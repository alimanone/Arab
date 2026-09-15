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
    id: "org.arabic.direct.addon",
    version: "8.0.0",
    name: "عرب ميديا المباشر | Direct Fast",
    description: "أفلام ومسلسلات عربية وأجنبية بجودات سريعة وبدون تعقيد",
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

// 3. Streams (مباشر وبدون بروكسي)
app.get("/stream/:type/:id.json", async (req, res) => {
  const { type, id } = req.params;
  const tmdbId = id.replace("tmdb:", "");

  try {
    const externalRes = await axios.get(`${TMDB_BASE_URL}/${type}/${tmdbId}/external_ids`, {
      params: { api_key: TMDB_API_KEY }
    });
    const imdbId = externalRes.data.imdb_id;

    let streams = [];

    // 1. جلب التورنت الأجنبي المفلتر (إلغاء الـ 4K)
    if (imdbId) {
      try {
        const p2pRes = await axios.get(`https://torrentio.strem.fun/stream/${type}/${imdbId}.json`, { timeout: 3000 });
        if (p2pRes.data && p2pRes.data.streams) {
          // فلترة التورنت لاستبعاد جودات 4K و 2160p
          const no4k = p2pRes.data.streams.filter(s => !s.title.includes("4K") && !s.title.includes("2160p"));
          
          streams = no4k.slice(0, 3).map((s, idx) => ({
            name: `Direct Stream [${idx === 0 ? '1080p' : '720p'}]`,
            title: `${s.title}\n⚡ تشغيل سريع بدون تقطيع`,
            infoHash: s.infoHash,
            fileIdx: s.fileIdx || 0
          }));
        }
      } catch (e) {
        console.log("P2P skip");
      }
    }

    // 2. سيرفرات البث العربي السريعة المباشرة
    const directArab = [
      {
        name: "عرب سينما VIP",
        title: "🎬 سيرفر ممتاز 1080p\n⚡ تشغيل فوري",
        url: `https://vidsrc.vip/embed/${type}/${tmdbId}`
      },
      {
        name: "عرب سينما HD",
        title: "🎬 سيرفر رئيسي 1080p\n⚡ سريع جداً",
        url: `https://autoembed.co/${type}/tmdb/${tmdbId}`
      },
      {
        name: "عرب سينما FAST",
        title: "⚡ سيرفر 720p HD\n📱 خفيف للموبايل",
        url: `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1`
      },
      {
        name: "عرب سينما SD",
        title: "📉 سيرفر اقتصادي 480p\n📉 توفير البيانات",
        url: `https://2embed.cc/embed/${tmdbId}`
      }
    ];

    const allStreams = [...streams, ...directArab].slice(0, 5);

    res.json({ streams: allStreams });
  } catch (error) {
    res.json({ streams: [] });
  }
});

module.exports = app;
