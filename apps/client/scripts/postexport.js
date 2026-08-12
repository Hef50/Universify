/**
 * Post-process the static web export for deployment.
 *
 * Expo emits vendor assets (icon fonts) under paths like
 *   dist/assets/__node_modules/.pnpm/<pkg>/node_modules/@expo/vector-icons/.../Fonts/Ionicons.<hash>.ttf
 * Vercel's uploader silently prunes anything under a `node_modules` (and
 * dot-directories like `.pnpm`), so those fonts 404 in production and every
 * icon renders as tofu. Flatten every such file to dist/assets/vendor/<basename>
 * (basenames carry content hashes, so collisions are not a concern) and
 * rewrite the references inside the exported JS/CSS/HTML.
 *
 * Runs automatically after `expo export` via the build script. Idempotent.
 */
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const ASSETS = path.join(DIST, 'assets');
const VENDOR = path.join(ASSETS, 'vendor');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

if (!fs.existsSync(ASSETS)) {
  console.error('postexport: dist/assets not found — run expo export first');
  process.exit(1);
}

// 1. Find every asset whose path would be pruned by Vercel
const pruned = walk(ASSETS).filter((file) => {
  const rel = path.relative(DIST, file).split(path.sep).join('/');
  return /(^|\/)(node_modules|__node_modules|\.pnpm)(\/|$)/.test(rel) && !rel.startsWith('assets/vendor/' + path.basename(file));
});

if (pruned.length === 0) {
  console.log('postexport: nothing to flatten (already processed or no vendor assets)');
  process.exit(0);
}

// 2. Move each to assets/vendor/<basename> and record the rewrite map
fs.mkdirSync(VENDOR, { recursive: true });
const rewrites = new Map();
for (const file of pruned) {
  const rel = path.relative(DIST, file).split(path.sep).join('/');
  const target = 'assets/vendor/' + path.basename(file);
  fs.renameSync(file, path.join(DIST, target));
  rewrites.set(rel, target);
}

// 3. Remove the now-empty pruned directory trees
for (const name of fs.readdirSync(ASSETS)) {
  if (/^(node_modules|__node_modules|\.pnpm)$/.test(name)) {
    fs.rmSync(path.join(ASSETS, name), { recursive: true, force: true });
  }
}
// Also clean any nested leftovers inside vendor from earlier runs
for (const name of fs.readdirSync(VENDOR)) {
  const full = path.join(VENDOR, name);
  if (fs.statSync(full).isDirectory()) fs.rmSync(full, { recursive: true, force: true });
}

// 4. Rewrite references in exported text files
let touched = 0;
for (const file of walk(DIST)) {
  if (!/\.(js|css|html|json)$/.test(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  for (const [oldRel, newRel] of rewrites) {
    if (content.includes(oldRel)) {
      content = content.split(oldRel).join(newRel);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(file, content);
    touched++;
  }
}

console.log(
  `postexport: flattened ${rewrites.size} vendor asset(s) to assets/vendor, rewrote ${touched} file(s)`
);
