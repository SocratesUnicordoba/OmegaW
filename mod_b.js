'use strict';
// ============================================================
//  Capítulo 4 · Oscillations
//  Secciones 4.4–4.7 : fuerzas externas, espacio de fases,
//  circuitos eléctricos, exactitud y estabilidad, proyectos
// ============================================================

// Amplitud y desfase estacionarios del oscilador forzado (solución analítica)
const ampEstac = (w, w0, g, A0) => A0 / Math.sqrt((w0 * w0 - w * w) ** 2 + (g * w) ** 2);
const faseEstac = (w, w0, g) => Math.atan2(g * w, w0 * w0 - w * w);

// ---------------- Problema 4.8 ----------------
reg({
  id: 'p48', group: '4.4 Respuesta a fuerzas externas', sec: '4.4', tag: 'P4.8', short: 'Oscilador forzado y resonancia',
  title: 'Problema 4.8 · Respuesta de un oscilador lineal amortiguado y forzado',
  desc: '(a) Añade una fuerza externa A₀·cos(ωt). (b) Con ω₀ = 3, γ = 0.5, ω = 2 y A₀ = 1 observa x(t): distingue el <b>transitorio</b>, que depende de las condiciones iniciales y se amortigua, del <b>estado estacionario</b>, que domina a tiempos largos y no depende de ellas. (c) Barre ω y dibuja la curva de resonancia: la amplitud máxima y el desfase frente a la frecuencia del forzamiento.',
  eq: 'd²x/dt² = −ω₀²x − γ·dx/dt + A₀cos(ωt)<br>Estacionario: x = A(ω)·cos(ωt − δ)<br>A(ω) = A₀ / √[(ω₀²−ω²)² + (γω)²]<br>tan δ = γω/(ω₀²−ω²) ,  ω_res = √(ω₀² − γ²/2)',
  controls: [
    { id: 'w0', type: 'range', label: 'ω₀', min: 1, max: 8, step: .25, value: 3 },
    { id: 'g', type: 'range', label: 'γ', min: .05, max: 4, step: .05, value: .5 },
    { id: 'w', type: 'range', label: 'ω del forzamiento', min: .2, max: 8, step: .05, value: 2 },
    { id: 'A0', type: 'range', label: 'A₀', min: .2, max: 3, step: .1, value: 1 },
    { id: 'x0', type: 'range', label: 'x(0)', min: -2, max: 2, step: .1, value: 1 },
    { id: 'v0', type: 'range', label: 'v(0)', min: -3, max: 3, step: .1, value: 0 },
    { id: 'tmax', type: 'range', label: 'Tiempo total', min: 10, max: 120, step: 5, value: 50 },
  ],
  buttons: [{ label: '▶ Simular', primary: true, fn: 'run' },
  { label: 'En resonancia', fn: () => setVals({ w: +Math.sqrt(Math.max(.04, V('w0') ** 2 - V('g') ** 2 / 2)).toFixed(2) }) },
  { label: 'x₀=1, v₀=0', fn: () => setVals({ x0: 1, v0: 0 }) },
  { label: 'x₀=0, v₀=1', fn: () => setVals({ x0: 0, v0: 1 }) }],
  views: [
    { id: 'v1', title: 'x(t): transitorio al principio y estado estacionario al final', h: 310 },
    { id: 'v2', title: 'Curva de resonancia A(ω)', half: true, w: 440, h: 270 },
    { id: 'v3', title: 'Desfase δ(ω) entre la fuerza y la respuesta', half: true, w: 440, h: 270 },
  ],
  run(anim) {
    const w0 = V('w0'), g = V('g'), w = V('w'), A0 = V('A0'), T = V('tmax');
    const dt = Math.min(.003, T / 12000);
    const P = integra((x, v, t) => -w0 * w0 * x - g * v + A0 * Math.cos(w * t), 'er', V('x0'), V('v0'), dt, T);
    const A = ampEstac(w, w0, g, A0), d = faseEstac(w, w0, g);
    const est = t => A * Math.cos(w * t - d);
    const curva = [], fases = [];
    for (let q = .05; q <= 9; q += .025) { curva.push([q, ampEstac(q, w0, g, A0)]); fases.push([q, faseEstac(q, w0, g)]); }
    const wres = w0 * w0 > g * g / 2 ? Math.sqrt(w0 * w0 - g * g / 2) : 0;
    const draw = fr => {
      const tn = T * fr, cut = thin(P.filter(p => p[0] <= tn + 1e-12));
      plot($('v1'), [
        { pts: cut.map(p => [p[0], p[1]]), color: COL.a, label: 'x(t) completa' },
        { pts: cut.map(p => [p[0], est(p[0])]), color: COL.c, dash: [5, 4], width: 1.3, label: 'solo estacionario' },
        { pts: cut.map(p => [p[0], p[1] - est(p[0])]), color: COL.b, width: 1.1, label: 'transitorio = diferencia' },
      ], { xmin: 0, xmax: T, xlabel: 't', ylabel: 'x' });
      plot($('v2'), [
        { pts: curva, color: COL.a, label: 'A(ω)' },
        { pts: [[w, 0], [w, A]], color: COL.c, dash: [3, 4], width: 1, label: `ω actual = ${w}` },
        ...(wres ? [{ pts: [[wres, 0], [wres, ampEstac(wres, w0, g, A0)]], color: COL.b, dash: [2, 3], width: 1, label: `ω_res = ${wres.toFixed(3)}` }] : []),
      ], { xmin: 0, xmax: 9, ymin: 0, xlabel: 'ω', ylabel: 'amplitud', legend: 'left' });
      plot($('v3'), [
        { pts: fases, color: COL.d, label: 'δ(ω)' },
        { pts: [[0, Math.PI / 2], [9, Math.PI / 2]], color: '#ffffff44', dash: [3, 4], width: 1, label: 'π/2' },
        { pts: [[w, 0], [w, d]], color: COL.c, dash: [3, 4], width: 1 },
      ], { xmin: 0, xmax: 9, ymin: 0, ymax: Math.PI, xlabel: 'ω', ylabel: 'δ (rad)', legend: 'left' });
    };
    go(anim, draw, 3000);
    // amplitud medida en el último tercio, ya sin transitorio
    const cola = P.filter(p => p[0] > T * .66);
    const Amed = (Math.max(...cola.map(p => p[1])) - Math.min(...cola.map(p => p[1]))) / 2;
    S(tbl(['', 'Valor'], [
      ['A(ω) teórica', fmt(A, 5)], ['A medida al final', fmt(Amed, 5)],
      ['Desfase δ', fmt(d, 4) + ' rad = ' + (d * 180 / Math.PI).toFixed(1) + '°'],
      ['ω de resonancia', wres ? fmt(wres, 4) : 'no hay (γ demasiado grande)'],
      ['A en resonancia', wres ? fmt(ampEstac(wres, w0, g, A0), 4) : '—'],
      ['τ del transitorio = 2/γ', fmt(2 / g, 3)],
    ]) + '<p class="muted">La curva roja es la diferencia entre la solución completa y la estacionaria: ese es el <b>transitorio</b>, que se apaga como e^(−γt/2) y sí recuerda las condiciones iniciales. Pasados unos cuantos τ solo queda el estacionario, idéntico para cualquier x(0) y v(0): pruébalo con los dos botones. En resonancia el desfase pasa por π/2 y la amplitud es máxima.</p>');
  }
});

