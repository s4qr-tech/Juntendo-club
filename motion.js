// 和紙モチーフの手ざわりギミック
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    path = path.slice().sort((a, b) => a[0] - b[0]);
    const line = [[0, path[0][1]], ...path, [W, path[path.length - 1][1]]];
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
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    intro.classList.remove('pulling');
    const xs = points.map(p => p[0]);
    if (Math.max(...xs) - Math.min(...xs) > innerWidth * .4) tear(points);
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

// ===== 袋とじ：ミシン目を指でなぞって開ける =====
// 使い方：<div class="fukuro" data-label="ひらいて読む"> 中身 </div>
document.querySelectorAll('.fukuro').forEach(box => {
  const seal = document.createElement('div');
  seal.className = 'fk-seal';
  seal.innerHTML = `
    <div class="fk-flap"><div class="fk-face">
      <span class="fk-label">${box.dataset.label || '袋とじ'}</span>
      <span class="fk-hint">点線を指でなぞって ひらく →</span>
    </div></div>
    <div class="fk-perf"><span class="fk-cut"></span></div>
    <button type="button" class="fk-open">ひらく</button>`;
  box.appendChild(seal);
  const cut = seal.querySelector('.fk-cut');
  const perf = seal.querySelector('.fk-perf');
  let startX = null, maxX = 0;

  const open = () => {
    box.classList.add('opened');
    setTimeout(() => seal.remove(), 900);
  };
  const progress = x => {
    const r = perf.getBoundingClientRect();
    maxX = Math.max(maxX, Math.min(1, (x - r.left) / r.width));
    cut.style.width = (maxX * 100) + '%';
    if (maxX > .92) open();
  };

  seal.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    const r = perf.getBoundingClientRect();
    // ミシン目の近く（上下 40px）から始めたときだけ反応
    if (Math.abs(e.clientY - (r.top + r.height / 2)) > 40) return;
    startX = e.clientX;
    seal.setPointerCapture(e.pointerId);
    progress(e.clientX);
  });
  seal.addEventListener('pointermove', e => { if (startX !== null) progress(e.clientX); });
  const stop = () => {
    if (startX === null) return;
    startX = null;
    if (!box.classList.contains('opened')) {
      maxX = 0; cut.style.width = '0';
    }
  };
  seal.addEventListener('pointerup', stop);
  seal.addEventListener('pointercancel', stop);
  seal.querySelector('.fk-open').addEventListener('click', open);
  if (reduceMotion) seal.querySelector('.fk-open').textContent = 'ひらく';
});

// ===== スクロールバー：和紙のロール =====
(function washiRoll() {
  const bar = document.createElement('div');
  bar.className = 'roll-bar';
  bar.setAttribute('aria-hidden', 'true');
  bar.innerHTML = '<div class="roll-sheet"></div><div class="roll-core"><span></span></div>';
  document.body.appendChild(bar);
  document.documentElement.classList.add('has-roll');
  const sheet = bar.querySelector('.roll-sheet');
  const core = bar.querySelector('.roll-core');

  const update = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    const track = bar.clientHeight;
    const y = p * (track - 34);
    sheet.style.height = (y + 17) + 'px';                 // ほどけた和紙
    core.style.transform = `translateY(${y}px)`;          // ロールが下へ転がる
    core.style.setProperty('--d', (30 - p * 14) + 'px');  // 紙がほどけるほど細くなる
    core.style.setProperty('--spin', (scrollY * .6) + 'deg');
  };
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();

  // ロールをつかんで引っぱるとスクロール
  let dragging = false;
  const toScroll = clientY => {
    const r = bar.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (clientY - r.top - 17) / (r.height - 34)));
    scrollTo({ top: p * (document.documentElement.scrollHeight - innerHeight), behavior: 'instant' });
  };
  bar.addEventListener('pointerdown', e => { dragging = true; bar.setPointerCapture(e.pointerId); bar.classList.add('grab'); toScroll(e.clientY); });
  bar.addEventListener('pointermove', e => { if (dragging) toScroll(e.clientY); });
  bar.addEventListener('pointerup', () => { dragging = false; bar.classList.remove('grab'); });
})();
