'use strict';
// ============================================================
//  Capítulo 4 · Oscillations
//  Secciones 4.1–4.3 : movimiento armónico simple, péndulo, amortiguamiento
// ============================================================

// Integradores de un grado de libertad, con a(x, v) genérica.
const PASO = {
  euler: ['Euler', (a, s, h) => { const an = a(s.x, s.v); s.x += s.v * h; s.v += an * h; }],
  cromer: ['Euler–Cromer', (a, s, h) => { s.v += a(s.x, s.v) * h; s.x += s.v * h; }],
  er: ['Euler–Richardson', (a, s, h) => {
    const an = a(s.x, s.v), vm = s.v + an * h / 2, xm = s.x + s.v * h / 2;
    const am = a(xm, vm); s.x += vm * h; s.v += am * h;
  }],
  verlet: ['Verlet de velocidades', (a, s, h) => {
    const an = a(s.x, s.v);
    s.x += s.v * h + .5 * an * h * h;
    const a1 = a(s.x, s.v + an * h);          // predicción de v para fuerzas con rozamiento
    s.v += .5 * (an + a1) * h;
  }],
};
// Integra guardando [t, x, v]; acc(x, v, t) y el paso se eligen fuera.
function integra(acc, metodo, x0, v0, dt, T) {
  const f = PASO[metodo][1], s = { x: x0, v: v0 }, P = [[0, x0, v0]];
  let t = 0;
  while (t < T - 1e-12 && P.length < 2e5) {
    const h = Math.min(dt, T - t);
    f((x, v) => acc(x, v, t), s, h); t += h;
    P.push([t, s.x, s.v]);
    if (!isFinite(s.x) || Math.abs(s.x) > 1e8) break;
  }
  return P;
}
// Periodo por cruces ascendentes de v = 0 (máximos de x), con interpolación lineal.
function periodoDe(P) {
  const tm = [];
  for (let i = 1; i < P.length; i++) {
    if (P[i - 1][2] > 0 && P[i][2] <= 0) {
      const f = P[i - 1][2] / (P[i - 1][2] - P[i][2]);
      tm.push(P[i - 1][0] + f * (P[i][0] - P[i - 1][0]));
    }
  }
  if (tm.length < 2) return { T: NaN, picos: tm };
  let s = 0; for (let i = 1; i < tm.length; i++) s += tm[i] - tm[i - 1];
  return { T: s / (tm.length - 1), picos: tm };
}
// Resorte para las animaciones
function resorte(c, x0, x1, y, n = 12, amp = 8) {
  c.beginPath(); c.moveTo(x0, y); const k = n * 2 + 1;
  for (let i = 1; i < k; i++) c.lineTo(x0 + (x1 - x0) * i / k, y + (i % 2 ? -amp : amp));
  c.lineTo(x1, y); c.stroke();
}

// ---------------- Problema 4.1 ----------------
reg({
  id: 'p41', group: '4.1 Movimiento armónico simple', sec: '4.1', tag: 'P4.1', short: 'Conservación de la energía',
  title: 'Problema 4.1 · Conservación de la energía',
  desc: 'Oscilador armónico con ω₀² = k/m. Se grafica ΔEₙ = Eₙ − E₀ a lo largo de varios ciclos. (a) Euler: ¿ΔE es pequeño en todo el ciclo o deriva con el tiempo? (b) Euler‑Cromer. (c) Euler‑Richardson y Verlet. (d) ¿Qué algoritmo respeta mejor la conservación de la energía y cuál da mejor la posición? (e) Busca el Δt que conserva la energía al 0.1 % en un ciclo para ω₀ = 3 y para ω₀ = 12.',
  eq: 'd²x/dt² = −ω₀²x ,  ω₀² = k/m<br>E/m = ½v² + ½ω₀²x²<br>Exacta: x(t) = A cos(ω₀t + δ)<br>T = 2π/ω₀',
  controls: [
    { id: 'w0', type: 'range', label: 'ω₀', min: 1, max: 12, step: .5, value: 3 },
    { id: 'dt', type: 'range', label: 'Paso Δt', min: .001, max: .2, step: .001, value: .05 },
    { id: 'cyc', type: 'range', label: 'Ciclos', min: 1, max: 40, step: 1, value: 10 },
    { id: 'x0', type: 'range', label: 'x(0)', min: .2, max: 4, step: .1, value: 1 },
    { type: 'sep', label: 'Algoritmos' },
    { id: 'euler', type: 'check', label: 'Euler', value: true, color: COL.b },
    { id: 'cromer', type: 'check', label: 'Euler–Cromer', value: true, color: COL.c },
    { id: 'er', type: 'check', label: 'Euler–Richardson', value: true, color: COL.a },
    { id: 'verlet', type: 'check', label: 'Verlet de velocidades', value: true, color: COL.d },
  ],
  buttons: [{ label: '▶ Simular', primary: true, fn: 'run' },
  { label: '🎯 Δt para 0.1 % en un ciclo', fn: m => m.buscar() }],
  views: [
    { id: 'v1', title: 'ΔEₙ = Eₙ − E₀ (energía por unidad de masa)', h: 320 },
    { id: 'v2', title: 'x(t) frente a la solución exacta', half: true, w: 440, h: 290 },
    { id: 'v3', title: 'Error en la posición |x − x_exacta|', half: true, w: 440, h: 290 },
    { id: 'v4', title: '(e) Δt necesario para conservar la energía al 0.1 % en un ciclo', html: true },
  ],
  sel() { return ['euler', 'cromer', 'er', 'verlet'].filter(k => V(k)); },
  // Δt mayor que conserva E al 0.1 % durante un ciclo, por bisección
  dtPara(metodo, w0, tol) {
    const T = 2 * Math.PI / w0, E0 = .5 * w0 * w0;
    const malo = h => {
      const P = integra(x => -w0 * w0 * x, metodo, 1, 0, h, T);
      let e = 0; P.forEach(p => { e = Math.max(e, Math.abs(.5 * p[2] ** 2 + .5 * w0 * w0 * p[1] ** 2 - E0) / E0); });
      return e > tol;
    };
    let lo = T / 1e5, hi = T / 4;
    if (!malo(hi)) return hi;
    for (let i = 0; i < 44; i++) { const m = Math.sqrt(lo * hi); malo(m) ? hi = m : lo = m; }
    return lo;
  },
  buscar() {
    const filas = [];
    [3, 12].forEach(w0 => {
      const T = 2 * Math.PI / w0;
      filas.push([`ω₀ = ${w0}  (T = ${T.toFixed(4)})`, ...this.sel().map(k => {
        const h = this.dtPara(k, w0, .001);
        return `${fmt(h, 4)}  (T/${Math.round(T / h)})`;
      })]);
    });
    $('v4').innerHTML = tbl(['', ...this.sel().map(k => PASO[k][0])], filas) +
      '<p class="hint">El Δt admisible escala con el periodo: al multiplicar ω₀ por cuatro, el periodo se divide por cuatro y el paso también. Lo que importa no es Δt en segundos sino la razón Δt/T, es decir, cuántos pasos por ciclo se dan.</p>';
  },
  run(anim) {
    const w0 = V('w0'), dt = V('dt'), x0 = V('x0'), T = V('cyc') * 2 * Math.PI / w0;
    const acc = x => -w0 * w0 * x, E = (x, v) => .5 * v * v + .5 * w0 * w0 * x * x, E0 = E(x0, 0);
    const cols = { euler: COL.b, cromer: COL.c, er: COL.a, verlet: COL.d };
    const R = this.sel().map(k => ({ k, col: cols[k], P: integra(acc, k, x0, 0, dt, T) }));
    const ex = t => x0 * Math.cos(w0 * t);
    const exs = []; for (let i = 0; i <= 700; i++) { const t = T * i / 700; exs.push([t, ex(t)]); }
    const lim = Math.min(8 * x0, Math.max(x0 * 1.2, ...R.map(r => r.P.reduce((M, p) => Math.max(M, Math.abs(p[1])), 0))));
    const dEmax = Math.min(6 * E0, Math.max(...R.map(r => r.P.reduce((M, p) => Math.max(M, Math.abs(E(p[1], p[2]) - E0)), 0)), E0 * .01));
    const draw = fr => {
      const tn = T * fr, cut = P => thin(P.filter(p => p[0] <= tn + 1e-12));
      plot($('v1'), [{ pts: [[0, 0], [T, 0]], color: '#fff', dash: [4, 4], width: 1, label: 'ΔE = 0' },
      ...R.map(r => ({ pts: cut(r.P).map(p => [p[0], E(p[1], p[2]) - E0]), color: r.col, label: PASO[r.k][0] }))],
        { xmin: 0, xmax: T, ymin: -dEmax * 1.1, ymax: dEmax * 1.1, xlabel: 't', ylabel: 'ΔE' });
      plot($('v2'), [{ pts: exs.filter(p => p[0] <= tn), color: '#fff', dash: [4, 4], width: 1.2, label: 'exacta' },
      ...R.map(r => ({ pts: cut(r.P).map(p => [p[0], p[1]]), color: r.col, label: PASO[r.k][0] }))],
        { xmin: 0, xmax: T, ymin: -lim, ymax: lim, xlabel: 't', ylabel: 'x' });
      plot($('v3'), R.map(r => ({ pts: cut(r.P).map(p => [p[0], Math.abs(p[1] - ex(p[0]))]), color: r.col, label: PASO[r.k][0] })),
        { xmin: 0, xmax: T, ymin: 0, xlabel: 't', ylabel: '|Δx|', legend: 'left' });
    };
    go(anim, draw, 2600);
    S(tbl(['Algoritmo', 'máx |ΔE|/E₀', 'ΔE al final', '|Δx| al final'], R.map(r => {
      const u = r.P[r.P.length - 1];
      let mx = 0; r.P.forEach(p => { mx = Math.max(mx, Math.abs(E(p[1], p[2]) - E0)); });
      return [`<span style="color:${r.col}">${PASO[r.k][0]}</span>`, fmt(mx / E0, 4),
        fmt(E(u[1], u[2]) - E0, 4), fmt(Math.abs(u[1] - ex(u[0])))];
    })) + `<p class="muted">Euler deja crecer la energía en cada paso. Euler‑Cromer y Verlet son simplécticos: ΔE oscila dentro de una banda y no deriva. Euler‑Richardson da la mejor posición, pero su energía sí deriva poco a poco. E₀ = ${fmt(E0, 4)}.</p>`);
  }
});

