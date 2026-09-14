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
    description: "إضافة الأفلام العربية بجودات متعددة",
    resources: ["catalog", "stream"],
    types: ["movie"],
    catalogs: [
      {
        type: "movie",
        id: "arabic_movies",
        name: "أفلام عربية"
      }
    ],
    idPrefixes: ["tmdb:"]
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
      poster: movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : "https://via.placeholder.com/300x450?text=No+Poster",
      description: movie.overview
    }));

    res.json({ metas });
  } catch (error) {
    res.json({ metas: [] });
  }
});

// 3. Streams (ربط مباشر بالسيرفرات المتاحة)
app.get("/stream/movie/:id.json", async (req, res) => {
  const tmdbId = req.params.id.replace("tmdb:", "");

  const streams = [
    {
      title: "🔥 Fast Server 1 | 1080p Full HD",
      url: `https://vidsrc.to/embed/movie/${tmdbId}`
    },
    {
      title: "🎬 ArabServer | 1080p HD",
      url: `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`
    },
    {
      title: "⚡ StreamHQ | 720p HD",
      url: `https://embed.su/embed/movie/${tmdbId}`
    },
    {
      title: "📱 Mobile Server | 720p",
      url: `https://2embed.org/embed/movie?tmdb=${tmdbId}`
    },
    {
      title: "📉 Data Saver | 480p",
      url: `https://vidsrc.icu/embed/movie/${tmdbId}`
    }
  ];

  res.json({ streams });
});

module.exports = app;
