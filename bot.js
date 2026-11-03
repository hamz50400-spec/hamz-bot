// ============================================
// HAMZ-BOT v6.0
// WhatsApp Bot — Downloader + Sticker + AI
// Dev: hamzz-speccer
// Pterodactyl & Termux Ready
// ============================================

require('dotenv').config();
const makeWASocket = require('@whiskeysockets/baileys').default;
const {
    DisconnectReason,
    useMultiFileAuthState,
    downloadMediaMessage
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const { Sticker, StickerTypes } = require('wa-sticker-kit');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============================================
// CONFIG
// ============================================
const PREFIX = process.env.PREFIX || '.';
const BOT_NAME = process.env.BOT_NAME || 'hamz-bot';
const DEV_NAME = 'hamzz-speccer';
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MENU_IMAGE_URL = process.env.MENU_IMAGE_URL || 'https://i.ibb.co/4pDNDk1/avatar.png';

const WORK_DIR = process.cwd();
const DOWNLOAD_DIR = path.join(WORK_DIR, 'downloads');
const AUTH_DIR = path.join(WORK_DIR, 'auth_info');

[DOWNLOAD_DIR, AUTH_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        try { fs.mkdirSync(dir, { recursive: true }); }
        catch (e) { console.error(`Gagal bikin folder ${dir}:`, e.message); }
    }
});

// ============================================
// CEK DEPENDENCY SISTEM
// ============================================
let FFMPEG_AVAILABLE = false;
let PYTHON_AVAILABLE = false;

try {
    execSync('ffmpeg -version', { stdio: 'ignore', timeout: 5000 });
    FFMPEG_AVAILABLE = true;
} catch (e) {
    console.warn('⚠️  FFmpeg gak ketemu. Fitur YouTube bakal gagal.');
}

try {
    execSync('python3 --version', { stdio: 'ignore', timeout: 5000 });
    PYTHON_AVAILABLE = true;
} catch (e) {
    try {
        execSync('python --version', { stdio: 'ignore', timeout: 5000 });
        PYTHON_AVAILABLE = true;
    } catch (e2) {
        console.warn('⚠️  Python gak ketemu. Fitur YouTube bakal gagal.');
    }
}

// ============================================
// LOAD LIBRARY DOWNLOADER (optional, anti-crash)
// ============================================
let youtubedl = null;
try { youtubedl = require('youtube-dl-exec'); }
catch (e) { console.warn('⚠️  youtube-dl-exec gak terinstall.'); }

let tiktokDownload = null;
try { tiktokDownload = require('@silent-tech-offc/ttdl').download; }
catch (e) { console.warn('⚠️  @silent-tech-offc/ttdl gak terinstall.'); }

let SnapSaver = null;
try { SnapSaver = require('snapsaver-downloader').SnapSaver; }
catch (e) { console.warn('⚠️  snapsaver-downloader gak terinstall.'); }

let mediafire = null;
try { mediafire = require('drive-mediafire-downloader'); }
catch (e) { console.warn('⚠️  drive-mediafire-downloader gak terinstall.'); }

// ============================================
// INIT GEMINI
// ============================================
const genAI = GEMINI_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null;
const model = genAI ? genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }) : null;

const chatHistory = new Map();
const logger = pino({ level: 'silent' });

// ============================================
// HELPERS
// ============================================
function detectPlatform(url) {
    if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
    if (/tiktok\.com|vt\.tiktok|vm\.tiktok/i.test(url)) return 'tiktok';
    if (/instagram\.com|instagr\.am/i.test(url)) return 'instagram';
    if (/mediafire\.com/i.test(url)) return 'mediafire';
    return null;
}

function cleanupFile(filePath) {
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }
    catch (e) { console.error('Cleanup error:', e.message); }
}