// ---------------- Problema 4.2 ----------------
reg({
  id: 'p42', group: '4.1 Movimiento armónico simple', sec: '4.1', tag: 'P4.2', short: 'Análisis del movimiento armónico',
  title: 'Problema 4.2 · Análisis del movimiento armónico simple',
  desc: '(a) Grafica la energía cinética y la potencial: ¿dónde del ciclo es máxima cada una? (b) Calcula sus promedios en un ciclo completo y compáralos. (c) Comprueba que x(t)/A no depende de A, y encuentra en qué unidades de tiempo tampoco depende de ω₀. (d) Dibuja el espacio de fases p frente a x para varias condiciones iniciales: ¿qué forma tiene, qué magnitud física distingue cada trayectoria y en qué sentido se recorre?',
  eq: 'K/m = ½v²   ,   U/m = ½ω₀²x²<br>⟨K⟩ = ⟨U⟩ = E/2  (teorema del virial)<br>Espacio de fases: (x/A)² + (v/Aω₀)² = 1',
  controls: [
    { id: 'w0', type: 'range', label: 'ω₀', min: 1, max: 10, step: .5, value: 3 },
    { id: 'A', type: 'range', label: 'Amplitud A', min: .5, max: 4, step: .1, value: 1 },
    { id: 'cyc', type: 'range', label: 'Ciclos', min: 1, max: 6, step: 1, value: 2 },
    { id: 'esc', type: 'check', label: '(c) Escalar: x/A frente a t·ω₀/2π', value: false, color: COL.a },
    { id: 'fases', type: 'select', label: '(d) Condiciones iniciales del espacio de fases', value: 'tres', options: [['una', 'Solo la actual'], ['tres', 'x₀=1,v₀=0 · x₀=0,v₀=1 · x₀=4,v₀=0']] },
  ],
  views: [
    { id: 'v1', title: '(a) Energía cinética y potencial a lo largo del ciclo', h: 300 },
    { id: 'v2', title: '(c) x(t), o x/A en unidades de periodo si se activa el escalado', half: true, w: 440, h: 290 },
    { id: 'v3', title: '(d) Espacio de fases: v frente a x', half: true, w: 440, h: 290 },
  ],
  run(anim) {
    const w0 = V('w0'), A = V('A'), T0 = 2 * Math.PI / w0, T = V('cyc') * T0, esc = V('esc');
    const N = 900, P = [];
    for (let i = 0; i <= N; i++) { const t = T * i / N; P.push([t, A * Math.cos(w0 * t), -A * w0 * Math.sin(w0 * t)]); }
    const K = p => .5 * p[2] * p[2], U = p => .5 * w0 * w0 * p[1] * p[1], E0 = .5 * w0 * w0 * A * A;
    // promedios en un ciclo exacto, por la regla del trapecio
    const unCiclo = P.filter(p => p[0] <= T0 + 1e-12);
    const prom = f => { let s = 0; for (let i = 1; i < unCiclo.length; i++) s += (f(unCiclo[i]) + f(unCiclo[i - 1])) / 2 * (unCiclo[i][0] - unCiclo[i - 1][0]); return s / unCiclo[unCiclo.length - 1][0]; };
    const Km = prom(K), Um = prom(U);
    const inic = V('fases') === 'tres' ? [[1, 0], [0, 1], [4, 0]] : [[A, 0]];
    const draw = fr => {
      const tn = T * fr, cut = P.filter(p => p[0] <= tn + 1e-12);
      plot($('v1'), [
        { pts: thin(cut).map(p => [p[0], K(p)]), color: COL.b, label: 'cinética K/m' },
        { pts: thin(cut).map(p => [p[0], U(p)]), color: COL.a, label: 'potencial U/m' },
        { pts: thin(cut).map(p => [p[0], K(p) + U(p)]), color: '#fff', width: 1.6, label: 'total E/m' },
        { pts: [[0, Km], [T, Km]], color: COL.b, dash: [3, 4], width: 1, label: `⟨K⟩ = ${fmt(Km, 4)}` },
      ], { xmin: 0, xmax: T, ymin: 0, ymax: E0 * 1.15, xlabel: 't', ylabel: 'energía / m' });
      plot($('v2'), [{ pts: thin(cut).map(p => esc ? [p[0] / T0, p[1] / A] : [p[0], p[1]]), color: COL.a, label: esc ? 'x/A' : 'x(t)' }],
        { xmin: 0, xmax: esc ? T / T0 : T, ymin: esc ? -1.1 : -A * 1.1, ymax: esc ? 1.1 : A * 1.1,
          xlabel: esc ? 't / T' : 't', ylabel: esc ? 'x / A' : 'x' });
      const cols = [COL.a, COL.b, COL.d];
      plot($('v3'), inic.map(([xi, vi], i) => {
        const Ai = Math.hypot(xi, vi / w0), fase = Math.atan2(-vi / (w0 * Ai), xi / Ai), pts = [];
        const hasta = Math.min(1, fr) * 2 * Math.PI;
        for (let a = 0; a <= hasta + 1e-9; a += Math.PI / 90) pts.push([Ai * Math.cos(a + fase), -Ai * w0 * Math.sin(a + fase)]);
        return { pts, color: cols[i % 3], label: `x₀=${xi}, v₀=${vi} · E/m=${fmt(.5 * vi * vi + .5 * w0 * w0 * xi * xi, 3)}` };
      }), { xlabel: 'x', ylabel: 'v', legend: 'left' });
    };
    go(anim, draw, 2600);
    S(tbl(['Magnitud', 'Valor'], [
      ['⟨K⟩/m en un ciclo', fmt(Km, 5)], ['⟨U⟩/m en un ciclo', fmt(Um, 5)],
      ['⟨K⟩ − ⟨U⟩', fmt(Km - Um)], ['E/m total', fmt(E0, 5)], ['Periodo T = 2π/ω₀', fmt(T0, 5)],
    ]) + '<p class="muted">(a) K es máxima al pasar por x = 0 y U lo es en los extremos. (b) Los dos promedios valen E/2: es el teorema del virial para un potencial cuadrático. (c) Con x/A frente a t/T la curva es la misma para cualquier A y cualquier ω₀. (d) Las trayectorias son elipses, una por cada energía, recorridas en sentido horario porque v &gt; 0 hace crecer x.</p>');
  }
});

