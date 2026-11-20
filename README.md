# 🌸 STORY WHATSAPP HD — XIYU CODEX

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&height=230&color=0:090D1D,35:5541A8,70:B58AE8,100:F4A7D7&text=XIYU%20CODEX&fontSize=58&fontColor=FFFFFF&fontAlignY=40&animation=fadeIn&desc=STORY%20WHATSAPP%20HD&descAlignY=60&descSize=18" width="100%" alt="XIYU CODEX Banner"/>
</p>

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=600&size=17&duration=3000&pause=1000&color=B58AE8&center=true&vCenter=true&width=650&lines=WhatsApp+Story+HD+Processor;Powered+by+StatusDrop+Mobile+API;Local+FFmpeg+WebAssembly+Processing;Designed+and+Developed+by+XIYU+CODEX" alt="Typing Animation"/>
</p>

<p align="center">
  🌸 꽃 · 星 · 花 · 🦋 · ✨ · 💜 · 🌷
</p>

<p align="center">
  <img src="https://img.shields.io/badge/PROJECT-XIYU%20CODEX-9B83E8?style=for-the-badge&logo=github&logoColor=white"/>
  <img src="https://img.shields.io/badge/PLATFORM-WHATSAPP-25D366?style=for-the-badge&logo=whatsapp&logoColor=white"/>
  <img src="https://img.shields.io/badge/API-STATUSDROP-BA91E8?style=for-the-badge&logo=cloudflare&logoColor=white"/>
</p>

<p align="center">
  <b>✨ A modern WhatsApp Story HD frontend ✨</b>
  <br/>
  <i>Preserving quality, simplifying processing, and connecting to the original StatusDrop service.</i>
</p>

---

## 🌷 ABOUT PROJECT

**STORY WHATSAPP HD — XIYU** adalah frontend statis yang dirancang untuk menggunakan layanan WhatsApp Story HD original dari **StatusDrop**.

Project ini menyediakan antarmuka untuk memilih video, melakukan pemrosesan kualitas secara lokal, mengunggah hasil video, dan melanjutkan proses aktivasi melalui layanan original StatusDrop.

### 💜 Project Affiliation

Project ini berafiliasi dengan:

<p align="center">
  <a href="https://t.me/StatusDrop">
    <img src="https://img.shields.io/badge/AFFILIATED%20WITH-@StatusDrop-8B78D8?style=for-the-badge&logo=telegram&logoColor=white"/>
  </a>
</p>

**StatusDrop** menyediakan layanan original, Mobile API, sistem upload, serta integrasi bot WhatsApp yang digunakan dalam alur project ini.

XIYU berperan sebagai frontend client dan tidak mengklaim kepemilikan atas infrastruktur maupun layanan original StatusDrop.

---

## ✨ MAIN FEATURES

| Feature | Description |
|---|---|
| 🎬 Multi Video Input | Memilih hingga 3 video sekaligus |
| 💎 HD Processing | Pemrosesan video menggunakan profil kualitas |
| ⚡ Local Compression | Kompresi menggunakan FFmpeg WebAssembly |
| 🔐 SHA-256 | Menghitung hash setiap klip |
| ☁️ API Integration | Terhubung dengan StatusDrop Mobile API |
| 📤 Direct Upload | Upload menggunakan token dari StatusDrop |
| 🔗 Activation | Mendapatkan kode aktivasi dan WhatsApp URL |
| 📱 Mobile Friendly | Frontend statis yang dapat digunakan melalui browser |

---

## 🎥 VIDEO QUALITY PROFILES

| Profile | Resolution | Clip Duration | Size Limit |
|---|---|---:|---:|
| `hd29` | 1080 × 1920 | 29 seconds | 15.8 MB |
| `long59` | 720 × 1280 | 59 seconds | 15.8 MB |
| `hd90` | 1080 × 1920 | 89 seconds | 60 MB |

### 📦 Frontend Limits

- 🎞️ Maximum 3 input videos.
- ✂️ Maximum 20 output clips.
- 💾 Maximum 300 MB total compressed output.

---

## ⚙️ HOW IT WORKS

```text
       👤 USER
          │
          ▼
   🎬 SELECT VIDEOS
          │
          ▼
   💎 QUALITY PROFILE
          │
          ▼
   ⚡ LOCAL COMPRESSION
       FFmpeg WASM
          │
          ▼
      🔐 SHA-256
          │
          ▼
   ☁️ STATUSDROP API
     CREATE SESSION
          │
          ▼
      📤 UPLOAD
     Upload Token
          │
          ▼
   🔄 FINALIZE SESSION
          │
          ▼
   🎟️ ACTIVATION CODE
          │
          ▼
    📱 WHATSAPP URL
          │
          ▼
   🤖 ORIGINAL STATUSDROP BOT
```

