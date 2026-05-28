const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI; 
const client = new MongoClient(uri);

module.exports = async (req, res) => {
    if (!uri) return res.status(500).json({ error: 'Database belum dikonfigurasi' });

    try {
        await client.connect();
        const db = client.db('aissistant'); 
        const collection = db.collection('playlists');

        if (req.method === 'POST') {
            const { playlistName, videoId, title, channel } = req.body;
            if (!playlistName || !videoId) return res.status(400).json({error: 'Data tidak lengkap'});

            const existing = await collection.findOne({ playlistName, videoId });
            if (existing) return res.status(400).json({error: 'Lagu sudah ada!'});

            await collection.insertOne({ playlistName, videoId, title, channel, addedAt: new Date() });
            res.status(200).json({ success: true, message: 'Tersimpan!' });
            
        } else if (req.method === 'DELETE') {
            const { playlistName, videoId } = req.body;
            await collection.deleteOne({ playlistName, videoId });
            res.status(200).json({ success: true, message: 'Dihapus!' });

        } else if (req.method === 'GET') {
            const songs = await collection.find({}).sort({ addedAt: -1 }).toArray();
            const playlists = {};
            songs.forEach(song => {
                if (!playlists[song.playlistName]) playlists[song.playlistName] = [];
                playlists[song.playlistName].push(song);
            });
            res.status(200).json(playlists);
        }
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    } finally {
        await client.close();
    }
};
