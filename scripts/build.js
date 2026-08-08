const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const assets = ['css', 'js', 'images', 'videos'];

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

fs.copyFileSync(path.join(root, 'index.html'), path.join(dist, 'index.html'));

if (fs.existsSync(path.join(root, '.nojekyll'))) {
  fs.copyFileSync(path.join(root, '.nojekyll'), path.join(dist, '.nojekyll'));
}

assets.forEach(function (dir) {
  const source = path.join(root, dir);
  if (fs.existsSync(source)) {
    fs.cpSync(source, path.join(dist, dir), { recursive: true });
  }
});

console.log('Build concluído em dist/');
