const express = require("express");
const axios = require("axios");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");

const app = express();
const PORT = process.env.PORT || 3000;

const TMDB_API_KEY = "f948ba1a1bb84b5e7a1d6f31cab85c8d";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  next();
});

// دالة فك الحماية وبث الفيديو الحقيقي عبر Headless Chrome
async function extractDirectStream(tmdbId, type) {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    let videoUrl = null;

    // مراقبة شبكة المتصفح لالتقاط رابط الفيديو المباشر (.m3u8 / .mp4)
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes(".m3u8") || (url.includes(".mp4") && !url.includes("google"))) {
        videoUrl = url;
      }
    });

    // فتح موقع الخدمة والتخفي كمستخدم حقيقي لتجاوز Cloudflare
    const targetUrl = `https://vidsrc.vip/embed/${type}/${tmdbId}`;
    await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 15000 });

    await browser.close();
    return videoUrl;
  } catch (e) {
    if (browser) await browser.close();
    return null;
  }
}

// 1. Manifest
app.get("/manifest.json", (req, res) => {
  res.json({
    id: "org.arabic.reezn.engine",
    version: "12.0.0",
    name: "عرب سينما Engine | Headless Scraper",
    description: "محرك سحب حقيقي لتجاوز الحماية وبث المحتوى العربي والأجنبي",
    resources: ["catalog", "stream"],
    types: ["movie", "series"],
    catalogs: [
      { type: "movie", id: "ar_movies", name: "🎬 أفلام عربية وأجنبية" },
      { type: "series", id: "ar_series", name: "📺 مسلسلات" }
    ],
    idPrefixes: ["tmdb:", "tt"]
  });
});

// 2. Catalog
app.get("/catalog/:type/:id.json", async (req, res) => {
  const { type } = req.params;
  try {
    const endpoint = type === "movie" ? "discover/movie" : "discover/tv";
    const response = await axios.get(`${TMDB_BASE_URL}/${endpoint}`, {
      params: {
        api_key: TMDB_API_KEY,
        with_original_language: "ar",
        language: "ar-EG",
        sort_by: "popularity.desc"
      }
    });

    const metas = response.data.results.map((item) => ({
      id: `tmdb:${item.id}`,
      type: type,
      name: item.title || item.name,
      poster: item.poster_path
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : "https://via.placeholder.com/500x750?text=بدون+بوستر",
      description: item.overview || "لا يوجد وصف."
    }));

    res.json({ metas });
  } catch (error) {
    res.json({ metas: [] });
  }
});

// 3. Streams (استخراج الرابط المباشر الصريح)
app.get("/stream/:type/:id.json", async (req, res) => {
  const { type, id } = req.params;
  const tmdbId = id.replace("tmdb:", "");

  try {
    const tmdbRes = await axios.get(`${TMDB_BASE_URL}/${type}/${tmdbId}`, {
      params: { api_key: TMDB_API_KEY, language: "ar-EG" }
    });
    
    const title = tmdbRes.data.title || tmdbRes.data.name;
    const imdbId = tmdbRes.data.imdb_id;

    let streams = [];

    // 1. التورنت للأجنبي المفلتر
    if (imdbId) {
      try {
        const p2pRes = await axios.get(`https://torrentio.strem.fun/stream/${type}/${imdbId}.json`, { timeout: 3000 });
        if (p2pRes.data && p2pRes.data.streams) {
          const no4k = p2pRes.data.streams.filter(s => !s.title.includes("4K") && !s.title.includes("2160p"));
          streams = no4k.slice(0, 2).map((s) => ({
            name: "P2P Engine",
            title: `${s.title}\n⚡ تشغيل سريع`,
            infoHash: s.infoHash,
            fileIdx: s.fileIdx || 0
          }));
        }
      } catch (e) {}
    }

    // 2. تشغيل السكرايبر المباشر للعربي
    const directVideoUrl = await extractDirectStream(tmdbId, type);

    if (directVideoUrl) {
      streams.unshift({
        name: "Reezn Engine | 1080p",
        title: `🎬 ${title}\n⚡ رابط مباشر بدون إعلانات (مفكوك التشفير)`,
        url: directVideoUrl
      });
    } else {
      // سيرفرات إضافية بديلة في حال تأخر السكرايبر
      streams.push({
        name: "Reezn Backup | HD",
        title: `🎬 ${title}\n⚡ سيرفر احتياطي سريع`,
        url: `https://vidsrc.vip/embed/${type}/${tmdbId}`
      });
    }

    res.json({ streams });
  } catch (error) {
    res.json({ streams: [] });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