// ---------------- Problema 4.3 ----------------
reg({
  id: 'p43', group: '4.1 Movimiento armónico simple', sec: '4.1', tag: 'P4.3', short: 'Figuras de Lissajous',
  title: 'Problema 4.3 · Figuras de Lissajous',
  desc: 'Un osciloscopio con entradas sinusoidales en los dos ejes: x = Aₓ·sen(ωₓt + φₓ), y = A_y·sen(ω_y t + φ_y). Si la curva se cierra sobre sí misma es una figura de Lissajous. Empieza con Aₓ = A_y = 1, ωₓ = 2, ω_y = 3, φₓ = π/6, φ_y = π/4. ¿Para qué valores de ωₓ y ω_y se obtiene una figura cerrada? ¿Cómo influyen las fases y las amplitudes?',
  eq: 'x = Aₓ sen(ωₓt + φₓ)<br>y = A_y sen(ω_y t + φ_y)<br>La curva se cierra si ωₓ/ω_y es racional<br>Periodo común: T = 2π·p/ωₓ = 2π·q/ω_y',
  controls: [
    { id: 'wx', type: 'range', label: 'ωₓ', min: 1, max: 9, step: 1, value: 2 },
    { id: 'wy', type: 'range', label: 'ω_y', min: 1, max: 9, step: 1, value: 3 },
    { id: 'frac', type: 'range', label: 'Desajuste de ω_y (×)', min: .9, max: 1.1, step: .002, value: 1 },
    { id: 'Ax', type: 'range', label: 'Aₓ', min: .2, max: 1.5, step: .05, value: 1 },
    { id: 'Ay', type: 'range', label: 'A_y', min: .2, max: 1.5, step: .05, value: 1 },
    { id: 'px', type: 'range', label: 'φₓ (× π)', min: 0, max: 2, step: 1 / 12, value: 1 / 6 },
    { id: 'py', type: 'range', label: 'φ_y (× π)', min: 0, max: 2, step: 1 / 12, value: .25 },
  ],
  buttons: [{ label: '▶ Dibujar', primary: true, fn: 'run' },
  { label: 'Enunciado (2:3)', fn: () => setVals({ wx: 2, wy: 3, frac: 1, Ax: 1, Ay: 1, px: 1 / 6, py: .25 }) },
  { label: '1:1 (elipse)', fn: () => setVals({ wx: 1, wy: 1, frac: 1, px: 0, py: .5 }) },
  { label: '3:4', fn: () => setVals({ wx: 3, wy: 4, frac: 1 }) },
  { label: 'Irracional', fn: () => setVals({ wx: 2, wy: 3, frac: 1.014 }) }],
  views: [
    { id: 'v1', title: 'Pantalla del osciloscopio: y frente a x', h: 420 },
    { id: 'v2', title: 'Las dos señales por separado', h: 240 },
  ],
  run(anim) {
    const wx = V('wx'), wy = V('wy') * V('frac'), Ax = V('Ax'), Ay = V('Ay');
    const px = V('px') * Math.PI, py = V('py') * Math.PI;
    const mcd = (a, b) => b ? mcd(b, a % b) : a;
    const cerrada = Math.abs(V('frac') - 1) < 1e-9;
    const Tc = cerrada ? 2 * Math.PI * (V('wy') / mcd(V('wx'), V('wy'))) / wy * mcd(V('wx'), V('wy')) / 1 : 0;
    const Tcom = cerrada ? 2 * Math.PI / mcd(V('wx'), V('wy')) : 40 * Math.PI / Math.min(wx, wy);
    const N = 4000, P = [];
    for (let i = 0; i <= N; i++) { const t = Tcom * i / N; P.push([t, Ax * Math.sin(wx * t + px), Ay * Math.sin(wy * t + py)]); }
    const draw = fr => {
      const n = Math.max(2, Math.floor(P.length * fr)), q = P[n - 1];
      const g = plot($('v1'), [{ pts: P.slice(0, n).map(p => [p[1], p[2]]), color: COL.a, width: 1.8, label: `ωₓ : ω_y = ${V('wx')} : ${(V('wy') * V('frac')).toFixed(3)}` }],
        { xmin: -1.6, xmax: 1.6, ymin: -1.6, ymax: 1.6, xlabel: 'x', ylabel: 'y' });
      dot2(g.c, g.X(q[1]), g.Y(q[2]), 6, COL.c);
      plot($('v2'), [
        { pts: thin(P.slice(0, n)).map(p => [p[0], p[1]]), color: COL.a, label: 'x(t)' },
        { pts: thin(P.slice(0, n)).map(p => [p[0], p[2]]), color: COL.b, label: 'y(t)' },
      ], { xmin: 0, xmax: Tcom, ymin: -1.6, ymax: 1.6, xlabel: 't', ylabel: 'señal' });
    };
    go(anim, draw, 3200);
    S(`ωₓ / ω_y = <b>${(wx / wy).toFixed(5)}</b><br>` +
      (cerrada ? `Razón racional <b>${V('wx')} : ${V('wy')}</b> → la curva <b>se cierra</b><br>Periodo común: <b>${fmt(Tcom, 4)}</b><br>Lóbulos: ${V('wy') / mcd(V('wx'), V('wy'))} horizontales × ${V('wx') / mcd(V('wx'), V('wy'))} verticales`
        : 'Razón <b>irracional</b> (desajuste activo) → la curva <b>nunca se cierra</b> y va rellenando el rectángulo') +
      '<p class="muted">La figura se cierra cuando ωₓ/ω_y es un número racional p/q; entonces hay un periodo común y la traza se repite. Las fases rotan e inclinan la figura (con 1:1 y φ_y − φₓ = π/2 sale un círculo); las amplitudes solo la estiran en cada eje. Mueve «Desajuste» un poco y verás la figura girar sin cerrarse nunca.</p>');
  }
});