// ---------------- Problema 4.9 ----------------
reg({
  id: 'p49', group: '4.4 Respuesta a fuerzas externas', sec: '4.4', tag: 'P4.9', short: 'Forzamiento no sinusoidal',
  title: 'Problema 4.9 · Respuesta a fuerzas externas no sinusoidales',
  desc: 'El mismo oscilador amortiguado, pero con una fuerza externa periódica que ya no es un coseno: onda cuadrada, triangular, diente de sierra o pulsos. El sistema responde sobre todo a la componente de Fourier cuya frecuencia se acerca a ω₀, así que la salida es mucho más sinusoidal que la entrada: el oscilador actúa como un filtro.',
  eq: 'd²x/dt² = −ω₀²x − γ·dx/dt + F(t)<br>F periódica de frecuencia ω<br>Serie de Fourier: F(t) = Σ aₙ cos(nωt) + bₙ sen(nωt)<br>Cada armónico nω responde con A(nω)',
  controls: [
    { id: 'tipo', type: 'select', label: 'Forma de la fuerza', value: 'cuad', options: [['cos', 'Coseno'], ['cuad', 'Onda cuadrada'], ['tri', 'Triangular'], ['sierra', 'Diente de sierra'], ['pulso', 'Pulsos estrechos']] },
    { id: 'w0', type: 'range', label: 'ω₀', min: 1, max: 10, step: .25, value: 3 },
    { id: 'g', type: 'range', label: 'γ', min: .05, max: 3, step: .05, value: .5 },
    { id: 'w', type: 'range', label: 'ω del forzamiento', min: .2, max: 6, step: .05, value: 1 },
    { id: 'A0', type: 'range', label: 'A₀', min: .2, max: 3, step: .1, value: 1 },
    { id: 'tmax', type: 'range', label: 'Tiempo total', min: 20, max: 160, step: 10, value: 80 },
  ],
  views: [
    { id: 'v1', title: 'Entrada F(t) y salida x(t): el oscilador suaviza la señal', h: 310 },
    { id: 'v2', title: 'Espectro: amplitud de cada armónico de la entrada y de la salida', half: true, w: 440, h: 280 },
    { id: 'v3', title: 'Curva de respuesta A(ω) con los armónicos nω marcados', half: true, w: 440, h: 280 },
  ],
  run(anim) {
    const tipo = V('tipo'), w0 = V('w0'), g = V('g'), w = V('w'), A0 = V('A0'), T = V('tmax');
    const per = 2 * Math.PI / w;
    const F = t => {
      const u = ((t % per) + per) % per / per;              // fase de 0 a 1
      switch (tipo) {
        case 'cos': return A0 * Math.cos(2 * Math.PI * u);
        case 'cuad': return A0 * (u < .5 ? 1 : -1);
        case 'tri': return A0 * (u < .5 ? 4 * u - 1 : 3 - 4 * u);
        case 'sierra': return A0 * (2 * u - 1);
        default: return A0 * (u < .05 ? 1 : 0) * 10;
      }
    };
    const dt = Math.min(.004, T / 20000);
    const P = integra((x, v, t) => -w0 * w0 * x - g * v + F(t), 'er', 0, 0, dt, T);
    // espectro por correlacion con cada armonico, sobre un numero entero de periodos del final
    const nper = Math.max(4, Math.floor(T / per / 3)), t0 = T - nper * per;
    const cola = P.filter(p => p[0] >= t0);
    const coef = (f, n) => {
      let a = 0, b = 0, cnt = 0;
      cola.forEach(p => { const ph = n * w * (p[0] - t0); a += f(p) * Math.cos(ph); b += f(p) * Math.sin(ph); cnt++; });
      return 2 * Math.hypot(a, b) / Math.max(1, cnt);
    };
    const NA = 9, espF = [], espX = [], marcas = [];
    for (let n = 1; n <= NA; n++) {
      espF.push([n, coef(p => F(p[0]), n)]);
      espX.push([n, coef(p => p[1], n)]);
      marcas.push([n * w, ampEstac(n * w, w0, g, 1)]);
    }
    const curva = []; for (let q = .05; q <= 9; q += .025) curva.push([q, ampEstac(q, w0, g, 1)]);
    const draw = fr => {
      const tn = T * fr, cut = thin(P.filter(p => p[0] <= tn + 1e-12));
      plot($('v1'), [
        { pts: cut.map(p => [p[0], F(p[0])]), color: COL.c, width: 1.1, label: 'entrada F(t)' },
        { pts: cut.map(p => [p[0], p[1]]), color: COL.a, width: 2, label: 'salida x(t)' },
      ], { xmin: Math.max(0, tn - 8 * per), xmax: Math.max(T * .02, tn), xlabel: 't', ylabel: 'F , x' });
      plot($('v2'), [
        { pts: espF, color: COL.c, dots: true, r: 4, label: 'armónicos de F' },
        { pts: espX, color: COL.a, dots: true, r: 4, label: 'armónicos de x' },
      ], { xmin: .5, xmax: NA + .5, ymin: 0, xlabel: 'armónico n (frecuencia nω)', ylabel: 'amplitud', legend: 'left' });
      plot($('v3'), [
        { pts: curva, color: COL.d, label: 'A(ω) del oscilador' },
        { pts: marcas, color: COL.c, dots: true, r: 4, label: 'armónicos nω' },
      ], { xmin: 0, xmax: 9, ymin: 0, xlabel: 'ω', ylabel: 'respuesta', legend: 'left' });
    };
    go(anim, draw, 3000);
    const domF = espF.reduce((a, b) => b[1] > a[1] ? b : a), domX = espX.reduce((a, b) => b[1] > a[1] ? b : a);
    S(tbl(['Armónico n', 'frecuencia nω', 'entrada', 'salida', 'A(nω)'],
      espF.slice(0, 6).map((e, i) => [e[0], fmt(e[0] * w, 3), fmt(e[1], 4), fmt(espX[i][1], 4), fmt(ampEstac(e[0] * w, w0, g, 1), 4)])) +
      `<p class="muted">El armónico dominante de la entrada es el <b>n = ${domF[0]}</b>, pero el de la salida es el <b>n = ${domX[0]}</b>: el que cae más cerca de ω₀ = ${w0}. El oscilador amortiguado se comporta como un <b>filtro pasa banda</b> centrado en su frecuencia propia, así que aunque le metas una onda cuadrada llena de armónicos, devuelve algo casi sinusoidal. Ajusta ω para que algún nω coincida con ω₀ y verás dispararse ese armónico.</p>`);
  }
});

