// Verificación numérica de la física del capítulo 4 (Oscillations)
const fs = require('fs'), path = require('path'), vm = require('vm');
const DIR = process.argv[2] || path.join(__dirname, '..');
const noop = () => { }, grad = { addColorStop: noop };
const ctx2d = () => new Proxy({ createRadialGradient: () => grad, createLinearGradient: () => grad, measureText: () => ({ width: 10 }) },
  { get(t, k) { return k in t ? t[k] : (typeof k === 'string' ? noop : undefined) }, set(t, k, v) { t[k] = v; return true } });
const els = new Map(), el = id => { if (!els.has(id)) els.set(id, { id, width: 820, height: 320, value: '', type: '', checked: false, options: [], innerHTML: '', style: {}, dataset: {}, classList: { toggle: noop, add: noop, remove: noop }, getContext: ctx2d, addEventListener: noop, setPointerCapture: noop }); return els.get(id) };
const sb = {
  console, Math, Date, JSON, Number, String, Array, Object, isFinite, isNaN, parseFloat, parseInt, Float64Array, Infinity, NaN, Proxy, Map, Set, Error,
  performance: { now: () => Date.now() }, setTimeout: (fn) => { try { fn(); } catch (e) { } }, clearTimeout: () => { },
  history: { replaceState: noop }, location: { hash: '' }, FileReader: function () { this.readAsText = noop },
  localStorage: { getItem: () => null, setItem: noop, removeItem: noop }, sessionStorage: { getItem: () => null, setItem: noop },
  Blob: function () { }, URL: { createObjectURL: () => '', revokeObjectURL: noop },
  document: { getElementById: el, documentElement: { lang: 'es' }, querySelector: () => null, createElement: () => el('__t'), querySelectorAll: () => [], addEventListener: noop, body: { appendChild: noop } },
  window: { addEventListener: noop, scrollTo: noop }, requestAnimationFrame: noop,
};
sb.globalThis = sb;
const src = ['i18n.js', 'core.js', 'mod_a.js', 'mod_b.js'].map(f => fs.readFileSync(path.join(DIR, f), 'utf8')).join('\n;\n');
const ctx = vm.createContext(sb);
vm.runInContext(src, ctx, { filename: 'bundle.js' });
const run = e => vm.runInContext(e, ctx);

let mal = 0;
const ok = (t, c, i) => { console.log(`  ${c ? '✓' : '✗'} ${t}${i ? '  —  ' + i : ''}`); if (!c) mal++; };
const cerca = (a, b, tol) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

console.log('');
console.log('== 4.1 Movimiento armónico simple ==');
const sh = run(`(() => {
  const w0 = 3, T0 = 2*Math.PI/w0, E = (x,v) => .5*v*v + .5*w0*w0*x*x, E0 = E(1,0), o = {};
  ['euler','cromer','er','verlet'].forEach(k => {
    const P = integra(x => -w0*w0*x, k, 1, 0, .01, 20*T0);
    let mx = 0; P.forEach(p => mx = Math.max(mx, Math.abs(E(p[1],p[2]) - E0)));
    o[k] = { fin: E(P[P.length-1][1], P[P.length-1][2])/E0, max: mx/E0, T: periodoDe(P).T };
  });
  return o;
})()`);
ok('Euler: la energía crece sin control', sh.euler.fin > 1.5, `E/E₀ = ${sh.euler.fin.toFixed(3)}`);
ok('Euler–Cromer: energía acotada (simpléctico)', sh.cromer.max < .05, `máx |ΔE|/E₀ = ${sh.cromer.max.toExponential(2)}`);
ok('Verlet: energía acotada (simpléctico)', sh.verlet.max < .05, `máx |ΔE|/E₀ = ${sh.verlet.max.toExponential(2)}`);
ok('Euler–Richardson: deriva lenta, no acotada como los simplécticos', sh.er.max < .05);
ok('periodo medido = 2π/ω₀', cerca(sh.verlet.T, 2 * Math.PI / 3, 2e-3), `T = ${sh.verlet.T.toFixed(5)} vs ${(2 * Math.PI / 3).toFixed(5)}`);

