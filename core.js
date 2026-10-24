'use strict';
// ============================================================
//  Núcleo: ODE / ODESolver, gráficas 2D/3D, interfaz y animación
// ============================================================
const g = 9.8;
const $ = id => document.getElementById(id);
const MODULES = [];
const reg = m => MODULES.push(m);
const COL = { a: '#2ec4b6', b: '#ef476f', c: '#f9a826', d: '#8ac926', e: '#8ecae6', f: '#c77dff', w: '#ffffff' };
const fmt = (x, d = 3) => !isFinite(x) ? '—' : (Math.abs(x) >= 1e5 || (Math.abs(x) < 1e-3 && x !== 0)) ? x.toExponential(d) : (+x).toFixed(d);
const S = html => { const e = $('stats'); if (e) e.innerHTML = html; };
const tbl = (h, rows) => '<table class="tbl"><tr>' + h.map(x => `<th>${x}</th>`).join('') + '</tr>' +
  rows.map(r => '<tr>' + r.map(x => `<td>${x}</td>`).join('') + '</tr>').join('') + '</table>';
const thin = (a, max = 1500) => { if (a.length <= max) return a; const s = Math.ceil(a.length / max); return a.filter((_, i) => i % s === 0 || i === a.length - 1); };
const mm = a => { let lo = Infinity, hi = -Infinity; for (const v of a) { if (v < lo) lo = v; if (v > hi) hi = v; } return [lo, hi]; };
const deg = Math.PI / 180;

// ---------- Interfaz ODE y solucionadores (secciones 3.5–3.6) ----------
// El estado es un arreglo; por convención el último elemento es el tiempo (rate = 1).
class ODE {
  constructor(state, rate) { this.state = state; this.rate = rate; }
  getState() { return this.state; }
  getRate(s) { return this.rate(s); }
}
const Solvers = {
  Euler(ode, dt) { const s = ode.getState(), r = ode.getRate(s); for (let i = 0; i < s.length; i++) s[i] += r[i] * dt; },
  EulerRichardson(ode, dt) {
    const s = ode.getState(), r = ode.getRate(s), m = s.map((x, i) => x + r[i] * dt / 2), rm = ode.getRate(m);
    for (let i = 0; i < s.length; i++) s[i] += rm[i] * dt;
  },
  RK4(ode, dt) {
    const s = ode.getState(), k1 = ode.getRate(s), a = s.map((x, i) => x + k1[i] * dt / 2), k2 = ode.getRate(a),
      b = s.map((x, i) => x + k2[i] * dt / 2), k3 = ode.getRate(b), c = s.map((x, i) => x + k3[i] * dt), k4 = ode.getRate(c);
    for (let i = 0; i < s.length; i++) s[i] += (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) * dt / 6;
  }
};
function integrate(ode, method, dt, stop, maxSteps = 2e6) {
  const out = [ode.state.slice()]; let n = 0;
  while (!stop(ode.state) && n++ < maxSteps) { Solvers[method](ode, dt); out.push(ode.state.slice()); }
  return out;
}
// interpolación lineal del cruce de la componente k por el valor 'val' entre los dos últimos estados
function crossing(P, k, val = 0) {
  const a = P[P.length - 2], b = P[P.length - 1]; if (!a) return b.slice();
  const s = (a[k] - val) / ((a[k] - b[k]) || 1); return a.map((x, i) => x + s * (b[i] - x));
}

// ---------- Gráficas 2D ----------
const tick = v => (Math.abs(v) >= 1e4 || (Math.abs(v) < 1e-2 && v !== 0)) ? v.toExponential(1) : String(+v.toFixed(2));
const PLOTS = {};                 // última serie dibujada en cada vista, para el reporte .txt
function plot(cv, series, o = {}) {
  if (cv && cv.id) PLOTS[cv.id] = series;
  const c = cv.getContext('2d'), W = cv.width, H = cv.height, m = { l: 60, r: 14, t: 14, b: 38 };
  c.clearRect(0, 0, W, H);
  const xs = [], ys = [];
  series.forEach(s => s.pts.forEach(p => { if (isFinite(p[0]) && isFinite(p[1])) { xs.push(p[0]); ys.push(p[1]); } }));
  let [x0, x1] = xs.length ? mm(xs) : [0, 1], [y0, y1] = ys.length ? mm(ys) : [0, 1];
  if (o.xmin !== undefined) x0 = o.xmin; if (o.xmax !== undefined) x1 = o.xmax;
  const pad = (y1 - y0) * 0.06 || 0.5;
  y0 = o.ymin !== undefined ? o.ymin : y0 - pad; y1 = o.ymax !== undefined ? o.ymax : y1 + pad;
  if (x1 <= x0) x1 = x0 + 1; if (y1 <= y0) y1 = y0 + 1;
  const X = x => m.l + (x - x0) / (x1 - x0) * (W - m.l - m.r);
  const Y = y => H - m.b - (y - y0) / (y1 - y0) * (H - m.t - m.b);
  c.lineWidth = 1; c.font = '11px JetBrains Mono';
  for (let i = 0; i <= 5; i++) {
    const xv = x0 + i * (x1 - x0) / 5, yv = y0 + i * (y1 - y0) / 5;
    c.strokeStyle = '#ffffff12';
    c.beginPath(); c.moveTo(X(xv), m.t); c.lineTo(X(xv), H - m.b); c.stroke();
    c.beginPath(); c.moveTo(m.l, Y(yv)); c.lineTo(W - m.r, Y(yv)); c.stroke();
    c.fillStyle = '#8a93b8'; c.textAlign = 'center'; c.fillText(tick(xv), X(xv), H - m.b + 15);
    c.textAlign = 'right'; c.fillText(tick(yv), m.l - 6, Y(yv) + 4);
  }
  c.textAlign = 'center'; c.fillStyle = '#8a93b8';
  if (o.xlabel) c.fillText(o.xlabel, (W + m.l) / 2, H - 4);
  if (o.ylabel) { c.save(); c.translate(12, (H - m.b + m.t) / 2); c.rotate(-Math.PI / 2); c.fillText(o.ylabel, 0, 0); c.restore(); }
  c.save(); c.beginPath(); c.rect(m.l, m.t, W - m.l - m.r, H - m.t - m.b); c.clip();
  series.forEach(s => {
    c.strokeStyle = c.fillStyle = s.color; c.lineWidth = s.width || 2; c.setLineDash(s.dash || []);
    if (s.dots) s.pts.forEach(p => { if (isFinite(p[1])) { c.beginPath(); c.arc(X(p[0]), Y(p[1]), s.r || 2.6, 0, 7); c.fill(); } });
    else {
      c.beginPath(); let pen = false;
      s.pts.forEach(p => { if (!isFinite(p[0]) || !isFinite(p[1])) { pen = false; return; } const px = X(p[0]), py = Y(Math.max(y0 - 10 * (y1 - y0), Math.min(y1 + 10 * (y1 - y0), p[1]))); pen ? c.lineTo(px, py) : c.moveTo(px, py); pen = true; });
      c.stroke();
    }
    c.setLineDash([]);
  });
  c.restore();
  let ly = m.t + 6; const lx = o.legend === 'left' ? m.l + 10 : W - m.r - 170;
  series.filter(s => s.label).forEach(s => {
    c.fillStyle = s.color; c.fillRect(lx, ly, 14, 3);
    c.fillStyle = '#e6e9f5'; c.textAlign = 'left'; c.fillText(s.label, lx + 20, ly + 5); ly += 15;
  });
  return { X, Y, c };
}

