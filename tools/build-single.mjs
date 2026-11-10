// Builds dist/index.html: the whole game in ONE file (styles, scripts, art, icon inlined).
// Double-click it to play solo offline. Online rooms still need the game server.
// Usage: npm run build:single
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLIENT = path.join(ROOT, 'client');
// The browser sees shared/ as client/shared/ (that is how the server serves it).
const resolveFile = (url) => {
  const rel = path.relative(CLIENT, url);
  if (rel.startsWith('shared' + path.sep)) return path.join(ROOT, rel);
  return url;
};

const modules = new Map(); // id -> code
function load(id) {
  if (modules.has(id)) return;
  modules.set(id, null);
  let src = fs.readFileSync(resolveFile(path.join(CLIENT, id)), 'utf8');
  const dir = path.posix.dirname(id);
  const req = (spec) => { const dep = path.posix.normalize(path.posix.join(dir, spec)); load(dep); return dep; };
  const exportsList = [];
  // export { a, b as c } from './x.js';
  src = src.replace(/^export \{([^}]*)\} from '([^']+)';/gm, (_, names, spec) => {
    const dep = req(spec);
    const tmp = '__re' + exportsList.length;
    for (const n of names.split(',').map((s) => s.trim()).filter(Boolean)) {
      const [orig, alias] = n.split(/\s+as\s+/);
      exportsList.push([alias || orig, `${tmp}.${orig}`]);
    }
    return `const ${tmp} = __req(${JSON.stringify(dep)});`;
  });
  // import { a, b as c } from './x.js';
  src = src.replace(/^import \{([^}]*)\} from '([^']+)';/gm, (_, names, spec) => {
    const dep = req(spec);
    const fields = names.split(',').map((s) => s.trim()).filter(Boolean).map((n) => n.replace(/\s+as\s+/, ': '));
    return `const { ${fields.join(', ')} } = __req(${JSON.stringify(dep)});`;
  });
  // export { a, b };
  src = src.replace(/^export \{([^}]*)\};/gm, (_, names) => {
    for (const n of names.split(',').map((s) => s.trim()).filter(Boolean)) { const [orig, alias] = n.split(/\s+as\s+/); exportsList.push([alias || orig, orig]); }
    return '';
  });
  // export function/class/const NAME
  src = src.replace(/^export (async function|function|class|const) (\w+)/gm, (_, kw, name) => { exportsList.push([name, name]); return `${kw} ${name}`; });
  if (/^\s*(import|export)\s/m.test(src)) throw new Error(`Unhandled import/export form in ${id}`);
  const ret = exportsList.map(([n, v]) => `get ${n}() { return ${v}; }`).join(', ');
  modules.set(id, `${src}\nreturn { ${ret} };`);
}
load('main.js');

const bundle = [
  '(() => {',
  'const __defs = {}; const __cache = {};',
  'function __req(id) { if (!(id in __cache)) { __cache[id] = null; __cache[id] = __defs[id](); } return __cache[id]; }',
  ...[...modules].map(([id, code]) => `__defs[${JSON.stringify(id)}] = function () {\n${code}\n};`),
  '__req("main.js");',
  '})();',
].join('\n');
// Fail the build if a module leaves behind syntax that cannot run as an embedded script.
new Function(bundle);

const packedAssets=Object.fromEntries(['car','logo','actors','terrain','objects','panel','walk-animals-a','walk-animals-b'].map(name=>[name,'data:image/png;base64,'+fs.readFileSync(path.join(CLIENT,'assets',name+'.png')).toString('base64')]));
let html = fs.readFileSync(path.join(CLIENT, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(CLIENT, 'style.css'), 'utf8').replaceAll('url(assets/panel.png)',`url(${packedAssets.panel})`);
const icon = fs.readFileSync(path.join(CLIENT, 'favicon.svg'), 'utf8').trim();
html = html.replace('<link rel="icon" href="favicon.svg" type="image/svg+xml">', `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(icon)}">`);
html = html.replace('<link rel="stylesheet" href="style.css">', () => `<style>\n${css}\n</style>`);
html = html.replace('<script type="module" src="main.js"></script>', () => `<script>\nwindow.__BB_ASSETS__=${JSON.stringify(packedAssets)};\n${bundle.replace(/<\/script/gi, '<\\/script')}\n</script>`);
if (/src="main\.js"|href="style\.css"/.test(html)) throw new Error('inlining failed');

fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
const out = path.join(ROOT, 'dist', 'index.html');
fs.writeFileSync(out, html);
console.log(`Wrote ${path.relative(ROOT, out)} (${Math.round(html.length / 1024)} KB, ${modules.size} modules)`);
