const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/api/pinterest', async (req, res) => {
    let pinUrl = req.query.url;
    if (!pinUrl) {
        return res.status(400).json({ status: false, error: "Please provide a Pinterest URL using ?url=" });
    }

    try {
        // 1. Resolve short pin.it links
        if (pinUrl.includes('pin.it')) {
            const redirectRes = await axios.get(pinUrl, { 
                maxRedirects: 5, 
                validateStatus: (status) => status < 400,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
                }
            });
            pinUrl = redirectRes.request.res.responseUrl || pinUrl;
        }

        // 2. Fetch the actual Pinterest page
        const response = await axios.get(pinUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // 3. Extract video source using multiple reliable patterns
        let videoUrl = null;

        // Pattern A: Meta OpenGraph tags
        videoUrl = $('meta[property="og:video"]').attr('content') ||
                   $('meta[property="og:video:secure_url"]').attr('content');

        // Pattern B: JSON-LD script extraction
        if (!videoUrl) {
            $('script[type="application/ld+json"]').each((i, el) => {
                try {
                    const json = JSON.parse($(el).html());
                    if (json && json.contentUrl) {
                        videoUrl = json.contentUrl;
                    }
                } catch (e) {}
            });
        }

        // Pattern C: Regex deep search fallback for mp4 links inside page script data
        if (!videoUrl) {
            const mp4Match = html.match(/"url":"(https:\/\/[^"]+\.mp4[^"]*)"/) || html.match(/"contentUrl":"(https:\/\/[^"]+\.mp4[^"]*)"/);
            if (mp4Match && mp4Match[1]) {
                videoUrl = mp4Match[1].replace(/\\u002F/g, '/');
            }
        }

        if (videoUrl) {
            return res.json({ status: true, result: videoUrl });
        } else {
            return res.status(404).json({ status: false, message: "Video not found in this pin. Make sure it's a video pin!" });
        }

    } catch (error) {
        return res.status(500).json({ status: false, error: "Failed to process the link." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