// ---------- Esquemas de circuito (tabla 4.1 y figuras 4.5–4.6) ----------
// Primitivas para dibujar los elementos del libro con el símbolo que allí se usa.
// Todas reciben el contexto, el punto de entrada y la longitud, y devuelven el
// punto de salida, de modo que se encadenan recorriendo la malla.
const CIR = {
  gris: '#9fb0c8',
  hilo(c, x0, y0, x1, y1, col) {
    c.strokeStyle = col || CIR.gris; c.lineWidth = 2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    return [x1, y1];
  },
  // zigzag de seis dientes, horizontal (dx=1) o vertical (dx=0).
  // El cuerpo tiene tamaño fijo y se centra en el tramo: así el símbolo se ve
  // igual aunque el hilo sea largo, como en las figuras del libro.
  resistor(c, x, y, L, horiz, col, etq) {
    const n = 6, cuerpo = Math.min(L * .9, 84), pata = (L - cuerpo) / 2, a = 11;
    c.strokeStyle = col || CIR.gris; c.lineWidth = 2; c.lineJoin = 'round'; c.beginPath();
    if (horiz) {
      c.moveTo(x, y); c.lineTo(x + pata, y);
      for (let i = 0; i < n; i++) c.lineTo(x + pata + cuerpo * (i + .5) / n, y + (i % 2 ? a : -a));
      c.lineTo(x + pata + cuerpo, y); c.lineTo(x + L, y);
    } else {
      c.moveTo(x, y); c.lineTo(x, y + pata);
      for (let i = 0; i < n; i++) c.lineTo(x + (i % 2 ? a : -a), y + pata + cuerpo * (i + .5) / n);
      c.lineTo(x, y + pata + cuerpo); c.lineTo(x, y + L);
    }
    c.stroke();
    if (etq) CIR.etiqueta(c, horiz ? x + L / 2 : x + a + 14, horiz ? y + a + 16 : y + L / 2, etq, col, horiz ? 'center' : 'left');
    return horiz ? [x + L, y] : [x, y + L];
  },
  // dos placas paralelas separadas por el dieléctrico
  condensador(c, x, y, L, horiz, col, etq) {
    const sep = 7, placa = 18, pata = (L - sep) / 2;
    c.strokeStyle = col || CIR.gris; c.lineWidth = 2; c.beginPath();
    if (horiz) {
      c.moveTo(x, y); c.lineTo(x + pata, y); c.moveTo(x + L - pata, y); c.lineTo(x + L, y);
      c.moveTo(x + pata, y - placa / 2); c.lineTo(x + pata, y + placa / 2);
      c.moveTo(x + pata + sep, y - placa / 2); c.lineTo(x + pata + sep, y + placa / 2);
    } else {
      c.moveTo(x, y); c.lineTo(x, y + pata); c.moveTo(x, y + L - pata); c.lineTo(x, y + L);
      c.moveTo(x - placa / 2, y + pata); c.lineTo(x + placa / 2, y + pata);
      c.moveTo(x - placa / 2, y + pata + sep); c.lineTo(x + placa / 2, y + pata + sep);
    }
    c.stroke();
    if (etq) CIR.etiqueta(c, horiz ? x + L / 2 : x + placa / 2 + 12, horiz ? y + placa / 2 + 16 : y + L / 2, etq, col, horiz ? 'center' : 'left');
    return horiz ? [x + L, y] : [x, y + L];
  },
  // cinco semicircunferencias, también de tamaño fijo
  bobina(c, x, y, L, horiz, col, etq) {
    const n = 5, cuerpo = Math.min(L * .9, 90), pata = (L - cuerpo) / 2, r = cuerpo / (2 * n);
    c.strokeStyle = col || CIR.gris; c.lineWidth = 2; c.beginPath();
    if (horiz) {
      c.moveTo(x, y); c.lineTo(x + pata, y);
      for (let i = 0; i < n; i++) c.arc(x + pata + r * (2 * i + 1), y, r, Math.PI, 0, false);
      c.moveTo(x + pata + cuerpo, y); c.lineTo(x + L, y);
    } else {
      c.moveTo(x, y); c.lineTo(x, y + pata);
      for (let i = 0; i < n; i++) c.arc(x, y + pata + r * (2 * i + 1), r, -Math.PI / 2, Math.PI / 2, false);
      c.moveTo(x, y + pata + cuerpo); c.lineTo(x, y + L);
    }
    c.stroke();
    if (etq) CIR.etiqueta(c, horiz ? x + L / 2 : x + r + 14, horiz ? y - r - 10 : y + L / 2, etq, col, horiz ? 'center' : 'left');
    return horiz ? [x + L, y] : [x, y + L];
  },
  // fuente de tensión: circunferencia con su rótulo dentro
  fuente(c, x, y, L, horiz, col, etq) {
    const r = 20, pata = (L - 2 * r) / 2;
    c.strokeStyle = col || CIR.gris; c.lineWidth = 2; c.beginPath();
    if (horiz) { c.moveTo(x, y); c.lineTo(x + pata, y); c.moveTo(x + L - pata, y); c.lineTo(x + L, y); }
    else { c.moveTo(x, y); c.lineTo(x, y + pata); c.moveTo(x, y + L - pata); c.lineTo(x, y + L); }
    c.stroke();
    const cx = horiz ? x + L / 2 : x, cy = horiz ? y : y + L / 2;
    c.beginPath(); c.arc(cx, cy, r, 0, 2 * Math.PI); c.stroke();
    c.fillStyle = col || '#e6e9f5'; c.font = 'bold 13px JetBrains Mono';
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(etq || 'Vs', cx, cy);
    c.textBaseline = 'alphabetic';
    return horiz ? [x + L, y] : [x, y + L];
  },
  etiqueta(c, x, y, txt, col, align = 'center', tam = 12) {
    c.fillStyle = col || '#e6e9f5'; c.font = tam + 'px JetBrains Mono';
    c.textAlign = align; c.textBaseline = 'middle'; c.fillText(txt, x, y); c.textBaseline = 'alphabetic';
  },
  // punto de medida: marca dónde se conecta el osciloscopio
  sonda(c, x, y, col, etq) {
    c.fillStyle = col; c.beginPath(); c.arc(x, y, 4.5, 0, 2 * Math.PI); c.fill();
    if (etq) CIR.etiqueta(c, x, y - 15, etq, col, 'center', 11);
  },
  // flecha de corriente que recorre el hilo; fase ∈ [0,1) desplaza los puntos
  corriente(c, x0, y0, x1, y1, I, fase, col) {
    const n = 4, s = Math.sign(I) || 1, mag = Math.min(1, Math.abs(I));
    if (mag < .02) return;
    c.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const u = (((i / n) + s * fase) % 1 + 1) % 1;
      c.globalAlpha = mag * (.35 + .65 * Math.sin(Math.PI * u));
      c.beginPath(); c.arc(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, 3, 0, 2 * Math.PI); c.fill();
    }
    c.globalAlpha = 1;
  },
  limpia(cv) { const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height); return c; },
};