// ---------------- Problema 4.10 ----------------
reg({
  id: 'p410', group: '4.4 Espacio de fases', sec: '4.4', tag: 'P4.10', short: 'N osciladores en el espacio de fases',
  title: 'Problema 4.10 · Trayectorias del oscilador armónico en el espacio de fases',
  desc: '(a) Simula N osciladores armónicos idénticos a la vez, cada uno dibujado como un círculo en su posición y velocidad. Con condiciones iniciales aleatorias: ¿se cruzan alguna vez las trayectorias? Explícalo con la unicidad de las trayectorias en un sistema determinista. (b) Elige condiciones iniciales que formen un rectángulo: ¿cambia su forma con el tiempo? ¿Y su área total?',
  eq: 'ẋ = v ,  v̇ = −ω₀²x<br>Elipses: ½v² + ½ω₀²x² = E<br>Teorema de Liouville: el área del espacio de fases se conserva<br>Con las variables (x, v) el área se escala por ω₀',
  controls: [
    { id: 'w0', type: 'range', label: 'ω₀', min: 1, max: 6, step: .25, value: 3 },
    { id: 'disp', type: 'select', label: 'Disposición inicial', value: 'rect', options: [['azar', '(a) N al azar'], ['rect', '(b) Rectángulo'], ['circ', 'Círculo']] },
    { id: 'N', type: 'range', label: 'N (en el caso al azar)', min: 4, max: 40, step: 1, value: 16 },
    { id: 'cx', type: 'range', label: 'Centro x del rectángulo', min: -2, max: 2, step: .1, value: 1 },
    { id: 'cv', type: 'range', label: 'Centro v del rectángulo', min: -4, max: 4, step: .2, value: 0 },
    { id: 'ax', type: 'range', label: 'Ancho en x', min: .1, max: 1.5, step: .05, value: .6 },
    { id: 'av', type: 'range', label: 'Alto en v', min: .2, max: 4, step: .1, value: 1.2 },
    { id: 'cyc', type: 'range', label: 'Ciclos', min: 1, max: 6, step: .5, value: 2 },
    { id: 'rastro', type: 'check', label: 'Mostrar las trayectorias', value: true, color: COL.d },
  ],
  views: [
    { id: 'v1', title: 'Espacio de fases: cada círculo es un oscilador', h: 420 },
    { id: 'v2', title: 'Área de la región / área inicial', half: true, w: 440, h: 250 },
    { id: 'v3', title: 'Energía de cada oscilador (constante)', half: true, w: 440, h: 250 },
  ],
  run(anim) {
    const w0 = V('w0'), disp = V('disp'), T = V('cyc') * 2 * Math.PI / w0;
    // Solución exacta: giro en el plano (x, v/ω₀); no hace falta integrar.
    let ini = [];
    if (disp === 'azar') { for (let i = 0; i < V('N'); i++) ini.push([(Math.random() * 2 - 1) * 2, (Math.random() * 2 - 1) * 2 * w0]); }
    else if (disp === 'rect') {
      const cx = V('cx'), cv = V('cv'), ax = V('ax'), av = V('av'), n = 9;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++)
        if (i === 0 || j === 0 || i === n - 1 || j === n - 1)
          ini.push([cx - ax / 2 + ax * i / (n - 1), cv - av / 2 + av * j / (n - 1)]);
      // ordenar el borde para poder calcular el área con la fórmula del polígono
      const c = [V('cx'), V('cv')];
      ini.sort((p, q) => Math.atan2(p[1] - c[1], p[0] - c[0]) - Math.atan2(q[1] - c[1], q[0] - c[0]));
    } else { for (let i = 0; i < 40; i++) { const a = 2 * Math.PI * i / 40; ini.push([V('cx') + V('ax') / 2 * Math.cos(a), V('cv') + V('av') / 2 * Math.sin(a)]); } }
    const en = ([x, v], t) => [x * Math.cos(w0 * t) + v / w0 * Math.sin(w0 * t), -x * w0 * Math.sin(w0 * t) + v * Math.cos(w0 * t)];
    const area = pts => { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; };
    const cerrada = disp !== 'azar';
    const A0 = cerrada ? area(ini) : 0;
    const serieA = []; for (let i = 0; i <= 120; i++) { const t = T * i / 120; serieA.push([t, cerrada ? area(ini.map(p => en(p, t))) / A0 : 1]); }
    const lim = Math.max(...ini.map(p => Math.hypot(p[0], p[1] / w0))) * 1.25;
    const draw = fr => {
      const tn = T * fr, ahora = ini.map(p => en(p, tn));
      const s = [];
      if (V('rastro')) ini.forEach(p => {
        const tr = []; for (let a = 0; a <= 2 * Math.PI + 1e-9; a += Math.PI / 60) tr.push(en(p, a / w0));
        s.push({ pts: tr, color: COL.d + '44', width: 1 });
      });
      if (cerrada) s.push({ pts: [...ahora, ahora[0]], color: COL.c, width: 1.6, label: `área ${(area(ahora) / A0).toFixed(4)}×` });
      s.push({ pts: ahora, color: COL.a, dots: true, r: 5, label: `${ini.length} osciladores` });
      plot($('v1'), s, { xmin: -lim, xmax: lim, ymin: -lim * w0, ymax: lim * w0, xlabel: 'x', ylabel: 'v', legend: 'left' });
      plot($('v2'), [{ pts: serieA.filter(p => p[0] <= tn), color: COL.c, label: 'área / área₀' },
      { pts: [[0, 1], [T, 1]], color: '#ffffff44', dash: [4, 4], width: 1 }],
        { xmin: 0, xmax: T, ymin: 0, ymax: 2, xlabel: 't', ylabel: 'área relativa' });
      plot($('v3'), [{ pts: ahora.map((p, i) => [i, .5 * p[1] ** 2 + .5 * w0 * w0 * p[0] ** 2]), color: COL.b, dots: true, r: 3.5, label: 'E de cada uno' }],
        { xmin: -1, xmax: ini.length, ymin: 0, xlabel: 'oscilador', ylabel: 'E/m' });
    };
    go(anim, draw, 3200);
    S(tbl(['', 'Valor'], [
      ['Osciladores', ini.length],
      ['Área inicial', cerrada ? fmt(A0, 5) : '—'],
      ['Área al final', cerrada ? fmt(area(ini.map(p => en(p, T))), 5) : '—'],
      ['Variación relativa', cerrada ? fmt(area(ini.map(p => en(p, T))) / A0 - 1) : '—'],
      ['Periodo T₀', fmt(2 * Math.PI / w0, 5)],
    ]) + '<p class="muted">(a) Las trayectorias <b>nunca se cruzan</b>: por cada punto (x, v) pasa una sola solución, porque el estado determina por completo el futuro y el pasado. Si dos se cortaran, desde ese punto saldrían dos evoluciones distintas. (b) La región <b>gira y se deforma</b> —en las variables (x, v) se estira porque los dos ejes tienen escalas distintas— pero su <b>área se conserva</b>: es el teorema de Liouville. Todos los puntos tardan lo mismo, T₀, en volver: el periodo no depende de la amplitud.</p>');
  }
});

// ---------------- Problema 4.11 ----------------
reg({
  id: 'p411', group: '4.4 Espacio de fases', sec: '4.4', tag: 'P4.11', short: 'N péndulos en el espacio de fases',
  title: 'Problema 4.11 · Trayectorias del péndulo en el espacio de fases',
  desc: '(a) Compara las trayectorias (ω frente a θ) de N péndulos con condiciones iniciales distintas. ¿Son cerradas? ¿Depende la forma de la energía total? (b) Parte de un rectángulo de condiciones iniciales: ¿cambia su forma con el tiempo? ¿Y su área?',
  eq: 'θ̇ = ω ,  ω̇ = −ω₀² sen θ<br>E/mL² = ½ω² + ω₀²(1 − cos θ)<br>Separatriz en E = 2ω₀²: límite entre oscilar y rotar<br>El área del espacio de fases también se conserva',
  controls: [
    { id: 'w0', type: 'range', label: 'ω₀', min: 1, max: 5, step: .25, value: 3 },
    { id: 'disp', type: 'select', label: 'Disposición inicial', value: 'rect', options: [['energias', '(a) Varias energías'], ['rect', '(b) Rectángulo']] },
    { id: 'cx', type: 'range', label: 'Centro θ del rectángulo', min: -3, max: 3, step: .1, value: 1 },
    { id: 'cv', type: 'range', label: 'Centro ω del rectángulo', min: -8, max: 8, step: .2, value: 0 },
    { id: 'ax', type: 'range', label: 'Ancho en θ', min: .1, max: 1.5, step: .05, value: .5 },
    { id: 'av', type: 'range', label: 'Alto en ω', min: .2, max: 4, step: .1, value: 1 },
    { id: 'tmax', type: 'range', label: 'Tiempo total', min: 1, max: 20, step: .5, value: 6 },
    { id: 'fondo', type: 'check', label: 'Dibujar el retrato de fase de fondo', value: true, color: COL.d },
  ],
  views: [
    { id: 'v1', title: 'Espacio de fases del péndulo: ω frente a θ', h: 430 },
    { id: 'v2', title: 'Área de la región / área inicial', half: true, w: 440, h: 250 },
    { id: 'v3', title: 'Energía de cada péndulo (constante)', half: true, w: 440, h: 250 },
  ],
  run(anim) {
    const w0 = V('w0'), disp = V('disp'), T = V('tmax'), dt = .002;
    const acc = th => -w0 * w0 * Math.sin(th);
    let ini = [];
    if (disp === 'rect') {
      const cx = V('cx'), cv = V('cv'), ax = V('ax'), av = V('av'), n = 9;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++)
        if (i === 0 || j === 0 || i === n - 1 || j === n - 1)
          ini.push([cx - ax / 2 + ax * i / (n - 1), cv - av / 2 + av * j / (n - 1)]);
      ini.sort((p, q) => Math.atan2(p[1] - cv, p[0] - cx) - Math.atan2(q[1] - cv, q[0] - cx));
    } else {
      [.3, .8, 1.4, 2, 2.6, 3.05].forEach(a => ini.push([a, 0]));
      [1.2, 1.6, 2.2].forEach(v => ini.push([0, 2 * w0 * v]));   // por encima de la separatriz: rotan
    }
    // integrar todas a la vez
    const est = ini.map(p => ({ x: p[0], v: p[1] }));
    const hist = ini.map(() => []), inst = [];
    const marcos = 140, cada = Math.max(1, Math.round(T / dt / marcos));
    for (let k = 0, t = 0; t < T - 1e-12; k++) {
      est.forEach(s => PASO.er[1]((x) => acc(x), s, dt));
      t += dt;
      if (k % cada === 0) { inst.push(est.map(s => [s.x, s.v])); est.forEach((s, i) => hist[i].push([s.x, s.v])); }
    }
    const area = pts => { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; };
    const cerrada = disp === 'rect', A0 = cerrada ? area(ini) : 0;
    const E = (x, v) => .5 * v * v + w0 * w0 * (1 - Math.cos(x));
    // retrato de fondo: curvas de energia constante
    const fondo = [];
    if (V('fondo')) [.2, .6, 1.2, 1.8, 2, 2.4, 3.2].forEach(f => {
      const Ec = f * w0 * w0, arr = [], ab = [];
      for (let th = -Math.PI; th <= Math.PI; th += .02) {
        const s = 2 * (Ec - w0 * w0 * (1 - Math.cos(th)));
        if (s >= 0) { arr.push([th, Math.sqrt(s)]); ab.push([th, -Math.sqrt(s)]); }
      }
      if (arr.length > 2) { fondo.push({ pts: arr, color: '#ffffff18', width: 1 }); fondo.push({ pts: ab, color: '#ffffff18', width: 1 }); }
    });
    const vmax = Math.max(3 * w0, ...ini.map(p => Math.abs(p[1]))) * 1.15;
    const draw = fr => {
      const i = Math.max(0, Math.min(inst.length - 1, Math.floor(fr * (inst.length - 1))));
      const ahora = inst[i] || ini;
      const envol = a => { let r = (a + Math.PI) % (2 * Math.PI); if (r <= 0) r += 2 * Math.PI; return r - Math.PI; };
      const s = [...fondo];
      hist.forEach(h => s.push({ pts: thin(h.slice(0, i + 1), 600).map(p => [envol(p[0]), p[1]]), color: COL.d + '55', width: 1, dots: true, r: .8 }));
      if (cerrada) s.push({ pts: [...ahora, ahora[0]].map(p => [envol(p[0]), p[1]]), color: COL.c, width: 1.6, label: `área ${(area(ahora) / A0).toFixed(4)}×` });
      s.push({ pts: ahora.map(p => [envol(p[0]), p[1]]), color: COL.a, dots: true, r: 5, label: `${ini.length} péndulos` });
      plot($('v1'), s, { xmin: -Math.PI * 1.05, xmax: Math.PI * 1.05, ymin: -vmax, ymax: vmax, xlabel: 'θ (rad)', ylabel: 'ω = dθ/dt', legend: 'left' });
      plot($('v2'), [{ pts: inst.slice(0, i + 1).map((a, k) => [k * cada * dt, cerrada ? area(a) / A0 : 1]), color: COL.c, label: 'área / área₀' },
      { pts: [[0, 1], [T, 1]], color: '#ffffff44', dash: [4, 4], width: 1 }],
        { xmin: 0, xmax: T, ymin: 0, ymax: 2, xlabel: 't', ylabel: 'área relativa' });
      plot($('v3'), [{ pts: ahora.map((p, k) => [k, E(p[0], p[1])]), color: COL.b, dots: true, r: 3.5, label: 'E/mL²' },
      { pts: [[0, 2 * w0 * w0], [ini.length, 2 * w0 * w0]], color: COL.c, dash: [3, 4], width: 1, label: 'separatriz E = 2ω₀²' }],
        { xmin: -1, xmax: ini.length, ymin: 0, xlabel: 'péndulo', ylabel: 'E/mL²' });
    };
    go(anim, draw, 3400);
    const fin = inst[inst.length - 1] || ini;
    S(tbl(['', 'Valor'], [
      ['Péndulos', ini.length], ['Separatriz E = 2ω₀²', fmt(2 * w0 * w0, 4)],
      ['Área inicial', cerrada ? fmt(A0, 5) : '—'],
      ['Área al final', cerrada ? fmt(area(fin), 5) : '—'],
      ['Variación relativa', cerrada ? fmt(area(fin) / A0 - 1) : '—'],
    ]) + '<p class="muted">Las trayectorias <b>sí son cerradas</b>, pero su forma depende de la energía: por debajo de la separatriz E = 2ω₀² el péndulo oscila y la órbita es un lazo cerrado alrededor del origen; por encima <b>rota</b> y la curva atraviesa la gráfica de lado a lado. El área se conserva igual que en el oscilador armónico, pero aquí la región se <b>estira y se retuerce</b> mucho más, porque el periodo depende de la amplitud y los puntos de dentro avanzan más deprisa que los de fuera.</p>');
  }
});

