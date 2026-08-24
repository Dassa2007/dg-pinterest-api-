const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/api/pinterest', async (req, res) => {
    const pinUrl = req.query.url;
    if (!pinUrl) {
        return res.status(400).json({ error: "Please provide a Pinterest URL using ?url=" });
    }

    try {
        // Using robust Cobalt API backend integration
        const response = await axios.post("https://api.cobalt.tools/api/json", {
            url: pinUrl
        }, {
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            }
        });

        const data = response.data;
        let videoUrl = data.url;

        if (!videoUrl && data.picker && data.picker.length > 0) {
            videoUrl = data.picker[0].url;
        }

        if (videoUrl) {
            return res.json({ status: true, result: videoUrl });
        } else {
            return res.status(404).json({ status: false, message: "Video not found in this link!" });
        }
    } catch (error) {
        return res.status(500).json({ status: false, error: "Failed to fetch video data." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
