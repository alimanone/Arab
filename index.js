<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>مكتبتي الخاصة للأفلام</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #121212; color: #fff; margin: 0; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; }
    h2 { text-align: center; color: #00e676; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 15px; margin-bottom: 20px; }
    .movie-card { background: #1e1e1e; border-radius: 8px; overflow: hidden; text-align: center; padding-bottom: 10px; border: 1px solid #333; }
    .movie-card img { width: 100%; height: 220px; object-fit: cover; }
    .play-btn { background: #00e676; color: #000; font-weight: bold; width: 90%; margin: 8px auto 0; padding: 8px; border: none; border-radius: 5px; cursor: pointer; }
    .player-container { display: none; background: #000; border-radius: 10px; padding: 10px; margin-top: 20px; text-align: center; }
    iframe { width: 100%; height: 400px; border: none; border-radius: 8px; }
    .close-btn { background: #ff5252; color: #fff; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; margin-top: 10px; }
  </style>
</head>
<body>

<div class="container">
  <h2>🎬 سينما علي الخاصة</h2>

  <!-- قائمة الأفلام -->
  <div id="movieGrid" class="grid"></div>

  <!-- مشغل الفيديو المدمج -->
  <div id="playerBox" class="player-container">
    <h3 id="playingTitle" style="color: #00e676; margin-top: 0;"></h3>
    <iframe id="videoFrame" src="" allowfullscreen></iframe>
    <button class="close-btn" onclick="closePlayer()">إغلاق المشغل ✖</button>
  </div>
</div>

<script>
  // قائمة الأفلام المدمجة بداخل الكود
  const movies = [
    {
      title: "ولاد رزق 1",
      poster: "https://image.tmdb.org/t/p/w500/w9m4XWcUpC5vG4J5qIWWp3d94oW.jpg",
      url: "https://yam.ahwaktv.net/see.php?vid=3B228bedf"
    }
  ];

  function renderMovies() {
    const grid = document.getElementById("movieGrid");
    grid.innerHTML = "";

    movies.forEach((m) => {
      grid.innerHTML += `
        <div class="movie-card">
          <img src="${m.poster}" alt="${m.title}">
          <h4 style="margin: 10px 0 5px; font-size: 1em;">${m.title}</h4>
          <button class="play-btn" onclick="playMovie('${m.title}', '${m.url}')">▶ تشغيل الآن</button>
        </div>
      `;
    });
  }

  function playMovie(title, url) {
    document.getElementById("playingTitle").innerText = "جاري عرض: " + title;
    document.getElementById("videoFrame").src = url;
    document.getElementById("playerBox").style.display = "block";
    window.scrollTo({ top: document.getElementById("playerBox").offsetTop, behavior: 'smooth' });
  }

  function closePlayer() {
    document.getElementById("videoFrame").src = "";
    document.getElementById("playerBox").style.display = "none";
  }

  renderMovies();
</script>

</body>
</html>