// ---------------- Problema 4.12 ----------------
reg({
  id: 'p412', group: '4.5 Oscilaciones en circuitos eléctricos', sec: '4.5', tag: 'P4.12', short: 'Filtros RC simples',
  title: 'Problema 4.12 · Filtros RC simples',
  desc: '(a) Simula las tensiones de un filtro RC con R = 1000 Ω y C = 1.0 µF, y halla la amplitud estacionaria en la resistencia y en el condensador para f = 10, 50, 100, 160, 200, 500, 1000, 5000 y 10000 Hz. (b) La salida depende de dónde se conecte el osciloscopio: dibuja el cociente entre la amplitud de salida y la de entrada en escala logarítmica. ¿Qué frecuencias deja pasar cada montaje? ¿Cuál es pasa bajos y cuál pasa altos?',
  eq: 'R·dQ/dt + Q/C = V₀cos(ωt)<br>V_C = Q/C  (salida en el condensador → pasa bajos)<br>V_R = V_s − V_C  (salida en la resistencia → pasa altos)<br>f_corte = 1/(2πRC)',
  controls: [
    { id: 'R', type: 'range', label: 'R (Ω)', min: 100, max: 10000, step: 100, value: 1000 },
    { id: 'C', type: 'range', label: 'C (µF)', min: .1, max: 10, step: .1, value: 1 },
    { id: 'f', type: 'range', label: 'f de la fuente (Hz)', min: 10, max: 2000, step: 10, value: 160 },
    { id: 'V0', type: 'range', label: 'V₀ (V)', min: .5, max: 5, step: .5, value: 1 },
    { id: 'nper', type: 'range', label: 'Periodos simulados', min: 4, max: 30, step: 1, value: 12 },
  ],
  buttons: [{ label: '▶ Simular', primary: true, fn: 'run' },
  { label: 'f = corte', fn: () => setVals({ f: Math.max(10, Math.min(2000, Math.round(1 / (2 * Math.PI * V('R') * V('C') * 1e-6)))) }) }],
  views: [
    { id: 'v1', title: 'Tensiones en el tiempo: fuente, condensador y resistencia', h: 300 },
    { id: 'v2', title: 'Respuesta en frecuencia (escala logarítmica): los dos filtros', h: 310 },
    { id: 'v3', title: 'Amplitudes a las frecuencias del enunciado', html: true },
  ],
  run(anim) {
    const R = V('R'), C = V('C') * 1e-6, V0 = V('V0'), f = V('f'), w = 2 * Math.PI * f;
    const tau = R * C, fc = 1 / (2 * Math.PI * tau), T = V('nper') / f, dt = Math.min(T / 6000, tau / 60);
    // RC de primer orden con Euler-Richardson sobre Q
    const dQ = (Q, t) => (V0 * Math.cos(w * t) - Q / C) / R;
    const P = [[0, 0]]; let Q = 0, t = 0;
    while (t < T - 1e-12 && P.length < 2e5) {
      const h = Math.min(dt, T - t), k1 = dQ(Q, t), k2 = dQ(Q + k1 * h / 2, t + h / 2);
      Q += k2 * h; t += h; P.push([t, Q]);
    }
    const Vs = t => V0 * Math.cos(w * t), Vc = Q2 => Q2 / C;
    const cola = P.filter(p => p[0] > T * .6);
    const amp = arr => (Math.max(...arr) - Math.min(...arr)) / 2;
    const Ac = amp(cola.map(p => Vc(p[1]))), Ar = amp(cola.map(p => Vs(p[0]) - Vc(p[1])));
    // teorico
    const gC = q => 1 / Math.sqrt(1 + (2 * Math.PI * q * tau) ** 2), gR = q => (2 * Math.PI * q * tau) * gC(q);
    const cur1 = [], cur2 = [];
    for (let lg = 0; lg <= 5; lg += .02) { const q = 10 ** lg; cur1.push([lg, gC(q)]); cur2.push([lg, gR(q)]); }
    const FS = [10, 50, 100, 160, 200, 500, 1000, 5000, 10000];
    const draw = fr => {
      const tn = T * fr, cut = thin(P.filter(p => p[0] <= tn + 1e-12));
      plot($('v1'), [
        { pts: cut.map(p => [p[0] * 1e3, Vs(p[0])]), color: '#ffffff99', dash: [4, 4], width: 1.2, label: 'V_s fuente' },
        { pts: cut.map(p => [p[0] * 1e3, Vc(p[1])]), color: COL.a, width: 2, label: 'V_C condensador' },
        { pts: cut.map(p => [p[0] * 1e3, Vs(p[0]) - Vc(p[1])]), color: COL.b, width: 1.6, label: 'V_R resistencia' },
      ], { xmin: 0, xmax: T * 1e3, xlabel: 't (ms)', ylabel: 'V' });
      plot($('v2'), [
        { pts: cur1, color: COL.a, label: 'V_C/V_s → pasa bajos' },
        { pts: cur2, color: COL.b, label: 'V_R/V_s → pasa altos' },
        { pts: [[Math.log10(fc), 0], [Math.log10(fc), 1]], color: COL.c, dash: [3, 4], width: 1, label: `f_corte = ${fc.toFixed(1)} Hz` },
        { pts: [[0, 1 / Math.SQRT2], [5, 1 / Math.SQRT2]], color: '#ffffff33', dash: [2, 4], width: 1, label: '1/√2' },
        { pts: [[Math.log10(f), gC(f)], [Math.log10(f), gR(f)]], color: COL.d, dots: true, r: 4.5 },
      ], { xmin: 0, xmax: 5, ymin: 0, ymax: 1.05, xlabel: 'log₁₀ f (Hz)', ylabel: 'amplitud de salida / entrada', legend: 'left' });
    };
    go(anim, draw, 2600);
    $('v3').innerHTML = tbl(['f (Hz)', 'V_C/V_s', 'V_R/V_s', 'Deja pasar'],
      FS.map(q => [q, gC(q).toFixed(4), gR(q).toFixed(4), q < fc ? 'el condensador' : 'la resistencia'])) +
      `<p class="hint">Con R = ${R} Ω y C = ${(C * 1e6).toFixed(1)} µF la frecuencia de corte es f = 1/(2πRC) = <b>${fc.toFixed(1)} Hz</b>, donde las dos salidas valen 1/√2 ≈ 0.707. Para el Δt: a 10 Hz basta con 10⁻⁴ s, pero a 10 kHz el periodo es mil veces más corto, así que hace falta un Δt unas mil veces menor para tener el mismo número de pasos por ciclo.</p>`;
    S(tbl(['', 'medido', 'teórico'], [
      ['Amplitud V_C', fmt(Ac, 4), fmt(V0 * gC(f), 4)],
      ['Amplitud V_R', fmt(Ar, 4), fmt(V0 * gR(f), 4)],
      ['f de corte (Hz)', '—', fmt(fc, 4)],
      ['τ = RC (s)', '—', fmt(tau, 5)],
    ]) + '<p class="muted">Tomando la salida <b>en el condensador</b> el circuito es un <b>pasa bajos</b>: a frecuencia alta el condensador no llega a cargarse y su tensión se queda pequeña. Tomándola <b>en la resistencia</b> es un <b>pasa altos</b>: lo que no cae en el condensador cae en la resistencia.</p>');
  }
});

