// Review sheet: every character with its strokes numbered, coloured and arrowed
(function () {
  var G = window.GLYPHS, STEP = G.STEP;
  var STROKE_COLORS = ['#2f8f5b', '#2f6db5', '#e07a2e', '#8a4fb0'];
  var css = getComputedStyle(document.documentElement);
  function c(name) { return css.getPropertyValue('--' + name).trim(); }
  var dpr = Math.max(1, window.devicePixelRatio || 1);

  function arrows(ctx, pts) {
    for (var d = 20; d < pts.length * STEP - 8; d += 26) {
      var j = Math.round(d / STEP);
      var a = pts[Math.max(0, j - 2)], b = pts[Math.min(pts.length - 1, j + 2)];
      var ang = Math.atan2(b[1] - a[1], b[0] - a[0]), p = pts[j], r = 5;
      ctx.beginPath();
      ctx.moveTo(p[0] + r * Math.cos(ang), p[1] + r * Math.sin(ang));
      ctx.lineTo(p[0] + r * Math.cos(ang + 2.5), p[1] + r * Math.sin(ang + 2.5));
      ctx.lineTo(p[0] + r * Math.cos(ang - 2.5), p[1] + r * Math.sin(ang - 2.5));
      ctx.fill();
    }
  }

  function drawCard(canvas, ch) {
    var g = G.glyph(ch), r = canvas.getBoundingClientRect();
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    var ctx = canvas.getContext('2d');
    var gw = g.maxX - g.minX, s = Math.min(r.height / 175, r.width / (gw + 70));
    var ox = (r.width - gw * s) / 2 - g.minX * s, oy = (r.height - 150 * s) / 2;
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);

    var x0 = -ox / s, x1 = (r.width - ox) / s;
    ctx.fillStyle = c('band');
    ctx.fillRect(x0, 50, x1 - x0, 50);
    ctx.lineWidth = 1 / s;
    [[0, c('line')], [100, c('muted')], [150, c('line')]].forEach(function (l) {
      ctx.strokeStyle = l[1];
      ctx.beginPath(); ctx.moveTo(x0, l[0]); ctx.lineTo(x1, l[0]); ctx.stroke();
    });

    ctx.lineCap = ctx.lineJoin = 'round';
    g.strokes.forEach(function (st, k) {
      var col = STROKE_COLORS[k % STROKE_COLORS.length];
      ctx.strokeStyle = ctx.fillStyle = col;
      if (st.dot) {
        ctx.beginPath(); ctx.arc(st.dot[0], st.dot[1], 9, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 9;
        ctx.beginPath();
        st.pts.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
        ctx.stroke();
        ctx.globalAlpha = 1;
        arrows(ctx, st.pts);
        ctx.beginPath(); ctx.arc(st.pts[0][0], st.pts[0][1], 9, 0, Math.PI * 2); ctx.fill();
      }
      var start = st.dot || st.pts[0];
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(k + 1), start[0], start[1] + 0.5);
    });
  }

  var sheet = document.getElementById('sheet');
  var cards = [];
  G.sets.forEach(function (set) {
    var h = document.createElement('h2');
    h.textContent = set.title;
    var grid = document.createElement('div');
    grid.className = 'grid';
    set.chars.forEach(function (ch) {
      var f = document.createElement('figure');
      f.innerHTML = '<canvas></canvas><figcaption>' + ch + '</figcaption>';
      grid.appendChild(f);
      cards.push([f.querySelector('canvas'), ch]);
    });
    sheet.appendChild(h);
    sheet.appendChild(grid);
  });

  function drawAll() { cards.forEach(function (x) { drawCard(x[0], x[1]); }); }
  drawAll();
  window.addEventListener('resize', drawAll);
  window.addEventListener('beforeprint', drawAll);
})();
