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
                progressNote: '',
                completedAt: null
            });
            res.status(200).json({ success: true });
            
        } else if (req.method === 'GET') {
            const tasks = await collection.find({}).sort({ createdAt: -1 }).toArray();
            res.status(200).json(tasks);
            
        } else if (req.method === 'PUT') {
            const { id, newStatus, progressNote } = req.body;
            let updateData = {};

            // Kalau ada update status
            if (newStatus) {
                updateData.status = newStatus;
                if (newStatus === 'done') {
                    updateData.completedAt = new Date(); // Catat waktu selesai
                } else {
                    updateData.completedAt = null; // Reset kalau dibalikin ke proses/belum
                }
            }

            // Kalau ada update catatan progres
            if (progressNote !== undefined) {
                updateData.progressNote = progressNote;
            }

            await collection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );
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