// ---------------- Problema 4.4 ----------------
reg({
  id: 'p44', group: '4.1 Movimiento armónico simple', sec: '4.1', tag: 'P4.4', short: 'Superposición de ondas',
  title: 'Problema 4.4 · Superposición de ondas',
  desc: '(a) Dibuja A·sen(kx + ωt) de x_min a x_max en función de t, con A = 1, ω = 2π y k = 2π/λ con λ = 2. (b) Suma y₁ = sen(kx − ωt) con y₂ = sen(kx + ωt): ¿qué tipo de onda aparece? (c) Demuestra los batidos superponiendo dos ondas de números de onda y velocidades ligeramente distintos, y determina la frecuencia de batido en cada caso.',
  eq: 'y₁ = A sen(k₁x − ω₁t) ,  y₂ = A sen(k₂x + s·ω₂t)<br>Onda estacionaria: sen(kx−ωt) + sen(kx+ωt) = 2 sen kx · cos ωt<br>Batido: ω_bat = |ω₁ − ω₂| ,  f_bat = ω_bat/2π',
  controls: [
    { id: 'caso', type: 'select', label: 'Caso', value: 'b', options: [['a', '(a) Una sola onda'], ['b', '(b) Onda estacionaria'], ['c1', '(c) Batido: 8.4(x−1.1t) + 8.0(x−1.1t)'], ['c2', '(c) Batido: 8.4(x−1.2t) + 8.0(x−1.0t)'], ['c3', '(c) Batido: 8.4(x−1.0t) + 8.0(x−1.2t)'], ['libre', 'Libre']] },
    { type: 'sep', label: 'Parámetros libres' },
    { id: 'k1', type: 'range', label: 'k₁', min: .5, max: 12, step: .1, value: 8.4 },
    { id: 'c1', type: 'range', label: 'velocidad v₁', min: .5, max: 2, step: .05, value: 1.1 },
    { id: 'k2', type: 'range', label: 'k₂', min: .5, max: 12, step: .1, value: 8 },
    { id: 'c2', type: 'range', label: 'velocidad v₂', min: .5, max: 2, step: .05, value: 1.1 },
    { id: 'tmax', type: 'range', label: 'Tiempo de la animación', min: 1, max: 12, step: .5, value: 4 },
  ],
  views: [
    { id: 'v1', title: 'y(x) en el instante actual', h: 300 },
    { id: 'v2', title: 'Las dos componentes por separado', half: true, w: 440, h: 250 },
    { id: 'v3', title: 'y(t) en x = 0: aquí se ve el batido', half: true, w: 440, h: 250 },
  ],
  run(anim) {
    const caso = V('caso');
    // k1, v1, k2, v2, signo del segundo término
    const CFG = { a: [Math.PI, 1, 0, 0, 1], b: [Math.PI, 1, Math.PI, 1, 1],
      c1: [8.4, 1.1, 8.0, 1.1, -1], c2: [8.4, 1.2, 8.0, 1.0, -1], c3: [8.4, 1.0, 8.0, 1.2, -1] };
    const [k1, v1, k2, v2, sg] = caso === 'libre' ? [V('k1'), V('c1'), V('k2'), V('c2'), -1] : CFG[caso];
    const w1 = k1 * v1, w2 = k2 * v2, T = V('tmax');
    const X0 = -10, X1 = 10, N = 900;
    const y1 = (x, t) => Math.sin(k1 * x - w1 * t);
    const y2 = (x, t) => caso === 'a' ? 0 : (caso === 'b' ? Math.sin(k2 * x + w2 * t) : Math.sin(k2 * x + sg * w2 * t));
    const serieT = []; for (let i = 0; i <= 900; i++) { const t = T * i / 900; serieT.push([t, y1(0, t) + y2(0, t)]); }
    const draw = fr => {
      const tn = T * fr, xs = [];
      for (let i = 0; i <= N; i++) xs.push(X0 + (X1 - X0) * i / N);
      plot($('v1'), [{ pts: xs.map(x => [x, y1(x, tn) + y2(x, tn)]), color: COL.a, width: 2, label: `y₁ + y₂   (t = ${tn.toFixed(2)})` }],
        { xmin: X0, xmax: X1, ymin: -2.2, ymax: 2.2, xlabel: 'x', ylabel: 'y' });
      plot($('v2'), [
        { pts: xs.filter((_, i) => i % 2 === 0).map(x => [x, y1(x, tn)]), color: COL.b, width: 1.3, label: 'y₁' },
        { pts: xs.filter((_, i) => i % 2 === 0).map(x => [x, y2(x, tn)]), color: COL.d, width: 1.3, label: 'y₂' },
      ], { xmin: X0, xmax: X1, ymin: -1.3, ymax: 1.3, xlabel: 'x', ylabel: 'y' });
      plot($('v3'), [{ pts: thin(serieT.filter(p => p[0] <= tn)), color: COL.c, label: 'y(0, t)' }],
        { xmin: 0, xmax: T, ymin: -2.2, ymax: 2.2, xlabel: 't', ylabel: 'y' });
    };
    go(anim, draw, 3400);
    const wb = Math.abs(w1 - w2);
    S(tbl(['', 'onda 1', 'onda 2'], [['k', fmt(k1, 3), caso === 'a' ? '—' : fmt(k2, 3)],
      ['velocidad', fmt(v1, 3), caso === 'a' ? '—' : fmt(v2, 3)], ['ω = k·v', fmt(w1, 4), caso === 'a' ? '—' : fmt(w2, 4)]]) +
      (caso === 'b' ? '<p class="muted">Dos ondas iguales que viajan en sentidos opuestos dan una <b>onda estacionaria</b>: 2·sen(kx)·cos(ωt). Los nodos no se mueven y la envolvente solo respira.</p>'
        : caso === 'a' ? '<p class="muted">Una sola onda viajera: el perfil se desplaza sin deformarse con velocidad v = ω/k.</p>'
          : `<p class="muted">ω_batido = |ω₁ − ω₂| = <b>${fmt(wb, 4)}</b> rad/s → f_batido = <b>${fmt(wb / (2 * Math.PI), 4)}</b> Hz, periodo de batido <b>${fmt(2 * Math.PI / (wb || 1e-9), 4)}</b> s. Si las dos ondas tienen la misma velocidad (primer caso) la envolvente viaja con ellas; si las velocidades difieren, la envolvente se mueve a otra velocidad que la de las crestas.</p>`));
  }
});