// ---------- Vistas 3D (proyección ortográfica rotable) ----------
function cam(cv, init) {
  if (!cv._cam) {
    cv._cam = Object.assign({ yaw: -0.9, pitch: 0.35, zoom: 1 }, init || {}); let drag = null;
    cv.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => {
      if (!drag) return; const k = cv._cam;
      k.yaw += (e.clientX - drag[0]) * 0.01; k.pitch = Math.max(-1.5, Math.min(1.5, k.pitch + (e.clientY - drag[1]) * 0.01));
      drag = [e.clientX, e.clientY]; cv._redraw && cv._redraw();
    });
    cv.addEventListener('pointerup', () => drag = null);
    cv.addEventListener('wheel', e => { e.preventDefault(); cv._cam.zoom *= e.deltaY < 0 ? 1.1 : 0.9; cv._redraw && cv._redraw(); }, { passive: false });
    cv.style.cursor = 'grab';
  }
  return cv._cam;
}
function projector(cv, center, scale, init) {
  const k = cam(cv, init), W = cv.width, H = cv.height, cy = Math.cos(k.yaw), sy = Math.sin(k.yaw), cp = Math.cos(k.pitch), sp = Math.sin(k.pitch), s = scale * k.zoom;
  return (x, y, z) => { x -= center[0]; y -= center[1]; z -= center[2]; const x1 = x * cy - y * sy, y1 = x * sy + y * cy; return [W / 2 + x1 * s, H / 2 - (z * cp + y1 * sp) * s]; };
}
function line3(c, P, pts, color, w = 2, dash) {
  c.strokeStyle = color; c.lineWidth = w; c.setLineDash(dash || []); c.beginPath();
  pts.forEach((p, i) => { const q = P(p[0], p[1], p[2]); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); });
  c.stroke(); c.setLineDash([]);
}
function axes3(c, P, L, o = [0, 0, 0]) {
  [['x', [L, 0, 0], COL.b], ['y', [0, L, 0], COL.d], ['z', [0, 0, L], COL.e]].forEach(([n, v, col]) => {
    line3(c, P, [o, [o[0] + v[0], o[1] + v[1], o[2] + v[2]]], col, 1.5);
    const q = P(o[0] + v[0] * 1.1, o[1] + v[1] * 1.1, o[2] + v[2] * 1.1);
    c.fillStyle = col; c.font = '12px JetBrains Mono'; c.textAlign = 'center'; c.fillText(n, q[0], q[1]);
  });
}
function ball3(c, P, p, r, color) {
  const q = P(p[0], p[1], p[2]); const gr = c.createRadialGradient(q[0] - r / 3, q[1] - r / 3, 1, q[0], q[1], r);
  gr.addColorStop(0, '#fff'); gr.addColorStop(1, color);
  c.fillStyle = gr; c.shadowColor = color; c.shadowBlur = 15; c.beginPath(); c.arc(q[0], q[1], r, 0, 7); c.fill(); c.shadowBlur = 0;
}
function dot2(c, x, y, r, color) {
  const gr = c.createRadialGradient(x - r / 3, y - r / 3, 1, x, y, r); gr.addColorStop(0, '#fff'); gr.addColorStop(1, color);
  c.fillStyle = gr; c.shadowColor = color; c.shadowBlur = 16; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.shadowBlur = 0;
}

