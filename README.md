# 🤖 hamz-bot v6.0

> WhatsApp Bot — Downloader + Sticker + AI
> **Dev:** `hamzz-speccer`

Bot WhatsApp ringan berbasis **Baileys** yang siap jalan di **Termux** maupun **Pterodactyl**. Fitur lengkap: downloader multi-platform, sticker maker, AI chat, anti-link, dan welcome message.

---

## ✨ Fitur

| Fitur | Tipe | Cara Pakai |
|-------|------|------------|
| Ping | Command | `.ping` |
| Menu | Command | `.menu` |
| Info | Command | `.info` |
| Sticker Maker | Command | Kirim gambar/video + caption `.sticker` |
| Downloader Auto | Command | `.dl <url>` (auto-detect platform) |
| YouTube | Command | `.yt <url>` |
| TikTok | Command | `.tt <url>` |
| Instagram | Command | `.ig <url>` |
| MediaFire | Command | `.mf <url>` |
| Anti-Link | Otomatis | Bot harus admin grup |
| Welcome Message | Otomatis | Aktif saat ada member baru |
| AI Chat (Gemini) | Otomatis | Tag bot di grup, atau DM langsung |

---

## 📋 Requirement

| Kebutuhan | Wajib? | Catatan |
|-----------|--------|---------|
| **Node.js 18+** | ✅ Wajib | `nodejs-lts` di Termux |
| **Python 3.9+** | ⚠️ Optional | Buat YouTube downloader |
| **FFmpeg** | ⚠️ Optional | Buat YouTube video/audio |
| **Gemini API Key** | ⚠️ Optional | Buat fitur AI Chat |

> Kalo Python & FFmpeg gak ada, fitur YouTube mati. Tapi TikTok, IG, MediaFire, sticker, dan AI tetap jalan.

---

## 🚀 Instalasi di Termux

### 1. Update & install dependency

```bash
pkg update && pkg upgrade -y
pkg install nodejs-lts python ffmpeg git tmux -y
```

### 2. Bikin folder project

```bash
mkdir hamz-bot && cd hamz-bot
```

### 3. Masukin file

Copy 3 file ini ke folder:
- `bot.js`
- `package.json`
- `.env`

**Cara cepat dari folder Download HP:**

```bash
termux-setup-storage
cp ~/storage/downloads/bot.js .
cp ~/storage/downloads/package.json .
cp ~/storage/downloads/.env .
```

### 4. Install library

```bash
npm install
```

**Kalo error `android_ndk_path`:**

```bash
mkdir -p ~/.gyp
echo "{ 'variables': { 'android_ndk_path': '' } }" > ~/.gyp/include.gypi
npm install
```

### 5. Jalanin bot

```bash
node bot.js
```

Scan QR pakai WhatsApp → **Linked Devices** → **Link a Device**.

### 6. Biar gak mati pas HP dikunci

```bash
pkg install tmux -y
tmux
node bot.js
```

Pencet `Ctrl+B` lalu `D` buat detach. Balik lagi: `tmux attach`.

**Tambahan:** Setting → Apps → Termux → Battery → **Unrestricted**.

---

## 🎮 Instalasi di Pterodactyl

### 1. Bikin server

- Egg: **Node.js Generic** atau **Multi-JS Runner** dari `parkervcp/eggs`
- Docker Image: Node.js **18+**

### 2. Upload file

Upload `bot.js`, `package.json`, `.env` ke `/home/container` via File Manager.

### 3. Start

Klik **Start**. Egg otomatis jalanin `npm install` → `node bot.js`.

### 4. Cek Console

Tunggu QR muncul, scan pakai WhatsApp.

### 5. Kalo fitur YouTube gagal

Minta owner panel tambahin di **Install Script** Egg:

```bash
apt update && apt install -y python3 ffmpeg
```

Atau matiin fitur YouTube — fitur lain tetap jalan.

---

## ⚙️ Konfigurasi `.env`

