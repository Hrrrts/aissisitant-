const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI; 
const client = new MongoClient(uri);

module.exports = async (req, res) => {
    if (!uri) return res.status(500).json({ error: 'Database belum dikonfigurasi' });

    try {
        await client.connect();
        const db = client.db('aissistant'); 
        const collection = db.collection('wallet');

        if (req.method === 'POST') {
            // Nambah transaksi
            const { type, amount, desc } = req.body;
            if (!type || !amount || !desc) return res.status(400).json({error: 'Data tidak lengkap'});

            await collection.insertOne({ 
                type, 
                amount: Number(amount), 
                desc, 
                date: new Date() 
            });
            res.status(200).json({ success: true, message: 'Transaksi tersimpan!' });
            
        } else if (req.method === 'GET') {
            // Ambil semua transaksi dan hitung total saldo
            const txs = await collection.find({}).sort({ date: -1 }).toArray();
            let balance = 0;
            
            txs.forEach(t => {
                if (t.type === 'income') balance += t.amount;
                else balance -= t.amount;
            });
            
            res.status(200).json({ balance, txs });
            
        } else if (req.method === 'DELETE') {
            // Hapus transaksi (opsional buat fitur ke depan)
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
