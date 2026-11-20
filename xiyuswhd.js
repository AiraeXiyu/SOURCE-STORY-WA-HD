
/**
 * ============================================================
 *  STORY WHATSAPP HD — XIYU CODEX
 *  Browser Processing & StatusDrop Mobile API Integration
 * ============================================================
 *
 *  Developer : XIYU CODEX
 *  Version   : 1.0.0
 *  Affiliation: StatusDrop
 *
 *  Copyright (c) 2026 XIYU CODEX.
 *  All Rights Reserved.
 *
 *  This library provides:
 *  - Local video processing using FFmpeg WebAssembly
 *  - Automatic video splitting
 *  - SHA-256 clip hashing
 *  - StatusDrop Mobile API integration
 *  - Upload token authorization
 *  - Upload progress tracking
 *  - Session finalization
 *
 *  Requirements:
 *  - Modern browser
 *  - ES Module support
 *  - WebAssembly
 *  - Web Crypto API
 *  - Network access
 *
 *  Original infrastructure and API:
 *  StatusDrop
 *
 * ============================================================
 */

const XIYU_VERSION = '1.0.0';

const DEFAULT_CONFIG = {
  API_BASE: '/_statusdrop',
  API_HOST: 'api.wastatusvideo.com',

  FFMPEG_VERSION: '0.12.10',
  FFMPEG_UTIL_VERSION: '0.12.1',

  MAX_INPUT_VIDEOS: 3,
  MAX_OUTPUT_CLIPS: 20,
  MAX_TOTAL_OUTPUT_BYTES: 300 * 1024 * 1024,

  MAX_PARALLEL_UPLOADS: 1,

  FFMPEG_CDN: 'https://cdn.jsdelivr.net/npm',

  REQUEST_TIMEOUT: 120000,

  COPYRIGHT: 'XIYU CODEX'
};

const PROFILES = Object.freeze({
  hd29: Object.freeze({
    id: 'hd29',
    label: '1080p HD · 29 detik/klip',
    width: 1080,
    height: 1920,
    seconds: 29,
    crf: 23,
    maxrate: '3800k',
    bufsize: '5700k',
    maxBytes: 15800000
  }),

  long59: Object.freeze({
    id: 'long59',
    label: '720p · 59 detik/klip',
    width: 720,
    height: 1280,
    seconds: 59,
    crf: 24,
    maxrate: '2200k',
    bufsize: '3300k',
    maxBytes: 15800000
  }),

  hd90: Object.freeze({
    id: 'hd90',
    label: '1080p HD · hingga 89 detik',
    width: 1080,
    height: 1920,
    seconds: 89,
    crf: 23,
    maxrate: '3800k',
    bufsize: '5700k',
    maxBytes: 60000000
  })
});

/* ============================================================
 * CONFIGURATION
 * ============================================================
 */

function createConfig(options = {}) {
  const config = {
    ...DEFAULT_CONFIG,
    ...options
  };

  config.API_BASE = String(config.API_BASE)
    .replace(/\/+$/, '');

  if (!config.API_BASE) {
    throw new Error('API_BASE tidak boleh kosong.');
  }

  if (
    !Number.isInteger(config.MAX_INPUT_VIDEOS) ||
    config.MAX_INPUT_VIDEOS < 1
  ) {
    throw new Error('MAX_INPUT_VIDEOS tidak valid.');
  }

  return Object.freeze(config);
}

/* ============================================================
 * UTILITIES
 * ============================================================
 */

function isVideo(file) {
  return Boolean(
    file &&
    (
      file.type?.startsWith('video/') ||
      /\.(mp4|mov|m4v|webm|mkv|avi|3gp)$/i.test(file.name || '')
    )
  );
}

