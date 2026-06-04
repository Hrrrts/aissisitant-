const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI; 
const client = new MongoClient(uri);

module.exports = async (req, res) => {
    if (!uri) return res.status(500).json({ error: 'Database belum dikonfigurasi' });

    try {
        await client.connect();
        const db = client.db('aissistant'); 
        const collection = db.collection('attendance');

        if (req.method === 'GET') {
            // Ambil semua data urut dari yang paling baru
            const items = await collection.find({}).sort({ clockIn: -1 }).toArray();
            res.status(200).json(items);

        } else if (req.method === 'POST') {
            // CLOCK IN
            const { location, dateStr } = req.body;
            const newItem = { 
                dateStr, 
                location: location || "Kantor", 
                clockIn: new Date(), 
                clockOut: null,
                totalMinutes: 0
            };
            const result = await collection.insertOne(newItem);
            res.status(200).json({ success: true, id: result.insertedId, ...newItem });

        } else if (req.method === 'PUT') {
            // CLOCK OUT
            const { id } = req.body;
            const record = await collection.findOne({ _id: new ObjectId(id) });
            
            if (!record) return res.status(404).json({ error: 'Data tidak ditemukan' });

            const clockOutTime = new Date();
            // Hitung selisih waktu dalam menit
            const diffMs = clockOutTime - new Date(record.clockIn);
            const totalMinutes = Math.floor(diffMs / 60000);

            await collection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { clockOut: clockOutTime, totalMinutes } }
            );
            res.status(200).json({ success: true, totalMinutes });

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
