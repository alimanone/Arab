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

// 1. Manifest
app.get("/manifest.json", (req, res) => {
  res.json({
    id: "org.arabic.addon.ali",
    version: "1.0.0",
    name: "عرب سينما | Ali",
    description: "إضافة الأفلام العربية بأعلى جودة بوسترات وسيرفرات متعددة",
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

// 3. Streams (الروابط الـ 5 المحددة بالجودات)
app.get("/stream/movie/:id.json", async (req, res) => {
  const rawId = req.params.id;
  const tmdbId = rawId.replace("tmdb:", "");

  try {
    const streams = [
      {
        title: "🎬 WeCima | 1080p (سيرفر رئيسي 1)",
        url: `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`
      },
      {
        title: "🎬 FaselHD | 1080p (سيرفر رئيسي 2)",
        url: `https://vidsrc.to/embed/movie/${tmdbId}`
      },
      {
        title: "⚡ WeCima | 720p (سيرفر سريع 1)",
        url: `https://embed.su/embed/movie/${tmdbId}`
      },
      {
        title: "⚡ FaselHD | 720p (سيرفر سريع 2)",
        url: `https://2embed.org/embed/movie?tmdb=${tmdbId}`
      },
      {
        title: "📱 FaselHD | 480p (سيرفر اقتصادي)",
        url: `https://vidsrc.icu/embed/movie/${tmdbId}`
      }
    ];

    res.json({ streams });
  } catch (error) {
    res.json({ streams: [] });
  }
});

module.exports = app;
