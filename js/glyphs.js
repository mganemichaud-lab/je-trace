/*
 * Letter model: each character is a list of strokes, in the order they are written.
 * Units: 4 writing lines at y = 0 (top), 50 (middle), 100 (baseline), 150 (bottom).
 * Angles are in degrees, screen coordinates: 0 = right, 90 = down.
 *   increasing angle = clockwise, decreasing angle = counterclockwise.
 * To change how a letter is written, edit its line below.
 */
(function () {
  var STEP = 1.5; // spacing of the sampled points, in units

  // Stroke builder: S().m(x, y).to(x, y).arc(...).bez(...)
  function S() {
    var pts = [];
    function push(x, y) {
      var last = pts[pts.length - 1];
      if (!last || Math.hypot(last[0] - x, last[1] - y) > 0.01) pts.push([x, y]);
    }
    var b = {
      pts: pts,
      m: function (x, y) { push(x, y); return b; },
      to: function (x, y) {
        var p = pts[pts.length - 1];
        var n = Math.max(2, Math.ceil(Math.hypot(x - p[0], y - p[1])));
        for (var i = 1; i <= n; i++) push(p[0] + (x - p[0]) * i / n, p[1] + (y - p[1]) * i / n);
        return b;
      },
      arc: function (cx, cy, rx, ry, a0, a1) {
        var n = Math.max(4, Math.ceil(Math.abs(a1 - a0) * Math.PI / 180 * Math.max(rx, ry)));
        if (pts.length) b.to(cx + rx * Math.cos(a0 * Math.PI / 180), cy + ry * Math.sin(a0 * Math.PI / 180));
        for (var i = 0; i <= n; i++) {
          var a = (a0 + (a1 - a0) * i / n) * Math.PI / 180;
          push(cx + rx * Math.cos(a), cy + ry * Math.sin(a));
        }
        return b;
      },
      bez: function (x1, y1, x2, y2, x3, y3) {
        var p = pts[pts.length - 1];
        for (var i = 1; i <= 60; i++) {
          var t = i / 60, u = 1 - t;
          push(u * u * u * p[0] + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
               u * u * u * p[1] + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3);
        }
        return b;
      }
    };
    return b;
  }
  function L(x0, y0, x1, y1) { return S().m(x0, y0).to(x1, y1); }
  function O(cx, cy, rx, ry, a0, a1) { return S().arc(cx, cy, rx, ry, a0, a1); }
  function dot(x, y) { return { dot: [x, y] }; }

  var DEF = {
    // ---- minuscules ----
    a: [O(25, 75, 25, 25, -30, -390), L(50, 50, 50, 100)],
    b: [L(0, 0, 0, 100), O(25, 75, 25, 25, 180, 540)],
    c: [O(25, 75, 25, 25, -40, -320)],
    d: [O(25, 75, 25, 25, -30, -390), L(50, 0, 50, 100)],
    e: [L(0, 75, 50, 75).arc(25, 75, 25, 25, 0, -320)],
    f: [O(35, 15, 15, 15, -20, -180).to(20, 100), L(5, 50, 38, 50)],
    g: [O(25, 75, 25, 25, -30, -390), L(50, 50, 50, 130).arc(25, 130, 25, 20, 0, 160)],
    h: [L(0, 0, 0, 100), O(25, 75, 25, 25, 180, 360).to(50, 100)],
    i: [L(0, 50, 0, 100), dot(0, 25)],
    j: [L(20, 50, 20, 130).arc(5, 130, 15, 18, 0, 170), dot(20, 25)],
    k: [L(0, 0, 0, 100), L(42, 50, 2, 78).to(45, 100)],
    l: [L(0, 0, 0, 100)],
    m: [L(0, 50, 0, 100), O(17.5, 72, 17.5, 22, 180, 360).to(35, 100), O(52.5, 72, 17.5, 22, 180, 360).to(70, 100)],
    n: [L(0, 50, 0, 100), O(25, 75, 25, 25, 180, 360).to(50, 100)],
    o: [O(25, 75, 25, 25, -90, -450)],
    p: [L(0, 50, 0, 150), O(25, 75, 25, 25, 180, 540)],
    q: [O(25, 75, 25, 25, -30, -390), L(50, 50, 50, 150)],
    r: [L(0, 50, 0, 100), O(22, 75, 22, 25, 180, 300)],
    s: [O(22, 62.5, 20, 12.5, -20, -270).arc(22, 87.5, 22, 12.5, -90, 160)],
    t: [L(15, 15, 15, 92).arc(27, 92, 12, 8, 180, 60), L(0, 50, 32, 50)],
    u: [L(0, 50, 0, 75).arc(25, 75, 25, 25, 180, 0), L(50, 50, 50, 100)],
    v: [L(0, 50, 25, 100).to(50, 50)],
    w: [L(0, 50, 17.5, 100).to(35, 50).to(52.5, 100).to(70, 50)],
    x: [L(0, 50, 50, 100), L(50, 50, 0, 100)],
    y: [L(0, 50, 27, 100), L(50, 50, 5, 150)],
    z: [L(0, 50, 45, 50).to(0, 100).to(45, 100)],

    // ---- majuscules ----
    A: [L(30, 0, 0, 100), L(30, 0, 60, 100), L(12, 62, 48, 62)],
    B: [L(0, 0, 0, 100), L(0, 0, 25, 0).arc(25, 24, 22, 24, -90, 90).to(0, 48),
        L(0, 48, 28, 48).arc(28, 74, 24, 26, -90, 90).to(0, 100)],
    C: [O(35, 50, 35, 50, -40, -320)],
    D: [L(0, 0, 0, 100), L(0, 0, 15, 0).arc(15, 50, 40, 50, -90, 90).to(0, 100)],
    E: [L(0, 0, 0, 100), L(0, 0, 45, 0), L(0, 50, 38, 50), L(0, 100, 45, 100)],
    F: [L(0, 0, 0, 100), L(0, 0, 45, 0), L(0, 50, 38, 50)],
    G: [O(35, 50, 35, 50, -40, -360).to(40, 50)],
    H: [L(0, 0, 0, 100), L(55, 0, 55, 100), L(0, 50, 55, 50)],
    I: [L(0, 0, 0, 100)],
    J: [L(35, 0, 35, 75).arc(17.5, 75, 17.5, 25, 0, 180)],
    K: [L(0, 0, 0, 100), L(50, 0, 2, 52).to(52, 100)],
    L: [L(0, 0, 0, 100).to(45, 100)],
    M: [L(0, 0, 0, 100), L(0, 0, 35, 70).to(70, 0).to(70, 100)],
    N: [L(0, 0, 0, 100), L(0, 0, 55, 100).to(55, 0)],
    O: [O(35, 50, 35, 50, -90, -450)],
    P: [L(0, 0, 0, 100), L(0, 0, 22, 0).arc(22, 26, 26, 26, -90, 90).to(0, 52)],
    Q: [O(35, 50, 35, 50, -90, -450), L(42, 68, 72, 104)],
    R: [L(0, 0, 0, 100), L(0, 0, 22, 0).arc(22, 26, 26, 26, -90, 90).to(0, 52), L(22, 52, 55, 100)],
    S: [O(30, 25, 28, 25, -20, -270).arc(30, 75, 30, 25, -90, 160)],
    T: [L(0, 0, 60, 0), L(30, 0, 30, 100)],
    U: [L(0, 0, 0, 70).arc(30, 70, 30, 30, 180, 0).to(60, 0)],
    V: [L(0, 0, 30, 100).to(60, 0)],
    W: [L(0, 0, 20, 100).to(40, 0).to(60, 100).to(80, 0)],
    X: [L(0, 0, 60, 100), L(60, 0, 0, 100)],
    Y: [L(0, 0, 30, 50), L(60, 0, 30, 50).to(30, 100)],
    Z: [L(0, 0, 55, 0).to(0, 100).to(55, 100)],

    // ---- chiffres ----
    '0': [O(25, 50, 25, 50, -90, -450)],
    '1': [L(5, 25, 30, 0).to(30, 100)],
    '2': [O(25, 27, 23, 25, 200, 390).to(0, 100).to(50, 100)],
    '3': [O(24, 25, 22, 24, 200, 450).arc(24, 74, 25, 26, -90, 160)],
    '4': [L(35, 0, 0, 65).to(55, 65), L(40, 25, 40, 100)],
    '5': [L(7.4, 0, 7.4, 47.4).arc(25, 68, 23, 32, -140, 150), L(7.4, 0, 48, 0)],
    '6': [S().m(45, 3).bez(15, 10, 2, 40, 2, 72).arc(26, 72, 24, 28, 180, -180)],
    '7': [L(0, 0, 50, 0).to(15, 100)],
    '8': [O(25, 24, 20, 24, -30, -270).arc(25, 74, 25, 26, -90, 270).arc(25, 24, 20, 24, 90, -30)],
    '9': [O(25, 28, 24, 28, 0, -360).to(49, 100)],

    // ---- symboles ----
    '+': [L(25, 30, 25, 80), L(0, 55, 50, 55)],
    '-': [L(0, 55, 40, 55)],
    '–': [L(0, 55, 60, 55)],
    '×': [L(5, 35, 45, 75), L(45, 35, 5, 75)],
    '=': [L(0, 42, 50, 42), L(0, 68, 50, 68)],
    '%': [O(12, 18, 12, 16, -90, -450), L(55, 0, 5, 100), O(48, 82, 12, 16, -90, -450)],
    '°': [O(10, 12, 10, 12, -90, -450)],
    '@': [O(40, 55, 14, 17, -30, -390).to(54, 38).to(54, 68)
            .bez(60, 78, 78, 72, 80, 52).arc(40, 52, 40, 45, 0, -300)],
    '&': [S().m(58, 100).to(15, 32).arc(28, 22, 15, 20, 150, 400).to(6, 70)
            .bez(2, 95, 20, 103, 32, 100).bez(45, 97, 55, 85, 60, 62)],
    '#': [L(22, 5, 15, 100), L(47, 5, 40, 100), L(0, 35, 62, 35), L(0, 70, 58, 70)],
    '*': [L(25, 15, 25, 75), L(0, 30, 50, 60), L(50, 30, 0, 60)],
    '/': [L(40, 0, 0, 100)],
    '(': [O(40, 50, 35, 55, -120, -240)],
    ')': [O(0, 50, 35, 55, -60, 60)],
    '«': [L(14, 58, 0, 75).to(14, 92), L(30, 58, 16, 75).to(30, 92)],
    '»': [L(0, 58, 14, 75).to(0, 92), L(16, 58, 30, 75).to(16, 92)],
    '.': [dot(0, 94)],
    ',': [L(6, 88, 0, 114)],
    "'": [L(6, 0, 2, 25)],
    ':': [dot(0, 58), dot(0, 94)],
    ';': [dot(3, 58), L(6, 88, 0, 114)],
    '?': [O(25, 25, 23, 24, 190, 360).bez(48, 45, 25, 48, 25, 62).to(25, 72), dot(25, 94)],
    '!': [L(0, 0, 0, 70), dot(0, 94)]
  };

  // Even spacing so progress along a stroke can be measured in steps
  function resample(src) {
    var out = [src[0]], carry = 0;
    for (var i = 1; i < src.length; i++) {
      var a = src[i - 1], b = src[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]), t = STEP - carry;
      while (t <= d) {
        out.push([a[0] + (b[0] - a[0]) * t / d, a[1] + (b[1] - a[1]) * t / d]);
        t += STEP;
      }
      carry = d - (t - STEP);
    }
    var end = src[src.length - 1], last = out[out.length - 1];
    if (Math.hypot(end[0] - last[0], end[1] - last[1]) > STEP * 0.3) out.push(end);
    return out;
  }

  var cache = {};
  function glyph(ch) {
    if (cache[ch]) return cache[ch];
    var minX = Infinity, maxX = -Infinity;
    var strokes = DEF[ch].map(function (s) {
      var st = s.dot ? { dot: s.dot } : { pts: resample(s.pts) };
      (st.dot ? [st.dot] : st.pts).forEach(function (p) {
        minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
      });
      return st;
    });
    return (cache[ch] = { ch: ch, strokes: strokes, minX: minX, maxX: maxX });
  }

  var NAMES = {
    a: 'a', b: 'bé', c: 'cé', d: 'dé', e: 'eu', f: 'èffe', g: 'gé', h: 'ache', i: 'i', j: 'ji',
    k: 'ka', l: 'èle', m: 'ème', n: 'ène', o: 'o', p: 'pé', q: 'ku', r: 'ère', s: 'èsse', t: 'té',
    u: 'u', v: 'vé', w: 'double vé', x: 'ixe', y: 'i grec', z: 'zède',
    '0': 'zéro', '1': 'un', '2': 'deux', '3': 'trois', '4': 'quatre',
    '5': 'cinq', '6': 'six', '7': 'sept', '8': 'huit', '9': 'neuf',
    '+': 'plus', '-': 'moins', '×': 'fois', '=': 'égal', '%': 'pour cent', '–': 'tiret', '°': 'degré',
    '«': 'guillemet ouvrant', '»': 'guillemet fermant',
    '@': 'arobase', '&': 'et', '#': 'dièse', '*': 'étoile', '/': 'barre oblique',
    '(': 'parenthèse ouvrante', ')': 'parenthèse fermante', '.': 'point', ',': 'virgule',
    "'": 'apostrophe', ':': 'deux-points', ';': 'point-virgule','?': "point d'interrogation", '!': "point d'exclamation"
  };

  window.GLYPHS = {
    STEP: STEP,
    sets: [
      { id: 'min', title: 'Minuscules', sample: 'abc', chars: 'abcdefghijklmnopqrstuvwxyz'.split('') },
      { id: 'maj', title: 'Majuscules', sample: 'ABC', chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('') },
      { id: 'chi', title: 'Chiffres', sample: '123', chars: '0123456789'.split('') },
      { id: 'sym', title: 'Symboles', sample: '@&+', chars: "+-–×=%°@&#*/()«».,':;?!".split('') }
    ],
    glyph: glyph,
    name: function (ch) { return NAMES[ch.toLowerCase()] || ch; }
  };
})();
