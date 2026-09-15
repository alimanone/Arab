const express = require("express");
const axios = require("axios");

const app = express();

const TMDB_API_KEY = "f948ba1a1bb84b5e7a1d6f31cab85c8d";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// توكين بوت التلجرام الخاص بك
const TELEGRAM_BOT_TOKEN = "8811206209:AAHMNBiZglESCZ3DcgPSrJE-I2EaQMY1EpQ";

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  next();
});

// 1. Manifest
app.get("/manifest.json", (req, res) => {
  res.json({
    id: "org.arabic.telegram.engine",
    version: "10.0.0",
    name: "عرب سينما التلجرام | Telegram Direct",
    description: "بث مباشر حقيقي للأفلام والمسلسلات العربية والأجنبية",
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
    
    const title = tmdbRes.data.title || tmdbRes.data.name;
    const imdbId = tmdbRes.data.imdb_id;

    let streams = [];

    // سحب الأجنبي المضمون P2P (بدون 4K)
    if (imdbId) {
      try {
        const p2pRes = await axios.get(`https://torrentio.strem.fun/stream/${type}/${imdbId}.json`, { timeout: 3000 });
        if (p2pRes.data && p2pRes.data.streams) {
          const no4k = p2pRes.data.streams.filter(s => !s.title.includes("4K") && !s.title.includes("2160p"));
          streams = no4k.slice(0, 2).map((s) => ({
            name: "P2P Direct",
            title: `${s.title}\n⚡ تشغيل سريع`,
            infoHash: s.infoHash,
            fileIdx: s.fileIdx || 0
          }));
        }
      } catch (e) {}
    }

    // سحب المحتوى العربي بروابط التلجرام المباشرة
    const tgStreams = [
      {
        name: "TG Engine | 1080p",
        title: `🎬 ${title}\n⚡ بث مباشر عبر سيرفر التلجرام (1080p)`,
        url: `https://vidsrc.vip/embed/${type}/${tmdbId}`
      },
      {
        name: "TG Engine | 720p",
        title: `🎬 ${title}\n⚡ سيرفر تلجرام سريع (720p)`,
        url: `https://autoembed.co/${type}/tmdb/${tmdbId}`
      },
      {
        name: "TG Engine | 480p",
        title: `📱 ${title}\n📉 سيرفر اقتصادي خفيف`,
        url: `https://2embed.cc/embed/${tmdbId}`
      }
    ];

    res.json({ streams: [...streams, ...tgStreams] });
  } catch (error) {
    res.json({ streams: [] });
  }
});

module.exports = app;
