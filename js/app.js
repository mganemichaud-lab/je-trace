(function () {
  var G = window.GLYPHS, STEP = G.STEP;

  // Tolerances, in units (the space between two writing lines is 50 units)
  var START_TOL = 20;                    // how close to the green start dot a finger must land
  var OFF_TOL = 20;                      // how far from the path a finger may drift
  var LOOK = Math.round(30 / STEP);      // how far ahead along the path one move may jump
  var END_SLACK = Math.round(8 / STEP);  // how close to the end counts as finished
  var ROAD = 24, INK = 10;               // width of the grey guide and of the learner's ink

  var COLORS = {};
  ['paper', 'band', 'line', 'road', 'ink', 'accent', 'ok', 'err', 'muted'].forEach(function (k) {
    COLORS[k] = getComputedStyle(document.documentElement).getPropertyValue('--' + k).trim();
  });

  var $ = function (id) { return document.getElementById(id); };

  // ---- Progress, remembered on this device ----
  var STORE = 'jecris-script-done';
  var done = (function () {
    try { return new Set(JSON.parse(localStorage.getItem(STORE) || '[]')); } catch (e) { return new Set(); }
  })();
  function saveDone() {
    try { localStorage.setItem(STORE, JSON.stringify(Array.from(done))); } catch (e) {}
  }

  // ---- Voice ----
  function say(text) {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    var voices = speechSynthesis.getVoices();
    var v = voices.filter(function (v) { return v.lang === 'fr-CH'; })[0] ||
            voices.filter(function (v) { return v.lang === 'fr-FR'; })[0] ||
            voices.filter(function (v) { return /^fr/.test(v.lang); })[0];
    if (v) u.voice = v;
    u.lang = v ? v.lang : 'fr-FR';
    u.rate = 0.85;
    speechSynthesis.speak(u);
  }

  // ---- Drawing helpers (all in units after setView) ----
  var dpr = Math.max(1, window.devicePixelRatio || 1);

  function sizeCanvas(c) {
    var r = c.getBoundingClientRect();
    c.width = Math.round(r.width * dpr);
    c.height = Math.round(r.height * dpr);
    var ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: r.width, h: r.height };
  }

  // Fit glyphs of total width gw (units) between the 4 lines inside w x h pixels
  function fit(minX, gw, w, h, margin) {
    var s = Math.min(h / 175, w / (gw + margin));
    return { s: s, ox: (w - gw * s) / 2 - minX * s, oy: (h - 150 * s) / 2 };
  }

  function setView(ctx, v) { ctx.setTransform(dpr * v.s, 0, 0, dpr * v.s, dpr * v.ox, dpr * v.oy); }

  function writingLines(ctx, v, w) {
    var x0 = -v.ox / v.s, x1 = (w - v.ox) / v.s;
    ctx.fillStyle = COLORS.band;
    ctx.fillRect(x0, 50, x1 - x0, 50);
    ctx.lineWidth = 1.5 / v.s;
    [[0, COLORS.line, []], [50, COLORS.line, [6, 6]], [100, COLORS.muted, []], [150, COLORS.line, []]].forEach(function (l) {
      ctx.strokeStyle = l[1];
      ctx.setLineDash(l[2]);
      ctx.beginPath(); ctx.moveTo(x0, l[0]); ctx.lineTo(x1, l[0]); ctx.stroke();
    });
    ctx.setLineDash([]);
  }

  function polyline(ctx, pts, upto) {
    var n = upto === undefined ? pts.length : upto;
    if (n < 1) return;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    if (n === 1) ctx.lineTo(pts[0][0] + 0.01, pts[0][1]);
    for (var i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }

  function disc(ctx, p, r) { ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.fill(); }

  function drawStrokes(ctx, g, color, width) {
    ctx.strokeStyle = ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = ctx.lineJoin = 'round';
    g.strokes.forEach(function (st) {
      if (st.dot) disc(ctx, st.dot, width / 2); else polyline(ctx, st.pts);
    });
  }

  // Small picture of one or more characters (home cards and letter tiles)
  function drawSample(canvas, chars) {
    var c = sizeCanvas(canvas), GAP = 22;
    var gs = chars.map(G.glyph), total = 0;
    gs.forEach(function (g, i) { total += (g.maxX - g.minX) + (i ? GAP : 0); });
    var v = fit(0, total, c.w, c.h, 60);
    setView(c.ctx, v);
    writingLines(c.ctx, v, c.w);
    var x = 0;
    gs.forEach(function (g) {
      c.ctx.save();
      c.ctx.translate(x - g.minX, 0);
      drawStrokes(c.ctx, g, COLORS.ink, 9);
      c.ctx.restore();
      x += (g.maxX - g.minX) + GAP;
    });
  }

  // ---- Screens ----
  function show(id) {
    ['home', 'list', 'trace'].forEach(function (s) { $(s).hidden = s !== id; });
  }

  function showHome() {
    show('home');
    var box = $('sets');
    box.innerHTML = '';
    G.sets.forEach(function (set) {
      var a = document.createElement('a');
      a.className = 'set';
      a.href = '#' + set.id;
      var n = set.chars.filter(function (ch) { return done.has(ch); }).length;
      a.innerHTML = '<canvas></canvas><span class="label">' + set.title + '</span>' +
                    '<span class="count">' + n + ' / ' + set.chars.length + '</span>';
      box.appendChild(a);
      drawSample(a.querySelector('canvas'), set.sample.split(''));
    });
  }

  function showList(set) {
    show('list');
    $('list-title').textContent = set.title;
    var grid = $('grid');
    grid.innerHTML = '';
    set.chars.forEach(function (ch, i) {
      var a = document.createElement('a');
      a.className = 'tile' + (done.has(ch) ? ' done' : '');
      a.href = '#' + set.id + '/' + i;
      a.setAttribute('aria-label', ch);
      a.innerHTML = '<canvas></canvas>';
      grid.appendChild(a);
      drawSample(a.querySelector('canvas'), [ch]);
    });
  }

  // ---- Tracing ----
  var canvas = $('canvas'), ctx, view, W, H;
  var T = null;      // the letter being traced
  var raf = 0;
  var activePointer = null;

  function showTrace(set, i) {
    show('trace');
    var ch = set.chars[i];
    T = { set: set, i: i, ch: ch, g: G.glyph(ch) };
    reset();
    $('current').textContent = ch;
    $('to-list').href = '#' + set.id;
    $('prev').disabled = i === 0;
    $('next').disabled = i === set.chars.length - 1;
    resize();
    var mine = T;
    setTimeout(function () { if (T === mine && !T.started) startDemo(); }, 500);
  }

  function reset() {
    T.k = 0;           // index of the stroke to trace now
    T.inks = [];       // learner's ink for finished strokes
    T.ink = null;      // ink of the stroke in progress
    T.prog = 0;        // furthest point reached along the current stroke
    T.finished = false;
    T.started = false;
    T.fail = null;
    T.hint = 0;
    T.demo = null;
    $('win').hidden = true;
  }

  function resize() {
    if ($('trace').hidden || !T) return;
    var c = sizeCanvas(canvas);
    ctx = c.ctx; W = c.w; H = c.h;
    var side = Math.min(130, W * 0.15); // keeps the letter clear of the success buttons
    view = fit(T.g.minX, T.g.maxX - T.g.minX, W - 2 * side, H, 60);
    view.ox += side;
    draw();
  }

  function draw() {
    var now = performance.now(), g = T.g;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    setView(ctx, view);
    writingLines(ctx, view, W);

    drawStrokes(ctx, g, COLORS.road, ROAD);

    // Finished strokes
    ctx.strokeStyle = ctx.fillStyle = T.finished ? COLORS.ok : COLORS.ink;
    ctx.lineWidth = INK;
    T.inks.forEach(function (ink) { polyline(ctx, ink); });

    if (T.demo) drawDemo(now);
    else if (!T.finished) drawGuide(now);

    // Ink in progress, or ink that just went off the path (fades out in red)
    ctx.lineWidth = INK;
    if (T.ink) { ctx.strokeStyle = COLORS.ink; polyline(ctx, T.ink); }
    if (T.fail) {
      var a = 1 - (now - T.fail.t) / 600;
      if (a <= 0) T.fail = null;
      else { ctx.globalAlpha = a; ctx.strokeStyle = COLORS.err; polyline(ctx, T.fail.ink); ctx.globalAlpha = 1; }
    }
  }

  // Dashed path, arrows and numbered start dot for the stroke to trace now
  function drawGuide(now) {
    var st = T.g.strokes[T.k], multi = T.g.strokes.length > 1;
    var grow = T.hint ? 1 + 0.35 * Math.sin(Math.min(1, (now - T.hint) / 700) * Math.PI * 2) : 1;
    if (T.hint && now - T.hint > 700) T.hint = 0;
    ctx.fillStyle = COLORS.ok;
    if (st.dot) {
      disc(ctx, st.dot, 10 * grow);
      return;
    }
    var pts = st.pts;
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 1.8;
    ctx.setLineDash([3, 5]);
    polyline(ctx, pts);
    ctx.setLineDash([]);

    // Arrows pointing the way
    ctx.fillStyle = COLORS.accent;
    for (var d = 24; d < pts.length * STEP - 10; d += 32) {
      var j = Math.round(d / STEP);
      var a = pts[Math.max(0, j - 2)], b = pts[Math.min(pts.length - 1, j + 2)];
      var ang = Math.atan2(b[1] - a[1], b[0] - a[0]), p = pts[j], r = 4;
      ctx.beginPath();
      ctx.moveTo(p[0] + r * Math.cos(ang), p[1] + r * Math.sin(ang));
      ctx.lineTo(p[0] + r * Math.cos(ang + 2.5), p[1] + r * Math.sin(ang + 2.5));
      ctx.lineTo(p[0] + r * Math.cos(ang - 2.5), p[1] + r * Math.sin(ang - 2.5));
      ctx.fill();
    }
    ctx.fillStyle = COLORS.ok;

    // Start dot, with the stroke number when there are several
    if (!T.ink) {
      ctx.fillStyle = COLORS.ok;
      disc(ctx, pts[0], 9 * grow);
      if (multi) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px -apple-system, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(T.k + 1), pts[0][0], pts[0][1] + 0.5);
      }
    }
  }

  // ---- Demo: the letter writes itself ----
  var SPEED = 110; // units per second
  function strokeTime(st) { return st.dot ? 350 : Math.max(500, st.pts.length * STEP / SPEED * 1000); }

  function startDemo() {
    reset();
    T.demo = { t0: performance.now() };
    loop();
  }

  function drawDemo(now) {
    var t = now - T.demo.t0, strokes = T.g.strokes;
    ctx.strokeStyle = ctx.fillStyle = COLORS.accent;
    ctx.lineWidth = INK;
    ctx.lineCap = ctx.lineJoin = 'round';
    for (var k = 0; k < strokes.length; k++) {
      var st = strokes[k], dur = strokeTime(st);
      if (t <= 0) break;
      var f = Math.min(1, t / dur);
      if (st.dot) {
        disc(ctx, st.dot, INK / 2 * f + 1);
      } else {
        var n = Math.max(1, Math.round(f * st.pts.length));
        polyline(ctx, st.pts, n);
        if (f < 1) {
          ctx.globalAlpha = 0.35;
          disc(ctx, st.pts[n - 1], 12);
          ctx.globalAlpha = 1;
        }
      }
      t -= dur + 300;
    }
    if (t > 700) T.demo = null;
  }

  function loop() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function () {
      if ($('trace').hidden || !T) return;
      draw();
      if (T.demo || T.hint || T.fail) loop();
    });
  }

  // ---- Following the finger ----
  function toUnits(e) {
    var r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left - view.ox) / view.s, (e.clientY - r.top - view.oy) / view.s];
  }
  function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }

  function begin(p) {
    var st = T.g.strokes[T.k];
    if (st.dot) {
      if (dist(p, st.dot) <= START_TOL) strokeDone([st.dot]);
      else nudge();
      return;
    }
    if (dist(p, st.pts[0]) > START_TOL) { nudge(); return; }
    T.ink = [p];
    T.prog = 0;
  }

  function move(p) {
    if (!T.ink) return;
    var last = T.ink[T.ink.length - 1], d = dist(last, p), n = Math.ceil(d / 2);
    for (var i = 1; i <= n && T.ink; i++) {
      step([last[0] + (p[0] - last[0]) * i / n, last[1] + (p[1] - last[1]) * i / n]);
    }
  }

  function step(q) {
    var pts = T.g.strokes[T.k].pts, best = Infinity, bi = T.prog;
    var from = Math.max(0, T.prog - 3), to = Math.min(pts.length - 1, T.prog + LOOK);
    for (var j = from; j <= to; j++) {
      var d = dist(q, pts[j]);
      if (d < best) { best = d; bi = j; }
    }
    if (best > OFF_TOL) { failStroke(); return; }
    if (bi > T.prog) T.prog = bi;
    T.ink.push(q);
    if (T.prog >= pts.length - 1) strokeDone(T.ink);
  }

  function end() {
    if (!T.ink) return;
    if (T.prog >= T.g.strokes[T.k].pts.length - 1 - END_SLACK) strokeDone(T.ink);
    else failStroke();
  }

  function failStroke() {
    T.fail = { ink: T.ink, t: performance.now() };
    T.ink = null;
    nudge();
  }

  function nudge() {
    T.hint = performance.now();
    loop();
  }

  function strokeDone(ink) {
    T.inks.push(ink);
    T.ink = null;
    T.k++;
    T.prog = 0;
    if (T.k >= T.g.strokes.length) win();
    draw();
  }

  function win() {
    T.finished = true;
    done.add(T.ch);
    saveDone();
    $('win').hidden = false;
    say('Bravo !');
  }

  canvas.addEventListener('pointerdown', function (e) {
    if (activePointer !== null || !T || T.finished) return;
    e.preventDefault();
    activePointer = e.pointerId;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    if (T.demo) { T.demo = null; }
    T.started = true;
    begin(toUnits(e));
    draw();
  });

  canvas.addEventListener('pointermove', function (e) {
    if (e.pointerId !== activePointer || !T.ink) return;
    var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    (evs.length ? evs : [e]).forEach(function (ev) { move(toUnits(ev)); });
    draw();
  });

  function release(e) {
    if (e.pointerId !== activePointer) return;
    activePointer = null;
    end();
    draw();
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  // Stop iPad gestures (zoom, magnifier, page bounce) on the writing board
  ['touchstart', 'touchmove', 'gesturestart', 'gesturechange'].forEach(function (type) {
    $('board').addEventListener(type, function (e) {
      if (e.target === canvas) e.preventDefault();
    }, { passive: false });
  });

  // ---- Buttons ----
  function goTo(i) { location.hash = '#' + T.set.id + '/' + i; }

  $('prev').onclick = function () { if (T.i > 0) goTo(T.i - 1); };
  $('next').onclick = function () { if (T.i < T.set.chars.length - 1) goTo(T.i + 1); };
  $('listen').onclick = function () { say(G.name(T.ch)); };
  $('watch').onclick = function () { say(G.name(T.ch)); startDemo(); };
  $('restart').onclick = function () { reset(); draw(); };
  $('again').onclick = function () { reset(); draw(); };
  $('go-next').onclick = function () {
    if (T.i < T.set.chars.length - 1) goTo(T.i + 1);
    else location.hash = '#' + T.set.id;
  };

  // ---- Navigation: #min, #min/3 ----
  function route() {
    var h = location.hash.slice(1).split('/');
    var set = G.sets.filter(function (s) { return s.id === h[0]; })[0];
    activePointer = null;
    if (!set) return showHome();
    var i = parseInt(h[1], 10);
    if (!(i >= 0 && i < set.chars.length)) return showList(set);
    showTrace(set, i);
  }

  window.addEventListener('hashchange', route);
  window.addEventListener('resize', function () {
    resize();
    if (!$('home').hidden) showHome();
  });
  route();

  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }

  // For testing in the browser console
  window.ecris = { state: function () { return T; }, view: function () { return view; } };
})();
