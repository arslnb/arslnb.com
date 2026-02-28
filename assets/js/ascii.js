// Animated ASCII banner with subtle movement and ~20% colored characters
(function () {
  var canvas = document.getElementById('ascii-canvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;

  var COLS = 80;
  var ROWS = 5;
  var CHAR_W = 8.5;
  var CHAR_H = 16;
  var CHARS = '.:-=+*#%@'.split('');
  var COLOR_CHANCE = 0.20;

  // Muted accent palette for the colored 20%
  var PALETTE_LIGHT = [
    '#b07d5b', // warm brown
    '#7a8b6e', // sage
    '#8b7ea0', // muted violet
    '#6e8b9b', // slate blue
    '#a07a6e', // terracotta
    '#7a9b8b', // sea glass
  ];

  var PALETTE_DARK = [
    '#c9a06a', // warm gold
    '#7aab8e', // muted teal
    '#a08bc0', // soft violet
    '#6eaabb', // steel blue
    '#bb8a7a', // dusty rose
    '#8abb9a', // faded mint
  ];

  // Stable random map: which cells get color and which color index
  // Regenerated once so the pattern is stable across frames
  var colorMap = [];
  for (var r = 0; r < ROWS; r++) {
    colorMap[r] = [];
    for (var c = 0; c < COLS; c++) {
      var isColored = Math.random() < COLOR_CHANCE;
      var palIdx = Math.floor(Math.random() * PALETTE_LIGHT.length);
      colorMap[r][c] = isColored ? palIdx : -1;
    }
  }

  function isDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function resize() {
    var w = COLS * CHAR_W;
    var h = ROWS * CHAR_H;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();

  var t = 0;
  var animId = null;
  var FPS = 14;
  var lastFrame = 0;

  function draw(now) {
    animId = requestAnimationFrame(draw);
    if (now - lastFrame < 1000 / FPS) return;
    lastFrame = now;

    var dark = isDark();
    var baseColor = dark ? '#3a3a3a' : '#c8c8c8';
    var palette = dark ? PALETTE_DARK : PALETTE_LIGHT;

    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    ctx.font = '11px "JetBrains Mono", "SF Mono", Consolas, monospace';
    ctx.textBaseline = 'top';

    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        // Layered sine waves with slow drift
        var v1 = Math.sin(c * 0.08 + t * 0.012 + r * 0.5);
        var v2 = Math.sin(c * 0.12 - t * 0.018 + r * 0.9);
        var v3 = Math.sin((c + r) * 0.06 + t * 0.008);
        // Subtle lateral drift: offset column by a slowly changing amount
        var drift = Math.sin(t * 0.005 + r * 1.2) * 0.3;
        var v4 = Math.sin((c + drift) * 0.1 + t * 0.01);
        var v = (v1 + v2 + v3 + v4) / 4;
        var norm = (v + 1) / 2;
        var idx = Math.floor(norm * (CHARS.length - 1));

        var palIdx = colorMap[r][c];
        if (palIdx >= 0) {
          ctx.fillStyle = palette[palIdx];
        } else {
          ctx.fillStyle = baseColor;
        }

        ctx.fillText(CHARS[idx], c * CHAR_W, r * CHAR_H);
      }
    }

    t++;
  }

  // Only animate when visible
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        if (!animId) animId = requestAnimationFrame(draw);
      } else {
        if (animId) {
          cancelAnimationFrame(animId);
          animId = null;
        }
      }
    });
  });

  observer.observe(canvas);
  animId = requestAnimationFrame(draw);
})();
