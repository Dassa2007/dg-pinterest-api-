const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/api/pinterest', async (req, res) => {
    const pinUrl = req.query.url;
    if (!pinUrl) {
        return res.status(400).json({ error: "Please provide a Pinterest URL using ?url=" });
    }

    try {
        let targetUrl = pinUrl;
        if (pinUrl.includes('pin.it')) {
            const redirectRes = await axios.get(pinUrl, { maxRedirects: 5, validateStatus: (status) => status < 400 });
            targetUrl = redirectRes.request.res.responseUrl || pinUrl;
        }

        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const $ = cheerio.load(response.data);
        let videoUrl = $('meta[property="og:video"]').attr('content') ||
                       $('meta[property="og:video:secure_url"]').attr('content');

        if (videoUrl) {
            return res.json({ status: true, result: videoUrl });
        } else {
            return res.status(404).json({ status: false, message: "Video not found!" });
        }
    } catch (error) {
        return res.status(500).json({ status: false, error: "Failed to fetch video." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
