const { MongoClient } = require('mongodb');

// Cache koneksi agar serverless tidak membuat koneksi baru setiap kali tombol diklik
let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb) return cachedDb;
    
    if (!process.env.MONGODB_URI) {
        throw new Error('Database Cloud (MongoDB) belum disambungkan!');
    }

    const client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db('aissistant_db');
    cachedDb = db;
    return db;
}

module.exports = async (req, res) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection('favorites');

        if (req.method === 'GET') {
            const favorites = await collection.find({}).toArray();
            return res.json(favorites);
        } 
        
        if (req.method === 'POST') {
            const { id, title } = req.body;
            if (!id || !title) return res.status(400).json({ error: 'Data tidak lengkap' });

            const existing = await collection.findOne({ id: id });
            if (existing) {
                await collection.deleteOne({ id: id });
                return res.json({ status: 'unliked', message: 'Dihapus dari favorit' });
            } else {
                await collection.insertOne({ id, title, addedAt: new Date().toISOString() });
                return res.json({ status: 'liked', message: 'Disimpan ke favorit' });
            }
        }
        
        res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
