const fs = require('fs'), path = require('path'), crypto = require('crypto'), zlib = require('zlib');
const file = path.join(__dirname, 'unit-incremental-baseline.js.gz');
const candidate = fs.readFileSync(path.join(__dirname, 'unit-next.js'));
const sha = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
if (sha(candidate) !== '6f60ad34fc3150f394ac1302865550b74376399cbb7ddd284add571320a091f9') throw Error('Incremental baseline differs');
if (fs.existsSync(file)) {
  if (!zlib.gunzipSync(fs.readFileSync(file)).equals(candidate)) throw Error('Existing incremental baseline differs');
} else fs.writeFileSync(file, zlib.gzipSync(candidate));
console.log(JSON.stringify({baselineSha256: sha(candidate), ownedScratchOnly: true}));