---

## 🔌 API ARCHITECTURE

XIYU menggunakan Vercel External Rewrite sebagai proxy untuk meneruskan request menuju layanan StatusDrop.

### Request Flow

```text
BROWSER
   │
   ▼
XIYU FRONTEND
   │
   ▼
VERCEL EXTERNAL REWRITE
   │
   ▼
STATUSDROP MOBILE API
   │
   ▼
ORIGINAL STATUSDROP SERVICE
```

### Proxy Configuration

```text
/_statusdrop/*
       ↓
https://api.wastatusvideo.com/*
```

### API Endpoints

| Method | Endpoint | Function |
|---|---|---|
| POST | `/_statusdrop/api/mobile/sessions` | Membuat sesi upload |
| PUT | `/_statusdrop/[upload-path]` | Mengunggah video |
| POST | `/_statusdrop/api/mobile/sessions/:sessionId/finalize` | Finalisasi sesi |

URL upload yang dikembalikan API juga diarahkan melalui proxy XIYU.

---

## 🛠️ TECHNOLOGY STACK

<p align="center">
  <img src="https://skillicons.dev/icons?i=html,css,js,nodejs,vercel,github&theme=dark" alt="Technology Stack"/>
</p>

### FFmpeg WebAssembly

Project menggunakan:

| Package | Version |
|---|---|
| `@ffmpeg/ffmpeg` | `0.12.10` |
| `@ffmpeg/util` | `0.12.1` |
| `@ffmpeg/core` | `0.12.10` |

FFmpeg dijalankan langsung di perangkat pengguna melalui browser.

**XIYU tidak menyediakan server backend FFmpeg untuk proses kompresi video.**

---

## 🚀 DEPLOYMENT

Project dapat di-deploy menggunakan Vercel.

1. Upload source code ke GitHub.
2. Import repository ke Vercel.
3. Pilih Framework Preset: Other.
4. Atur Output Directory menjadi `public`.
5. Pastikan konfigurasi external rewrite tersedia di `vercel.json`.
6. Deploy project.

### Syntax Check

```bash
npm run check
```

---

## ⚠️ IMPORTANT NOTES

- XIYU merupakan frontend client, bukan pengganti backend StatusDrop.
- Sistem upload dan aktivasi tetap bergantung pada layanan original StatusDrop.
- External Rewrite bukan backend delivery buatan XIYU.
- Keberhasilan upload bergantung pada kompatibilitas API upstream dan konfigurasi Vercel.
- Upload video berukuran besar perlu diuji pada lingkungan deployment sebenarnya.
- External Rewrite tidak otomatis menjamin streaming file besar tanpa batas waktu atau ukuran request.
- Jika terjadi kegagalan upload akibat keterbatasan proxy, gunakan metode upload yang didukung langsung oleh infrastruktur StatusDrop.

---

## 🌸 PROJECT IDENTITY

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&height=100&color=0:090D1D,50:5541A8,100:F4A7D7&text=XIYU%20CODEX&fontSize=35&fontColor=FFFFFF&animation=fadeIn" width="100%" alt="XIYU Identity"/>
</p>

<p align="center">
  <b>DEVELOPED BY XIYU CODEX</b>
  <br/>
  <i>Independent frontend integration for StatusDrop services.</i>
  <br/><br/>
  🌸 꽃 · 星 · 花 · 🦋 · ✨ · 💜
</p>

---

## © COPYRIGHT & CREDITS

**Copyright © 2026 XIYU CODEX. All Rights Reserved.**

Original frontend implementation, source code, project identity, documentation, and original assets are credited to **XIYU CODEX**.

### Copyright Protection

- Unauthorized removal or alteration of original developer credits is prohibited.
- Do not redistribute this project while claiming original authorship.
- Do not misrepresent the original project identity or development credits.
- Preserve the original copyright notice when redistributing permitted copies.

### Third-Party Affiliation

This project is affiliated with and integrates the original services of **@StatusDrop**.

StatusDrop retains ownership of its own API, backend infrastructure, upload systems, activation services, and related assets.

WhatsApp is a third-party platform and is not owned or operated by XIYU CODEX.

---

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:090D1D,45:5541A8,100:F4A7D7&height=120&section=footer&animation=fadeIn" width="100%" alt="Footer"/>
</p>

<p align="center">
  <b>🌸 XIYU CODEX 🌸</b>
  <br/>
  <i>Designed with elegance. Built with purpose.</i>
  <br/><br/>
  💜 Made with passion · Powered by technology · Connected with StatusDrop
</p>
