const https = require('https');

module.exports = async (req, res) => {
    const query = req.query.q;
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

    if (!YOUTUBE_API_KEY) return res.status(500).json({ error: 'API Key belum diset di Cloud' });
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
};