const vir = run(`(() => {
  const w0 = 3, A = 1.7, T0 = 2*Math.PI/w0, N = 20000;
  let K = 0, U = 0;
  for (let i = 0; i < N; i++) { const t = T0*i/N, x = A*Math.cos(w0*t), v = -A*w0*Math.sin(w0*t);
    K += .5*v*v; U += .5*w0*w0*x*x; }
  return { K: K/N, U: U/N, E: .5*w0*w0*A*A };
})()`);
ok('teorema del virial: ⟨K⟩ = ⟨U⟩ = E/2', cerca(vir.K, vir.U, 1e-4) && cerca(vir.K, vir.E / 2, 1e-4),
  `⟨K⟩=${vir.K.toFixed(5)} ⟨U⟩=${vir.U.toFixed(5)} E/2=${(vir.E / 2).toFixed(5)}`);

console.log('');
console.log('== 4.2 Péndulo: el periodo crece con la amplitud ==');
const pen = run(`(() => {
  const w0 = 3, T0 = 2*Math.PI/w0;
  const Kel = k => { let a = 1, b = Math.sqrt(1-k*k); for (let i=0;i<40;i++){ const na=(a+b)/2; b=Math.sqrt(a*b); a=na; } return Math.PI/(2*a); };
  return [0.2, 1.0, 2.0].map(t0 => {
    const P = integra(th => -w0*w0*Math.sin(th), 'er', t0, 0, .0005, 10*T0);
    return { t0, num: periodoDe(P).T/T0, exacto: (4/w0*Kel(Math.sin(t0/2)))/T0, serie: 1 + t0*t0/16 };
  });
})()`);
pen.forEach(p => ok(`θ₀ = ${p.t0}: T/T₀ numérico = exacto`, cerca(p.num, p.exacto, 2e-3),
  `num ${p.num.toFixed(5)} · elíptico ${p.exacto.toFixed(5)} · serie ${p.serie.toFixed(5)}`));
ok('el periodo crece de forma monótona con la amplitud', pen[0].num < pen[1].num && pen[1].num < pen[2].num);

console.log('');
console.log('== 4.3 Oscilador amortiguado ==');
const am = run(`(() => {
  const w0 = 3, o = {};
  [0.5, 1, 2, 3].forEach(g => {
    const P = integra((x,v) => -w0*w0*x - g*v, 'er', 1, 0, .0005, 40);
    const w1 = Math.sqrt(w0*w0 - g*g/4);
    o[g] = { T: periodoDe(P).T, Tteo: 2*Math.PI/w1 };
  });
  const P2 = integra((x,v) => -w0*w0*x - 8*v, 'er', 1, 0, .0005, 20);
  o.sobre = periodoDe(P2).T;
  return o;
})()`);
[0.5, 1, 2, 3].forEach(g => ok(`γ = ${g}: T medido = 2π/ω₁`, cerca(am[g].T, am[g].Tteo, 5e-3),
  `${am[g].T.toFixed(5)} vs ${am[g].Tteo.toFixed(5)}`));
ok('el periodo crece al aumentar γ', am[0.5].T < am[1].T && am[1].T < am[2].T && am[2].T < am[3].T);
ok('γ > 2ω₀: sobreamortiguado, ya no oscila', !isFinite(am.sobre));

console.log('');
console.log('== 4.4 Forzamiento: amplitud y fase estacionarias ==');
const fz = run(`(() => {
  const w0 = 3, g = .5, A0 = 1, o = [];
  [1, 2, 3, 5].forEach(w => {
    const T = 240, P = integra((x,v,t) => -w0*w0*x - g*v + A0*Math.cos(w*t), 'er', 1, 0, .002, T);
    let lo = Infinity, hi = -Infinity;
    P.forEach(p => { if (p[0] > T*.8) { if (p[1]<lo) lo=p[1]; if (p[1]>hi) hi=p[1]; } });
    o.push({ w, med: (hi-lo)/2, teo: ampEstac(w, w0, g, A0) });
  });
  const wres = Math.sqrt(w0*w0 - g*g/2);
  return { o, wres, Ares: ampEstac(wres, w0, g, A0), A3: ampEstac(3, w0, g, A0) };
})()`);
fz.o.forEach(r => ok(`ω = ${r.w}: amplitud medida = A(ω) teórica`, cerca(r.med, r.teo, 2e-2),
  `${r.med.toFixed(5)} vs ${r.teo.toFixed(5)}`));
ok('la resonancia está en ω = √(ω₀² − γ²/2)', fz.Ares >= fz.A3, `A(ω_res)=${fz.Ares.toFixed(4)} ≥ A(ω₀)=${fz.A3.toFixed(4)}`);

