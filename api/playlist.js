const { MongoClient } = require('mongodb');

// Vercel akan mengambil ini dari Environment Variables lu
const uri = process.env.MONGODB_URI; 
const client = new MongoClient(uri);

module.exports = async (req, res) => {
    // Kalau lupa masukin MONGODB_URI di Vercel
    if (!uri) return res.status(500).json({ error: 'Database belum dikonfigurasi' });

    try {
        await client.connect();
        const db = client.db('aissistant'); 
        const collection = db.collection('playlists');

        if (req.method === 'POST') {
            // LOGIKA MENYIMPAN LAGU BARU
            const { playlistName, videoId, title, channel } = req.body;
            if (!playlistName || !videoId) return res.status(400).json({error: 'Data tidak lengkap'});

            // Cek biar lagu nggak dobel di playlist yang sama
            const existing = await collection.findOne({ playlistName, videoId });
            if (existing) {
                return res.status(400).json({error: 'Lagu ini udah ada di playlist tersebut!'});
            }

            await collection.insertOne({ playlistName, videoId, title, channel, addedAt: new Date() });
            res.status(200).json({ success: true, message: 'Berhasil disimpan ke MongoDB!' });
            
        } else if (req.method === 'GET') {
            // LOGIKA MENGAMBIL SEMUA PLAYLIST
            const songs = await collection.find({}).sort({ addedAt: -1 }).toArray();
            
            // Kelompokkan lagu berdasarkan nama folder (playlistName)
            const playlists = {};
            songs.forEach(song => {
                if (!playlists[song.playlistName]) playlists[song.playlistName] = [];
                playlists[song.playlistName].push(song);
            });
            
            res.status(200).json(playlists);
        }
    } catch (error) {
        res.status(500).json({ error: 'Koneksi database gagal' });
    } finally {
        await client.close();
    }
};
