const path = require('node:path');
const {createCanvas, loadImage} = require('C:/Users/cabba/node_modules/@napi-rs/canvas');
(async () => {
  const names = process.argv.slice(2);
  if (!names.length || names.length > 4 || names.some(n => !/^[a-z0-9-]+\.png$/.test(n))) throw Error('Supply one to four report PNG filenames');
  const cols = Math.min(2, names.length), rows = Math.ceil(names.length / cols);
  const canvas = createCanvas(cols * 800, rows * 547), ctx = canvas.getContext('2d');
  for (let i = 0; i < names.length; i++) {
    const img = await loadImage(path.join(__dirname, names[i]));
    ctx.drawImage(img, (i % cols) * 800, Math.floor(i / cols) * 547, 800, 547);
  }
  process.stdout.write(canvas.toBuffer('image/jpeg', 86).toString('base64'));
})().catch(e => {console.error(e); process.exitCode = 1;});
