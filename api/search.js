const https = require('https');

module.exports = async (req, res) => {
    const query = req.query.q;
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

    if (!YOUTUBE_API_KEY) return res.status(500).json({ error: 'Config Error' });
    if (!query) return res.status(400).json({ error: 'Query kosong' });

    // Bersihkan query
    const cleanQuery = query.trim();
    const finalSearch = encodeURIComponent(cleanQuery + " audio");
    
    // maxResults diubah jadi 5
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${finalSearch}&type=video&videoCategoryId=10&key=${YOUTUBE_API_KEY}`;

    https.get(url, (ytRes) => {
        let data = '';
        ytRes.on('data', (chunk) => data += chunk);
        ytRes.on('end', () => {
            try {
                const parsed = JSON.parse(data);
                if (parsed.items && parsed.items.length > 0) {
                    // Petakan 5 hasil tersebut ke dalam array
                    const results = parsed.items.map(item => ({
                        videoId: item.id.videoId,
                        title: item.snippet.title,
                        channel: item.snippet.channelTitle
                    }));
                    res.json(results);
                } else { 
                    res.json({ error: 'Tidak ditemukan' }); 
                }
            } catch (e) { res.status(500).json({ error: 'Data error' }); }
        });
    }).on('error', (err) => res.status(500).json({ error: err.message }));
};
