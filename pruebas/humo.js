// Arnés de humo: ejecuta core.js + mod_*.js en un DOM/canvas simulado.
const fs = require('fs'), path = require('path'), vm = require('vm');
const DIR = process.argv[2] || require('path').join(__dirname, '..');
const FILES = ['i18n.js', 'core.js', 'mod_a.js', 'mod_b.js'];

const noop = () => { };
const grad = { addColorStop: noop };
function ctx2d() {
  return new Proxy({
    createRadialGradient: () => grad, createLinearGradient: () => grad,
    measureText: () => ({ width: 10 }), getImageData: () => ({ data: [] }),
  }, {
    get(t, k) { if (k in t) return t[k]; return typeof k === 'string' ? noop : undefined; },
    set(t, k, v) { t[k] = v; return true; },
  });
}
const els = new Map();
function el(id) {
  if (!els.has(id)) els.set(id, {
    id, width: 820, height: 320, value: '', type: '', checked: false, options: [], innerHTML: '', textContent: '',
    style: {}, dataset: {}, files: null,
    classList: { toggle: noop, add: noop, remove: noop, contains: () => false },
    getContext: ctx2d, addEventListener: noop, setPointerCapture: noop, releasePointerCapture: noop,
    appendChild: noop, click: noop, focus: noop, getBoundingClientRect: () => ({ left: 0, top: 0, width: 820, height: 320 }),
  });
  return els.get(id);
}
let boot = null;
const sandbox = {
  console, Math, Date, JSON, Number, String, Array, Object, isFinite, isNaN, parseFloat, parseInt,
  Float64Array, Infinity, NaN, undefined, Proxy, Reflect, Map, Set, Symbol, Error, TypeError,
  performance: { now: () => Date.now() }, setTimeout: (fn) => { try { fn(); } catch (e) {} }, clearTimeout: () => {},
  history: { replaceState: noop },
  location: { hash: '' },
  FileReader: function () { this.readAsText = noop; },
  document: {
    getElementById: el, documentElement: { lang: 'es' }, querySelector: () => null,
    createElement: () => el('__tmp' + Math.random()),
    querySelectorAll: () => [],
    addEventListener: noop,
  },
  window: { addEventListener: (ev, fn) => { if (ev === 'DOMContentLoaded') boot = fn; }, scrollTo: noop },
};
sandbox.globalThis = sandbox;
let raf = 0;
sandbox.requestAnimationFrame = fn => { if (raf-- > 0) fn(sandbox.performance.now()); };

const src = FILES.map(f => `//#### ${f}\n` + fs.readFileSync(path.join(DIR, f), 'utf8')).join('\n;\n');
const ctx = vm.createContext(sandbox);
vm.runInContext(src, ctx, { filename: 'bundle.js' });

// sembrar los controles de todos los módulos
const mods = vm.runInContext('MODULES.map(m => ({ id: m.id, tag: m.tag, controls: m.controls, nb: (m.buttons||[]).length }))', ctx);
const TIPO = { check: 'checkbox', range: 'range', number: 'number', text: 'text', select: 'select-one' };
mods.forEach(m => m.controls.forEach(c => {
  if (c.type === 'sep') return;
  const e = el('c-' + c.id);
  e.type = TIPO[c.type] || 'text';
  if (c.type === 'check') e.checked = !!c.value; else e.value = String(c.value);
  el('c-' + c.id + '-o');
}));

let fallos = 0;
const prueba = (etiq, fn) => {
  try { fn(); } catch (e) { fallos++; console.log(`  ✗ ${etiq}: ${e && e.message}\n     ${String(e && e.stack).split('\n')[1] || ''}`); }
};

prueba('arranque (DOMContentLoaded)', () => { raf = 4; vm.runInContext('buildNav()', ctx); boot && boot(); });

const sembrar = m => m.controls.forEach(c => {
  if (c.type === 'sep') return;
  const e = el('c-' + c.id);
  e.type = TIPO[c.type] || 'text';
  if (c.type === 'check') e.checked = !!c.value; else e.value = String(c.value);
});
mods.forEach(m => {
  sembrar(m);                 // valores por defecto propios: varios modulos comparten ids (v0, h, dt)
  const t0 = Date.now();
  prueba(`${m.tag} show()`, () => { raf = 6; vm.runInContext(`show(${JSON.stringify(m.id)})`, ctx); });
  const tr = Date.now();
  prueba(`${m.tag} run(false)`, () => { raf = 0; vm.runInContext(`MODULES.find(x=>x.id===${JSON.stringify(m.id)}).run(false)`, ctx); });
  const msRun = Date.now() - tr;
  for (let i = 0; i < m.nb; i++) {
    prueba(`${m.tag} botón ${i}`, () => { raf = 4; const b = el('b-' + i); if (typeof b.onclick === 'function') b.onclick(); });
  }
  console.log(`  · ${m.tag.padEnd(10)} run ${String(msRun).padStart(6)} ms   total(+botones) ${String(Date.now() - t0).padStart(6)} ms`);
});

console.log(fallos ? `\n${fallos} FALLO(S)` : '\nSIN FALLOS: los ' + mods.length + ' módulos se ejecutan');
process.exit(fallos ? 1 : 0);