// ---------------- Problema 4.13 ----------------
reg({
  id: 'p413', group: '4.5 Oscilaciones en circuitos eléctricos', sec: '4.5', tag: 'P4.13', short: 'RC con onda cuadrada',
  title: 'Problema 4.13 · Respuesta de un circuito RC a una onda cuadrada',
  desc: 'La fuente pasa a ser una onda cuadrada periódica. Con C = 1.0 µF y R = 3000 Ω, dibuja la tensión en el condensador. Asegúrate de que el periodo sea lo bastante largo para que el condensador se cargue del todo en medio ciclo. ¿Qué dependencia temporal tiene V_C mientras se carga y mientras se descarga?',
  eq: 'R·dQ/dt + Q/C = V_s(t)  (onda cuadrada)<br>Carga:     V_C = V₀(1 − e^(−t/τ))<br>Descarga:  V_C = V₀·e^(−t/τ)<br>τ = RC',
  controls: [
    { id: 'R', type: 'range', label: 'R (Ω)', min: 500, max: 20000, step: 100, value: 3000 },
    { id: 'C', type: 'range', label: 'C (µF)', min: .1, max: 10, step: .1, value: 1 },
    { id: 'f', type: 'range', label: 'f de la onda cuadrada (Hz)', min: 2, max: 400, step: 1, value: 30 },
    { id: 'V0', type: 'range', label: 'V₀ (V)', min: 1, max: 10, step: .5, value: 5 },
    { id: 'nper', type: 'range', label: 'Periodos simulados', min: 2, max: 12, step: 1, value: 4 },
    { id: 'expo', type: 'check', label: 'Superponer las exponenciales teóricas', value: true, color: COL.c },
  ],
  buttons: [{ label: '▶ Simular', primary: true, fn: 'run' },
  { label: 'Carga completa (T ≫ τ)', fn: () => setVals({ f: Math.max(2, Math.round(1 / (20 * V('R') * V('C') * 1e-6))) }) },
  { label: 'Integrador (T ≪ τ)', fn: () => setVals({ f: Math.min(400, Math.round(1 / (.2 * V('R') * V('C') * 1e-6))) }) }],
  views: [
    { id: 'v1', title: 'V_s (onda cuadrada) y V_C (condensador)', h: 320 },
    { id: 'v2', title: 'Corriente I = dQ/dt', half: true, w: 440, h: 250 },
    { id: 'v3', title: 'Medio ciclo en detalle, con la exponencial teórica', half: true, w: 440, h: 250 },
  ],
  run(anim) {
    const R = V('R'), C = V('C') * 1e-6, V0 = V('V0'), f = V('f');
    const tau = R * C, per = 1 / f, T = V('nper') * per, dt = Math.min(per / 4000, tau / 80);
    const Vs = t => (((t % per) + per) % per) < per / 2 ? V0 : -V0;
    const dQ = (Q, t) => (Vs(t) - Q / C) / R;
    const P = [[0, 0, 0]]; let Q = 0, t = 0;
    while (t < T - 1e-12 && P.length < 2e5) {
      const h = Math.min(dt, T - t), k1 = dQ(Q, t), k2 = dQ(Q + k1 * h / 2, t + h / 2);
      Q += k2 * h; t += h; P.push([t, Q, k2]);
    }
    // medio ciclo del final para el detalle
    const t0 = Math.max(0, (Math.floor(T / per) - 1) * per), medio = P.filter(p => p[0] >= t0 && p[0] <= t0 + per / 2);
    const Vini = medio.length ? medio[0][1] / C : 0;
    const draw = fr => {
      const tn = T * fr, cut = thin(P.filter(p => p[0] <= tn + 1e-12));
      plot($('v1'), [
        { pts: cut.map(p => [p[0] * 1e3, Vs(p[0])]), color: '#ffffff88', width: 1.2, label: 'V_s onda cuadrada' },
        { pts: cut.map(p => [p[0] * 1e3, p[1] / C]), color: COL.a, width: 2, label: 'V_C condensador' },
      ], { xmin: 0, xmax: T * 1e3, ymin: -V0 * 1.2, ymax: V0 * 1.2, xlabel: 't (ms)', ylabel: 'V' });
      plot($('v2'), [{ pts: cut.map(p => [p[0] * 1e3, p[2] * 1e3]), color: COL.b, label: 'I (mA)' }],
        { xmin: 0, xmax: T * 1e3, xlabel: 't (ms)', ylabel: 'I (mA)' });
      plot($('v3'), [
        { pts: medio.map(p => [(p[0] - t0) * 1e3, p[1] / C]), color: COL.a, width: 2, label: 'V_C numérica' },
        ...(V('expo') ? [{ pts: medio.map(p => [(p[0] - t0) * 1e3, V0 + (Vini - V0) * Math.exp(-(p[0] - t0) / tau)]), color: COL.c, dash: [5, 4], width: 1.4, label: 'V₀ + (V_i − V₀)e^(−t/τ)' }] : []),
      ], { xlabel: 't desde el flanco (ms)', ylabel: 'V_C', legend: 'left' });
    };
    go(anim, draw, 2800);
    const cargado = medio.length ? Math.abs(medio[medio.length - 1][1] / C) / V0 : 0;
    S(tbl(['', 'Valor'], [
      ['τ = RC', fmt(tau, 6) + ' s'],
      ['Periodo de la onda', fmt(per, 6) + ' s'],
      ['Medio ciclo / τ', fmt(per / 2 / tau, 3)],
      ['V_C alcanzado en medio ciclo', (cargado * 100).toFixed(1) + ' % de V₀'],
    ]) + `<p class="muted">Mientras carga, V_C sigue una <b>exponencial</b> V₀(1 − e^(−t/τ)); al descargarse, V₀e^(−t/τ). Hace falta medio ciclo de al menos unos 5τ para que llegue al 99 %: aquí el medio ciclo vale <b>${fmt(per / 2 / tau, 2)}τ</b>. Si acortas el periodo hasta T ≪ τ el condensador apenas se mueve y la salida se vuelve triangular: el circuito está <b>integrando</b> la onda cuadrada.</p>`);
  }
});