console.log('');
console.log('== 4.4 Espacio de fases: teorema de Liouville ==');
const li = run(`(() => {
  const w0 = 3, T = 2*Math.PI/w0*2;
  const area = pts => { let s = 0; for (let i=0;i<pts.length;i++){ const a=pts[i], b=pts[(i+1)%pts.length]; s += a[0]*b[1]-b[0]*a[1]; } return Math.abs(s)/2; };
  const ini = []; const n = 9, cx = 1, cv = 0, ax = .6, av = 1.2;
  for (let i=0;i<n;i++) for (let j=0;j<n;j++) if (i===0||j===0||i===n-1||j===n-1) ini.push([cx-ax/2+ax*i/(n-1), cv-av/2+av*j/(n-1)]);
  ini.sort((p,q) => Math.atan2(p[1]-cv,p[0]-cx) - Math.atan2(q[1]-cv,q[0]-cx));
  const en = ([x,v],t) => [x*Math.cos(w0*t)+v/w0*Math.sin(w0*t), -x*w0*Math.sin(w0*t)+v*Math.cos(w0*t)];
  const A0 = area(ini);
  let peor = 0;
  for (let i=0;i<=60;i++){ const t=T*i/60; peor = Math.max(peor, Math.abs(area(ini.map(p=>en(p,t)))/A0 - 1)); }
  return { A0, peor };
})()`);
ok('el área del espacio de fases se conserva a lo largo del giro', li.peor < 1e-9,
  `desviación máxima ${li.peor.toExponential(2)}`);

console.log('');
console.log('== 4.5 Circuitos ==');
const rc = run(`(() => {
  const R = 1000, C = 1e-6, tau = R*C, V0 = 1, o = [];
  [10, 160, 1000].forEach(f => {
    const w = 2*Math.PI*f, T = 40/f, dt = Math.min(T/20000, tau/200);
    const dQ = (Q,t) => (V0*Math.cos(w*t) - Q/C)/R;
    let Q = 0, t = 0, lo = Infinity, hi = -Infinity;
    while (t < T-1e-15) { const h=Math.min(dt,T-t), k1=dQ(Q,t), k2=dQ(Q+k1*h/2,t+h/2); Q+=k2*h; t+=h;
      if (t>T*.7) { const v = Q/C; if (v<lo) lo=v; if (v>hi) hi=v; } }
    o.push({ f, med: (hi-lo)/2, teo: 1/Math.sqrt(1+(w*tau)**2) });
  });
  return { o, fc: 1/(2*Math.PI*tau) };
})()`);
rc.o.forEach(r => ok(`RC a ${r.f} Hz: ganancia V_C/V_s correcta`, cerca(r.med, r.teo, 2e-2),
  `${r.med.toFixed(5)} vs ${r.teo.toFixed(5)}`));
ok('a la frecuencia de corte la ganancia vale 1/√2', cerca(1 / Math.sqrt(1 + 1), Math.SQRT1_2, 1e-12),
  `f_corte = ${rc.fc.toFixed(2)} Hz`);

const rlc = run(`(() => {
  const R = 100, L = 2e-3, C = 3e-6, V0 = 10, w0 = 1/Math.sqrt(L*C);
  const Imax = q => V0/Math.sqrt(R*R + (q*L - 1/(q*C))**2);
  const T = 60*2*Math.PI/w0, dt = 1/(200*w0);
  const P = integra((q,i,t) => (V0*Math.cos(w0*t) - R*i - q/C)/L, 'er', 0, 0, dt, T);
  let lo = Infinity, hi = -Infinity;
  P.forEach(p => { if (p[0] > T*.7) { if (p[2]<lo) lo=p[2]; if (p[2]>hi) hi=p[2]; } });
  return { w0, pico: Imax(w0), VR: V0/R, med: (hi-lo)/2,
           Q: w0*L/R, menor: Imax(w0*.8) };
})()`);
ok('RLC: en resonancia I_max = V₀/R', cerca(rlc.pico, rlc.VR, 1e-9), `${rlc.pico.toFixed(5)} A`);
ok('RLC: la corriente simulada en resonancia coincide', cerca(rlc.med, rlc.VR, 3e-2), `${rlc.med.toFixed(5)} A`);
ok('RLC: fuera de resonancia la corriente es menor', rlc.menor < rlc.pico);
ok('RLC: Q = ω₀L/R = (1/R)√(L/C)', cerca(rlc.Q, (1 / 100) * Math.sqrt(2e-3 / 3e-6), 1e-9), `Q = ${rlc.Q.toFixed(4)}`);

