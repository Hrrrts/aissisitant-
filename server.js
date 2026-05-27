const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const https = require('https');

const app = express();

// 1. UBAH PORT: Mendukung port dinamis dari server hosting cloud
const PORT = process.env.PORT || 8080;
const DB_FILE = path.join(__dirname, 'database.json');

// 2. AMANKAN API KEY: Diambil dari Environment Variable rahasia di cloud nanti
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ favorites: [], journals: [], checklist: [] }, null, 2));
}

function readDB() { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
function writeDB(data) { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); }

app.get('/api/search', (req, res) => {
    const query = req.query.q;
    // Proteksi jika API Key belum diset di cloud
    if (!YOUTUBE_API_KEY) {
        return res.status(500).json({ error: 'Sistem Cloud belum dikonfigurasi dengan YOUTUBE_API_KEY' });
    }
    if (!query) return res.status(400).json({ error: 'Query kosong' });

    let cleanQuery = query.toLowerCase()
        .replace(/ais,?/g, '').replace(/tolong/g, '').replace(/putar(kan)?/g, '').replace(/lagu/g, '').trim();
    
    const finalSearch = encodeURIComponent(cleanQuery + " audio HQ");
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${finalSearch}&type=video&videoCategoryId=10&key=${YOUTUBE_API_KEY}`;

    https.get(url, (ytRes) => {
        let data = '';
        ytRes.on('data', (chunk) => data += chunk);
        ytRes.on('end', () => {
            try {
                const parsed = JSON.parse(data);
                if (parsed.items && parsed.items.length > 0) {
                    const item = parsed.items[0];
                    res.json({ videoId: item.id.videoId, title: item.snippet.title });
                } else {
                    res.json({ error: 'Lagu tidak ditemukan' });
                }
            } catch (e) { res.status(500).json({ error: 'Gagal memproses data' }); }
        });
    }).on('error', (err) => res.status(500).json({ error: err.message }));
});

app.get('/api/favorites', (req, res) => res.json(readDB().favorites || []));

app.post('/api/favorites', (req, requireRes) => {
    const { id, title } = req.body;
    if (!id || !title) return requireRes.status(400).json({ error: 'Data tidak lengkap' });

    const db = readDB();
    const index = db.favorites.findIndex(item => item.id === id);

    if (index === -1) {
        db.favorites.push({ id, title, addedAt: new Date().toISOString() });
        writeDB(db);
        requireRes.json({ status: 'liked', message: 'Ditambahkan ke favorit' });
    } else {
        db.favorites.splice(index, 1);
        writeDB(db);
        requireRes.json({ status: 'unliked', message: 'Dihapus dari favorit' });
    }
});

app.listen(PORT, () => {
    console.log(`========== PRODUCTION MODE ACTIVE ==========`);
    console.log(`Aissistant stand-by pada Port: ${PORT}`);
    console.log(`============================================`);
});
