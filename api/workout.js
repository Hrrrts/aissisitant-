const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI; 
const client = new MongoClient(uri);

module.exports = async (req, res) => {
    if (!uri) return res.status(500).json({ error: 'Database belum dikonfigurasi' });

    try {
        await client.connect();
        const db = client.db('aissistant'); 
        const collection = db.collection('workout');

        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

        if (req.method === 'GET') {
            let record = await collection.findOne({ date: todayStr });
            if (!record) {
                // Template kosong kalau hari ini belum ada data (Default Target: 120g)
                record = { date: todayStr, targetProtein: 120, currentProtein: 0, workoutLog: '' };
            }
            const history = await collection.find({}).sort({ date: -1 }).limit(7).toArray();
            
            res.status(200).json({ today: record, history });
            
        } else if (req.method === 'POST') {
            const { action, value } = req.body;
            let updateQuery = {};

            if (action === 'addProtein') {
                updateQuery = { 
                    $inc: { currentProtein: Number(value) },
                    $setOnInsert: { targetProtein: 120, workoutLog: '' }
                };
            } else if (action === 'setTarget') {
                updateQuery = { 
                    $set: { targetProtein: Number(value) },
                    $setOnInsert: { currentProtein: 0, workoutLog: '' }
                };
            } else if (action === 'setWorkout') {
                updateQuery = { 
                    $set: { workoutLog: value },
                    $setOnInsert: { targetProtein: 120, currentProtein: 0 }
                };
            } else if (action === 'resetProtein') {
                updateQuery = { 
                    $set: { currentProtein: 0 },
                    $setOnInsert: { targetProtein: 120, workoutLog: '' }
                };
            }

            await collection.updateOne(
                { date: todayStr },
                updateQuery,
                { upsert: true }
            );
            res.status(200).json({ success: true });
        }
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    } finally {
        await client.close();
    }
};
