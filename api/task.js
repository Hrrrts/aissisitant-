const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI; 
const client = new MongoClient(uri);

module.exports = async (req, res) => {
    if (!uri) return res.status(500).json({ error: 'Database belum dikonfigurasi' });

    try {
        await client.connect();
        const db = client.db('aissistant'); 
        const collection = db.collection('tasks');

        if (req.method === 'POST') {
            // Nambah tugas baru
            const { text } = req.body;
            if (!text) return res.status(400).json({error: 'Teks kosong'});

            await collection.insertOne({ 
                text, 
                status: 'todo', // Default kolom pertama
                createdAt: new Date() 
            });
            res.status(200).json({ success: true });
            
        } else if (req.method === 'GET') {
            // Ambil semua tugas
            const tasks = await collection.find({}).sort({ createdAt: -1 }).toArray();
            res.status(200).json(tasks);
            
        } else if (req.method === 'PUT') {
            // Mindahin tugas (Update status)
            const { id, newStatus } = req.body;
            await collection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { status: newStatus } }
            );
            res.status(200).json({ success: true });

        } else if (req.method === 'DELETE') {
            // Hapus tugas
            const { id } = req.body;
            await collection.deleteOne({ _id: new ObjectId(id) });
            res.status(200).json({ success: true });
        }
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    } finally {
        await client.close();
    }
};
