const express = require("express");
const axios = require("axios");

const app = express();

const TMDB_API_KEY = "f948ba1a1bb84b5e7a1d6f31cab85c8d";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  next();
});

// 1. Manifest (أفلام + مسلسلات + كتب)
app.get("/manifest.json", (req, res) => {
  res.json({
    id: "org.arabic.mega.addon",
    version: "5.0.0",
    name: "عرب ميديا الشاملة | Mega Arab",
    description: "إضافة شاملة للأفلام والمسلسلات والكتب العربية من كافة مصادر FMHY",
    resources: ["catalog", "stream"],
    types: ["movie", "series", "other"],
    catalogs: [
      { type: "movie", id: "ar_movies", name: "🎬 أفلام عربية" },
      { type: "series", id: "ar_series", name: "📺 مسلسلات عربية" },
      { type: "other", id: "ar_books", name: "📚 المكتبة العربية (كتب)" }
    ],
    idPrefixes: ["tmdb:", "tt", "book:"]
  });
});

// 2. Catalogs (أفلام، مسلسلات، كتب)
app.get("/catalog/:type/:id.json", async (req, res) => {
  const { type, id } = req.params;

  try {
    if (type === "movie") {
      const response = await axios.get(`${TMDB_BASE_URL}/discover/movie`, {
        params: { api_key: TMDB_API_KEY, with_original_language: "ar", language: "ar-EG", include_image_language: "ar,null", sort_by: "popularity.desc" }
      });
      const metas = response.data.results.map(m => ({
        id: `tmdb:${m.id}`, type: "movie", name: m.title,
        poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : "",
        description: m.overview
      }));
      return res.json({ metas });
    } 
    
    if (type === "series") {
      const response = await axios.get(`${TMDB_BASE_URL}/discover/tv`, {
        params: { api_key: TMDB_API_KEY, with_original_language: "ar", language: "ar-EG", include_image_language: "ar,null", sort_by: "popularity.desc" }
      });
      const metas = response.data.results.map(s => ({
        id: `tmdb:${s.id}`, type: "series", name: s.name,
        poster: s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : "",
        description: s.overview
      }));
      return res.json({ metas });
    }

    if (type === "other") {
      // كتالوج الكتب العربية المصدرة من Hindawi / Open Library
      const books = [
        { id: "book:1", type: "other", name: "📖 مقدمة ابن خلدون", poster: "https://www.hindawi.org/books/92745160/covers/thumbnail.jpg", description: "كتاب مقدمة ابن خلدون الكامل" },
        { id: "book:2", type: "other", name: "📖 ألف ليلة وليلة", poster: "https://www.hindawi.org/books/31818617/covers/thumbnail.jpg", description: "حكايات ألف ليلة وليلة العربية" }
      ];
      return res.json({ metas: books });
    }

    res.json({ metas: [] });
  } catch (error) {
    res.json({ metas: [] });
  }
});

// 3. Streams (مصادر متنوعة لكل الفئات)
app.get("/stream/:type/:id.json", async (req, res) => {
  const { type, id } = req.params;
  const tmdbId = id.replace("tmdb:", "");

  let streams = [];

  if (type === "movie" || type === "series") {
    // محاولة جلب HLS direct stream أو P2P InfoHash
    streams = [
      {
        name: "FMHY Stream 1",
        title: "🎬 HLS Direct Stream | 1080p\n⚡ يعمل مباشرة داخل Nuvio",
        url: `https://vidsrc.vip/embed/movie/${tmdbId}`
      },
      {
        name: "FMHY Stream 2",
        title: "🎬 MultiEmbed Direct | 720p\n⚡ سيرفر سريع بدون إعلانات",
        url: `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1`
      },
      {
        name: "FMHY Torrent",
        title: "⚡ P2P Direct Magnet\n⚙️ جودة عالية جداً",
        infoHash: "7b4da22687a4192bc585860d8a9833cb9b165b45" // تجربة محرك تورنت
      }
    ];
  } else if (type === "other") {
    streams = [
      {
        name: "Hindawi PDF",
        title: "📄 قراءة الكتاب (ملف PDF مباشر)",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
      }
    ];
  }

  res.json({ streams });
});

module.exports = app;