// ---------------- Problema 4.14 ----------------
reg({
  id: 'p414', group: '4.5 Oscilaciones en circuitos eléctricos', sec: '4.5', tag: 'P4.14', short: 'Circuito RLC y factor Q',
  title: 'Problema 4.14 · Respuesta de un circuito RLC',
  desc: '(a) Con R = 100 Ω, C = 3.0 µF y L = 2 mH, calcula las caídas de tensión en los tres elementos y la corriente. Obtén la curva de resonancia dibujando I_max frente a ω y localiza la frecuencia de resonancia. (b) La agudeza de la resonancia se mide con el factor Q = ω₀/Δω, donde Δω es el ancho entre los puntos en que I_max cae a 1/√2 del máximo.',
  eq: 'L·d²Q/dt² + R·dQ/dt + Q/C = V₀cos(ωt)<br>ω₀ = 1/√(LC)<br>I_max(ω) = V₀ / √[R² + (ωL − 1/ωC)²]<br>Q = ω₀L/R = (1/R)√(L/C)',
  controls: [
    { id: 'R', type: 'range', label: 'R (Ω)', min: 5, max: 400, step: 5, value: 100 },
    { id: 'L', type: 'range', label: 'L (mH)', min: .5, max: 20, step: .5, value: 2 },
    { id: 'C', type: 'range', label: 'C (µF)', min: .5, max: 20, step: .5, value: 3 },
    { id: 'V0', type: 'range', label: 'V₀ (V)', min: 1, max: 20, step: 1, value: 10 },
    { id: 'rel', type: 'range', label: 'ω / ω₀', min: .2, max: 2.5, step: .01, value: 1 },
    { id: 'nper', type: 'range', label: 'Periodos simulados', min: 10, max: 80, step: 5, value: 40 },
  ],
  buttons: [{ label: '▶ Simular', primary: true, fn: 'run' },
  { label: 'En resonancia', fn: () => setVals({ rel: 1 }) },
  { label: 'Q alto (R = 10 Ω)', fn: () => setVals({ R: 10 }) },
  { label: 'Q bajo (R = 300 Ω)', fn: () => setVals({ R: 300 }) }],
  views: [
    { id: 'v1', title: 'Curva de resonancia I_max(ω) y su anchura a 1/√2', h: 320 },
    { id: 'v2', title: 'Corriente I(t) con la ω elegida', half: true, w: 440, h: 260 },
    { id: 'v3', title: 'Caídas de tensión en R, L y C', half: true, w: 440, h: 260 },
  ],
  run(anim) {
    const R = V('R'), L = V('L') * 1e-3, C = V('C') * 1e-6, V0 = V('V0');
    const w0 = 1 / Math.sqrt(L * C), w = V('rel') * w0, Q = w0 * L / R;
    const Imax = q => V0 / Math.sqrt(R * R + (q * L - 1 / (q * C)) ** 2);
    const per = 2 * Math.PI / w, T = V('nper') * per, dt = Math.min(per / 400, 1 / (40 * w0));
    // L q'' + R q' + q/C = V0 cos(wt)
    const P = integra((q, i, t) => (V0 * Math.cos(w * t) - R * i - q / C) / L, 'er', 0, 0, dt, T);
    const cola = P.filter(p => p[0] > T * .6);
    const Imed = (Math.max(...cola.map(p => p[2])) - Math.min(...cola.map(p => p[2]))) / 2;
    const curva = []; for (let r = .2; r <= 2.5; r += .005) curva.push([r * w0, Imax(r * w0)]);
    // anchura a 1/raiz(2) del maximo, numerica
    const pico = Imax(w0), obj = pico / Math.SQRT2;
    let wlo = w0, whi = w0;
    for (let q = w0; q > w0 / 50; q *= .999) if (Imax(q) < obj) { wlo = q; break; }
    for (let q = w0; q < w0 * 50; q *= 1.001) if (Imax(q) < obj) { whi = q; break; }
    const Qmed = w0 / (whi - wlo);
    const draw = fr => {
      const tn = T * fr, cut = thin(P.filter(p => p[0] <= tn + 1e-12));
      plot($('v1'), [
        { pts: curva, color: COL.a, label: 'I_max(ω)' },
        { pts: [[wlo, obj], [whi, obj]], color: COL.c, width: 2, label: `Δω = ${fmt(whi - wlo, 4)}` },
        { pts: [[w0, 0], [w0, pico]], color: COL.b, dash: [3, 4], width: 1, label: `ω₀ = ${fmt(w0, 5)}` },
        { pts: [[w, 0], [w, Imax(w)]], color: COL.d, dash: [2, 3], width: 1, label: 'ω actual' },
      ], { xmin: .2 * w0, xmax: 2.5 * w0, ymin: 0, xlabel: 'ω (rad/s)', ylabel: 'I_max (A)', legend: 'left' });
      plot($('v2'), [{ pts: cut.map(p => [p[0] * 1e3, p[2]]), color: COL.a, label: 'I(t)' }],
        { xmin: 0, xmax: T * 1e3, xlabel: 't (ms)', ylabel: 'I (A)' });
      plot($('v3'), [
        { pts: cut.map(p => [p[0] * 1e3, R * p[2]]), color: COL.b, label: 'V_R' },
        { pts: cut.map(p => [p[0] * 1e3, p[1] / C]), color: COL.a, label: 'V_C' },
        { pts: cut.map(p => [p[0] * 1e3, V0 * Math.cos(w * p[0]) - R * p[2] - p[1] / C]), color: COL.d, label: 'V_L' },
      ], { xmin: Math.max(0, T * 1e3 - 6 * per * 1e3), xmax: T * 1e3, xlabel: 't (ms)', ylabel: 'V', legend: 'left' });
    };
    go(anim, draw, 2800);
    S(tbl(['', 'Valor'], [
      ['ω₀ = 1/√(LC)', fmt(w0, 6) + ' rad/s'], ['f₀', fmt(w0 / 2 / Math.PI, 5) + ' Hz'],
      ['ω elegida', fmt(w, 6)], ['I_max teórica', fmt(Imax(w), 5) + ' A'], ['I_max medida', fmt(Imed, 5) + ' A'],
      ['I_max en resonancia', fmt(pico, 5) + ' A  (= V₀/R)'],
      ['Δω a 1/√2', fmt(whi - wlo, 5)], ['Q = ω₀/Δω', fmt(Qmed, 4)], ['Q = (1/R)√(L/C)', fmt(Q, 4)],
    ]) + '<p class="muted">En resonancia las reactancias de L y C se cancelan, el circuito es puramente resistivo y la corriente alcanza V₀/R. Bajar R hace la resonancia <b>más aguda</b> y sube Q: por eso un receptor de radio con Q alto separa una emisora de la siguiente. Fíjate en que V_L y V_C pueden ser mucho mayores que V₀ cuando Q &gt; 1: están en oposición de fase y se cancelan entre sí.</p>');
  }
});

