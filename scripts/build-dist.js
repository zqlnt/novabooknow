#!/usr/bin/env node
/**
 * Creates production dist/ folder for Render and static hosts.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

if (fs.existsSync(dist)) {
  fs.rmSync(dist, { recursive: true, force: true });
}
fs.mkdirSync(dist, { recursive: true });

const copyList = ['index.html', 'config.js', 'manifest.json', 'sw.js', 'assets', 'src', 'supabase', 'netlify.toml', 'vercel.json', 'render.yaml'];
for (const item of copyList) {
  copyRecursive(path.join(root, item), path.join(dist, item));
}

console.log('Created dist/ production bundle');