// ---------------- Listados 4.1 y 4.2 ----------------
reg({
  id: 'l41', group: '4.2 El péndulo', sec: '4.2', tag: 'L4.1–4.2', short: 'Pendulum y PendulumApp',
  title: 'Listados 4.1 y 4.2 · La clase Pendulum y su visualización',
  desc: 'Versión en JavaScript de Pendulum (que implementa Drawable y ODE) y de PendulumApp. El estado es {θ, dθ/dt, t} y la derivada es dθ/dt y −ω₀²·sen θ, integrada con Euler‑Richardson. A la izquierda el péndulo dibujado, a la derecha θ(t), igual que las dos ventanas del programa original.',
  eq: 'estado = {θ, dθ/dt, t}<br>rate[0] = state[1]<br>rate[1] = −ω₀²·sen(state[0])<br>rate[2] = 1<br>ω₀² = g/L',
  controls: [
    { id: 'w02', type: 'range', label: 'ω₀² = g/L', min: 1, max: 20, step: .5, value: 3 },
    { id: 'th0', type: 'range', label: 'θ inicial (rad)', min: -3, max: 3, step: .05, value: .5 },
    { id: 'w', type: 'range', label: 'dθ/dt inicial', min: -4, max: 4, step: .1, value: 0 },
    { id: 'dt', type: 'range', label: 'dt', min: .005, max: .2, step: .005, value: .05 },
    { id: 'estela', type: 'check', label: 'Dejar estela de la lenteja', value: true, color: COL.c },
  ],
  live: false,
  buttons: [{ label: '▶ Iniciar / Reiniciar', primary: true, fn: 'run' }, { label: '⏸ Pausa', fn: () => stopAnim() }],
  views: [
    { id: 'v1', title: 'DisplayFrame · el péndulo', half: true, w: 440, h: 360 },
    { id: 'v2', title: 'PlotFrame · θ frente al tiempo', half: true, w: 440, h: 360 },
  ],
  run() {
    const w02 = V('w02'), dt = V('dt'), cv = $('v1'), c = cv.getContext('2d');
    let s = [V('th0'), V('w'), 0];
    const rate = st => [st[1], -w02 * Math.sin(st[0]), 1];
    const serie = [[0, s[0]]], estela = [];
    const draw = () => {
      const W = cv.width, H = cv.height; c.clearRect(0, 0, W, H);
      const px = W / 2, py = 60, L = Math.min(W, H) * .32;
      const bx = px + L * Math.sin(s[0]), by = py + L * Math.cos(s[0]);
      c.strokeStyle = '#ffffff18'; c.beginPath(); c.moveTo(px - 70, py); c.lineTo(px + 70, py); c.stroke();
      c.strokeStyle = '#ffffff12'; c.setLineDash([3, 4]); c.beginPath(); c.moveTo(px, py); c.lineTo(px, py + L + 30); c.stroke(); c.setLineDash([]);
      if (V('estela') && estela.length > 1) {
        c.strokeStyle = COL.c + '66'; c.lineWidth = 1.4; c.beginPath();
        estela.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke();
      }
      c.strokeStyle = '#cfe3dd'; c.lineWidth = 2; c.beginPath(); c.moveTo(px, py); c.lineTo(bx, by); c.stroke();
      dot2(c, px, py, 4, '#cfe3dd');
      dot2(c, bx, by, 13, COL.b);
      c.fillStyle = '#e9f2ef'; c.font = '12px JetBrains Mono'; c.textAlign = 'left';
      c.fillText(`t = ${s[2].toFixed(2)}`, 12, 20);
      c.fillText(`θ = ${s[0].toFixed(3)} rad`, 12, 36);
      c.fillText(`dθ/dt = ${s[1].toFixed(3)}`, 12, 52);
      plot($('v2'), [{ pts: thin(serie), color: COL.a, label: 'θ(t)' },
      { pts: [[0, 0], [Math.max(serie[serie.length - 1][0], 1), 0]], color: '#ffffff33', dash: [3, 4], width: 1 }],
        { ymin: -Math.PI * 1.05, ymax: Math.PI * 1.05, xlabel: 't', ylabel: 'θ (rad)' });
    };
    cv._redraw = draw;
    runLoop(() => {
      // Euler-Richardson, igual que el EulerRichardson del listado
      const r = rate(s), mid = s.map((x, i) => x + r[i] * dt / 2), rm = rate(mid);
      s = s.map((x, i) => x + rm[i] * dt);
      serie.push([s[2], s[0]]); if (serie.length > 4000) serie.shift();
      const W = cv.width, H = cv.height, L = Math.min(W, H) * .32;
      estela.push([W / 2 + L * Math.sin(s[0]), 60 + L * Math.cos(s[0])]);
      if (estela.length > 500) estela.shift();
      draw();
      S(`θ = <b>${s[0].toFixed(4)} rad</b><br>dθ/dt = <b>${s[1].toFixed(4)}</b><br>t = <b>${s[2].toFixed(2)}</b><br>E/mL² = <b>${(.5 * s[1] ** 2 + w02 * (1 - Math.cos(s[0]))).toFixed(5)}</b>`);
    });
  }
});

