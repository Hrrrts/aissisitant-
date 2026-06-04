const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI; 
const client = new MongoClient(uri);

module.exports = async (req, res) => {
    if (!uri) return res.status(500).json({ error: 'Database belum dikonfigurasi' });

    try {
        await client.connect();
        const db = client.db('aissistant'); 
        const collection = db.collection('pekerjaan');

        if (req.method === 'GET') {
            const items = await collection.find({}).sort({ createdAt: 1 }).toArray();
            res.status(200).json(items);

        } else if (req.method === 'POST') {
            const { category, text } = req.body;
            if (!category || !text) return res.status(400).json({error: 'Data tidak lengkap'});
            
            const newItem = { category, text, isDone: false, createdAt: new Date() };
            const result = await collection.insertOne(newItem);
            res.status(200).json({ success: true, id: result.insertedId, ...newItem });
            
        } else if (req.method === 'PUT') {
            const { id, isDone } = req.body;
            await collection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { isDone: isDone } }
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
