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
  var STORE = 'jetrace-done';
  var done = (function () {
    try { return new Set(JSON.parse(localStorage.getItem(STORE) || '[]')); } catch (e) { return new Set(); }
  })();
  function saveDone() {
    try { localStorage.setItem(STORE, JSON.stringify(Array.from(done))); } catch (e) {}
  }

  // Characters passed in the self-test (written from memory)
  var TEST_STORE = 'jetrace-test';
  var mastered = (function () {
    try { return new Set(JSON.parse(localStorage.getItem(TEST_STORE) || '[]')); } catch (e) { return new Set(); }
  })();
  function saveMastered() {
    try { localStorage.setItem(TEST_STORE, JSON.stringify(Array.from(mastered))); } catch (e) {}
  }

  // Calm mode (plain ink) or festive mode (flowing rainbow ink and sparkles)
  var FUN_KEY = 'jetrace-fun';
  var fun = false;
  try { fun = localStorage.getItem(FUN_KEY) === '1'; } catch (e) {}

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
    ['home', 'list', 'trace', 'test'].forEach(function (s) { $(s).hidden = s !== id; });
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
    // The test of everything, mixed
    var a = document.createElement('a');
    a.className = 'set set-test';
    a.href = '#test';
    var n = MIX.chars.filter(function (ch) { return mastered.has(ch); }).length;
    a.innerHTML = '<span class="set-icon"><svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="2"/>' +
                  '<path d="M9 4V3h6v1M8.5 12.5l2.5 2.5 4.5-5"/></svg></span><span class="label">Test</span>' +
                  '<span class="count">' + n + ' / ' + MIX.chars.length + '</span>';
    box.appendChild(a);
  }

  function showList(set) {
    show('list');
    $('list-title').textContent = set.title;
    $('to-test').href = '#' + set.id + '/test';
    var grid = $('grid');
    grid.innerHTML = '';
    set.chars.forEach(function (ch, i) {
      var a = document.createElement('a');
      a.className = 'tile' + (done.has(ch) ? ' done' : '') + (mastered.has(ch) ? ' mastered' : '');
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
    if (fun) loop();
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
    T.inks.forEach(function (ink) { drawInk(ctx, ink, T.finished ? COLORS.ok : COLORS.ink, now); });

    if (T.demo) drawDemo(now);
    else if (!T.finished) drawGuide(now);

    // Ink in progress, or ink that just went off the path (fades out in red)
    if (T.ink) drawInk(ctx, T.ink, COLORS.ink, now);
    if (T.fail) {
      var a = 1 - (now - T.fail.t) / 600;
      if (a <= 0) T.fail = null;
      else { ctx.globalAlpha = a; ctx.lineWidth = INK; ctx.strokeStyle = COLORS.err; polyline(ctx, T.fail.ink); ctx.globalAlpha = 1; }
    }
    if (fun) drawSparks(now);
  }

  // Plain ink, or in festive mode a shiny rainbow ribbon whose colours keep flowing
  function drawInk(ctx, pts, color, now) {
    ctx.lineWidth = INK;
    if (!fun) {
      ctx.strokeStyle = ctx.fillStyle = color;
      polyline(ctx, pts);
      return;
    }
    rainbow(ctx, pts, now / 6, INK);
    if (pts.length > 1) {
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = INK * 0.22;
      polyline(ctx, pts);
      ctx.globalAlpha = 1;
    }
  }

  function rainbow(ctx, pts, h0, width) {
    function hue(i) { return 'hsl(' + Math.round(h0 - i * 4) % 360 + ', 85%, 55%)'; }
    if (pts.length === 1) { ctx.fillStyle = hue(0); disc(ctx, pts[0], width / 2); return; }
    ctx.lineWidth = width;
    for (var i = 1; i < pts.length; i++) {
      ctx.strokeStyle = hue(i);
      ctx.beginPath();
      ctx.moveTo(pts[i - 1][0], pts[i - 1][1]);
      ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    }
  }

  // Sparkles: a few follow the finger, a big burst when the letter is done
  var sparks = [], lastSparkTime = 0;
  function spark(p, n, burst) {
    var now = performance.now();
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, v = burst ? 40 + Math.random() * 120 : 10 + Math.random() * 30;
      sparks.push({
        x: p[0], y: p[1], vx: Math.cos(a) * v, vy: Math.sin(a) * v - (burst ? 70 : 0),
        h: Math.random() * 360, t0: now, life: burst ? 1500 : 650,
        r: burst ? 2 + Math.random() * 2.5 : 1.5 + Math.random() * 1.5
      });
    }
  }

  function drawSparks(now) {
    var dt = Math.min(0.05, (now - (lastSparkTime || now)) / 1000);
    lastSparkTime = now;
    sparks = sparks.filter(function (s) { return now - s.t0 < s.life; });
    sparks.forEach(function (s) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 140 * dt;
      var a = 1 - (now - s.t0) / s.life, r = s.r * (0.5 + a * 0.7);
      ctx.globalAlpha = a;
      ctx.fillStyle = 'hsl(' + s.h + ', 90%, 58%)';
      ctx.beginPath();
      ctx.moveTo(s.x, s.y - 2 * r);
      ctx.lineTo(s.x + 0.5 * r, s.y - 0.5 * r);
      ctx.lineTo(s.x + 2 * r, s.y);
      ctx.lineTo(s.x + 0.5 * r, s.y + 0.5 * r);
      ctx.lineTo(s.x, s.y + 2 * r);
      ctx.lineTo(s.x - 0.5 * r, s.y + 0.5 * r);
      ctx.lineTo(s.x - 2 * r, s.y);
      ctx.lineTo(s.x - 0.5 * r, s.y - 0.5 * r);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
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
    if (!drawWriting(ctx, T.g, now - T.demo.t0, now)) T.demo = null;
  }

  // The strokes of g writing themselves, t ms after the start; false once finished
  function drawWriting(ctx, g, t, now) {
    var strokes = g.strokes;
    ctx.lineCap = ctx.lineJoin = 'round';
    for (var k = 0; k < strokes.length; k++) {
      var st = strokes[k], dur = strokeTime(st);
      if (t <= 0) break;
      var f = Math.min(1, t / dur);
      ctx.strokeStyle = ctx.fillStyle = COLORS.accent;
      ctx.lineWidth = INK;
      if (st.dot) {
        disc(ctx, st.dot, INK / 2 * f + 1);
      } else {
        var n = Math.max(1, Math.round(f * st.pts.length));
        if (fun) drawInk(ctx, st.pts.slice(0, n), null, now);
        else polyline(ctx, st.pts, n);
        if (f < 1) {
          ctx.fillStyle = COLORS.accent;
          ctx.globalAlpha = 0.35;
          disc(ctx, st.pts[n - 1], 12);
          ctx.globalAlpha = 1;
        }
      }
      t -= dur + 300;
    }
    return t <= 700;
  }

  function loop() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function () {
      if ($('trace').hidden || !T) return;
      draw();
      if (T.demo || T.hint || T.fail || fun) loop();
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
    if (fun && Math.random() < 0.15) spark(q, 1, false);
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
    if (fun) T.g.strokes.forEach(function (st) {
      var pts = st.dot ? [st.dot] : st.pts;
      for (var i = 0; i < pts.length; i += 12) spark(pts[i], 2, true);
    });
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

  function setFun(on) {
    fun = on;
    try { localStorage.setItem(FUN_KEY, on ? '1' : '0'); } catch (e) {}
    $('fun').setAttribute('aria-pressed', String(on));
    sparks = [];
    if (T && !$('trace').hidden) { draw(); loop(); }
  }
  $('fun').onclick = function () { setFun(!fun); };
  setFun(fun);
  $('go-next').onclick = function () {
    if (T.i < T.set.chars.length - 1) goTo(T.i + 1);
    else location.hash = '#' + T.set.id;
  };

  // ---- Self-test: copy beside the model, then write from memory ----
  var TEST_SIZE = 5;   // characters per test
  var TRIES = 2;       // tries per step before moving on
  var tcanvas = $('test-canvas'), tctx, tview, TW, TH;
  var X = null;        // the test in progress
  var traf = 0, tPointer = null;

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // All four sets together, for the test on the home screen
  var MIX = { id: 'test', mix: true, chars: [].concat.apply([], G.sets.map(function (s) { return s.chars; })) };
  var SYMBOLS = G.sets.filter(function (s) { return s.id === 'sym'; })[0].chars;

  function showTest(set) {
    show('test');
    if (X) clearTimeout(X.timer);
    // Characters not passed yet come first
    var pool = shuffle(set.chars.slice()).sort(function (a, b) { return mastered.has(a) - mastered.has(b); });
    X = { set: set, items: pool.slice(0, TEST_SIZE), n: 0, results: [] };
    $('test-quit').href = $('test-done').href = set.mix ? '#' : '#' + set.id;
    $('result').hidden = true;
    startItem();
  }

  function startItem() {
    X.ch = X.items[X.n];
    X.g = G.glyph(X.ch);
    X.phase = 'copy';
    X.tries = 0;
    X.hidden = 0;
    clearWriting();
    showDots();
    testResize();
    say(G.name(X.ch));
  }

  // state: 'write' (waiting for the learner), 'ok' (right), 'fade' then 'demo' (not yet), 'done'
  function clearWriting() {
    clearTimeout(X.timer);
    X.inks = [];
    X.ink = null;
    X.state = 'write';
  }

  function later(fn, ms) {
    var mine = X;
    clearTimeout(X.timer);
    X.timer = setTimeout(function () { if (X === mine && !$('test').hidden) fn(); }, ms);
  }

  function showDots() {
    $('test-dots').innerHTML = X.items.map(function (ch, i) {
      var c = i < X.results.length ? (X.results[i] ? 'pass' : 'miss') : (i === X.n ? 'cur' : '');
      return '<span class="' + c + '"></span>';
    }).join('');
  }

  // Model on the left, writing space on the right, on the same lines; x = 0 is the line between them
  function testResize() {
    if ($('test').hidden || !X) return;
    var c = sizeCanvas(tcanvas);
    tctx = c.ctx; TW = c.w; TH = c.h;
    var g = X.g, gw = g.maxX - g.minX, mid = (g.minX + g.maxX) / 2;
    var modelW = gw + 70, writeW = Math.max(gw * 1.8, gw + 110);
    tview = fit(0, modelW + writeW, TW, TH, 40);
    tview.ox += modelW * tview.s;
    X.modelX = -modelW / 2 - mid;
    X.writeX = writeW / 2 - mid;
    drawTest();
    if (fun) testLoop();
  }

  function drawTest() {
    var now = performance.now(), g = X.g, ctx = tctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, TW, TH);
    setView(ctx, tview);
    writingLines(ctx, tview, TW);

    // The writing space lights up after a touch on the model's side
    if (X.flash) {
      var f = 1 - (now - X.flash) / 800;
      if (f <= 0) X.flash = 0;
      else {
        ctx.fillStyle = 'rgba(224, 122, 46, ' + (0.2 * f) + ')';
        ctx.fillRect(0, -20, (TW - tview.ox) / tview.s, 190);
      }
    }
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 2 / tview.s;
    ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, 170); ctx.stroke();
    ctx.setLineDash([]);

    // The model: shown while copying, fades away for the memory step
    var a = X.phase === 'copy' ? 1 : Math.max(0, 1 - (now - X.hidden) / 700);
    if (a > 0) {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(X.modelX, 0);
      drawStrokes(ctx, g, COLORS.ink, 9);
      ctx.restore();
    }

    // The learner's writing
    var inks = X.ink ? X.inks.concat([X.ink]) : X.inks;
    if (X.state === 'fade') {
      ctx.globalAlpha = Math.max(0, 1 - (now - X.t0) / 500);
      ctx.strokeStyle = COLORS.muted;
      ctx.lineWidth = INK;
      inks.forEach(function (ink) { polyline(ctx, ink); });
      ctx.globalAlpha = 1;
    } else if (X.state !== 'demo') {
      ctx.lineCap = ctx.lineJoin = 'round';
      inks.forEach(function (ink) { drawInk(ctx, ink, X.state === 'ok' ? COLORS.ok : COLORS.ink, now); });
    }

    // How it is written, in the writing space
    if (X.state === 'demo') {
      ctx.save();
      ctx.translate(X.writeX, 0);
      var going = drawWriting(ctx, g, now - X.t0, now);
      ctx.restore();
      if (!going) afterDemo();
    }
  }

  function testLoop() {
    cancelAnimationFrame(traf);
    traf = requestAnimationFrame(function () {
      if ($('test').hidden || !X) return;
      drawTest();
      var busy = X.state === 'fade' || X.state === 'demo' || X.flash ||
                 (X.phase === 'memory' && performance.now() - X.hidden < 700);
      if (busy || fun) testLoop();
    });
  }

  function checkWriting() {
    if (X.state !== 'write' || !X.inks.length) return;
    X.t0 = performance.now();
    if (CHECK(X.inks, X.g, SYMBOLS.indexOf(X.ch) >= 0)) {
      X.state = 'ok';
      if (X.phase === 'memory') say('Bravo !');
      drawTest();
      later(function () { nextStep(true); }, 1100);
    } else {
      X.tries++;
      X.state = 'fade';
      testLoop();
      later(function () { X.state = 'demo'; X.t0 = performance.now(); testLoop(); }, 550);
    }
  }

  function afterDemo() {
    if (X.tries >= TRIES) nextStep(false);
    else { clearWriting(); drawTest(); }
  }

  function nextStep(passed) {
    if (X.phase === 'copy') {
      X.phase = 'memory';
      X.tries = 0;
      X.hidden = performance.now();
      clearWriting();
      testLoop();
      say(G.name(X.ch));
      return;
    }
    X.results.push(passed);
    if (passed) { mastered.add(X.ch); saveMastered(); }
    X.n++;
    if (X.n < X.items.length) startItem();
    else finishTest();
  }

  function finishTest() {
    clearWriting();
    X.state = 'done';
    showDots();
    drawTest();
    var row = $('result-row');
    row.innerHTML = '';
    $('result').hidden = false; // visible first, so the small pictures get their size
    X.items.forEach(function (ch, i) {
      var d = document.createElement('div');
      d.className = 'result-item' + (X.results[i] ? ' pass' : '');
      d.innerHTML = '<canvas></canvas><span class="mark"></span>';
      row.appendChild(d);
      drawSample(d.querySelector('canvas'), [ch]);
    });
  }

  function tUnits(e) {
    var r = tcanvas.getBoundingClientRect();
    return [(e.clientX - r.left - tview.ox) / tview.s, (e.clientY - r.top - tview.oy) / tview.s];
  }

  tcanvas.addEventListener('pointerdown', function (e) {
    if (tPointer !== null || !X || X.state !== 'write') return;
    e.preventDefault();
    var p = tUnits(e);
    if (p[0] < 0) { X.flash = performance.now(); testLoop(); return; } // shows where to write
    tPointer = e.pointerId;
    try { tcanvas.setPointerCapture(e.pointerId); } catch (err) {}
    clearTimeout(X.timer);
    X.ink = [p];
    drawTest();
  });

  tcanvas.addEventListener('pointermove', function (e) {
    if (e.pointerId !== tPointer || !X.ink) return;
    var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    (evs.length ? evs : [e]).forEach(function (ev) { X.ink.push(tUnits(ev)); });
    drawTest();
  });

  function tRelease(e) {
    if (e.pointerId !== tPointer) return;
    tPointer = null;
    if (!X.ink) return;
    X.inks.push(X.ink);
    X.ink = null;
    drawTest();
    // Checked once all the strokes are there, or after a pause
    later(checkWriting, X.inks.length >= X.g.strokes.length ? 400 : 3500);
  }
  tcanvas.addEventListener('pointerup', tRelease);
  tcanvas.addEventListener('pointercancel', tRelease);

  ['touchstart', 'touchmove', 'gesturestart', 'gesturechange'].forEach(function (type) {
    $('test-board').addEventListener(type, function (e) {
      if (e.target === tcanvas) e.preventDefault();
    }, { passive: false });
  });

  $('test-listen').onclick = function () { if (X) say(G.name(X.ch)); };
  $('test-erase').onclick = function () { if (X && X.state === 'write') { clearWriting(); drawTest(); } };
  $('test-again').onclick = function () { showTest(X.set); };

  // Teacher keys, to look through a test quickly: Cmd/Ctrl + → counts the step as right, + ← as missed
  document.addEventListener('keydown', function (e) {
    if (!(e.metaKey || e.ctrlKey) || $('test').hidden || !X) return;
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault(); // also stops the browser going back a page
    if (X.state === 'done') return;
    clearWriting();
    nextStep(e.key === 'ArrowRight');
  });

  // ---- Anything but an iPad: say the app is made for the iPad (once per device) ----
  var NOTICE_KEY = 'jetrace-notice';
  (function () {
    var ua = navigator.userAgent;
    // iPads say "iPad", or (since iPadOS 13) pretend to be a Mac that has a touch screen
    var iPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    var seen = false;
    try { seen = localStorage.getItem(NOTICE_KEY) === '1'; } catch (e) {}
    if (seen || iPad) return;
    $('notice').hidden = false;
    $('notice-ok').onclick = function () {
      $('notice').hidden = true;
      try { localStorage.setItem(NOTICE_KEY, '1'); } catch (e) {}
    };
  })();

  // ---- Navigation: #min, #min/3, #min/test ----
  function route() {
    var h = location.hash.slice(1).split('/');
    var set = G.sets.filter(function (s) { return s.id === h[0]; })[0];
    activePointer = null;
    tPointer = null;
    if (h[0] === 'test') return showTest(MIX);
    if (!set) return showHome();
    if (h[1] === 'test') return showTest(set);
    var i = parseInt(h[1], 10);
    if (!(i >= 0 && i < set.chars.length)) return showList(set);
    showTrace(set, i);
  }

  window.addEventListener('hashchange', route);
  window.addEventListener('resize', function () {
    resize();
    testResize();
    if (!$('home').hidden) showHome();
  });
  route();

  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }

  // For testing in the browser console
  window.jetrace = {
    state: function () { return T; }, view: function () { return view; },
    test: function () { return X; }, testView: function () { return tview; }
  };
})();