```env
# Gemini API Key (optional)
# Dapet gratis di: https://aistudio.google.com/apikey
GEMINI_API_KEY=

# Nama bot (tampil di menu & sticker)
BOT_NAME=hamz-bot

# Prefix command
PREFIX=.

# URL gambar buat menu (harus direct link)
MENU_IMAGE_URL=https://i.ibb.co/4pDNDk1/avatar.png
```

### Cara dapet Gemini API Key

1. Buka https://aistudio.google.com/apikey
2. Login pakai Google account
3. Klik **Create API Key**
4. Copy key, paste ke `.env`

Kalo `GEMINI_API_KEY` kosong, fitur AI Chat otomatis mati.

### Cara ganti gambar menu

1. Upload gambar ke [ImgBB](https://imgbb.com) atau [Postimages](https://postimages.org)
2. Copy **direct link** (berakhiran `.jpg` / `.png`)
3. Paste ke `MENU_IMAGE_URL` di `.env`

**Penting:** Harus direct link, bukan halaman HTML.

---

## 📱 Daftar Command

```
.menu              → Tampilkan menu (dengan gambar)
.ping              → Cek bot hidup
.info              → Info bot & status sistem
.sticker           → Kirim gambar/video + caption ini
.dl <url>          → Download auto-detect
.yt <url>          → Download YouTube
.tt <url>          → Download TikTok
.ig <url>          → Download Instagram
.mf <url>          → Download MediaFire
```

**Contoh:**

```
.dl https://youtu.be/dQw4w9WgXcQ
.tt https://vt.tiktok.com/xxxxx
.ig https://instagram.com/p/xxxxx
.mf https://mediafire.com/file/xxxxx
```

---

## 🔧 Troubleshooting

### QR gak muncul

- Tunggu 10–30 detik
- Kalo tetep gak muncul: `Ctrl+C`, jalanin `node bot.js` lagi
- Hapus folder `auth_info/`, jalanin ulang

### `npm install` gagal

```bash
mkdir -p ~/.gyp
echo "{ 'variables': { 'android_ndk_path': '' } }" > ~/.gyp/include.gypi
npm install
```

### `Connection Closed` terus

Downgrade Baileys:

```bash
npm install @whiskeysockets/baileys@6.6.0
```

### YouTube gagal

Cek dependency:

```bash
ffmpeg -version
python3 --version
```

Kalo gak keluar output, install ulang:

```bash
pkg install python ffmpeg -y
```

### Sticker gagal

- File terlalu gede (max ~1MB)
- Coba gambar dulu, jangan video
- Cek format (JPG/PNG/MP4)

### AI gak respon

- Cek `GEMINI_API_KEY` di `.env` udah diisi
- Cek quota API (Gemini gratis ada limit)
- Cek console buat error message

### Anti-link gak jalan

- Pastiin bot udah jadi **admin** grup
- Cek yang kirim link bukan admin
- Link harus ada `http` atau `wa.me`

### File > 100MB gagal kirim

WhatsApp limit dokumen ~100MB. Handler MediaFire udah cek size otomatis.

### Bot mati pas HP dikunci

- Pakai `tmux` (lihat atas)
- Matiin battery optimization Termux

---

## 📁 Struktur Folder

```
hamz-bot/
├── bot.js              ← Kode utama
├── package.json        ← Daftar library
├── .env                ← Config (API key, nama bot)
├── README.md           ← File ini
├── auth_info/          ← Session WhatsApp (JANGAN di-share!)
└── downloads/          ← File sementara (auto-hapus)
```

---

## ⚠️ Disclaimer

Bot ini dibuat untuk **edukasi**. Penggunaan untuk spam, phishing, atau aktivitas ilegal adalah **tanggung jawab pengguna**. WhatsApp bisa ban nomor kalo dipake buat abuse.

**Jangan share folder `auth_info/`** — itu kredensial WhatsApp lu. Kalo bocor, orang lain bisa akses akun lu.

---

## 📝 Lisensi

MIT — bebas dipake, dimodif, dan dibagi.

---

## 👤 Developer

**hamzz-speccer**

> _"Error itu cuma cara kode bilang capek."_
