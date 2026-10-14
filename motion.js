// ボタン・スイッチまわりの動き（和紙モチーフ）
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const PAPER_COLORS = ['#F6C9D0', '#A8D26B', '#F2784B', '#3A5BA0', '#F8E3B0'];

// ちぎった和紙の形（ランダムなギザギザの多角形）
function tornPolygon() {
  const pts = [];
  const n = 7 + Math.floor(Math.random() * 4);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 30 + Math.random() * 20;
    pts.push(`${50 + Math.cos(a) * r}% ${50 + Math.sin(a) * r}%`);
  }
  return `polygon(${pts.join(',')})`;
}

// ボタンを押すと、和紙の切れはしが舞う
function scatterPaper(x, y, count = 9) {
  if (reduceMotion) return;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'paper-bit';
    const size = 8 + Math.random() * 12;
    const ang = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 60;
    p.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;` +
      `background:${PAPER_COLORS[i % PAPER_COLORS.length]};clip-path:${tornPolygon()};` +
      `--dx:${Math.cos(ang) * dist}px;--dy:${Math.sin(ang) * dist - 20}px;--rot:${Math.random() * 540 - 270}deg;`;
    document.body.appendChild(p);
    p.addEventListener('animationend', () => p.remove());
  }
}

document.addEventListener('click', e => {
  const btn = e.target.closest('.btn, .tab, .chip');
  if (btn) scatterPaper(e.clientX, e.clientY, btn.classList.contains('btn') ? 10 : 6);
});

// チェック・ラジオは「はんこ」を押したように
document.addEventListener('change', e => {
  const el = e.target;
  if (!el.matches('input[type=checkbox], input[type=radio]') || !el.checked || reduceMotion) return;
  const label = el.closest('label');
  if (!label) return;
  label.classList.remove('stamped');
  void label.offsetWidth;
  label.classList.add('stamped');
});

// ===== 最初の画面：指でなぞって和紙をやぶる =====
(function washiIntro() {
  const intro = document.getElementById('washi');
  if (!intro) return;
  let seen = false;
  try { seen = sessionStorage.getItem('washiSeen') === '1'; } catch (_) {}
  if (seen || reduceMotion) { intro.remove(); return; }

  document.documentElement.classList.add('intro-lock');
  const top = intro.querySelector('.w-top .w-piece');
  const bottom = intro.querySelector('.w-bottom .w-piece');
  const crease = intro.querySelector('.w-crease polyline');
  let points = [];
  let dragging = false;

  const finish = () => {
    try { sessionStorage.setItem('washiSeen', '1'); } catch (_) {}
    document.documentElement.classList.remove('intro-lock');
    setTimeout(() => intro.remove(), 1100);
  };

  function tear(path) {
    const W = innerWidth, H = innerHeight;
    // 左端から右端までの破れ目を作る（ゆらぎを足して和紙らしく）
    path = path.slice().sort((a, b) => a[0] - b[0]);
    const line = [[0, path[0][1]]];
    path.forEach(([x, y]) => line.push([x, y]));
    line.push([W, path[path.length - 1][1]]);
    const rough = [];
    for (let i = 0; i < line.length - 1; i++) {
      const [x1, y1] = line[i], [x2, y2] = line[i + 1];
      const steps = Math.max(1, Math.round((x2 - x1) / 14));
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        rough.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t + (Math.random() - .5) * 10]);
      }
    }
    rough.push(line[line.length - 1]);
    const toPts = arr => arr.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(',');
    top.style.clipPath = `polygon(0 0, ${W}px 0, ${toPts(rough.slice().reverse())})`;
    bottom.style.clipPath = `polygon(${toPts(rough)}, ${W}px ${H}px, 0 ${H}px)`;
    crease.setAttribute('points', '');
    requestAnimationFrame(() => intro.classList.add('torn'));
    finish();
  }

  function straightTear() {
    const y = innerHeight * .5;
    const pts = [];
    for (let x = 0; x <= innerWidth; x += 40) pts.push([x, y + Math.sin(x / 60) * 18]);
    tear(pts);
  }

  intro.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    dragging = true;
    points = [[e.clientX, e.clientY]];
    intro.setPointerCapture(e.pointerId);
    intro.classList.add('pulling');
  });
  intro.addEventListener('pointermove', e => {
    if (!dragging) return;
    points.push([e.clientX, e.clientY]);
    crease.setAttribute('points', points.map(p => p.join(',')).join(' '));
    if (Math.random() < .35) scatterPaper(e.clientX, e.clientY, 1);
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    intro.classList.remove('pulling');
    const xs = points.map(p => p[0]);
    const span = Math.max(...xs) - Math.min(...xs);
    if (span > innerWidth * .4) tear(points);
    else {
      crease.setAttribute('points', '');
      intro.classList.remove('nudge'); void intro.offsetWidth; intro.classList.add('nudge');
    }
  };
  intro.addEventListener('pointerup', end);
  intro.addEventListener('pointercancel', end);
  intro.querySelector('.w-skip').addEventListener('click', straightTear);
  intro.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') straightTear(); });
})();