// ---------------- Problema 4.5 ----------------
reg({
  id: 'p45', group: '4.2 El péndulo', sec: '4.2', tag: 'P4.5', short: 'Oscilaciones de un péndulo',
  title: 'Problema 4.5 · Oscilaciones de un péndulo',
  desc: '(a) Dibuja también la solución analítica para ángulos pequeños. (b) Con ω₀ = 3 y θ(0) = 0.2, determina el periodo numéricamente y compáralo con 2π/ω₀; estima el error de la aproximación sen θ ≈ θ. (c) Para θ(0) = 0.1, 0.2, 0.4, 0.8 y 1.0 estudia cómo depende el periodo de la amplitud y compáralo con la serie T = T₀[1 + θ²/16 + …].',
  eq: 'd²θ/dt² = −ω₀² sen θ<br>Ángulos pequeños: θ(t) = θ₀cos(ω₀t) , T₀ = 2π/ω₀<br>Serie: T = T₀[1 + θ₀²/16 + 11θ₀⁴/3072 + …]<br>Exacto: T = (4/ω₀)·K(sen(θ₀/2))',
  controls: [
    { id: 'w0', type: 'range', label: 'ω₀ = √(g/L)', min: 1, max: 8, step: .5, value: 3 },
    { id: 'th0', type: 'range', label: 'θ(0) (rad)', min: .05, max: 3.1, step: .05, value: .2 },
    { id: 'dt', type: 'range', label: 'Δt', min: .0005, max: .02, step: .0005, value: .002 },
    { id: 'cyc', type: 'range', label: 'Ciclos', min: 2, max: 12, step: 1, value: 4 },
  ],
  buttons: [{ label: '▶ Simular', primary: true, fn: 'run' },
  { label: '(b) θ₀ = 0.2', fn: () => setVals({ w0: 3, th0: .2 }) },
  { label: '(c) θ₀ = 1.0', fn: () => setVals({ w0: 3, th0: 1 }) }],
  views: [
    { id: 'v1', title: 'θ(t): numérica frente a la aproximación de ángulos pequeños', h: 300 },
    { id: 'v2', title: 'dθ/dt frente al tiempo', half: true, w: 440, h: 270 },
    { id: 'v3', title: '(c) Periodo T en función de la amplitud θmax', half: true, w: 440, h: 270 },
  ],
  run(anim) {
    const w0 = V('w0'), th0 = V('th0'), dt = V('dt'), T0 = 2 * Math.PI / w0, T = V('cyc') * T0 * 1.6;
    const acc = th => -w0 * w0 * Math.sin(th);
    const P = integra(acc, 'er', th0, 0, dt, T);
    const { T: Tn } = periodoDe(P);
    // periodo exacto por la integral elíptica completa K(k), con la media aritmético-geométrica
    const Kelip = k => { let a = 1, b = Math.sqrt(1 - k * k); for (let i = 0; i < 40; i++) { const na = (a + b) / 2; b = Math.sqrt(a * b); a = na; } return Math.PI / (2 * a); };
    const Texacto = t0 => 4 / w0 * Kelip(Math.sin(t0 / 2));
    const curva = [], serieT = [], serieE = [];
    for (let t0 = .05; t0 <= 3.05; t0 += .05) {
      curva.push([t0, Texacto(t0) / T0]);
      serieT.push([t0, 1 + t0 * t0 / 16 + 11 * t0 ** 4 / 3072]);
    }
    [.1, .2, .4, .8, 1].forEach(t0 => {
      const Q = integra(acc, 'er', t0, 0, Math.min(dt, .002), 6 * T0 * 1.6);
      serieE.push([t0, periodoDe(Q).T / T0]);
    });
    const ex = t => th0 * Math.cos(w0 * t);
    const draw = fr => {
      const tn = T * fr, cut = thin(P.filter(p => p[0] <= tn + 1e-12));
      plot($('v1'), [
        { pts: cut.map(p => [p[0], p[1]]), color: COL.a, label: 'numérica (no lineal)' },
        { pts: cut.map(p => [p[0], ex(p[0])]), color: '#fff', dash: [4, 4], width: 1.3, label: 'ángulos pequeños' },
      ], { xmin: 0, xmax: T, ymin: -th0 * 1.15, ymax: th0 * 1.15, xlabel: 't', ylabel: 'θ (rad)' });
      plot($('v2'), [{ pts: cut.map(p => [p[0], p[2]]), color: COL.d, label: 'dθ/dt' }],
        { xmin: 0, xmax: T, xlabel: 't', ylabel: 'dθ/dt' });
      plot($('v3'), [
        { pts: curva, color: COL.a, label: 'exacto  (4/ω₀)K(sen θ₀/2)' },
        { pts: serieT, color: COL.c, dash: [5, 4], width: 1.3, label: 'serie 1 + θ₀²/16 + …' },
        { pts: serieE, color: COL.b, dots: true, r: 4, label: 'medido' },
        { pts: [[th0, Tn / T0]], color: '#fff', dots: true, r: 5.5 },
      ], { xmin: 0, xmax: 3.1, ymin: .95, xlabel: 'θmax (rad)', ylabel: 'T / T₀', legend: 'left' });
    };
    go(anim, draw, 2600);
    S(tbl(['', 'Valor'], [
      ['T₀ = 2π/ω₀ (ángulos pequeños)', fmt(T0, 5)],
      ['T numérico', fmt(Tn, 5)],
      ['T exacto (integral elíptica)', fmt(Texacto(th0), 5)],
      ['T/T₀', fmt(Tn / T0, 5)],
      ['Error de la aproximación', ((Tn / T0 - 1) * 100).toFixed(3) + ' %'],
      ['Serie 1 + θ₀²/16', fmt(1 + th0 * th0 / 16, 5)],
    ]) + '<p class="muted">El periodo medido se obtiene promediando los intervalos entre máximos consecutivos de θ. Crece siempre con la amplitud: el péndulo real es más lento que el armónico porque sen θ &lt; θ, es decir, la fuerza recuperadora se queda corta. Cerca de θ₀ = π el periodo tiende a infinito.</p>');
  }
});