// ---------------- Problema 4.15 ----------------
reg({
  id: 'p415', group: '4.6 Exactitud y estabilidad', sec: '4.6', tag: 'P4.15', short: 'Exactitud del algoritmo de Euler',
  title: 'Problema 4.15 · Exactitud del algoritmo de Euler',
  desc: '(a) Resuelve dy/dx = 2x con y = 0 en x = 0 para Δx = 0.1, 0.05, 0.025, 0.01 y 0.005, y tabula la diferencia con la solución exacta y = x². ¿Se reduce al dividir Δx por dos? Si los puntos caen en una recta en escala log‑log, el error es proporcional a (Δx)ⁿ y n es el orden del método. (b) ¿Qué Δx hace falta para un 0.1 % de exactitud en x = 2?',
  eq: 'dy/dx = 2x ,  y(0) = 0  →  exacta y = x²<br>Euler: y_{n+1} = y_n + 2x_n·Δx<br>Error exacto: y_num − x² = −x·Δx  (¡independiente de x²!)<br>Orden 1: el error se divide por dos al dividir Δx por dos',
  controls: [
    { id: 'xf', type: 'range', label: 'x final', min: .5, max: 5, step: .5, value: 2 },
    { id: 'lg', type: 'range', label: 'Δx de la vista superior (log₁₀)', min: -3, max: -.5, step: .05, value: -1 },
    { id: 'tol', type: 'range', label: 'Exactitud buscada (%)', min: .01, max: 2, step: .01, value: .1 },
  ],
  views: [
    { id: 'v1', title: 'y(x): Euler frente a la solución exacta', half: true, w: 440, h: 280 },
    { id: 'v2', title: 'Error frente a x para el Δx elegido', half: true, w: 440, h: 280 },
    { id: 'v3', title: 'Error en x final frente a Δx (log‑log): la pendiente es el orden', h: 310 },
    { id: 'v4', title: 'Tabla del enunciado', html: true },
  ],
  run(anim) {
    const xf = V('xf'), h0 = 10 ** V('lg'), tol = V('tol') / 100;
    const euler = h => { const P = [[0, 0]]; let y = 0, x = 0; while (x < xf - 1e-12) { const p = Math.min(h, xf - x); y += 2 * x * p; x += p; P.push([x, y]); } return P; };
    const errEn = h => Math.abs(euler(h)[euler(h).length - 1][1] - xf * xf);
    const DX = [.1, .05, .025, .01, .005];
    const filas = DX.map(h => { const e = Math.abs(euler(h).pop()[1] - xf * xf); return [h, (xf * xf).toFixed(6), (xf * xf - e).toFixed(6), e.toExponential(3), (e / (xf * h)).toFixed(4)]; });
    const pts = []; for (let L = -3.4; L <= -.5; L += .1) { const h = 10 ** L; pts.push([L, Math.log10(Math.max(1e-16, errEn(h)))]); }
    const pend = P => { const n = P.length, sx = P.reduce((s, p) => s + p[0], 0), sy = P.reduce((s, p) => s + p[1], 0), sxx = P.reduce((s, p) => s + p[0] ** 2, 0), sxy = P.reduce((s, p) => s + p[0] * p[1], 0); return (n * sxy - sx * sy) / (n * sxx - sx * sx); };
    const hNec = tol * xf * xf / xf;                   // |error| = x·Δx = tol·x² → Δx = tol·x
    const P0 = euler(h0);
    const draw = fr => {
      const n = Math.max(2, Math.floor(P0.length * fr)), cut = thin(P0.slice(0, n));
      plot($('v1'), [
        { pts: cut.map(p => [p[0], p[0] * p[0]]), color: '#fff', dash: [4, 4], width: 1.3, label: 'exacta y = x²' },
        { pts: cut, color: COL.a, label: `Euler Δx = ${fmt(h0, 4)}` },
      ], { xmin: 0, xmax: xf, xlabel: 'x', ylabel: 'y' });
      plot($('v2'), [
        { pts: cut.map(p => [p[0], p[1] - p[0] * p[0]]), color: COL.b, label: 'y_Euler − x²' },
        { pts: cut.map(p => [p[0], -p[0] * h0]), color: COL.c, dash: [5, 4], width: 1.3, label: '−x·Δx (teórico)' },
      ], { xmin: 0, xmax: xf, xlabel: 'x', ylabel: 'error' });
      plot($('v3'), [
        { pts: pts, color: COL.a, label: `pendiente ${pend(pts).toFixed(3)}` },
        { pts: pts.filter((_, i) => i % 3 === 0), color: COL.a, dots: true, r: 3.5 },
        { pts: [[Math.log10(hNec), -16], [Math.log10(hNec), 2]], color: COL.c, dash: [3, 4], width: 1, label: `Δx para ${V('tol')} %` },
      ], { xlabel: 'log₁₀ Δx', ylabel: 'log₁₀ |error|', legend: 'left' });
    };
    go(anim, draw, 2200);
    $('v4').innerHTML = tbl(['Δx', 'exacta y(x_f)', 'Euler', '|error|', '|error| / (x_f·Δx)'], filas) +
      '<p class="hint">La última columna vale 1 en todos los casos: para esta ecuación el error de Euler es exactamente x·Δx. Al dividir Δx por dos el error se divide por dos, así que el <b>orden es 1</b>, y la recta log‑log lo confirma con pendiente 1.</p>';
    S(tbl(['', 'Valor'], [
      ['Pendiente log‑log medida', pend(pts).toFixed(4)],
      ['Orden del algoritmo', '1'],
      [`Δx para ${V('tol')} % en x = ${xf}`, fmt(hNec, 5)],
      ['Pasos necesarios', Math.ceil(xf / hNec)],
    ]) + '<p class="muted">Este caso es especialmente limpio: como la derivada no depende de y, el error de Euler se acumula sin realimentarse y sale exactamente −x·Δx. Para una exactitud relativa del tol en x, basta con Δx = tol·x.</p>');
  }
});

// ---------------- Problema 4.16 ----------------
reg({
  id: 'p416', group: '4.6 Exactitud y estabilidad', sec: '4.6', tag: 'P4.16', short: 'Estabilidad del algoritmo de Euler',
  title: 'Problema 4.16 · Estabilidad del algoritmo de Euler',
  desc: 'Carga de un condensador en un circuito RC con tensión constante: R·dQ/dt + Q/C = V. Con R = 2000 Ω, C = 10⁻⁶ F y V = 10 V, ¿crece Q indefinidamente o llega a un valor estacionario? (a) ¿Qué Δt hace falta para tres cifras exactas en t = 0.005 s? (b) ¿Qué ocurre en t = 0.05 s con Δt = 0.005, 0.0025 y 0.001? ¿Un cambio pequeño de Δt provoca un cambio grande en Q?',
  eq: 'R·dQ/dt + Q/C = V  →  dQ/dt = (V − Q/C)/R<br>Exacta: Q(t) = CV(1 − e^(−t/τ)) ,  τ = RC<br>Euler: Q_{n+1} = Q_n(1 − Δt/τ) + VΔt/R<br><b>Estable solo si Δt &lt; 2τ</b> ; oscila sin crecer si τ &lt; Δt &lt; 2τ',
  controls: [
    { id: 'R', type: 'range', label: 'R (Ω)', min: 500, max: 10000, step: 100, value: 2000 },
    { id: 'C', type: 'range', label: 'C (µF)', min: .2, max: 5, step: .1, value: 1 },
    { id: 'Vf', type: 'range', label: 'V (voltios)', min: 1, max: 20, step: 1, value: 10 },
    { id: 'tmax', type: 'range', label: 'Tiempo total (ms)', min: 2, max: 60, step: 1, value: 50 },
    { type: 'sep', label: 'Pasos que se comparan' },
    { id: 'd1', type: 'check', label: 'Δt = 0.005 s', value: true, color: COL.b },
    { id: 'd2', type: 'check', label: 'Δt = 0.0025 s', value: true, color: COL.c },
    { id: 'd3', type: 'check', label: 'Δt = 0.001 s', value: true, color: COL.d },
    { id: 'd4', type: 'check', label: 'Δt = 0.0001 s', value: true, color: COL.a },
  ],
  views: [
    { id: 'v1', title: 'Q(t) con cada Δt, frente a la solución exacta', h: 330 },
    { id: 'v2', title: 'Factor de amplificación |1 − Δt/τ| : por encima de 1 el método explota', half: true, w: 440, h: 270 },
    { id: 'v3', title: '(a) Δt necesario para tres cifras exactas en t = 0.005 s', half: true, w: 440, h: 270 },
  ],
  run(anim) {
    const R = V('R'), C = V('C') * 1e-6, Vf = V('Vf'), tau = R * C, T = V('tmax') * 1e-3, Qinf = C * Vf;
    const exacta = t => Qinf * (1 - Math.exp(-t / tau));
    const eulerQ = (h, Tt) => { const P = [[0, 0]]; let Q = 0, t = 0; while (t < Tt - 1e-12 && P.length < 3e4) { Q += (Vf - Q / C) / R * Math.min(h, Tt - t); t += Math.min(h, Tt - t); P.push([t, Q]); } return P; };
    const DT = [['d1', .005, COL.b], ['d2', .0025, COL.c], ['d3', .001, COL.d], ['d4', .0001, COL.a]].filter(d => V(d[0]));
    const ex = []; for (let i = 0; i <= 600; i++) { const t = T * i / 600; ex.push([t * 1e3, exacta(t)]); }
    // |1 - h/tau| frente a h
    const fac = []; for (let h = tau / 50; h <= 3 * tau; h += tau / 300) fac.push([h / tau, Math.abs(1 - h / tau)]);
    // (a) Dt para 3 cifras exactas en t = 0.005
    const tObj = .005, Qobj = exacta(tObj), conv = [];
    let hNec = NaN;
    for (let L = -1.5; L >= -6.5; L -= .05) {
      const h = 10 ** L, q = eulerQ(h, tObj).pop()[1], e = Math.abs(q - Qobj) / Qobj;
      conv.push([L, Math.log10(Math.max(1e-16, e))]);
      if (!isFinite(hNec) && e < 5e-4) hNec = h;
    }
    const draw = fr => {
      const tn = T * fr;
      plot($('v1'), [
        { pts: ex.filter(p => p[0] <= tn * 1e3), color: '#fff', dash: [4, 4], width: 1.4, label: 'exacta' },
        ...DT.map(([, h, col]) => ({ pts: eulerQ(h, Math.max(tn, 1e-9)).map(p => [p[0] * 1e3, p[1]]), color: col, label: `Δt = ${h}` })),
        { pts: [[0, Qinf], [T * 1e3, Qinf]], color: '#ffffff33', dash: [2, 4], width: 1, label: 'Q∞ = CV' },
      ], { xmin: 0, xmax: T * 1e3, xlabel: 't (ms)', ylabel: 'Q (C)' });
      plot($('v2'), [
        { pts: fac, color: COL.a, label: '|1 − Δt/τ|' },
        { pts: [[0, 1], [3, 1]], color: COL.b, dash: [3, 4], width: 1.2, label: 'límite de estabilidad' },
        { pts: DT.map(([, h, ]) => [h / tau, Math.abs(1 - h / tau)]), color: COL.c, dots: true, r: 5 },
      ], { xmin: 0, xmax: 3, ymin: 0, ymax: 2.2, xlabel: 'Δt / τ', ylabel: 'factor por paso', legend: 'left' });
      plot($('v3'), [
        { pts: conv, color: COL.d, label: 'error relativo en t = 5 ms' },
        { pts: [[-6.5, Math.log10(5e-4)], [-1.5, Math.log10(5e-4)]], color: COL.c, dash: [3, 4], width: 1, label: '3 cifras (5×10⁻⁴)' },
      ], { xlabel: 'log₁₀ Δt', ylabel: 'log₁₀ error relativo', legend: 'left' });
    };
    go(anim, draw, 2600);
    S(tbl(['Δt', 'Δt/τ', '|1 − Δt/τ|', 'Q en t = 50 ms', 'Comportamiento'],
      [.005, .0025, .001, .0001].map(h => {
        const f = Math.abs(1 - h / tau), q = eulerQ(h, .05).pop()[1];
        return [h, (h / tau).toFixed(2), f.toFixed(3), isFinite(q) ? q.toExponential(3) : 'desbordamiento',
          f > 1 ? 'INESTABLE: oscila y crece' : h > tau ? 'oscila pero converge' : 'estable'];
      })) + `<p class="muted">τ = RC = <b>${fmt(tau, 6)} s</b>. Euler multiplica el error por (1 − Δt/τ) en cada paso, así que solo es <b>estable si Δt &lt; 2τ</b>. Con Δt = 0.005 s se tiene Δt/τ = ${(0.005 / tau).toFixed(1)}, muy por encima del límite: la solución oscila con amplitud creciente y se va al infinito. Esto no es falta de exactitud sino <b>inestabilidad</b>: por eso un cambio pequeño de Δt puede cambiar el resultado por completo. Para tres cifras en t = 5 ms basta con Δt ≈ <b>${fmt(hNec, 5)} s</b>. Y sí, Q tiende a un valor estacionario Q∞ = CV = ${fmt(Qinf, 5)} C.</p>`);
  }
});

