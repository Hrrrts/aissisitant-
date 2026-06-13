const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI; 
const client = new MongoClient(uri);

module.exports = async (req, res) => {
    if (!uri) return res.status(500).json({ error: 'Database belum dikonfigurasi' });
    const { type } = req.query; // Kunci pemisahnya

    try {
        await client.connect();
        const db = client.db('aissistant'); 

        // ================= ROUTE: VAULT =================
        if (type === 'vault') {
            const collection = db.collection('vault');
            if (req.method === 'GET') {
                const items = await collection.find({}).sort({ createdAt: -1 }).toArray();
                return res.status(200).json(items);
            } else if (req.method === 'POST') {
                const { title, username, password } = req.body;
                if (!title || !password) return res.status(400).json({error: 'Data tidak lengkap'});
                const newItem = { title, username, password, createdAt: new Date() };
                const result = await collection.insertOne(newItem);
                return res.status(200).json({ success: true, id: result.insertedId, ...newItem });
            } else if (req.method === 'DELETE') {
                const { id } = req.body;
                await collection.deleteOne({ _id: new ObjectId(id) });
                return res.status(200).json({ success: true });
            }
        } 
        // ================= ROUTE: WISHLIST =================
        else if (type === 'wishlist') {
            const collection = db.collection('wishlist');
            if (req.method === 'GET') {
                const items = await collection.find({}).sort({ createdAt: -1 }).toArray();
                return res.status(200).json(items);
            } else if (req.method === 'POST') {
                if (req.body.action === 'scrape') {
                    const { url } = req.body;
                    try {
                        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                        const html = await response.text();
                        const titleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) || html.match(/<title>([^<]+)<\/title>/i);
                        const imageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
                        return res.status(200).json({ success: true, title: titleMatch ? titleMatch[1].trim() : "", image: imageMatch ? imageMatch[1].trim() : "" });
                    } catch (e) {
                        return res.status(200).json({ success: false, title: "", image: "" });
                    }
                }
                const { title, link, image, reason, price, isDiscount, discountPrice } = req.body;
                if (!title || !price) return res.status(400).json({ error: 'Data tidak lengkap' });
                const newItem = { title, link: link || "#", image: image || "", reason: reason || "", price: parseFloat(price), isDiscount: isDiscount || false, discountPrice: discountPrice ? parseFloat(discountPrice) : 0, createdAt: new Date() };
                const result = await collection.insertOne(newItem);
                return res.status(200).json({ success: true, id: result.insertedId, ...newItem });
            } else if (req.method === 'DELETE') {
                const { id } = req.body;
                await collection.deleteOne({ _id: new ObjectId(id) });
                return res.status(200).json({ success: true });
            }
        } 
        else {
            return res.status(400).json({error: 'Tipe rute tidak valid'});
        }
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    } finally {
        await client.close();
    }
};
