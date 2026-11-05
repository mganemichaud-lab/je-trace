/*
 * Letter model: each character is a list of strokes, in the order they are written.
 * Units: 4 writing lines at y = 0 (top), 50 (middle), 100 (baseline), 150 (bottom).
 * Angles are in degrees, screen coordinates: 0 = right, 90 = down.
 *   increasing angle = clockwise, decreasing angle = counterclockwise.
 * Letters and numbers follow the « Alphabet Écriture Trace Print » font (shapes and arrows).
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
    f: [O(19, 12, 11, 12, -80, -180).to(8, 100), L(0, 50, 18, 50)],
    g: [O(25, 75, 25, 25, -30, -390), L(50, 50, 50, 130).arc(25, 130, 25, 20, 0, 160)],
    h: [L(0, 0, 0, 100), O(20.5, 71, 20.5, 21, 180, 360).to(41, 100)],
    i: [L(0, 50, 0, 100), dot(0, 30)],
    j: [L(15, 50, 15, 133).arc(5, 133, 10, 15, 0, 165), dot(15, 30)],
    k: [L(0, 0, 0, 100), L(31, 50, 2, 75).to(32, 100)],
    l: [L(0, 0, 0, 100)],
    m: [L(0, 50, 0, 100), O(18.5, 71, 18.5, 21, 180, 360).to(37, 100), O(55.5, 71, 18.5, 21, 180, 360).to(74, 100)],
    n: [L(0, 50, 0, 100), O(20.5, 71, 20.5, 21, 180, 360).to(41, 100)],
    o: [O(25, 75, 25, 25, -90, -450)],
    p: [L(0, 50, 0, 150), O(25, 75, 25, 25, 180, 540)],
    q: [O(25, 75, 25, 25, -30, -390), L(50, 50, 50, 150)],
    r: [L(0, 50, 0, 100), O(20, 75, 20, 25, 180, 295)],
    s: [O(15, 62, 14, 12, -20, -270).arc(15, 88, 15, 12, -90, 160)],
    t: [L(9, 0, 9, 100), L(0, 50, 19, 50)],
    u: [L(0, 50, 0, 79).arc(20.5, 79, 20.5, 21, 180, 0).to(41, 50)],
    v: [L(0, 50, 22.5, 100).to(45, 50)],
    w: [L(0, 50, 21, 100).to(39, 50).to(57, 100).to(75, 50)],
    x: [L(0, 50, 35, 100), L(35, 50, 0, 100)],
    y: [L(0, 50, 24, 98), L(46, 50, 4, 148)],
    z: [L(0, 50, 31, 50).to(0, 100).to(31, 100)],

    // ---- majuscules ----
    A: [L(0, 100, 44, 0).to(88, 100), L(16, 63, 72, 63)],
    B: [L(0, 0, 0, 100), L(0, 0, 23, 0).arc(23, 23, 23, 23, -90, 90).to(0, 46),
        L(0, 46, 28, 46).arc(28, 73, 27, 27, -90, 90).to(0, 100)],
    C: [O(53, 50, 53, 50, -45, -315)],
    D: [L(0, 0, 0, 100), L(0, 0, 32, 0).arc(32, 50, 50, 50, -90, 90).to(0, 100)],
    E: [L(0, 0, 0, 100), L(0, 0, 52, 0), L(0, 46, 52, 46), L(0, 100, 52, 100)],
    F: [L(0, 0, 0, 100), L(0, 0, 44, 0), L(0, 46, 42, 46)],
    G: [O(53.5, 50, 53.5, 50, -45, -330).to(100, 58).to(71, 58)],
    H: [L(0, 0, 0, 100), L(68, 0, 68, 100), L(0, 46, 68, 46)],
    I: [L(16, 0, 16, 100), L(0, 0, 32, 0), L(0, 100, 32, 100)],
    J: [L(41, 0, 41, 74).arc(20.5, 74, 20.5, 26, 0, 150)],
    K: [L(0, 0, 0, 100), L(52, 0, 2, 45).to(57, 100)],
    L: [L(0, 0, 0, 100).to(43, 100)],
    M: [L(0, 0, 0, 100), L(0, 0, 46, 100).to(92, 0).to(92, 100)],
    N: [L(0, 0, 0, 100), L(0, 0, 76, 100).to(76, 0)],
    O: [O(52, 50, 52, 50, -90, -450)],
    P: [L(0, 0, 0, 100), L(0, 0, 34, 0).arc(34, 24, 24, 24, -90, 90).to(0, 48)],
    Q: [O(52, 50, 52, 50, -90, -450), L(60, 61, 92, 108)],
    R: [L(0, 0, 0, 100), L(0, 0, 34, 0).arc(34, 24, 24, 24, -90, 90).to(0, 48), L(15, 48, 54, 100)],
    S: [O(26, 23, 20.5, 22.5, -35, -225).arc(26, 74, 24.5, 26, -45, 150)],
    T: [L(27, 0, 27, 100), L(0, 0, 54, 0)],
    U: [L(0, 0, 0, 70).arc(30.5, 70, 30.5, 30, 180, 0).to(61, 0)],
    V: [L(0, 0, 41.5, 100).to(83, 0)],
    W: [L(0, 0, 28, 100).to(60, 8).to(92, 100).to(119, 0)],
    X: [L(2, 0, 62, 100), L(60, 0, 0, 100)],
    Y: [L(0, 0, 30, 48).to(30, 100), L(60, 0, 30, 48)],
    Z: [L(0, 0, 43, 0).to(0, 100).to(43, 100)],

    // ---- chiffres ----
    '0': [O(28.5, 50, 28.5, 50, -90, -450)],
    '1': [L(0, 9, 28.5, 0).to(28.5, 100)],
    '2': [O(35, 29, 27, 29, 200, 400).to(5, 100).to(68, 100)],
    '3': [O(24, 25, 23, 24, 205, 450).arc(25, 74, 25, 26, -90, 155)],
    '4': [L(37, 0, 0, 72).to(61, 72), L(38, 18, 38, 100)],
    '5': [L(4, 0, 4, 44).arc(30, 71, 29, 28, -125, 150), L(4, 0, 52, 0)],
    '6': [O(26.5, 50, 26.5, 50, -45, -270).arc(26.5, 74, 26.5, 26, 90, -200)],
    '7': [L(0, 0, 53, 0).to(11, 100), L(13, 57, 47, 57)],
    '8': [O(26.5, 25, 25.5, 24.5, -30, -270).arc(26.5, 74, 26.5, 26, -90, 270).arc(26.5, 25, 25.5, 24.5, 90, -30)],
    '9': [O(26.5, 25, 26.5, 25, 0, -360).arc(26.5, 50, 26.5, 50, 0, 165)],

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
    '«': [L(18, 56, 0, 75).to(18, 94), L(38, 56, 20, 75).to(38, 94)],
    '»': [L(0, 56, 18, 75).to(0, 94), L(20, 56, 38, 75).to(20, 94)],
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
