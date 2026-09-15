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
    id: "org.arabic.real.torrent",
    version: "6.0.0",
    name: "عرب سينما الحقيقي | P2P Direct",
    description: "تشغيل مباشر لجميع الأفلام والمسلسلات عبر شبكة التورنت المفتوحة",
    resources: ["catalog", "stream"],
    types: ["movie", "series"],
    catalogs: [
      { type: "movie", id: "ar_movies", name: "🎬 أفلام عربية وأجنبية" },
      { type: "series", id: "ar_series", name: "📺 مسلسلات" }
    ],
    idPrefixes: ["tmdb:", "tt"]
  });
});

// 2. Kinds / Catalogs
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

// 3. Streams (توليد روابط InfoHash شغال مع Nuvio مباشرة)
app.get("/stream/:type/:id.json", async (req, res) => {
  const { type, id } = req.params;
  const tmdbId = id.replace("tmdb:", "");

  try {
    // 1. تحويل TMDB ID إلى IMDb ID
    const externalRes = await axios.get(`${TMDB_BASE_URL}/${type}/${tmdbId}/external_ids`, {
      params: { api_key: TMDB_API_KEY }
    });
    const imdbId = externalRes.data.imdb_id;

    let streams = [];

    // 2. لو لقينات IMDb ID هنجيب التورنت المباشر الحقيقي
    if (imdbId) {
      try {
        const p2pRes = await axios.get(`https://torrentio.strem.fun/stream/${type}/${imdbId}.json`, { timeout: 4000 });
        if (p2pRes.data && p2pRes.data.streams && p2pRes.data.streams.length > 0) {
          streams = p2pRes.data.streams.map((s) => ({
            name: "P2P Direct Torrent",
            title: `${s.title || "فيلم/مسلسل"}\n⚙️ تشغيل فوري بدون إعلانات`,
            infoHash: s.infoHash,
            fileIdx: s.fileIdx || 0
          }));
        }
      } catch (e) {
        console.log("P2P Error");
      }
    }

    // 3. لو محتواش تورنت، هيحط روابط مباشرة تفهمها مشغلات الموبايل
    if (streams.length === 0) {
      streams = [
        {
          name: "Direct Video Stream",
          title: "🎬 سيرفر مباشر 1080p\n(يتطلب فتح المشغل الخارجي VLC)",
          url: `https://vidsrc.vip/embed/${type}/${tmdbId}`
        }
      ];
    }

    res.json({ streams: streams.slice(0, 5) });
  } catch (error) {
    res.json({ streams: [] });
  }
});

module.exports = app;