// ---------------- Proyecto 4.17 ----------------
reg({
  id: 'pr417', group: '4.7 Proyectos', sec: '4.7', tag: 'Proy. 4.17', short: 'Oscilaciones químicas',
  title: 'Proyecto 4.17 · Oscilaciones químicas',
  desc: 'La cinética de una reacción se modela con ecuaciones diferenciales acopladas. Para A + 2B → 3B + C, la velocidad de la etapa autocatalítica es proporcional a A·B². Manteniendo A constante por aporte externo se obtiene el <b>brusselator</b>, el modelo clásico de reloj químico: por encima de un umbral el punto fijo se desestabiliza y las concentraciones entran en un <b>ciclo límite</b>, una oscilación que no depende de las condiciones iniciales.',
  eq: 'Ẋ = A − (B+1)X + X²Y<br>Ẏ = BX − X²Y<br>Punto fijo: (X, Y) = (A, B/A)<br>Oscila si B &gt; 1 + A²  (bifurcación de Hopf)',
  controls: [
    { id: 'A', type: 'range', label: 'A (concentración fija)', min: .2, max: 3, step: .05, value: 1 },
    { id: 'B', type: 'range', label: 'B (parámetro de control)', min: .2, max: 6, step: .05, value: 3 },
    { id: 'x0', type: 'range', label: 'X(0)', min: .05, max: 5, step: .05, value: 1 },
    { id: 'y0', type: 'range', label: 'Y(0)', min: .05, max: 5, step: .05, value: 1 },
    { id: 'tmax', type: 'range', label: 'Tiempo total', min: 10, max: 120, step: 5, value: 50 },
    { id: 'varias', type: 'check', label: 'Varias condiciones iniciales', value: true, color: COL.d },
  ],
  buttons: [{ label: '▶ Simular', primary: true, fn: 'run' },
  { label: 'Estable (B < 1+A²)', fn: () => setVals({ A: 1, B: 1.5 }) },
  { label: 'Ciclo límite', fn: () => setVals({ A: 1, B: 3 }) },
  { label: 'Justo en el umbral', fn: () => setVals({ B: +(1 + V('A') ** 2).toFixed(2) }) }],
  views: [
    { id: 'v1', title: 'Concentraciones X(t) e Y(t)', h: 300 },
    { id: 'v2', title: 'Espacio de fases Y frente a X: el ciclo límite', h: 360 },
  ],
  run(anim) {
    const A = V('A'), B = V('B'), T = V('tmax'), dt = .002;
    const paso = (x, y, h) => {               // Euler-Richardson sobre el sistema 2×2
      const fx = (x, y) => A - (B + 1) * x + x * x * y, fy = (x, y) => B * x - x * x * y;
      const k1x = fx(x, y), k1y = fy(x, y);
      const mx = x + k1x * h / 2, my = y + k1y * h / 2;
      return [x + fx(mx, my) * h, y + fy(mx, my) * h];
    };
    const trayect = (x0, y0) => { const P = [[0, x0, y0]]; let x = x0, y = y0, t = 0;
      while (t < T - 1e-12 && P.length < 1e5) { const h = Math.min(dt, T - t);[x, y] = paso(x, y, h); t += h; P.push([t, x, y]); if (!isFinite(x) || x > 1e6) break; } return P; };
    const P = trayect(V('x0'), V('y0'));
    const otras = V('varias') ? [[.3, .3], [3, .5], [.5, 4]].map(([a, b]) => trayect(a, b)) : [];
    const umbral = 1 + A * A, oscila = B > umbral;
    const draw = fr => {
      const tn = T * fr, cut = thin(P.filter(p => p[0] <= tn + 1e-12));
      plot($('v1'), [
        { pts: cut.map(p => [p[0], p[1]]), color: COL.a, label: 'X(t)' },
        { pts: cut.map(p => [p[0], p[2]]), color: COL.b, label: 'Y(t)' },
        { pts: [[0, A], [T, A]], color: '#ffffff33', dash: [3, 4], width: 1, label: 'X fijo = A' },
      ], { xmin: 0, xmax: T, ymin: 0, xlabel: 't', ylabel: 'concentración' });
      const s = otras.map(Q => ({ pts: thin(Q.filter(p => p[0] <= tn + 1e-12), 1200).map(p => [p[1], p[2]]), color: COL.d + '55', width: 1 }));
      s.push({ pts: thin(P.filter(p => p[0] <= tn + 1e-12), 2500).map(p => [p[1], p[2]]), color: COL.a, width: 1.8, label: 'trayectoria' });
      s.push({ pts: [[A, B / A]], color: COL.c, dots: true, r: 6, label: `punto fijo (${A}, ${fmt(B / A, 3)})` });
      plot($('v2'), s, { xmin: 0, ymin: 0, xlabel: 'X', ylabel: 'Y', legend: 'left' });
    };
    go(anim, draw, 3200);
    const cola = P.filter(p => p[0] > T * .7);
    const ampX = (Math.max(...cola.map(p => p[1])) - Math.min(...cola.map(p => p[1]))) / 2;
    S(tbl(['', 'Valor'], [
      ['Punto fijo (X, Y)', `(${fmt(A, 3)}, ${fmt(B / A, 3)})`],
      ['Umbral de Hopf 1 + A²', fmt(umbral, 4)],
      ['B actual', fmt(B, 4)],
      ['Estado', oscila ? 'OSCILA (ciclo límite)' : 'converge al punto fijo'],
      ['Amplitud de X al final', fmt(ampX, 4)],
    ]) + `<p class="muted">Por debajo del umbral B = 1 + A² = ${fmt(umbral, 3)} el punto fijo es estable y las concentraciones se asientan. Por encima pierde la estabilidad y aparece un <b>ciclo límite</b>: la oscilación tiene una amplitud y un periodo propios del sistema, no de las condiciones iniciales. Enciende «varias condiciones iniciales» y verás que todas las trayectorias, vengan de donde vengan, caen sobre la misma curva cerrada. Eso lo distingue del oscilador armónico, donde cada condición inicial da su propia elipse.</p>`);
  }
});