// ============================================
// DOWNLOADER HANDLERS
// ============================================
async function handleYouTube(url, sock, sender, msg) {
    if (!youtubedl) throw new Error('youtube-dl-exec gak terinstall.');
    if (!FFMPEG_AVAILABLE) throw new Error('FFmpeg gak tersedia. YouTube download gak bisa jalan.');

    await sock.sendMessage(sender, { text: '⏳ Mengunduh dari YouTube...' }, { quoted: msg });

    const outputTemplate = path.join(DOWNLOAD_DIR, `yt_${Date.now()}.%(ext)s`);
    await youtubedl(url, {
        output: outputTemplate,
        format: 'best[filesize<50M]/best',
        noWarnings: true,
        noCheckCertificates: true,
        preferFreeFormats: true
    });

    const files = fs.readdirSync(DOWNLOAD_DIR)
        .filter(f => f.startsWith('yt_'))
        .map(f => ({ name: f, time: fs.statSync(path.join(DOWNLOAD_DIR, f)).mtimeMs }))
        .sort((a, b) => b.time - a.time);

    if (!files.length) throw new Error('File hasil download gak ketemu');

    const filePath = path.join(DOWNLOAD_DIR, files[0].name);
    const ext = path.extname(filePath).toLowerCase();
    const isVideo = ['.mp4', '.mkv', '.webm'].includes(ext);
    const isAudio = ['.mp3', '.m4a', '.opus'].includes(ext);

    try {
        if (isVideo) {
            await sock.sendMessage(sender, {
                video: fs.readFileSync(filePath),
                caption: `✅ YouTube\n${url}`
            }, { quoted: msg });
        } else if (isAudio) {
            await sock.sendMessage(sender, {
                audio: fs.readFileSync(filePath),
                mimetype: 'audio/mp4',
                caption: `✅ YouTube Audio\n${url}`
            }, { quoted: msg });
        } else {
            await sock.sendMessage(sender, {
                document: fs.readFileSync(filePath),
                fileName: files[0].name,
                caption: `✅ YouTube\n${url}`
            }, { quoted: msg });
        }
    } finally {
        cleanupFile(filePath);
    }
}

async function handleTikTok(url, sock, sender, msg) {
    if (!tiktokDownload) throw new Error('Library TikTok gak terinstall.');
    await sock.sendMessage(sender, { text: '⏳ Mengunduh dari TikTok...' }, { quoted: msg });
    const data = await tiktokDownload(url);
    if (!data?.videoNoWatermark) throw new Error('Gagal dapet URL video TikTok');
    await sock.sendMessage(sender, {
        video: { url: data.videoNoWatermark },
        caption: `✅ TikTok (no watermark)\n${data.title || ''}\n${url}`
    }, { quoted: msg });
}

async function handleInstagram(url, sock, sender, msg) {
    if (!SnapSaver) throw new Error('Library Instagram gak terinstall.');
    await sock.sendMessage(sender, { text: '⏳ Mengunduh dari Instagram...' }, { quoted: msg });
    const result = await SnapSaver(url);
    if (!result.success || !result.data?.media?.length) {
        throw new Error(result.message || 'Gagal ambil media Instagram');
    }
    for (const media of result.data.media) {
        if (media.type === 'video') {
            await sock.sendMessage(sender, { video: { url: media.url }, caption: `✅ Instagram\n${url}` }, { quoted: msg });
        } else {
            await sock.sendMessage(sender, { image: { url: media.url }, caption: `✅ Instagram\n${url}` }, { quoted: msg });
        }
    }
}

async function handleMediaFire(url, sock, sender, msg) {
    if (!mediafire) throw new Error('Library MediaFire gak terinstall.');
    await sock.sendMessage(sender, { text: '⏳ Mengunduh dari MediaFire...' }, { quoted: msg });
    const result = await mediafire.downloadFromMediafire(url, DOWNLOAD_DIR);
    if (!result.success || !result.filePath) throw new Error(result.message || 'Gagal download MediaFire');

    const filePath = result.filePath;
    const fileName = path.basename(filePath);
    const stats = fs.statSync(filePath);

    if (stats.size > 100 * 1024 * 1024) {
        cleanupFile(filePath);
        throw new Error('File terlalu besar (>100MB). WhatsApp gak bisa kirim.');
    }

    try {
        await sock.sendMessage(sender, {
            document: fs.readFileSync(filePath),
            fileName: fileName,
            caption: `✅ MediaFire\n${url}\nUkuran: ${(stats.size / 1024 / 1024).toFixed(2)} MB`
        }, { quoted: msg });
    } finally {
        cleanupFile(filePath);
    }
}

