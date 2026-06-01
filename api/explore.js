const https = require('https');

module.exports = async (req, res) => {
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    if (!YOUTUBE_API_KEY) return res.status(500).json({ error: 'Config Error' });

    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&videoCategoryId=10&regionCode=ID&maxResults=10&key=${YOUTUBE_API_KEY}`;

    https.get(url, (ytRes) => {
        let data = '';
        ytRes.on('data', (chunk) => data += chunk);
        ytRes.on('end', () => {
            try {
                const parsed = JSON.parse(data);
                if (parsed.items && parsed.items.length > 0) {
                    const results = parsed.items.map(item => ({
                        videoId: item.id,
                        title: item.snippet.title,
                        channel: item.snippet.channelTitle
                    }));
                    res.json(results);
                } else { 
                    res.status(404).json({ error: 'Tidak ditemukan' }); 
                }
            } catch (e) { res.status(500).json({ error: 'Data error' }); }
        });
    }).on('error', (err) => res.status(500).json({ error: err.message }));
};
