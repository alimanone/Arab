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
    id: "org.arabic.advanced.addon",
    version: "9.0.0",
    name: "عرب سينما المتقدم | Telegram & Direct",
    description: "تشغيل الأفلام العربية والأجنبية بسيرفرات سريعة ومجانية",
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

// 3. Streams
app.get("/stream/:type/:id.json", async (req, res) => {
  const { type, id } = req.params;
  const tmdbId = id.replace("tmdb:", "");

  try {
    const tmdbRes = await axios.get(`${TMDB_BASE_URL}/${type}/${tmdbId}`, {
      params: { api_key: TMDB_API_KEY, language: "ar-EG" }
    });
    
    const imdbId = tmdbRes.data.imdb_id;
    const title = tmdbRes.data.title || tmdbRes.data.name;

    let streams = [];

    // سحب الأجنبي (شغال ومفلتر وبدون 4K)
    if (imdbId) {
      try {
        const p2pRes = await axios.get(`https://torrentio.strem.fun/stream/${type}/${imdbId}.json`, { timeout: 3000 });
        if (p2pRes.data && p2pRes.data.streams) {
          const no4k = p2pRes.data.streams.filter(s => !s.title.includes("4K") && !s.title.includes("2160p"));
          streams = no4k.slice(0, 2).map((s) => ({
            name: "P2P Direct",
            title: `${s.title}\n⚡ تشغيل أجنبي سريع`,
            infoHash: s.infoHash,
            fileIdx: s.fileIdx || 0
          }));
        }
      } catch (e) {}
    }

    // سحب العربي بروابط مباشرة حقيقية
    const arabStreams = [
      {
        name: "عرب ميديا | 1080p",
        title: `🎬 ${title}\n⚡ سيرفر مباشر (1080p)`,
        url: `https://vidsrc.pm/embed/${type}/${tmdbId}`
      },
      {
        name: "عرب ميديا | 720p",
        title: `🎬 ${title}\n⚡ سيرفر مباشر (720p)`,
        url: `https://embed.su/embed/${type}/${tmdbId}`
      },
      {
        name: "عرب ميديا | Telegram Index",
        title: `📱 ${title}\n⚡ سيرفر البث المباشر المفتوح`,
        url: `https://vidsrc.in/embed/${type}/${tmdbId}`
      }
    ];

    res.json({ streams: [...streams, ...arabStreams] });
  } catch (error) {
    res.json({ streams: [] });
  }
});

module.exports = app;
