export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Gửi dự đoán lên Walrus Gateway
        const response = await fetch('https://publisher.walrus-mainnet.walrus.space/v1/blobs?epochs=5', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        res.status(200).json({ success: true, blobId: data.newBlob ? data.newBlob.blobId : "saved" });
    } catch (error) {
        res.status(500).json({ error: "Lỗi kết nối Walrus Mainnet" });
    }
}