function formatSize(bytes) {
  return bytes < 1048576
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1048576).toFixed(1)} MB`;
}

function safeName(name, order) {
  const base = String(name)
    .replace(/\.[^.]+$/, '')
    .replace(/[^A-Za-z0-9._ -]/g, '_')
    .slice(0, 75) || 'video';

  return `${String(order).padStart(3, '0')}_${base}.mp4`;
}

function emitProgress(callback, data) {
  if (typeof callback === 'function') {
    try {
      callback(Object.freeze({
        timestamp: Date.now(),
        ...data
      }));
    } catch (error) {
      console.warn('[XIYU] Progress callback error:', error);
    }
  }
}

async function readJson(response) {
  const raw = await response.text();

  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(
      `Respons API bukan JSON (HTTP ${response.status}).`
    );
  }
}

function apiUrl(config, path) {
  return `${config.API_BASE}${path}`;
}

function getProxiedUploadUrl(config, rawUrl) {
  let upstream;

  try {
    upstream = new URL(rawUrl);
  } catch {
    throw new Error('URL upload StatusDrop tidak valid.');
  }

  if (
    upstream.protocol !== 'https:' ||
    upstream.hostname !== config.API_HOST ||
    upstream.username ||
    upstream.password
  ) {
    throw new Error(
      'API memberikan alamat upload yang tidak dikenal.'
    );
  }

  return `${config.API_BASE}${upstream.pathname}${upstream.search}`;
}

/* ============================================================
 * CRYPTOGRAPHIC HASH
 * ============================================================
 */

async function sha256(blob) {
  if (!globalThis.crypto?.subtle) {
    throw new Error(
      'Web Crypto API tidak tersedia. Gunakan HTTPS.'
    );
  }

  const digest = await crypto.subtle.digest(
    'SHA-256',
    await blob.arrayBuffer()
  );

  return Array.from(
    new Uint8Array(digest),
    byte => byte.toString(16).padStart(2, '0')
  ).join('');
}

/* ============================================================
 * VIDEO METADATA
 * ============================================================
 */

async function getDuration(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);

    let finished = false;

    const cleanup = () => {
      if (finished) return;

      finished = true;

      URL.revokeObjectURL(url);

      video.removeAttribute('src');
      video.load();
    };

    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      const duration = video.duration;

      cleanup();

      if (Number.isFinite(duration) && duration > 0) {
        resolve(duration);
      } else {
        reject(
          new Error(`Durasi ${file.name} tidak terbaca.`)
        );
      }
    };

    video.onerror = () => {
      cleanup();

      reject(
        new Error(
          `Video ${file.name} tidak dapat dibaca browser.`
        )
      );
    };

    video.src = url;
  });
}

/* ============================================================
 * XIYU STORY HD ENGINE
 * ============================================================
 */

export class XiyuSwhd {
  constructor(options = {}) {
    this.config = createConfig(options);

    this.ffmpeg = null;
    this.ffmpegLoading = null;
    this.activeProgress = null;

    this.isProcessing = false;
    this.workerBlobURL = null;
  }

  get version() {
    return XIYU_VERSION;
  }

  get profiles() {
    return PROFILES;
  }

  /* ----------------------------------------------------------
   * FFmpeg Loader
   * ---------------------------------------------------------- */

  async loadFFmpeg(onProgress) {
    if (this.ffmpeg) {
      return this.ffmpeg;
    }

    if (this.ffmpegLoading) {
      return this.ffmpegLoading;
    }

    this.ffmpegLoading = (async () => {
      emitProgress(onProgress, {
        stage: 'ffmpeg-loading',
        percent: 3,
        message: 'Memuat FFmpeg WebAssembly.'
      });

      const { FFmpeg } = await import(
        `${this.config.FFMPEG_CDN}/@ffmpeg/ffmpeg@${this.config.FFMPEG_VERSION}/dist/esm/index.js`
      );

      const { toBlobURL } = await import(
        `${this.config.FFMPEG_CDN}/@ffmpeg/util@${this.config.FFMPEG_UTIL_VERSION}/dist/esm/index.js`
      );

      const ff = new FFmpeg();

      ff.on('progress', ({ progress }) => {
        const state = this.activeProgress;

        if (!state || !Number.isFinite(progress)) {
          return;
        }

        state.clipProgress = Math.max(
          state.clipProgress,
          Math.min(1, Math.max(0, progress))
        );

        const overall = (
          state.completedSeconds +
          state.currentSeconds * state.clipProgress
        ) / state.totalSeconds;

        emitProgress(onProgress, {
          stage: 'compressing',
          percent: 5 + Math.min(1, overall) * 45,
          clip: state.clipNumber,
          totalClips: state.totalClips,
          fileName: state.fileName,
          message: 'Mengompres video di perangkat.'
        });
      });

      const coreBase =
        `${this.config.FFMPEG_CDN}/@ffmpeg/core@${this.config.FFMPEG_VERSION}/dist/esm`;

      const coreURL = await toBlobURL(
        `${coreBase}/ffmpeg-core.js`,
        'text/javascript'
      );

      const wasmURL = await toBlobURL(
        `${coreBase}/ffmpeg-core.wasm`,
        'application/wasm'
      );

      /*
       * Worker wrapper.
       * Menggantikan file ffmpeg-worker.js dari project website.
       */

      const workerSource = `
        import "${this.config.FFMPEG_CDN}/@ffmpeg/ffmpeg@${this.config.FFMPEG_VERSION}/dist/esm/worker.js";
      `;

      this.workerBlobURL = URL.createObjectURL(
        new Blob(
          [workerSource],
          { type: 'text/javascript' }
        )
      );

      try {
        await ff.load({
          classWorkerURL: this.workerBlobURL,
          coreURL,
          wasmURL
        });
      } catch (error) {
        console.error('[XIYU/FFmpeg]', error);

        throw new Error(
          `FFmpeg gagal dimuat: ${error?.message || error}`
        );
      }

      this.ffmpeg = ff;

      return ff;
    })();

    try {
      return await this.ffmpegLoading;
    } finally {
      this.ffmpegLoading = null;
    }
  }

  /* ----------------------------------------------------------
   * Video Compression
   * ---------------------------------------------------------- */

  async compress(files, options = {}) {
    const onProgress = options.onProgress;
    const profile = PROFILES[options.profile || 'hd29'];

    if (!profile) {
      throw new Error('Profil kualitas tidak dikenal.');
    }

    if (!Array.isArray(files) || files.length === 0) {
      throw new Error('Pilih minimal satu video.');
    }

    if (files.length > this.config.MAX_INPUT_VIDEOS) {
      throw new Error(
        `Maksimal ${this.config.MAX_INPUT_VIDEOS} video.`
      );
    }

    if (files.some(file => !isVideo(file))) {
      throw new Error('Terdapat file yang bukan video.');
    }

    if (files.some(file => !file.size)) {
      throw new Error('Terdapat file video kosong.');
    }

    emitProgress(onProgress, {
      stage: 'metadata',
      percent: 2,
      message: 'Memeriksa metadata video.'
    });

    const metadata = await Promise.all(
      files.map(async file => ({
        file,
        duration: await getDuration(file)
      }))
    );

    const totalClips = metadata.reduce(
      (total, item) =>
        total + Math.ceil(item.duration / profile.seconds),
      0
    );

    if (!totalClips || totalClips > this.config.MAX_OUTPUT_CLIPS) {
      throw new Error(
        `Jumlah klip ${totalClips} melebihi batas ${this.config.MAX_OUTPUT_CLIPS}.`
      );
    }

    const totalSeconds = metadata.reduce(
      (total, item) => total + item.duration,
      0
    );

    const ff = await this.loadFFmpeg(onProgress);

    const clips = [];

    let completedSeconds = 0;
    let order = 0;

    try {
      for (let fi = 0; fi < metadata.length; fi++) {
        const { file, duration } = metadata[fi];

        const ext = (
          file.name.match(/\.([^.]+)$/)?.[1] || 'mp4'
        ).toLowerCase();

        const inputName = `xiyu_input_${fi}.${ext}`;

        try {
          emitProgress(onProgress, {
            stage: 'loading-video',
            percent: 5,
            fileName: file.name,
            message: 'Memuat video ke FFmpeg.'
          });

          await ff.writeFile(
            inputName,
            new Uint8Array(await file.arrayBuffer())
          );

          const partCount = Math.ceil(
            duration / profile.seconds
          );

          for (let part = 0; part < partCount; part++) {
            order++;

            const start = part * profile.seconds;

            const length = Math.min(
              profile.seconds,
              duration - start
            );

            const outputName = `xiyu_clip_${order}.mp4`;

            const vf =
              `scale=w=${profile.width}:h=${profile.height}:force_original_aspect_ratio=decrease,pad=${profile.width}:${profile.height}:(ow-iw)/2:(oh-ih)/2,scale=trunc(iw/2)*2:trunc(ih/2)*2`;

            const attempts = [
              {
                crf: profile.crf,
                rate: profile.maxrate,
                buf: profile.bufsize
              },
              {
                crf: profile.crf + 1,
                rate: profile.maxrate,
                buf: profile.bufsize
              },
              {
                crf: profile.crf + 3,
                rate: profile.maxrate,
                buf: profile.bufsize
              }
            ];

            let outputBlob = null;

            for (let attemptIndex = 0; attemptIndex < attempts.length; attemptIndex++) {
              const attempt = attempts[attemptIndex];

              await ff.deleteFile(outputName).catch(() => {});

              this.activeProgress = {
                completedSeconds,
                currentSeconds: length,
                totalSeconds,
                totalClips,
                clipNumber: order,
                fileName: file.name,
                clipProgress: 0
              };

              emitProgress(onProgress, {
                stage: 'compressing',
                percent: 5 + (completedSeconds / totalSeconds) * 45,
                clip: order,
                totalClips,
                fileName: file.name,
                message: 'Mengompres video.'
              });

              const exitCode = await ff.exec([
                '-y',
                '-hide_banner',
                '-loglevel',
                'error',
                '-ss',
                String(start),
                '-t',
                String(length),
                '-i',
                inputName,
                '-map',
                '0:v:0',
                '-map',
                '0:a:0?',
                '-sn',
                '-dn',
                '-vf',
                vf,
                '-c:v',
                'libx264',
                '-preset',
                'ultrafast',
                '-pix_fmt',
                'yuv420p',
                '-color_range',
                'tv',
                '-crf',
                String(attempt.crf),
                '-maxrate',
                attempt.rate,
                '-bufsize',
                attempt.buf,
                '-r',
                '29.97',
                '-c:a',
                'aac',
                '-ar',
                '44100',
                '-ac',
                '2',
                '-b:a',
                '128k',
                '-movflags',
                '+faststart',
                '-f',
                'mp4',
                outputName
              ]);

              if (exitCode !== 0) {
                throw new Error(
                  `FFmpeg gagal mengompres ${file.name}.`
                );
              }

              const data = await ff.readFile(outputName);

              outputBlob = new Blob(
                [data],
                { type: 'video/mp4' }
              );

              if (outputBlob.size <= profile.maxBytes) {
                break;
              }
            }

            this.activeProgress = null;

            if (
              !outputBlob ||
              outputBlob.size > profile.maxBytes
            ) {
              throw new Error(
                `Klip ${order} melebihi batas ${formatSize(profile.maxBytes)}.`
              );
            }

            const clip = {
              order,
              name: safeName(file.name, order),
              blob: outputBlob,
              sizeBytes: outputBlob.size,
              durationSeconds: length,
              sha256: await sha256(outputBlob)
            };

            clips.push(clip);

            await ff.deleteFile(outputName).catch(() => {});

            completedSeconds += length;

            emitProgress(onProgress, {
              stage: 'clip-completed',
              percent: 5 + (completedSeconds / totalSeconds) * 45,
              clip: order,
              totalClips,
              sizeBytes: clip.sizeBytes,
              message: 'Klip berhasil dikompres.'
            });
          }
        } finally {
          this.activeProgress = null;
          await ff.deleteFile(inputName).catch(() => {});
        }
      }
    } finally {
      this.activeProgress = null;
    }

    const totalBytes = clips.reduce(
      (total, clip) => total + clip.sizeBytes,
      0
    );

    if (totalBytes > this.config.MAX_TOTAL_OUTPUT_BYTES) {
      throw new Error('Total hasil kompresi melebihi 300 MB.');
    }

    return {
      profile,
      clips,
      totalClips: clips.length,
      totalBytes
    };
  }

  /* ----------------------------------------------------------
   * Create StatusDrop Mobile Session
   * ---------------------------------------------------------- */

  async createSession(profile, clips) {
    if (!clips?.length) {
      throw new Error('Tidak ada klip untuk dibuatkan sesi.');
    }

    let response;

    try {
      response = await fetch(
        apiUrl(this.config, '/api/mobile/sessions'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            profile: profile.id,

            clips: clips.map(({
              order,
              name,
              sizeBytes,
              durationSeconds,
              sha256
            }) => ({
              order,
              name,
              sizeBytes,
              durationSeconds,
              sha256
            }))
          })
        }
      );
    } catch (error) {
      throw new Error(
        `Tidak dapat menghubungi StatusDrop: ${error.message}`
      );
    }

    const body = await readJson(response);

    if (!response.ok) {
      throw new Error(
        body.error ||
        `Gagal membuat sesi (HTTP ${response.status}).`
      );
    }

    if (
      !body.sessionId ||
      !body.uploadToken ||
      !Array.isArray(body.uploads) ||
      body.uploads.length !== clips.length
    ) {
      throw new Error(
        'Respons pembuatan sesi tidak valid.'
      );
    }

    return body;
  }

  /* ----------------------------------------------------------
   * Upload One Clip
   * ---------------------------------------------------------- */

  uploadClip(session, clip, uploadUrl, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open('PUT', uploadUrl, true);

      xhr.timeout = this.config.REQUEST_TIMEOUT;

      xhr.setRequestHeader(
        'Authorization',
        `Bearer ${session.uploadToken}`
      );

      xhr.setRequestHeader(
        'Content-Type',
        'video/mp4'
      );

      xhr.upload.onprogress = event => {
        if (event.lengthComputable) {
          emitProgress(onProgress, {
            stage: 'uploading',
            clip: clip.order,
            loaded: event.loaded,
            total: event.total,
            percent: event.total
              ? event.loaded / event.total * 100
              : 0,
            message: 'Mengunggah klip.'
          });
        }
      };

      xhr.onload = () => {
        let body = {};

        if (xhr.responseText) {
          try {
            body = JSON.parse(xhr.responseText);
          } catch {
            reject(
              new Error(
                `Respons upload bukan JSON (HTTP ${xhr.status}).`
              )
            );
            return;
          }
        }

        if (xhr.status < 200 || xhr.status >= 300) {
          reject(
            new Error(
              body.error ||
              `Upload klip ${clip.order} gagal (HTTP ${xhr.status}).`
            )
          );
          return;
        }

        resolve(body);
      };

      xhr.onerror = () => {
        reject(
          new Error(
            `Koneksi upload klip ${clip.order} gagal.`
          )
        );
      };

      xhr.ontimeout = () => {
        reject(
          new Error(
            `Upload klip ${clip.order} timeout.`
          )
        );
      };

      xhr.onabort = () => {
        reject(
          new Error(
            `Upload klip ${clip.order} dibatalkan.`
          )
        );
      };

      xhr.send(clip.blob);
    });
  }

  /* ----------------------------------------------------------
   * Upload All Clips
   * ---------------------------------------------------------- */

  async uploadClips(session, clips, onProgress) {
    const total = clips.reduce(
      (sum, clip) => sum + clip.sizeBytes,
      0
    );

    if (!total) {
      throw new Error('Tidak ada data klip untuk diunggah.');
    }

    let uploaded = 0;

    for (const clip of clips) {
      const slot = session.uploads.find(
        item => Number(item.order) === clip.order
      );

      if (!slot?.url) {
        throw new Error(
          `Slot upload klip ${clip.order} tidak ditemukan.`
        );
      }

      const uploadUrl = getProxiedUploadUrl(
        this.config,
        slot.url
      );

      emitProgress(onProgress, {
        stage: 'upload-start',
        clip: clip.order,
        totalClips: clips.length,
        message: 'Memulai upload ke StatusDrop.'
      });

      await this.uploadClip(
        session,
        clip,
        uploadUrl,
        data => {
          const current = uploaded + data.loaded;

          emitProgress(onProgress, {
            ...data,
            totalUploaded: current,
            totalBytes: total,
            overallPercent: current / total * 100
          });
        }
      );

      uploaded += clip.sizeBytes;

      emitProgress(onProgress, {
        stage: 'upload-completed',
        clip: clip.order,
        totalClips: clips.length,
        totalUploaded: uploaded,
        totalBytes: total,
        percent: uploaded / total * 100,
        message: 'Upload klip berhasil.'
      });
    }

    return {
      uploadedClips: clips.length,
      totalUploadedBytes: uploaded
    };
  }

  /* ----------------------------------------------------------
   * Finalize StatusDrop Session
   * ---------------------------------------------------------- */

  async finalizeSession(session) {
    let response;

    try {
      response = await fetch(
        apiUrl(
          this.config,
          `/api/mobile/sessions/${encodeURIComponent(session.sessionId)}/finalize`
        ),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.uploadToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: '{}'
        }
      );
    } catch (error) {
      throw new Error(
        `Koneksi finalisasi gagal: ${error.message}`
      );
    }

    const body = await readJson(response);

    if (!response.ok) {
      throw new Error(
        body.error ||
        `Finalisasi gagal (HTTP ${response.status}).`
      );
    }

    const code = String(
      body.activationCode || ''
    ).toUpperCase();

    const whatsappUrl = String(
      body.whatsAppUrl || ''
    );

    if (!/^[A-Z0-9]{9}$/.test(code)) {
      throw new Error(
        'Kode aktivasi dari StatusDrop tidak valid.'
      );
    }

    if (!/^https:\/\/wa\.me\//i.test(whatsappUrl)) {
      throw new Error(
        'WhatsApp URL dari StatusDrop tidak valid.'
      );
    }

    return body;
  }

  /* ----------------------------------------------------------
   * COMPLETE PROCESS
   * ---------------------------------------------------------- */

  async process(files, options = {}) {
    if (this.isProcessing) {
      throw new Error('Proses sebelumnya masih berjalan.');
    }

    this.isProcessing = true;

    const onProgress = options.onProgress;

    try {
      emitProgress(onProgress, {
        stage: 'started',
        percent: 0,
        message: 'Memulai proses STORY WHATSAPP HD.'
      });

      // 1. Compress videos locally.

      const compressed = await this.compress(
        Array.from(files),
        {
          profile: options.profile || 'hd29',
          onProgress
        }
      );

      // 2. Create Mobile API session.

      emitProgress(onProgress, {
        stage: 'creating-session',
        percent: 51,
        message: 'Membuat sesi Mobile API StatusDrop.'
      });

      const session = await this.createSession(
        compressed.profile,
        compressed.clips
      );

      // 3. Upload clips.

      await this.uploadClips(
        session,
        compressed.clips,
        onProgress
      );

      // 4. Finalize session.

      emitProgress(onProgress, {
        stage: 'finalizing',
        percent: 94,
        message: 'Memfinalisasi sesi StatusDrop.'
      });

      const result = await this.finalizeSession(session);

      emitProgress(onProgress, {
        stage: 'completed',
        percent: 100,
        message: 'Proses berhasil diselesaikan.'
      });

      return {
        success: true,
        version: XIYU_VERSION,
        profile: compressed.profile.id,
        totalClips: compressed.totalClips,
        totalBytes: compressed.totalBytes,
        activationCode: result.activationCode,
        whatsAppUrl: result.whatsAppUrl,
        expiresAt: result.expiresAt || null,
        providerResponse: result
      };

    } catch (error) {
      emitProgress(onProgress, {
        stage: 'failed',
        message: error.message
      });

      throw error;

    } finally {
      this.isProcessing = false;
    }
  }

  /* ----------------------------------------------------------
   * CLEANUP
   * ---------------------------------------------------------- */

  async terminate() {
    if (this.ffmpeg) {
      await this.ffmpeg.terminate();
      this.ffmpeg = null;
    }

    if (this.workerBlobURL) {
      URL.revokeObjectURL(this.workerBlobURL);
      this.workerBlobURL = null;
    }

    this.ffmpegLoading = null;
    this.activeProgress = null;
    this.isProcessing = false;
  }
}

/* ============================================================
 * FACTORY & EXPORTS
 * ============================================================
 */

export function createXiyuSwhd(options = {}) {
  return new XiyuSwhd(options);
}

export {
  XIYU_VERSION,
  DEFAULT_CONFIG,
  PROFILES,
  createConfig,
  formatSize,
  sha256
};

export default XiyuSwhd;

/* ============================================================
 * END OF FILE
 * XIYU CODEX © 2026
 * ============================================================
 */
