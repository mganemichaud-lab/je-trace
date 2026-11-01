/*
 * Checks a character written freely (no path to follow) against the letter model.
 * The writing may sit anywhere left or right and be a little bigger or smaller;
 * each stroke must have the right shape and go in the right direction.
 * Strokes must come in the taught order, unless anyOrder is set (symbols).
 */
(function () {
  var N = 32;  // points compared per stroke
  // Tolerances, in units for a character 100 units tall (smaller characters get a bit less)
  var TOL = {
    shape: 11,   // average distance allowed between the two shapes
    ends: 26,    // how far a stroke may start or end from where it should
    dot: 24,     // how far a dot may land from where it should
    dotLen: 8,   // a stroke shorter than this counts as a dot
    yShift: 30,  // how far up or down the whole character may sit
    size: 1.7    // how much bigger or smaller than the model it may be written
  };

  function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }

  function length(pts) {
    var d = 0;
    for (var i = 1; i < pts.length; i++) d += dist(pts[i - 1], pts[i]);
    return d;
  }

  // n points evenly spread along the stroke
  function spread(pts, n) {
    var total = length(pts), out = [pts[0]], i = 1, acc = 0;
    if (total === 0) { while (out.length < n) out.push(pts[0]); return out; }
    for (var k = 1; k < n - 1; k++) {
      var want = total * k / (n - 1);
      while (i < pts.length - 1 && acc + dist(pts[i - 1], pts[i]) < want) { acc += dist(pts[i - 1], pts[i]); i++; }
      var d = dist(pts[i - 1], pts[i]), t = d ? (want - acc) / d : 0;
      out.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]);
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  function box(strokes) {
    var b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    strokes.forEach(function (pts) {
      pts.forEach(function (p) {
        b.x0 = Math.min(b.x0, p[0]); b.x1 = Math.max(b.x1, p[0]);
        b.y0 = Math.min(b.y0, p[1]); b.y1 = Math.max(b.y1, p[1]);
      });
    });
    b.cx = (b.x0 + b.x1) / 2; b.cy = (b.y0 + b.y1) / 2;
    b.size = Math.max(b.x1 - b.x0, b.y1 - b.y0, 10);
    return b;
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // Average distance between two strokes, letting one run a bit faster than the other
  function shapeGap(a, b) {
    var D = [];
    for (var i = 0; i < N; i++) {
      D.push([]);
      for (var j = 0; j < N; j++) {
        var best = i === 0 && j === 0 ? 0 : Math.min(
          i > 0 ? D[i - 1][j] : Infinity,
          j > 0 ? D[i][j - 1] : Infinity,
          i > 0 && j > 0 ? D[i - 1][j - 1] : Infinity);
        D[i].push(best + dist(a[i], b[j]));
      }
    }
    return D[N - 1][N - 1] / N;
  }

  function sameStroke(drawn, want, f) {
    var isDot = length(drawn) < TOL.dotLen;
    if (want.dot) {
      if (!isDot) return false;
      var c = box([drawn]);
      return dist([c.cx, c.cy], want.dot) <= TOL.dot;
    }
    if (isDot) return false;
    var a = spread(drawn, N), b = spread(want.pts, N), ends = TOL.ends * f;
    return dist(a[0], b[0]) <= ends && dist(a[N - 1], b[N - 1]) <= ends && shapeGap(a, b) <= TOL.shape * f;
  }

  function orders(n) {
    if (n <= 1) return [[0]].slice(0, n);
    var out = [];
    orders(n - 1).forEach(function (o) {
      for (var i = 0; i <= o.length; i++) out.push(o.slice(0, i).concat([n - 1], o.slice(i)));
    });
    return out;
  }

  // drawn: list of strokes (lists of [x, y] in letter units); g: GLYPHS.glyph(ch)
  function check(drawn, g, anyOrder) {
    var want = g.strokes, hasDot = want.some(function (w) { return w.dot; });
    // A stray touch is not a stroke, unless the character has dots
    drawn = drawn.filter(function (s) { return hasDot || length(s) >= 3; });
    if (drawn.length !== want.length) return false;

    // Bring the writing onto the model: same middle, same size (within limits)
    var d = box(drawn), m = box(want.map(function (w) { return w.dot ? [w.dot] : w.pts; }));
    var k = m.size / d.size, f = clamp(m.size / 100, 0.7, 1);
    if (want.length > 1 || !want[0].dot) {
      if (k > TOL.size || k < 1 / TOL.size) return false;
    }
    var ty = d.cy + clamp(m.cy - d.cy, -TOL.yShift, TOL.yShift);
    var moved = drawn.map(function (s) {
      return s.map(function (p) { return [m.cx + (p[0] - d.cx) * k, ty + (p[1] - d.cy) * k]; });
    });

    return (anyOrder ? orders(want.length) : [want.map(function (w, i) { return i; })]).some(function (o) {
      return o.every(function (wi, i) { return sameStroke(moved[i], want[wi], f); });
    });
  }

  check.TOL = TOL;
  window.CHECK = check;
})();
