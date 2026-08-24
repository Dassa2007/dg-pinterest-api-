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

        const response = await axios.get(pinUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });

        const html = response.data;
        const $ = cheerio.load(html);
        
        let qualities = {};

        // Search for all mp4 links inside the page to capture different resolutions if available
        const mp4Matches = html.match(/"url":"(https:\/\/[^"]+\.mp4[^"]*)"/g);
        if (mp4Matches && mp4Matches.length > 0) {
            let uniqueLinks = [...new Set(mp4Matches.map(m => m.match(/"url":"([^"]+)"/)[1].replace(/\\u002F/g, '/')))];
            
            // Assign available links to respective qualities
            let labels = ["1080p (FHD)", "720p (HD)", "480p (SD)", "360p (Low)"];
            uniqueLinks.forEach((link, index) => {
                let label = labels[index] || `Quality ${index + 1}`;
                qualities[label] = link;
            });
        }

        // Fallback to og:video if regex didn't catch multiple
        if (Object.keys(qualities).length === 0) {
            let defaultVideo = $('meta[property="og:video"]').attr('content') ||
                               $('meta[property="og:video:secure_url"]').attr('content');
            if (defaultVideo) {
                qualities["720p (HD)"] = defaultVideo;
            }
        }

        if (Object.keys(qualities).length > 0) {
            return res.json({ 
                status: true, 
                qualities: qualities
            });
        } else {
            return res.status(404).json({ status: false, message: "Video qualities not found in this pin!" });
        }

    } catch (error) {
        return res.status(500).json({ status: false, error: "Failed to process the link." });
    }
});

// Direct Download Proxy
app.get('/api/download-proxy', async (req, res) => {
    const fileUrl = req.query.url;
    if (!fileUrl) return res.status(400).send("Missing URL");

    try {
        const response = await axios({
            method: 'get',
            url: fileUrl,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });

        res.setHeader('Content-Disposition', 'attachment; filename="DG-Pinterest-Video.mp4"');
        res.setHeader('Content-Type', 'video/mp4');
        response.data.pipe(res);
    } catch (error) {
        res.status(500).send("Download failed.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
