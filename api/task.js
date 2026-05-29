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
            const { text } = req.body;
            if (!text) return res.status(400).json({error: 'Teks kosong'});

            await collection.insertOne({ 
                text, 
                status: 'todo',
                createdAt: new Date(),
                progressLog: [], // Sekarang bentuknya Array (Daftar) buat nyimpen banyak bubble
                completedAt: null
            });
            res.status(200).json({ success: true });
            
        } else if (req.method === 'GET') {
            const tasks = await collection.find({}).sort({ createdAt: -1 }).toArray();
            res.status(200).json(tasks);
            
        } else if (req.method === 'PUT') {
            const { id, newStatus, newNote } = req.body;
            let updateQuery = {};
            let setOps = {};

            // 1. Kalau ada pindah status
            if (newStatus) {
                setOps.status = newStatus;
                if (newStatus === 'done') {
                    setOps.completedAt = new Date();
                } else {
                    setOps.completedAt = null;
                }
            }
            if (Object.keys(setOps).length > 0) updateQuery.$set = setOps;

            // 2. Kalau ada tambahan catatan progres (Push ke dalam array)
            if (newNote) {
                updateQuery.$push = { 
                    progressLog: { text: newNote, date: new Date() } 
                };
            }

            if (Object.keys(updateQuery).length > 0) {
                await collection.updateOne({ _id: new ObjectId(id) }, updateQuery);
            }
            res.status(200).json({ success: true });

        } else if (req.method === 'DELETE') {
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
