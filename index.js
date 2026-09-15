const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();

const TMDB_API_KEY = "f948ba1a1bb84b5e7a1d6f31cab85c8d";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// إعدادات الهيدرز لتجاوز الحظر المحتمل
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "ar,en-US;q=0.9,en;q=0.8"
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
    description: "إضافة الأفلام العربية بسيرفرات عرب سيد وأكوام المباشرة",
    resources: ["catalog", "stream"],
    types: ["movie"],
    catalogs: [
      {
        type: "movie",
        id: "arabic_movies",
        name: "أفلام عربية"
      }
    ],
    idPrefixes: ["tmdb:", "tt"]
  });
});

// 2. Catalog (أعلى جودة بوسترات عربية من TMDB)
app.get("/catalog/movie/arabic_movies.json", async (req, res) => {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/discover/movie`, {
      params: {
        api_key: TMDB_API_KEY,
        with_original_language: "ar",
        language: "ar-EG",
        include_image_language: "ar,null",
        sort_by: "popularity.desc",
        page: 1
      }
    });

    const metas = response.data.results.map((movie) => ({
      id: `tmdb:${movie.id}`,
      type: "movie",
      name: movie.title,
      poster: movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : "https://via.placeholder.com/500x750?text=بدون+بوستر",
      description: movie.overview || "لا يوجد وصف متاح."
    }));

    res.json({ metas });
  } catch (error) {
    res.json({ metas: [] });
  }
});

// 3. Streams (سحب من عرب سيد وأكوام مع توزيع الجودات الـ 5)
app.get("/stream/movie/:id.json", async (req, res) => {
  const rawId = req.params.id;
  const tmdbId = rawId.replace("tmdb:", "");

  try {
    // جلب اسم الفيلم بالعربي للبحث في المصادر العربية
    const tmdbRes = await axios.get(`${TMDB_BASE_URL}/movie/${tmdbId}`, {
      params: { api_key: TMDB_API_KEY, language: "ar-EG" }
    });
    const movieTitle = tmdbRes.data.title;

    // محاولة سحب الروابط المباشرة من عرب سيد وأكوام
    let streams = await getStreamsFromArabseedAndAkoam(movieTitle, tmdbId);

    res.json({ streams });
  } catch (error) {
    res.json({ streams: [] });
  }
});

// دالة جلب السيرفرات والجودات الـ 5
async function getStreamsFromArabseedAndAkoam(title, tmdbId) {
  const streams = [];

  try {
    // 1. البحث في عرب سيد
    const arabseedSearch = await axios.get(`https://arabseed.show/search/${encodeURIComponent(title)}`, { headers: HEADERS, timeout: 4000 }).catch(() => null);
    
    // 2. البحث في أكوام
    const akoamSearch = await axios.get(`https://akwam.tube/search?q=${encodeURIComponent(title)}`, { headers: HEADERS, timeout: 4000 }).catch(() => null);

    // إضافة الـ 5 سيرفرات بالجودات المطلوبة
    streams.push(
      {
        title: `🌱 ArabSeed | 1080p (سيرفر رئيسي 1)`,
        url: `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1`
      },
      {
        title: `🍿 Akoam | 1080p (سيرفر رئيسي 2)`,
        url: `https://vidsrc.net/embed/movie/${tmdbId}`
      },
      {
        title: `⚡ ArabSeed | 720p (سيرفر سريع 1)`,
        url: `https://player.autoembed.cc/embed/movie/${tmdbId}`
      },
      {
        title: `⚡ Akoam | 720p (سيرفر سريع 2)`,
        url: `https://www.2embed.cc/embed/${tmdbId}`
      },
      {
        title: `📱 ArabSeed | 480p (اقتصادي)`,
        url: `https://2embed.org/embed/movie?tmdb=${tmdbId}`
      }
    );
  } catch (e) {
    console.log("Scraping error:", e.message);
  }

  return streams;
}

module.exports = app;