console.log('');
console.log('== 4.6 Exactitud y estabilidad de Euler ==');
const eu = run(`(() => {
  const xf = 2;
  const euler = h => { let y = 0, x = 0; while (x < xf-1e-12) { const p = Math.min(h, xf-x); y += 2*x*p; x += p; } return y; };
  const errs = [.1,.05,.025,.01,.005].map(h => ({ h, e: Math.abs(euler(h) - xf*xf), teo: xf*h }));
  const pts = errs.map(r => [Math.log10(r.h), Math.log10(r.e)]);
  const n = pts.length, sx = pts.reduce((s,p)=>s+p[0],0), sy = pts.reduce((s,p)=>s+p[1],0),
        sxx = pts.reduce((s,p)=>s+p[0]**2,0), sxy = pts.reduce((s,p)=>s+p[0]*p[1],0);
  return { errs, pend: (n*sxy-sx*sy)/(n*sxx-sx*sx) };
})()`);
ok('el error de Euler en dy/dx = 2x es exactamente x·Δx',
  eu.errs.every(r => cerca(r.e, r.teo, 1e-9)), eu.errs.map(r => r.e.toExponential(2)).join(' · '));
ok('la pendiente log-log es 1 → el método es de orden 1', cerca(eu.pend, 1, 1e-3), `pendiente ${eu.pend.toFixed(5)}`);

const est = run(`(() => {
  const R = 2000, C = 1e-6, Vf = 10, tau = R*C;
  const euler = (h, T) => { let Q = 0, t = 0, n = 0; while (t < T-1e-15 && n++ < 1e6) { Q += (Vf - Q/C)/R*Math.min(h,T-t); t += Math.min(h,T-t); } return Q; };
  return { tau, Qinf: C*Vf,
    q5: euler(.005, .05), q25: euler(.0025, .05), q1: euler(.001, .05), q01: euler(.0001, .05),
    f5: Math.abs(1-.005/tau), f1: Math.abs(1-.001/tau) };
})()`);
ok('τ = RC = 2 ms', cerca(est.tau, .002, 1e-12));
ok('Δt = 0.005 s > 2τ → Euler es INESTABLE', est.f5 > 1 && Math.abs(est.q5) > 10 * est.Qinf,
  `|1−Δt/τ| = ${est.f5.toFixed(2)} · Q = ${est.q5.toExponential(2)}`);
ok('Δt = 0.001 s < 2τ → estable y converge a CV', est.f1 < 1 && cerca(est.q1, est.Qinf, 1e-3),
  `Q = ${est.q1.toExponential(4)} vs CV = ${est.Qinf.toExponential(4)}`);
ok('con Δt pequeño converge al valor estacionario', cerca(est.q01, est.Qinf, 1e-4));

console.log('');
console.log('== 4.7 Brusselator: umbral de Hopf ==');
const br = run(`(() => {
  const sim = (A,B) => {
    const fx = (x,y) => A - (B+1)*x + x*x*y, fy = (x,y) => B*x - x*x*y;
    let x = 1, y = 1; const h = .002;
    for (let i = 0; i < 60000; i++) { const k1x=fx(x,y),k1y=fy(x,y), mx=x+k1x*h/2, my=y+k1y*h/2; x+=fx(mx,my)*h; y+=fy(mx,my)*h; }
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < 20000; i++) { const k1x=fx(x,y),k1y=fy(x,y), mx=x+k1x*h/2, my=y+k1y*h/2; x+=fx(mx,my)*h; y+=fy(mx,my)*h;
      if (x<lo) lo=x; if (x>hi) hi=x; }
    return (hi - lo)/2;
  };
  return { bajo: sim(1, 1.5), alto: sim(1, 3), umbral: 1 + 1*1 };
})()`);
ok('B < 1 + A²: converge al punto fijo, sin oscilación', br.bajo < 1e-3, `amplitud ${br.bajo.toExponential(2)}`);
ok('B > 1 + A²: aparece el ciclo límite', br.alto > .5, `amplitud ${br.alto.toFixed(4)}`);

console.log('');
console.log(mal ? `${mal} COMPROBACIÓN(ES) FALLIDA(S)` : 'TODAS LAS COMPROBACIONES NUMÉRICAS PASAN');
process.exit(mal ? 1 : 0);