// ============================================
// MENU
// ============================================
function buildMenu() {
    return `
╭───「 *${BOT_NAME} v6.0* 」───
│
│ 👤 Dev: ${DEV_NAME}
│
│ *Umum:*
│ ${PREFIX}ping
│ ${PREFIX}menu
│ ${PREFIX}info
│ ${PREFIX}sticker (caption gambar/video)
│
│ *Downloader:*
│ ${PREFIX}dl <url>  → auto-detect
│ ${PREFIX}yt <url>  → YouTube
│ ${PREFIX}tt <url>  → TikTok
│ ${PREFIX}ig <url>  → Instagram
│ ${PREFIX}mf <url>  → MediaFire
│
│ *Otomatis:*
│ • Anti-Link (Grup)
│ • Welcome Message (Grup)
│ • AI Chat (Tag bot / DM)
│
╰─────────────────────
    `.trim();
}

// ============================================
// MAIN BOT
// ============================================
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    const sock = makeWASocket({
        auth: state,
        logger: logger,
        printQRInTerminal: false,
        browser: [BOT_NAME, 'Chrome', '6.0.0']
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log('\n📱 Scan QR:\n');
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'close') {
            const code = (lastDisconnect?.error instanceof Boom)?.output?.statusCode;
            const shouldReconnect = code !== DisconnectReason.loggedOut;
            console.log(`❌ Disconnect (${code}). Reconnect: ${shouldReconnect}`);
            if (shouldReconnect) setTimeout(() => startBot(), 3000);
        } else if (connection === 'open') {
            console.log(`\n✅ ${BOT_NAME} v6.0 connected! Dev: ${DEV_NAME}`);
            console.log(`📁 Dir: ${WORK_DIR}`);
            console.log(`🎬 FFmpeg: ${FFMPEG_AVAILABLE ? 'OK' : 'TIDAK ADA'}`);
            console.log(`🐍 Python: ${PYTHON_AVAILABLE ? 'OK' : 'TIDAK ADA'}`);
            console.log(`🧠 AI: ${model ? 'Aktif' : 'Mati'}\n`);
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;
        if (action !== 'add') return;
        for (const p of participants) {
            await sock.sendMessage(id, {
                text: `👋 Selamat datang @${p.split('@')[0]}!\nKetik ${PREFIX}menu buat liat fitur.\n_Bot by ${DEV_NAME}_`,
                mentions: [p]
            }).catch(() => {});
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid;
        const isGroup = sender.endsWith('@g.us');
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        // Anti-link
        if (isGroup && /(https?:\/\/|wa\.me)/i.test(text)) {
            try {
                const meta = await sock.groupMetadata(sender);
                const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                const botP = meta.participants.find(p => p.id === botJid);
                const senderP = meta.participants.find(p => p.id === msg.key.participant);
                const isAdmin = senderP?.admin === 'admin' || senderP?.admin === 'superadmin';

                if (botP?.admin && !isAdmin) {
                    await sock.sendMessage(sender, { delete: msg.key });
                    await sock.groupParticipantsUpdate(sender, [msg.key.participant], 'remove');
                    await sock.sendMessage(sender, {
                        text: `🚫 Anti-Link: @${msg.key.participant.split('@')[0]} di-kick.`,
                        mentions: [msg.key.participant]
                    });
                    return;
                }
            } catch (e) { console.error('Anti-link:', e.message); }
        }

        // AI Chat
        if (!text.startsWith(PREFIX) && text && model) {
            const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.includes(sock.user.id);
            if (isGroup && !mentioned) return;
            try {
                let history = chatHistory.get(sender) || [];
                const chat = model.startChat({ history });
                const res = await chat.sendMessage(text);
                const reply = res.response.text();
                history.push({ role: 'user', parts: [{ text }] });
                history.push({ role: 'model', parts: [{ text: reply }] });
                if (history.length > 20) history = history.slice(-20);
                chatHistory.set(sender, history);
                await sock.sendMessage(sender, { text: reply }, { quoted: msg });
                return;
            } catch (e) { console.error('AI:', e.message); }
        }

        if (!text.startsWith(PREFIX)) return;
        const args = text.slice(PREFIX.length).trim().split(/ +/);
        const cmd = args.shift().toLowerCase();

        try {
            switch (cmd) {
                case 'ping':
                    await sock.sendMessage(sender, { text: '🏓 Pong! Bot hidup.' }, { quoted: msg });
                    break;

                case 'menu':
                case 'help': {
                    const menuText = buildMenu();
                    try {
                        await sock.sendMessage(sender, {
                            image: { url: MENU_IMAGE_URL },
                            caption: menuText
                        }, { quoted: msg });
                    } catch (err) {
                        await sock.sendMessage(sender, { text: menuText }, { quoted: msg });
                    }
                    break;
                }

                case 'info':
                    await sock.sendMessage(sender, {
                        text: `🤖 *${BOT_NAME} v6.0*\n` +
                              `👤 Dev: ${DEV_NAME}\n` +
                              `🧠 AI: ${model ? 'Aktif' : 'Mati'}\n` +
                              `🎬 FFmpeg: ${FFMPEG_AVAILABLE ? 'OK' : 'TIDAK ADA'}\n` +
                              `🐍 Python: ${PYTHON_AVAILABLE ? 'OK' : 'TIDAK ADA'}\n\n` +
                              `_"Error itu cuma cara kode bilang capek."_`
                    }, { quoted: msg });
                    break;

                case 'sticker': {
                    const isMedia = msg.message.imageMessage || msg.message.videoMessage;
                    if (!isMedia) {
                        await sock.sendMessage(sender, { text: `Kirim gambar/video dengan caption *${PREFIX}sticker*` }, { quoted: msg });
                        break;
                    }
                    await sock.sendMessage(sender, { text: '⏳ Bikin stiker...' }, { quoted: msg });
                    try {
                        const buf = await downloadMediaMessage(msg, 'buffer', {}, { logger });
                        const st = new Sticker(buf, { pack: BOT_NAME, author: DEV_NAME, type: StickerTypes.FULL, quality: 80 });
                        await sock.sendMessage(sender, { sticker: await st.toBuffer() }, { quoted: msg });
                    } catch (e) {
                        console.error('Sticker:', e.message);
                        await sock.sendMessage(sender, { text: '💥 Gagal bikin stiker.' }, { quoted: msg });
                    }
                    break;
                }

                case 'dl': {
                    const url = args[0];
                    if (!url) { await sock.sendMessage(sender, { text: `Contoh: ${PREFIX}dl https://youtu.be/xxx` }, { quoted: msg }); break; }
                    const platform = detectPlatform(url);
                    if (!platform) { await sock.sendMessage(sender, { text: '❌ Platform gak dikenali. Support: YouTube, TikTok, IG, MediaFire.' }, { quoted: msg }); break; }
                    try {
                        if (platform === 'youtube') await handleYouTube(url, sock, sender, msg);
                        else if (platform === 'tiktok') await handleTikTok(url, sock, sender, msg);
                        else if (platform === 'instagram') await handleInstagram(url, sock, sender, msg);
                        else if (platform === 'mediafire') await handleMediaFire(url, sock, sender, msg);
                    } catch (e) {
                        await sock.sendMessage(sender, { text: `💥 Gagal download ${platform}: ${e.message}` }, { quoted: msg });
                    }
                    break;
                }

                case 'yt':
                    if (!args[0]) { await sock.sendMessage(sender, { text: 'Kasih link YouTube-nya.' }, { quoted: msg }); break; }
                    try { await handleYouTube(args[0], sock, sender, msg); }
                    catch (e) { await sock.sendMessage(sender, { text: `💥 ${e.message}` }, { quoted: msg }); }
                    break;

                case 'tt':
                    if (!args[0]) { await sock.sendMessage(sender, { text: 'Kasih link TikTok-nya.' }, { quoted: msg }); break; }
                    try { await handleTikTok(args[0], sock, sender, msg); }
                    catch (e) { await sock.sendMessage(sender, { text: `💥 ${e.message}` }, { quoted: msg }); }
                    break;

                case 'ig':
                    if (!args[0]) { await sock.sendMessage(sender, { text: 'Kasih link Instagram-nya.' }, { quoted: msg }); break; }
                    try { await handleInstagram(args[0], sock, sender, msg); }
                    catch (e) { await sock.sendMessage(sender, { text: `💥 ${e.message}` }, { quoted: msg }); }
                    break;

                case 'mf':
                    if (!args[0]) { await sock.sendMessage(sender, { text: 'Kasih link MediaFire-nya.' }, { quoted: msg }); break; }
                    try { await handleMediaFire(args[0], sock, sender, msg); }
                    catch (e) { await sock.sendMessage(sender, { text: `💥 ${e.message}` }, { quoted: msg }); }
                    break;

                default:
                    await sock.sendMessage(sender, { text: `❓ Command *${cmd}* gak ada. Ketik ${PREFIX}menu` }, { quoted: msg });
            }
        } catch (err) {
            console.error('Command error:', err.message);
        }
    });

    return sock;
}

startBot().catch(err => {
    console.error('💀 Fatal:', err);
    process.exit(1);
});