// ---------------- Problema 4.6 ----------------
reg({
  id: 'p46', group: '4.3 Oscilador amortiguado', sec: '4.3', tag: 'P4.6', short: 'Oscilador lineal amortiguado',
  title: 'Problema 4.6 · Oscilador lineal amortiguado',
  desc: '(a) Añade el amortiguamiento y describe x(t) y v(t) con ω₀ = 3, γ = 0.5, x(0) = 1, v(0) = 0. (b) Calcula el periodo y compáralo con el caso sin amortiguar para γ = 1, 2 y 3: ¿crece o decrece? (c) Calcula el tiempo de relajación τ, aquel en que la amplitud cae a 1/e. (d) Dibuja la energía total: si no decrece de forma monótona, explica por qué.',
  eq: 'd²x/dt² = −ω₀²x − γ·dx/dt<br>Subamortiguado (γ &lt; 2ω₀): ω₁ = √(ω₀² − γ²/4)<br>Envolvente: x ≈ A·e^(−γt/2) → τ = 2/γ<br>Crítico en γ = 2ω₀ ; sobreamortiguado por encima',
  controls: [
    { id: 'w0', type: 'range', label: 'ω₀', min: 1, max: 8, step: .25, value: 3 },
    { id: 'g', type: 'range', label: 'γ (amortiguamiento)', min: 0, max: 14, step: .1, value: .5 },
    { id: 'x0', type: 'range', label: 'x(0)', min: -2, max: 2, step: .1, value: 1 },
    { id: 'v0', type: 'range', label: 'v(0)', min: -4, max: 4, step: .1, value: 0 },
    { id: 'tmax', type: 'range', label: 'Tiempo total', min: 2, max: 40, step: 1, value: 20 },
  ],
  buttons: [{ label: '▶ Simular', primary: true, fn: 'run' },
  { label: 'γ = 0.5', fn: () => setVals({ g: .5 }) }, { label: 'γ = 1', fn: () => setVals({ g: 1 }) },
  { label: 'γ = 2', fn: () => setVals({ g: 2 }) }, { label: 'γ = 3', fn: () => setVals({ g: 3 }) },
  { label: 'Crítico γ = 2ω₀', fn: () => setVals({ g: 2 * V('w0') }) }],
  views: [
    { id: 'v1', title: 'x(t) con su envolvente e^(−γt/2)', h: 300 },
    { id: 'v2', title: 'v(t)', half: true, w: 440, h: 260 },
    { id: 'v3', title: 'Energía total E(t)/m', half: true, w: 440, h: 260 },
    { id: 'v4', title: 'Espacio de fases: la espiral hacia el origen', h: 300 },
  ],
  run(anim) {
    const w0 = V('w0'), g = V('g'), x0 = V('x0'), v0 = V('v0'), T = V('tmax');
    const P = integra((x, v) => -w0 * w0 * x - g * v, 'er', x0, v0, Math.min(.002, T / 4000), T);
    const E = p => .5 * p[2] ** 2 + .5 * w0 * w0 * p[1] ** 2, E0 = E([0, x0, v0]);
    const sub = g < 2 * w0, w1 = sub ? Math.sqrt(w0 * w0 - g * g / 4) : 0;
    const { T: Tn, picos } = periodoDe(P);
    // tiempo de relajacion medido: caida de la amplitud de los maximos a 1/e
    let tau = NaN;
    if (picos.length > 1) {
      const amp = picos.map(t => { const i = Math.round(t / (P[1][0] - P[0][0])); return [t, Math.abs(P[Math.min(P.length - 1, i)][1])]; }).filter(a => a[1] > 1e-9);
      const obj = amp[0][1] / Math.E, k = amp.findIndex(a => a[1] <= obj);
      if (k > 0) { const a0 = amp[k - 1], a1 = amp[k]; tau = a0[0] + (a0[1] - obj) / (a0[1] - a1[1]) * (a1[0] - a0[0]) - amp[0][0]; }
    }
    const A0 = Math.hypot(x0, (v0 + g * x0 / 2) / (w1 || 1));
    const draw = fr => {
      const tn = T * fr, cut = thin(P.filter(p => p[0] <= tn + 1e-12));
      plot($('v1'), [
        { pts: cut.map(p => [p[0], p[1]]), color: COL.a, label: 'x(t)' },
        ...(sub ? [{ pts: thin(P).filter(p => p[0] <= tn).map(p => [p[0], A0 * Math.exp(-g * p[0] / 2)]), color: COL.c, dash: [5, 4], width: 1.2, label: '±A e^(−γt/2)' },
        { pts: thin(P).filter(p => p[0] <= tn).map(p => [p[0], -A0 * Math.exp(-g * p[0] / 2)]), color: COL.c, dash: [5, 4], width: 1.2 }] : []),
      ], { xmin: 0, xmax: T, xlabel: 't', ylabel: 'x' });
      plot($('v2'), [{ pts: cut.map(p => [p[0], p[2]]), color: COL.d, label: 'v(t)' }], { xmin: 0, xmax: T, xlabel: 't', ylabel: 'v' });
      plot($('v3'), [{ pts: cut.map(p => [p[0], E(p)]), color: COL.b, label: 'E(t)/m' }], { xmin: 0, xmax: T, ymin: 0, xlabel: 't', ylabel: 'E/m' });
      const g4 = plot($('v4'), [{ pts: thin(P.filter(p => p[0] <= tn + 1e-12), 2500).map(p => [p[1], p[2]]), color: COL.a, label: 'trayectoria' },
      { pts: [[0, 0]], color: '#fff', dots: true, r: 4, label: 'atractor' }], { xlabel: 'x', ylabel: 'v' });
      const q = P[Math.min(P.length - 1, Math.max(1, Math.floor(P.length * fr))) - 1];
      dot2(g4.c, g4.X(q[1]), g4.Y(q[2]), 6, COL.c);
    };
    go(anim, draw, 2800);
    S(tbl(['', 'Valor'], [
      ['Régimen', g === 0 ? 'sin amortiguar' : sub ? 'subamortiguado' : Math.abs(g - 2 * w0) < 1e-9 ? 'crítico' : 'sobreamortiguado'],
      ['T sin amortiguar', fmt(2 * Math.PI / w0, 5)],
      ['T medido', isFinite(Tn) ? fmt(Tn, 5) : 'no oscila'],
      ['T teórico 2π/ω₁', sub && w1 ? fmt(2 * Math.PI / w1, 5) : '—'],
      ['τ medido (caída a 1/e)', isFinite(tau) ? fmt(tau, 4) : '—'],
      ['τ teórico = 2/γ', g ? fmt(2 / g, 4) : '∞'],
      ['E final / E₀', fmt(E(P[P.length - 1]) / E0, 5)],
    ]) + '<p class="muted">El periodo <b>crece</b> con γ: el rozamiento frena el movimiento y ω₁ = √(ω₀² − γ²/4) es menor que ω₀. La energía no baja de forma monótona porque la potencia disipada −γv² se anula en los puntos de retorno, donde v = 0: ahí la curva se aplana. Pasado γ = 2ω₀ ya no hay oscilación.</p>');
  }
});

