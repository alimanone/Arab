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
    id: "org.arabic.addon.ali.torrent",
    version: "4.0.0",
    name: "عرب تورنت | Nuvio & Stremio",
    description: "تشغيل الأفلام العربية عبر شبكة التورنت المباشرة (FMHY)",
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

// 2. Catalog
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

// 3. Streams (سحب التورنت المباشر بروابط FMHY/P2P)
app.get("/stream/movie/:id.json", async (req, res) => {
  const rawId = req.params.id;
  const tmdbId = rawId.replace("tmdb:", "");

  try {
    // جلب IMDb ID لضمان البحث في شبكات التورنت
    const tmdbRes = await axios.get(`${TMDB_BASE_URL}/movie/${tmdbId}`, {
      params: { api_key: TMDB_API_KEY }
    });
    const imdbId = tmdbRes.data.imdb_id;

    let streams = [];

    // جلب التورنت المباشر عبر محرك P2P المفتوح
    if (imdbId) {
      try {
        const torrentRes = await axios.get(`https://torrentio.strem.fun/stream/movie/${imdbId}.json`, { timeout: 3000 });
        if (torrentRes.data && torrentRes.data.streams) {
          streams = torrentRes.data.streams.map((s, index) => ({
            name: "عرب تورنت P2P",
            title: `🎬 ${s.title || 'فيلم عربي'}\n⚙️ جودة عالية - تشغيل مباشر`,
            infoHash: s.infoHash,
            fileIdx: s.fileIdx || 0
          }));
        }
      } catch (e) {
        console.log("Torrent fetch failed, switching to backup servers");
      }
    }

    // إذا لم يجد تورنت مباشر، يضع سيرفرات الفيديو السريعة كبديل
    if (streams.length === 0) {
      streams = [
        {
          name: "ArabStream VIP",
          title: "🎬 ArabStream | 1080p FHD\n⚡ تشغيل مباشر",
          url: `https://vidsrc.stream/embed/movie/${tmdbId}`
        },
        {
          name: "ArabStream HD",
          title: "🎬 CimaDrive | 720p HD\n⚡ سيرفر سريع",
          url: `https://autoembed.co/movie/tmdb/${tmdbId}`
        }
      ];
    }

    res.json({ streams: streams.slice(0, 5) });
  } catch (error) {
    res.json({ streams: [] });
  }
});

module.exports = app;
