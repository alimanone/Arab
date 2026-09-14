const express = require("express");
const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  next();
});

// 1. معلومات الإضافة (Manifest)
app.get("/manifest.json", (req, res) => {
  res.json({
    id: "org.arabic.addon.ali",
    version: "1.0.0",
    name: "إضافة علي للأفلام",
    description: "إضافة خاصة للأفلام العربية",
    resources: ["catalog", "stream"],
    types: ["movie"],
    catalogs: [
      {
        type: "movie",
        id: "arabic_movies",
        name: "أفلام عربية"
      }
    ]
  });
});

// 2. قائمة الأفلام
app.get("/catalog/movie/arabic_movies.json", (req, res) => {
  res.json({
    metas: [
      {
        id: "tt0080000",
        type: "movie",
        name: "فيلم تجريبي عربي",
        poster: "https://via.placeholder.com/300x450?text=Arabic+Movie"
      }
    ]
  });
});

// 3. رابط التشغيل
app.get("/stream/movie/:id.json", (req, res) => {
  res.json({
    streams: [
      {
        title: "سيرفر تجريبي 1080p",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
      }
    ]
  });
});

module.exports = app;
