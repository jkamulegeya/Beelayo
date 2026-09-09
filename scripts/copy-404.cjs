// Copies dist/index.html -> dist/404.html so GitHub Pages serves the SPA
// for unknown paths (deep links like /Beelayo/e/slug) instead of a 404.
const fs = require('node:fs')
const path = require('node:path')

const dist = path.resolve(__dirname, '..', 'dist')
const src = path.join(dist, 'index.html')
const dest = path.join(dist, '404.html')

try {
  fs.copyFileSync(src, dest)
  console.log('404.html created for GitHub Pages SPA fallback.')
} catch (err) {
  console.error('Could not create 404.html:', err.message)
  process.exit(1)
}