// ---------- Animación ----------
// SPEED multiplica la velocidad de todas las animaciones: 1 = normal, 0.5 = la mitad
// de rápido (cámara lenta), 2 = el doble. Lo fija el selector del encabezado.
let TOKEN = 0, SPEED = 1;
function setSpeed(v) { SPEED = v > 0 ? v : 1; try { localStorage.setItem('cap3-vel', String(SPEED)); } catch (e) { /* sin almacenamiento */ } }
function animate(draw, ms = 1800) {
  const my = ++TOKEN, t0 = performance.now(), dur = Math.max(1, ms / SPEED);
  // Math.max(0, …): el sello de tiempo de requestAnimationFrame puede ser anterior a
  // performance.now() si el cuadro ya había empezado, y entonces fr saldría negativo.
  const f = now => { if (my !== TOKEN) return; const fr = Math.max(0, Math.min(1, (now - t0) / dur)); draw(fr); if (fr < 1) requestAnimationFrame(f); };
  requestAnimationFrame(f);
}
// Los bucles continuos (pelota 3D, cinturón de Van Allen) no van por tiempo sino por
// cuadros: la cámara lenta se consigue dando menos pasos de física por cuadro.
function runLoop(step) {
  const my = ++TOKEN; let acc = 0;
  const f = () => {
    if (my !== TOKEN) return;
    acc += SPEED; let seguir = true;
    while (acc >= 1 && seguir) { acc -= 1; seguir = step() !== false; }
    if (seguir) requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
}
const stopAnim = () => TOKEN++;
const go = (anim, draw, ms) => anim ? animate(draw, ms) : (stopAnim(), draw(1));

// ---------- Construcción de la interfaz ----------
let CUR = null;
function V(id) {
  const e = $('c-' + id); if (!e) return undefined;
  if (e.type === 'checkbox') return e.checked;
  if (e.type === 'range' || e.type === 'number') return +e.value;
  return e.value;
}
function ctrlHTML(c) {
  const id = 'c-' + c.id;
  switch (c.type) {
    case 'range': return `<label>${c.label}<span class="rng"><input type="range" id="${id}" min="${c.min}" max="${c.max}" step="${c.step}" value="${c.value}"><output id="${id}-o"></output></span></label>`;
    case 'number': return `<label>${c.label}<input type="number" id="${id}" value="${c.value}" step="${c.step || 'any'}"></label>`;
    case 'select': return `<label>${c.label}<select id="${id}">${c.options.map(o => `<option value="${o[0]}" ${o[0] == c.value ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></label>`;
    case 'check': return `<label class="chk"><input type="checkbox" id="${id}" ${c.value ? 'checked' : ''}><i style="--c:${c.color || '#7c5cff'}"></i>${c.label}</label>`;
    case 'text': return `<label>${c.label}<input type="text" id="${id}" value="${c.value}"></label>`;
    case 'sep': return `<div class="sep">${c.label}</div>`;
  }
  return '';
}
function updOut(c) {
  const e = $('c-' + c.id), o = $('c-' + c.id + '-o'); if (!e || !o) return;
  const d = (String(c.step).split('.')[1] || '').length; o.textContent = (+e.value).toFixed(d);
}
function setVals(obj, anim = true) {
  Object.entries(obj).forEach(([k, v]) => { const e = $('c-' + k); if (!e) return; if (e.type === 'checkbox') e.checked = v; else e.value = v; });
  CUR.controls.forEach(updOut); CUR.run(anim);
}
function show(id) {
  stopAnim();
  const m = trMod(MODULES.find(x => x.id === id)); CUR = m; history.replaceState(null, '', '#' + id);
  if (typeof VISITADOS !== 'undefined') VISITADOS.add(m.tag);   // para el informe de simulación
  Object.keys(PLOTS).forEach(k => delete PLOTS[k]);            // v1, v2… se reutilizan entre módulos
  const sel = $('nav-sel'); if (sel && sel.value !== id) sel.value = id;   // asignar no dispara 'change'
  const views = m.views.map(v => `<div class="card view ${v.half ? '' : 'full'}"><h3>${v.title}</h3>${v.html ? `<div id="${v.id}" class="htmlview"></div>` : `<canvas id="${v.id}" width="${v.w || 820}" height="${v.h || 320}"></canvas>`}${v.hint ? `<p class="hint">${v.hint}</p>` : ''}</div>`).join('');
  const btns = (m.buttons || [{ label: T('simular'), primary: true, fn: 'run' }])
    .concat([{ label: T('btnReporte'), fn: mod => reporteModulo(mod) }]);   // concat: no muta el módulo
  $('content').innerHTML = `<div class="mod-head"><span class="badge">${m.tag} · Sección ${m.sec}</span><h2>${m.title}</h2><p>${m.desc}</p></div>
  <section class="panel active"><aside class="card controls">${m.controls.map(ctrlHTML).join('')}
  <div class="btns">${btns.map((b, i) => `<button class="btn ${b.primary ? 'primary' : ''}" id="b-${i}">${b.label}</button>`).join('')}</div>
  ${m.eq ? `<div class="eq">${m.eq}</div>` : ''}<div class="stats" id="stats"></div></aside><div class="stage">${views}</div></section>`;
  m.controls.forEach(c => { const e = $('c-' + c.id); if (!e) return; updOut(c); e.addEventListener('input', () => { updOut(c); if (m.live !== false) m.run(false); }); });
  btns.forEach((b, i) => $('b-' + i).onclick = () => b.fn === 'run' ? m.run(true) : b.fn(m));
  m.run(true);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
// El índice del capítulo es una lista desplegable agrupada por sección.
function buildNav() {
  const sel = $('nav-sel'); if (!sel) return;
  const groups = {};
  MODULES.map(trMod).forEach(m => (groups[m.group] = groups[m.group] || []).push(m));
  sel.innerHTML = Object.entries(groups).map(([gn, ms]) =>
    `<optgroup label="${gn}">${ms.map(m => `<option value="${m.id}">${m.tag} · ${m.short}</option>`).join('')}</optgroup>`).join('');
  sel.onchange = () => show(sel.value);
}
function initVelocidad() {
  const sel = $('speed'); if (!sel) return;
  let v = 0.5;                                   // por defecto, cámara lenta
  try { const g = parseFloat(localStorage.getItem('cap3-vel')); if (g > 0) v = g; } catch (e) { /* sin almacenamiento */ }
  SPEED = v; sel.value = String(v);
  if (sel.value !== String(v)) { sel.value = '0.5'; SPEED = 0.5; }   // valor guardado que ya no existe
  sel.addEventListener('change', () => { setSpeed(parseFloat(sel.value)); if (CUR) CUR.run(true); });
}
// ---------- Identificación del estudiante ----------
// Pregrados de la Universidad de Córdoba (Montería), agrupados por facultad.
// La oferta cambia cada periodo: si falta o sobra alguno, se edita aquí.
const PREGRADOS = {
  'Ciencias Básicas': ['Biología', 'Estadística', 'Física', 'Geografía', 'Matemáticas', 'Química'],
  'Ingenierías': ['Ingeniería Ambiental', 'Ingeniería de Alimentos', 'Ingeniería de Sistemas', 'Ingeniería Industrial', 'Ingeniería Mecánica'],
  'Ciencias Agrícolas': ['Ingeniería Agronómica'],
  'Medicina Veterinaria y Zootecnia': ['Acuicultura', 'Medicina Veterinaria y Zootecnia'],
  'Ciencias de la Salud': ['Bacteriología', 'Enfermería', 'Regencia de Farmacia'],
  'Ciencias Económicas, Jurídicas y Administrativas': ['Administración en Finanzas y Negocios Internacionales', 'Administración en Salud', 'Derecho'],
  'Educación y Ciencias Humanas': ['Licenciatura en Ciencias Naturales y Educación Ambiental', 'Licenciatura en Ciencias Sociales',
    'Licenciatura en Educación Artística', 'Licenciatura en Educación Física, Recreación y Deporte', 'Licenciatura en Educación Infantil',
    'Licenciatura en Informática', 'Licenciatura en Lengua Extranjera con Énfasis en Inglés', 'Licenciatura en Literatura y Lengua Castellana'],
};
// Periodo académico: enero–junio es el 1, julio–diciembre el 2.
const semestreDe = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() < 6 ? 1 : 2}`;
let SESION = null;
// La sesión vive en sessionStorage: sobrevive a recargas y a navegar dentro de la pestaña,
// pero el navegador la borra al cerrarse, que es justo lo que se quiere de un inicio de sesión.
// (La velocidad de la animación sigue en localStorage: es una preferencia, no un dato de sesión.)
let REPINTAR_SESION = null;
const leerSesion = () => { try { return JSON.parse(sessionStorage.getItem('cap3-sesion') || 'null'); } catch (e) { return null; } };
const guardarSesion = s => { try { sessionStorage.setItem('cap3-sesion', JSON.stringify(s)); } catch (e) { /* sin almacenamiento */ } };
// restos de versiones anteriores, que sí persistían entre cierres del navegador
try { localStorage.removeItem('cap3-sesion'); } catch (e) { /* sin almacenamiento */ }

function initSesion() {
  const caja = $('login'), form = $('login-form'); if (!form) return;
  const sel = $('f-carrera'), otraCaja = $('f-otra-caja'), otra = $('f-otra');
  const nombre = $('f-nombre'), materia = $('f-materia'), grupo = $('f-grupo'), sem = $('f-sem'), err = $('f-error'), cancelar = $('f-cancelar');

  llenarCarreras();
  const verOtra = () => { otraCaja.hidden = sel.value !== '__otra'; };
  sel.addEventListener('change', verOtra);

  const pintarSesion = REPINTAR_SESION = () => {
    const cj = $('sesion-caja'), nm = $('sesion-nombre'), mt = $('sesion-materia'), dt = $('sesion-det');
    if (!cj || !SESION) return;
    nm.textContent = nm.title = SESION.nombre;
    mt.textContent = mt.title = SESION.materia || '';
    mt.hidden = !SESION.materia;                       // sin materia, no se deja la línea vacía
    dt.textContent = dt.title = `${SESION.carrera} · ${T('grupoCorto')} ${SESION.grupo || '—'} · ${SESION.semestre}`;
    cj.hidden = false;
  };
  const abrir = () => {
    const s = SESION || {};
    nombre.value = s.nombre || '';
    materia.value = s.materia || '';
    grupo.value = s.grupo || '';
    sem.value = s.semestre || semestreDe();
    const conocida = Object.values(PREGRADOS).flat().includes(s.carrera);
    sel.value = s.carrera ? (conocida ? s.carrera : '__otra') : 'Física';   // por defecto, Física
    otra.value = conocida ? '' : (s.carrera || '');
    verOtra(); err.hidden = true;
    cancelar.hidden = !SESION;
    caja.hidden = false;
    setTimeout(() => nombre.focus(), 60);
  };
  const cerrar = () => { if (SESION) caja.hidden = true; };

  form.addEventListener('submit', e => {
    e.preventDefault();
    const n = nombre.value.trim();
    const carrera = sel.value === '__otra' ? otra.value.trim() : sel.value;
    if (!n) { err.textContent = 'Escribe el nombre del estudiante.'; err.hidden = false; nombre.focus(); return; }
    if (!carrera) { err.textContent = 'Escribe el nombre del programa.'; err.hidden = false; otra.focus(); return; }
    SESION = { nombre: n, materia: materia.value.trim(), carrera, grupo: grupo.value.trim(), semestre: sem.value };
    guardarSesion(SESION); pintarSesion(); caja.hidden = true;
  });
  cancelar.addEventListener('click', cerrar);
  caja.addEventListener('mousedown', e => { if (e.target === caja) cerrar(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !caja.hidden) cerrar(); });
  const btn = $('sesion-cambiar'); if (btn) btn.addEventListener('click', abrir);

  SESION = leerSesion();
  if (SESION) { SESION.semestre = semestreDe(); guardarSesion(SESION); pintarSesion(); }   // el periodo se recalcula
  else abrir();
}

// ---------- Idioma ----------
const dimTxt = d => LANG === 'en' ? (I18N_DIM[d] || d) : d;
const itemTxt = (q, txt) => LANG === 'en' ? (I18N_ITEM[q] || txt) : txt;

function llenarCarreras() {
  const sel = $('f-carrera'); if (!sel) return;
  const antes = sel.value;
  sel.innerHTML = Object.entries(PREGRADOS).map(([fac, ps]) =>
    `<optgroup label="${LANG === 'en' ? (I18N_FAC[fac] || fac) : fac}">` +
    ps.map(x => `<option value="${x}">${x}</option>`).join('') + '</optgroup>').join('') +
    `<option value="__otra">${T('otroPrograma')}</option>`;
  if (antes) sel.value = antes;
}

// Reescribe todos los textos fijos de la página con el idioma activo.
function aplicarIdioma() {
  const q = s => document.querySelector(s);
  const set = (s, t) => { const e = q(s); if (e) e.textContent = t; };
  const ph = (s, t) => { const e = q(s); if (e) e.placeholder = t; };
  document.documentElement.lang = LANG;
  set('#lema', T('lema'));
  set('#pie', T('pie'));
  set('label[for="nav-sel"]', T('ejercicio'));
  set('label[for="speed"]', T('velocidad'));
  const sp = $('speed');
  if (sp) ['vel2', 'vel1', 'vel05', 'vel025', 'vel01'].forEach((k, i) => { if (sp.options[i]) sp.options[i].text = T(k); });
  set('#abrir-informe', T('btnInforme'));
  set('#sesion-cambiar', T('cambiar'));
  set('#login-tit', T('loginTit'));
  set('#login-form .modal-sub', 'ω · ' + T('lema'));
  set('label[for="f-nombre"]', T('lblNombre')); ph('#f-nombre', T('phNombre'));
  set('label[for="f-materia"]', T('lblMateria')); ph('#f-materia', T('phMateria'));
  set('label[for="f-carrera"]', T('lblCarrera'));
  set('label[for="f-otra"]', T('lblOtra')); ph('#f-otra', T('phOtra'));
  set('label[for="f-grupo"]', T('lblGrupo')); ph('#f-grupo', T('phGrupo'));
  set('label[for="f-sem"]', T('lblSem'));
  set('#f-sem-nota', T('notaSem'));
  set('#f-cancelar', T('cancelar'));
  set('#login-form button[type="submit"]', T('entrar'));
  set('#inf-tit', T('infTit'));
  set('#informe .modal-sub', T('infSub'));
  llenarCarreras();
  if (REPINTAR_SESION && SESION) REPINTAR_SESION();
}

function initIdioma() {
  const radios = [...document.querySelectorAll('input[name="lang"]')];
  if (!radios.length) return;
  try { const g = localStorage.getItem('cap3-lang'); if (g === 'en' || g === 'es') LANG = g; } catch (e) { /* sin almacenamiento */ }
  radios.forEach(r => { r.checked = r.value === LANG; });
  aplicarIdioma();
  radios.forEach(r => r.addEventListener('change', () => {
    if (!r.checked) return;
    LANG = r.value === 'en' ? 'en' : 'es';
    try { localStorage.setItem('cap3-lang', LANG); } catch (e) { /* sin almacenamiento */ }
    aplicarIdioma(); buildNav();
    if (CUR) show(CUR.id);              // repintar el módulo abierto en el nuevo idioma
  }));
}

window.addEventListener('DOMContentLoaded', () => {
  initIdioma();
  buildNav(); initVelocidad(); initSesion(); initInforme();
  const ir = () => { const h = location.hash.slice(1); show(MODULES.some(m => m.id === h) ? h : MODULES[0].id); };
  // también al pegar una URL con #id en una pestaña ya abierta o al usar atrás/adelante
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h && (!CUR || CUR.id !== h) && MODULES.some(m => m.id === h)) show(h); });
  ir();
});

// ============================================================
//  Informe de simulación · usabilidad ISO/IEC 25010:2011
// ============================================================
// 24 ítems en escala Likert de 5 puntos. Q3, Q6, Q9 y Q14 están redactados en
// sentido negativo y se invierten (6 − x) antes de promediar.
const D_REC = 'Reconocimiento de la adecuación', D_APR = 'Capacidad de aprendizaje',
  D_OPE = 'Operabilidad', D_ERR = 'Protección frente a errores', D_EST = 'Estética',
  D_ACC = 'Accesibilidad', D_SAT = 'Satisfacción';
const ITEMS = [
  ['Q1', D_REC, 'Comprensión del propósito del simulador', 0],
  ['Q2', D_REC, 'Identificación de las funciones principales (simular, elegir escenarios, exportar el reporte)', 0],
  ['Q3', D_APR, 'Claridad del flujo de trabajo inicial', 1],
  ['Q4', D_APR, 'Facilidad para configurar ω₀, el amortiguamiento, el forzamiento y el algoritmo', 0],
  ['Q5', D_APR, 'Aprendizaje sin ayuda externa', 0],
  ['Q6', D_APR, 'Dificultad para recordar los pasos', 1],
  ['Q7', D_OPE, 'Navegación sencilla y lógica', 0],
  ['Q8', D_OPE, 'Respuesta adecuada de botones y controles', 0],
  ['Q9', D_OPE, 'Necesidad de muchos intentos para lograr el objetivo', 1],
  ['Q10', D_ERR, 'Velocidad de respuesta del simulador', 0],
  ['Q11', D_ERR, 'Acotación de parámetros fuera de rango', 0],
  ['Q12', D_ERR, 'Mensajes de error comprensibles', 0],
  ['Q13', D_ERR, 'Prevención de errores graves', 0],
  ['Q14', D_ERR, 'Comportamiento inesperado del sistema', 1],
  ['Q15', D_EST, 'Distribución de elementos en pantalla', 0],
  ['Q16', D_EST, 'El diseño visual facilita el análisis de las oscilaciones, los espacios de fases y los circuitos', 0],
  ['Q17', D_EST, 'Interfaz agradable y profesional', 0],
  ['Q18', D_EST, 'Legibilidad de textos y etiquetas', 0],
  ['Q19', D_EST, 'Identificación de la información en las animaciones, las gráficas y los esquemas de circuito', 0],
  ['Q20', D_EST, 'Uso sin ajustes técnicos adicionales', 0],
  ['Q21', D_ACC, 'Facilita el estudio frente a programar la simulación manualmente', 0],
  ['Q22', D_SAT, 'Facilita el trabajo docente o de investigación', 0],
  ['Q23', D_SAT, 'Satisfacción general de uso', 0],
  ['Q24', D_SAT, 'Recomendaría el simulador a otros usuarios', 0],
];
const DIMS = [D_REC, D_APR, D_OPE, D_ERR, D_EST, D_ACC, D_SAT];
// Créditos, en un solo sitio: encabezado de la página y pie de los dos tipos de reporte.
const AUTORES = 'Autores: Nicolas de la Espriella Vélez Ph. D., Daniel José Salas Álvarez M. Sc., Pierre Augusto Peña salgado M. Sc.';
const nivelDe = s => s >= 70 ? 'Alto' : s >= 50 ? 'Moderado' : 'Bajo';
const scorePct = media => (media - 1) / 4 * 100;
const VISITADOS = new Set();

function calcularUsabilidad(resp) {
  const aj = {};                                   // valor ya invertido donde corresponde
  ITEMS.forEach(([q, , , inv]) => { aj[q] = inv ? 6 - resp[q] : resp[q]; });
  const porDim = DIMS.map(d => {
    const qs = ITEMS.filter(i => i[1] === d).map(i => i[0]);
    const media = qs.reduce((s, q) => s + aj[q], 0) / qs.length;
    return { dim: d, n: qs.length, media, score: scorePct(media), nivel: nivelDe(scorePct(media)) };
  });
  const todos = ITEMS.map(i => aj[i[0]]);
  const mediaG = todos.reduce((a, b) => a + b, 0) / todos.length;
  return { aj, porDim, global: { n: todos.length, media: mediaG, score: scorePct(mediaG), nivel: nivelDe(scorePct(mediaG)) } };
}

function textoInforme(resp, R) {
  const s = SESION || {}, d = new Date(), f = n => String(n).padStart(2, '0');
  const fecha = `${d.getFullYear()}-${f(d.getMonth() + 1)}-${f(d.getDate())} ${f(d.getHours())}:${f(d.getMinutes())}`;
  const sep = '='.repeat(78), sub = '-'.repeat(78), L = [];
  const fila = (dim, n, media, sc, niv) =>
    '  ' + String(dim).padEnd(36) + String(n).padStart(5) + String(media).padStart(8) + String(sc).padStart(10) + '   ' + niv;
  const et = (k, v) => L.push(T(k).padEnd(15) + ' : ' + v);
  L.push(sep, '  ω · OMEGAW — ' + T('repUsa'), '  ' + T('repUsaSub'), sep, '');
  et('rFecha', fecha);
  et('rEstudiante', s.nombre || T('rSinReg'));
  et('rMateria', s.materia || T('rSinReg'));
  et('rCarrera', s.carrera || T('rSinReg'));
  et('rGrupo', s.grupo || T('rSinReg'));
  et('rSemestre', s.semestre || T('rSinReg'));
  et('rModulo', CUR ? CUR.tag + ' · ' + CUR.short : '—');
  et('rUsados', `${VISITADOS.size} ${T('rDe')} ${MODULES.length}` + (VISITADOS.size ? '  [' + [...VISITADOS].join(', ') + ']' : ''));
  L.push('', T('sInstr'), sub);
  L.push('  ' + T('iEscala'));
  L.push('  ' + T('iAgrup'));
  L.push('  ' + T('iInv'));
  L.push('  Score (%) = (' + T('colMedia') + ' - 1) / 4 x 100');
  L.push('  ' + T('iNiveles'));
  L.push('', T('sRespuestas'), sub);
  L.push('  ' + T('hItem').padEnd(6) + T('colDim').padEnd(38) + T('hResp').padStart(5) + T('hAjust').padStart(8) + '  ' + T('hDescr'));
  ITEMS.forEach(([q, dim, txt, inv]) => {
    L.push('  ' + q.padEnd(6) + dimTxt(dim).padEnd(38) + String(resp[q]).padStart(5) + String(R.aj[q]).padStart(8) +
      (inv ? '  (inv.) ' : '  ') + itemTxt(q, txt));
  });
  L.push('', T('sPorDim'), sub);
  L.push(fila(T('colDim'), T('colItems'), T('colMedia'), T('colScore'), T('colNivel')));
  R.porDim.forEach(p => L.push(fila(dimTxt(p.dim), p.n, p.media.toFixed(2), p.score.toFixed(1) + ' %', p.nivel)));
  L.push('  ' + '-'.repeat(74));
  L.push(fila('GLOBAL', R.global.n, R.global.media.toFixed(2), R.global.score.toFixed(1) + ' %', R.global.nivel));
  L.push('', sep, '  ' + T('generadoPor'),
    '  ' + AUTORES, sep, '');
  return L.join('\r\n');
}

function descargarTxt(nombre, texto) {
  const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nombre;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
}

function initInforme() {
  const caja = $('informe'), cuerpo = $('inf-cuerpo'), btns = $('inf-btns'), err = $('inf-error');
  const abrirBtn = $('abrir-informe'); if (!caja || !abrirBtn) return;

  const formulario = () => {
    let h = '<div class="inf-leyenda">' + [1, 2, 3, 4, 5]
      .map(n => `<span><b>${n}</b> ${T('esc' + n)}</span>`).join('') + '</div>';
    DIMS.forEach(d => {
      h += `<div class="inf-dim">${dimTxt(d)}</div>`;
      ITEMS.filter(i => i[1] === d).forEach(([q, , txt, inv]) => {
        h += `<div class="inf-item" id="fila-${q}"><code>${q}</code><p>${itemTxt(q, txt)}${inv ? ' <em>' + T('invertida') + '</em>' : ''}</p><div class="inf-esc">` +
          [1, 2, 3, 4, 5].map(v => `<label title="${v}"><input type="radio" name="${q}" value="${v}"><span>${v}</span></label>`).join('') +
          '</div></div>';
      });
    });
    cuerpo.innerHTML = h;
    btns.innerHTML = `<button type="button" class="btn" id="inf-cerrar">${T('cancelar')}</button>` +
      `<button type="button" class="btn primary" id="inf-calcular">${T('calcular')}</button>`;
    $('inf-cerrar').onclick = () => { caja.hidden = true; };
    $('inf-calcular').onclick = calcularYmostrar;
    err.hidden = true;
  };

  // window.close() solo surte efecto en pestañas abiertas por script; si el usuario
  // llegó por URL o marcador el navegador lo bloquea, así que queda esta pantalla.
  const despedida = archivo => {
    stopAnim();
    const d = document.createElement('div');
    d.className = 'modal-fondo'; d.id = 'adios';
    d.innerHTML = '<div class="modal modal-centro card">' +
      `<h2>${T('descargado')}</h2>` +
      '<p class="modal-sub">' + archivo + '</p>' +
      `<p class="modal-nota">${T('gracias')}</p>` +
      '<div class="modal-btns">' +
      `<button type="button" class="btn" id="adios-volver">${T('volverSim')}</button>` +
      `<button type="button" class="btn primary" id="adios-cerrar">${T('cerrarPest')}</button>` +
      '</div></div>';
    document.body.appendChild(d);
    $('adios-volver').onclick = () => d.remove();
    $('adios-cerrar').onclick = () => window.close();
  };

  const calcularYmostrar = () => {
    const resp = {}, faltan = [];
    ITEMS.forEach(([q]) => {
      const m = cuerpo.querySelector(`input[name="${q}"]:checked`);
      $('fila-' + q).classList.remove('inf-falta');
      if (m) resp[q] = +m.value; else { faltan.push(q); $('fila-' + q).classList.add('inf-falta'); }
    });
    if (faltan.length) {
      err.textContent = T('faltan')(faltan.length) + faltan.join(', ') + '.';
      err.hidden = false;
      $('fila-' + faltan[0]).scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    err.hidden = true;
    const R = calcularUsabilidad(resp), txt = textoInforme(resp, R);
    cuerpo.innerHTML = '<div class="inf-res">' + tbl([T('colDim'), T('colItems'), T('colMedia'), T('colScore'), T('colNivel')],
      R.porDim.map(p => [dimTxt(p.dim), p.n, p.media.toFixed(2), p.score.toFixed(1) + ' %', p.nivel])
        .concat([['<b>GLOBAL</b>', `<b>${R.global.n}</b>`, `<b>${R.global.media.toFixed(2)}</b>`,
          `<b>${R.global.score.toFixed(1)} %</b>`, `<b>${R.global.nivel}</b>`]])) + '</div>' +
      `<p class="hint">${T('notaScore')}</p>`;
    btns.innerHTML = `<button type="button" class="btn" id="inf-volver">${T('volverCuest')}</button>` +
      `<button type="button" class="btn primary" id="inf-bajar">${T('descargar')}</button>`;
    $('inf-volver').onclick = formulario;
    const s = SESION || {}, d = new Date(), f = n => String(n).padStart(2, '0');
    const limpio = (s.nombre || 'anonimo').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').toLowerCase();
    const archivo = `informe-usabilidad-${limpio}-${d.getFullYear()}${f(d.getMonth() + 1)}${f(d.getDate())}.txt`;
    $('inf-bajar').onclick = () => {
      descargarTxt(archivo, txt);
      caja.hidden = true;                       // cerrar la ventana modal
      despedida(archivo);
      // margen para que la descarga arranque antes de intentar cerrar la pestaña
      setTimeout(() => window.close(), 1200);
    };
  };

  abrirBtn.addEventListener('click', () => { formulario(); caja.hidden = false; });
  caja.addEventListener('mousedown', e => { if (e.target === caja) caja.hidden = true; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !caja.hidden) caja.hidden = true; });
}

// ============================================================
//  Reporte .txt por ejercicio
// ============================================================
// plot() deja en PLOTS las series de cada vista, así el reporte vuelca los datos
// realmente dibujados sin tener que tocar los 23 módulos uno por uno.

const numTxt = v => !isFinite(v) ? '—'
  : (Math.abs(v) >= 1e5 || (Math.abs(v) < 1e-4 && v !== 0)) ? v.toExponential(5) : v.toFixed(6);

// Convierte el HTML de los paneles (estadísticas y vistas de tabla) a texto plano alineado.
function htmlATexto(html) {
  const d = document.createElement('div');
  d.innerHTML = html;
  d.querySelectorAll('table').forEach(t => {
    const filas = [...t.rows].map(r => [...r.cells].map(c => c.textContent.trim()));
    if (!filas.length) return;
    const nc = Math.max(...filas.map(f => f.length));
    const an = [];
    for (let i = 0; i < nc; i++) an.push(Math.max(...filas.map(f => (f[i] || '').length)));
    const txt = filas.map(f => '    ' + f.map((c, i) => i === 0 ? c.padEnd(an[i]) : c.padStart(an[i])).join('  ')).join('\n');
    t.replaceWith(document.createTextNode('\n' + txt + '\n'));
  });
  d.querySelectorAll('br,hr').forEach(e => e.replaceWith(document.createTextNode('\n')));
  d.querySelectorAll('p,div').forEach(e => e.insertAdjacentText('beforebegin', '\n'));
  return d.textContent.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

const valorControl = c => {
  const e = $('c-' + c.id); if (!e) return '';
  if (c.type === 'check') return e.checked ? 'sí' : 'no';
  if (c.type === 'select') return e.options[e.selectedIndex] ? e.options[e.selectedIndex].text : e.value;
  return e.value;
};

// Vuelca las series dibujadas. Si varias comparten el eje x se juntan en una tabla.
function datosGraficados(m) {
  const MAX = 100, out = [];
  (m.views || []).forEach(v => {
    const S = PLOTS[v.id];
    if (!S) return;
    const ser = S.filter(s => s && s.pts && s.pts.length > 1);
    if (!ser.length) return;
    const conEtq = ser.filter(s => s.label);
    const usar = (conEtq.length ? conEtq : ser).slice(0, 6);
    const n = usar[0].pts.length;
    const mismaX = usar.every(s => s.pts.length === n) &&
      usar.every(s => s.pts.every((p, i) => Math.abs(p[0] - usar[0].pts[i][0]) < 1e-9));
    const paso = Math.max(1, Math.ceil(n / MAX));
    out.push('', `  ${v.title}`);
    if (mismaX) {
      out.push(`    (${Math.ceil(n / paso)} ${T('rDe')} ${n} ${T('puntos')} · ${T('unoDe')} ${paso})`);
      out.push('    ' + ['x', ...usar.map((s, i) => s.label || 'serie ' + (i + 1))]
        .map(c => String(c).slice(0, 15).padStart(16)).join(''));
      for (let i = 0; i < n; i += paso)
        out.push('    ' + [usar[0].pts[i][0], ...usar.map(s => s.pts[i][1])]
          .map(x => numTxt(x).padStart(16)).join(''));
    } else {
      usar.forEach((s, k) => {
        const ns = s.pts.length, ps = Math.max(1, Math.ceil(ns / MAX));
        out.push(`    ${T('serie')}: ${s.label || T('serie') + ' ' + (k + 1)}  (${Math.ceil(ns / ps)} ${T('rDe')} ${ns} ${T('puntos')} · ${T('unoDe')} ${ps})`);
        out.push('    ' + 'x'.padStart(16) + 'y'.padStart(16));
        for (let i = 0; i < ns; i += ps) out.push('    ' + numTxt(s.pts[i][0]).padStart(16) + numTxt(s.pts[i][1]).padStart(16));
      });
    }
  });
  return out;
}

function textoReporte(m) {
  const s = SESION || {}, d = new Date(), f = n => String(n).padStart(2, '0');
  const fecha = `${d.getFullYear()}-${f(d.getMonth() + 1)}-${f(d.getDate())} ${f(d.getHours())}:${f(d.getMinutes())}`;
  const sep = '='.repeat(78), sub = '-'.repeat(78), L = [];
  const sangrar = t => t.split('\n').map(x => '  ' + x).join('\n');
  const et = (k, v) => L.push(T(k).padEnd(15) + ' : ' + v);
  L.push(sep, '  ω · OMEGAW — ' + T('repEjer'), `  ${m.tag} · ${m.title}`, sep, '');
  et('rFecha', fecha);
  et('rEstudiante', s.nombre || T('rSinReg'));
  et('rMateria', s.materia || T('rSinReg'));
  et('rCarrera', s.carrera || T('rSinReg'));
  et('rGrupo', s.grupo || T('rSinReg'));
  et('rSemestre', s.semestre || T('rSinReg'));
  et('rSeccion', `${m.sec} — ${m.group}`);
  L.push('', T('sEnunciado'), sub, sangrar(htmlATexto(m.desc || '')));

  const ctrls = (m.controls || []).filter(c => c.type !== 'sep');
  if (ctrls.length) {
    const an = Math.max(...ctrls.map(c => htmlATexto(c.label).length));
    L.push('', T('sParam'), sub);
    ctrls.forEach(c => L.push('  ' + htmlATexto(c.label).padEnd(an) + ' : ' + valorControl(c)));
  }
  if (m.eq) L.push('', T('sEcu'), sub, sangrar(htmlATexto(m.eq)));

  const est = $('stats');
  if (est && est.textContent.trim()) L.push('', T('sResultados'), sub, sangrar(htmlATexto(est.innerHTML)));

  (m.views || []).filter(v => v.html).forEach(v => {
    const e = $(v.id);
    if (e && e.textContent.trim()) L.push('', v.title.toUpperCase(), sub, sangrar(htmlATexto(e.innerHTML)));
  });

  const dat = datosGraficados(m);
  if (dat.length) L.push('', T('sDatos'), sub, ...dat);

  L.push('', sep, '  ' + T('generadoPor'),
    '  ' + AUTORES, sep, '');
  return L.join('\r\n');
}

function reporteModulo(m) {
  // redibujar el estado final: si la animación va a medias, las series estarían cortadas
  if (m.run.length > 0) m.run(false);
  const s = SESION || {}, d = new Date(), f = n => String(n).padStart(2, '0');
  const limpio = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  const nombre = `reporte-${limpio(m.tag)}-${limpio(s.nombre || 'anonimo')}-${d.getFullYear()}${f(d.getMonth() + 1)}${f(d.getDate())}.txt`;
  descargarTxt(nombre, textoReporte(m));
  const e = $('stats');
  if (e) e.insertAdjacentHTML('afterbegin', `<p class="hint" id="aviso-rep">${T('repDescargado')} <b>${nombre}</b></p>`);
  setTimeout(() => { const a = $('aviso-rep'); if (a) a.remove(); }, 6000);
}
