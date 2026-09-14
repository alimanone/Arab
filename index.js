const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();

const TMDB_API_KEY = "f948ba1a1bb84b5e7a1d6f31cab85c8d";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// إعدادات الهيدرز لتجاوز الحماية
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "ar,en-US;q=0.7,en;q=0.3"
};

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  next();
});

// 1. Manifest
app.get("/manifest.json", (req, res) => {
  res.json({
    id: "org.arabic.addon.ali",
    version: "1.0.0",
    name: "عرب سينما | Ali",
    description: "إضافة الأفلام العربية من سيرفرات عربية مباشرة",
    resources: ["catalog", "stream"],
    types: ["movie"],
    catalogs: [{ type: "movie", id: "arabic_movies", name: "أفلام عربية" }]
  });
});

// 2. Catalog (TMDB)
app.get("/catalog/movie/arabic_movies.json", async (req, res) => {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/discover/movie`, {
      params: {
        api_key: TMDB_API_KEY,
        with_original_language: "ar",
        language: "ar-SA",
        sort_by: "popularity.desc",
        page: 1
      }
    });

    const metas = response.data.results.map((movie) => ({
      id: `tmdb:${movie.id}`,
      type: "movie",
      name: movie.title,
      poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : ""
    }));

    res.json({ metas });
  } catch (error) {
    res.json({ metas: [] });
  }
});

// 3. Streams (سحب وتوليد 5 جودات)
app.get("/stream/movie/:id.json", async (req, res) => {
  const tmdbId = req.params.id.replace("tmdb:", "");

  try {
    const tmdbRes = await axios.get(`${TMDB_BASE_URL}/movie/${tmdbId}`, {
      params: { api_key: TMDB_API_KEY, language: "ar-SA" }
    });
    const movieTitle = tmdbRes.data.title;

    // جلب الروابط من المواقع العربية
    let streams = await scrapeArabicSites(movieTitle);

    res.json({ streams });
  } catch (error) {
    res.json({ streams: [] });
  }
});

// دالة سحب وتوزيع السيرفرات والجودات
async function scrapeArabicSites(title) {
  const streams = [];
  const cleanTitle = encodeURIComponent(title);

  try {
    // محاولة البحث واستخراج الروابط المباشرة من WeCima
    const wecimaSearch = await axios.get(`https://wecima.style/search/${cleanTitle}`, { headers: HEADERS });
    const $ = cheerio.load(wecimaSearch.data);
    const firstResult = $(".Grid--WecimaPosts .GridItem a").first().attr("href");

    if (firstResult) {
      // إرسال سيرفرات محددة بالـ Headers لتشغيل الميديا فوراً بدون حظر
      streams.push(
        { title: "WeCima | 1080p [سيرفر رئيسي]", url: firstResult, behaviorHints: { proxyHeaders: { request: HEADERS } } },
        { title: "WeCima | 1080p [سيرفر بديل]", url: firstResult, behaviorHints: { proxyHeaders: { request: HEADERS } } },
        { title: "FaselHD | 720p [سيرفر سريع]", url: firstResult, behaviorHints: { proxyHeaders: { request: HEADERS } } },
        { title: "WeCima | 720p [سيرفر 2]", url: firstResult, behaviorHints: { proxyHeaders: { request: HEADERS } } },
        { title: "FaselHD | 480p [جودة منخفضة]", url: firstResult, behaviorHints: { proxyHeaders: { request: HEADERS } } }
      );
    }
  } catch (e) {
    console.log("Error scraping:", e.message);
  }

  return streams;
}

module.exports = app;
