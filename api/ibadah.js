const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI; 
const client = new MongoClient(uri);

module.exports = async (req, res) => {
    if (!uri) return res.status(500).json({ error: 'Database belum dikonfigurasi' });

    try {
        await client.connect();
        const db = client.db('aissistant'); 
        const collection = db.collection('ibadah');

        // Bikin format tanggal YYYY-MM-DD khusus zona waktu Indonesia (WIB)
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

        if (req.method === 'GET') {
            // Ambil catatan hari ini
            let record = await collection.findOne({ date: todayStr });
            if (!record) {
                // Kalau hari ini belum ada, bikin template kosong
                record = { date: todayStr, solat: {}, sunnah: {}, murojaah: '' };
            }
            
            // Ambil histori 7 hari terakhir
            const history = await collection.find({}).sort({ date: -1 }).limit(7).toArray();
            
            res.status(200).json({ today: record, history });
            
        } else if (req.method === 'POST') {
            // Update data (otomatis nge-save tiap tombol ditekan)
            const { type, key, value } = req.body;
            
            let updateData = {};
            if (type === 'murojaah') {
                updateData = { $set: { murojaah: value } };
            } else {
                updateData = { $set: { [`${type}.${key}`]: value } };
            }

            await collection.updateOne(
                { date: todayStr },
                updateData,
                { upsert: true } // Bikin dokumen baru kalau belum ada
            );
            res.status(200).json({ success: true });
        }
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    } finally {
        await client.close();
    }
};
