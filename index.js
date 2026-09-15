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

// 1. Manifest (معرف خصيصاً للتوافق مع Nuvio)
app.get("/manifest.json", (req, res) => {
  res.json({
    id: "org.arabic.addon.ali.nuvio",
    version: "3.0.0",
    name: "عرب سينما Nuvio | Ali",
    description: "إضافة الأفلام العربية المحسنة لمشغلات Nuvio و Stremio",
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

// 2. Catalog (كتالوج ومحتوى عالي الدقة)
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

// 3. Streams (استجابة بتنسيق Direct Stream متوافق مع Nuvio)
app.get("/stream/movie/:id.json", async (req, res) => {
  const rawId = req.params.id;
  const tmdbId = rawId.replace("tmdb:", "");

  try {
    const tmdbRes = await axios.get(`${TMDB_BASE_URL}/movie/${tmdbId}`, {
      params: { api_key: TMDB_API_KEY, language: "ar-EG" }
    });

    // سحب الروابط بتنسيقات يفهمها Nuvio Player مباشرة
    const streams = [
      {
        name: "Nuvio VIP",
        title: "🎬 ArabStream | 1080p FHD\n⚡ تشغيل فوري مجاني",
        url: `https://vidsrc.stream/embed/movie/${tmdbId}`
      },
      {
        name: "Nuvio Fast",
        title: "🎬 CimaDrive | 1080p HD\n⚡ سيرفر سريع",
        url: `https://autoembed.co/movie/tmdb/${tmdbId}`
      },
      {
        name: "Nuvio Mobile",
        title: "⚡ AkoamDirect | 720p\n📱 مناسب للموبايل",
        url: `https://moviesapi.club/movie/${tmdbId}`
      },
      {
        name: "Nuvio Light",
        title: "⚡ FaselStream | 720p\n📱 سيرفر بديل",
        url: `https://player.smashystream.com/movie/${tmdbId}`
      },
      {
        name: "Nuvio Low",
        title: "📱 DataSaver | 480p\n📉 اقتصادي",
        url: `https://2embed.cc/embed/${tmdbId}`
      }
    ];

    res.json({ streams });
  } catch (error) {
    res.json({ streams: [] });
  }
});

module.exports = app;
