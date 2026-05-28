const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI; 
const client = new MongoClient(uri);

module.exports = async (req, res) => {
    if (!uri) return res.status(500).json({ error: 'Database belum dikonfigurasi' });

    try {
        await client.connect();
        const db = client.db('aissistant'); 
        const collection = db.collection('journal');

        if (req.method === 'POST') {
            const { title, content, mood } = req.body;
            if (!content) return res.status(400).json({error: 'Jurnal tidak boleh kosong'});

            await collection.insertOne({ 
                title: title || 'Tanpa Judul', 
                content, 
                mood, 
                date: new Date() 
            });
            res.status(200).json({ success: true });
            
        } else if (req.method === 'GET') {
            const entries = await collection.find({}).sort({ date: -1 }).toArray();
            res.status(200).json(entries);
            
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