// ---------------- Problema 4.7 ----------------
reg({
  id: 'p47', group: '4.3 Oscilador amortiguado', sec: '4.3', tag: 'P4.7', short: 'Péndulo no lineal amortiguado',
  title: 'Problema 4.7 · Péndulo no lineal amortiguado',
  desc: 'Péndulo con ω₀ = 3 y un término de amortiguamiento −γ·dθ/dt. Con γ = 1 y θ(0) = 0.2: ¿en qué se parece al oscilador lineal amortiguado y en qué se diferencia? ¿Qué forma tiene la trayectoria en el espacio de fases para θ(0) = 1? ¿Cambia con otras condiciones iniciales? Recuerda que θ está restringido entre −π y +π.',
  eq: 'd²θ/dt² = −ω₀² sen θ − γ·dθ/dt<br>Lineal: d²x/dt² = −ω₀²x − γ·dx/dt<br>θ se repliega al intervalo (−π, π]',
  controls: [
    { id: 'w0', type: 'range', label: 'ω₀', min: 1, max: 6, step: .25, value: 3 },
    { id: 'g', type: 'range', label: 'γ', min: 0, max: 4, step: .05, value: 1 },
    { id: 'th0', type: 'range', label: 'θ(0) (rad)', min: -3.1, max: 3.1, step: .05, value: .2 },
    { id: 'w', type: 'range', label: 'dθ/dt (0)', min: -12, max: 12, step: .2, value: 0 },
    { id: 'tmax', type: 'range', label: 'Tiempo total', min: 3, max: 40, step: 1, value: 15 },
    { id: 'lineal', type: 'check', label: 'Superponer el oscilador lineal', value: true, color: COL.c },
    { id: 'varias', type: 'check', label: 'Varias condiciones iniciales en el espacio de fases', value: true, color: COL.d },
  ],
  buttons: [{ label: '▶ Simular', primary: true, fn: 'run' },
  { label: 'θ₀ = 0.2', fn: () => setVals({ th0: .2, w: 0 }) },
  { label: 'θ₀ = 1', fn: () => setVals({ th0: 1, w: 0 }) },
  { label: 'Con giro completo', fn: () => setVals({ th0: 0, w: 7 }) }],
  views: [
    { id: 'v1', title: 'θ(t): péndulo no lineal frente al oscilador lineal', h: 300 },
    { id: 'v2', title: 'Espacio de fases ω frente a θ, replegado a (−π, π]', h: 340 },
    { id: 'v3', title: 'Energía E/mL² = ½ω² + ω₀²(1 − cos θ)', half: true, w: 440, h: 250 },
  ],
  run(anim) {
    const w0 = V('w0'), g = V('g'), th0 = V('th0'), w00 = V('w'), T = V('tmax');
    const dt = Math.min(.002, T / 6000);
    const Pnl = integra((x, v) => -w0 * w0 * Math.sin(x) - g * v, 'er', th0, w00, dt, T);
    const Plin = integra((x, v) => -w0 * w0 * x - g * v, 'er', th0, w00, dt, T);
    const envolver = a => { let r = (a + Math.PI) % (2 * Math.PI); if (r <= 0) r += 2 * Math.PI; return r - Math.PI; };
    // corta la curva donde θ salta de +π a −π, para no dibujar lineas que cruzan la grafica
    const trozos = P => {
      const out = []; let cur = [];
      P.forEach(p => { const t = envolver(p[1]); if (cur.length && Math.abs(t - cur[cur.length - 1][0]) > Math.PI) { out.push(cur); cur = []; } cur.push([t, p[2]]); });
      if (cur.length) out.push(cur); return out;
    };
    const otras = V('varias') ? [[.5, 0], [2.5, 0], [0, 5], [0, 8]] : [];
    const Potras = otras.map(([a, b]) => integra((x, v) => -w0 * w0 * Math.sin(x) - g * v, 'er', a, b, dt, T));
    const E = p => .5 * p[2] ** 2 + w0 * w0 * (1 - Math.cos(p[1]));
    const draw = fr => {
      const tn = T * fr, c1 = thin(Pnl.filter(p => p[0] <= tn + 1e-12)), c2 = thin(Plin.filter(p => p[0] <= tn + 1e-12));
      plot($('v1'), [{ pts: c1.map(p => [p[0], p[1]]), color: COL.a, label: 'no lineal: −ω₀² sen θ' },
      ...(V('lineal') ? [{ pts: c2.map(p => [p[0], p[1]]), color: COL.c, dash: [5, 4], width: 1.3, label: 'lineal: −ω₀²θ' }] : [])],
        { xmin: 0, xmax: T, xlabel: 't', ylabel: 'θ (rad)' });
      const s = [];
      Potras.forEach(Q => trozos(Q.filter(p => p[0] <= tn + 1e-12)).forEach(tr => s.push({ pts: thin(tr, 900), color: COL.d + '77', width: 1.1 })));
      trozos(Pnl.filter(p => p[0] <= tn + 1e-12)).forEach((tr, i) => s.push({ pts: thin(tr, 1500), color: COL.a, width: 2, label: i ? '' : 'trayectoria actual' }));
      s.push({ pts: [[0, 0]], color: '#fff', dots: true, r: 4.5, label: 'punto fijo (0,0)' });
      s.push({ pts: [[-Math.PI, 0], [Math.PI, 0]], color: COL.b, dots: true, r: 4, label: 'punto silla (±π,0)' });
      plot($('v2'), s, { xmin: -Math.PI * 1.05, xmax: Math.PI * 1.05, xlabel: 'θ (rad)', ylabel: 'dθ/dt', legend: 'left' });
      plot($('v3'), [{ pts: c1.map(p => [p[0], E(p)]), color: COL.b, label: 'E/mL²' }], { xmin: 0, xmax: T, ymin: 0, xlabel: 't', ylabel: 'E/mL²' });
    };
    go(anim, draw, 2800);
    const u = Pnl[Pnl.length - 1];
    S(tbl(['', 'no lineal', 'lineal'], [
      ['θ final', fmt(envolver(u[1]), 4), fmt(Plin[Plin.length - 1][1], 4)],
      ['dθ/dt final', fmt(u[2], 4), fmt(Plin[Plin.length - 1][2], 4)],
      ['E final', fmt(E(u), 5), '—'],
    ]) + '<p class="muted">Se parecen en lo esencial: el amortiguamiento lleva el sistema al reposo y en el espacio de fases la trayectoria es una espiral que acaba en el origen, que es un atractor. Se diferencian en que el péndulo es más lento para amplitudes grandes, y en que con energía suficiente puede <b>dar vueltas completas</b> antes de quedar atrapado: en la gráfica replegada eso se ve como saltos de +π a −π. Los puntos (±π, 0) son sillas, no atractores.</p>');
  }
});
