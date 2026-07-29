'use strict';
/*
 * zip_writer.cjs — minimal ZIP writer for the MCP connector's alternative-format exports.
 *
 * WHY not a library: the connector ships as a .mcpb bundle with no node_modules, and the two
 * formats that need zipping (ePub 3, DAISY 3) are the ones a user reaches for when they have no
 * network. Pulling JSZip off a CDN — which the Office-export path does — would make an offline
 * install silently unable to produce an ebook. zlib is built into Node, and the subset of ZIP
 * these formats need is small enough to write correctly.
 *
 * WHY it matters that this is exact: EPUB's OCF container spec requires the 'mimetype' entry to
 * be FIRST in the archive and STORED (compression method 0), with no extra field. A reader sniffs
 * those bytes at a fixed offset. Get it wrong and the file is not an EPUB — epubcheck rejects it
 * and Apple Books refuses to open it, while everything upstream still reports success.
 *
 * Scope: STORE + DEFLATE, no ZIP64, no encryption, no directory entries. Anything that needs more
 * than 4 GB or 65,535 files is not a document export.
 */

const zlib = require('zlib');

// CRC-32 (IEEE 802.3), the checksum ZIP central directories carry. Table built once.
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

// DOS date/time. Fixed rather than "now" by default so two runs over the same input produce
// byte-identical archives — a test can then assert output stability, and a user diffing two
// exports sees only real content changes.
const FIXED_DOS_TIME = 0x0000;           // 00:00:00
const FIXED_DOS_DATE = ((2020 - 1980) << 9) | (1 << 5) | 1;  // 2020-01-01

/**
 * @param {Array<{name: string, data: string|Buffer, store?: boolean}>} entries
 *        Order is preserved exactly. `store: true` forces no compression.
 * @returns {Buffer} the .zip / .epub bytes
 */
function makeZip(entries) {
  if (!Array.isArray(entries) || !entries.length) throw new Error('makeZip: entries must be a non-empty array');
  const locals = [];
  const central = [];
  let offset = 0;

  for (const e of entries) {
    if (!e || typeof e.name !== 'string' || !e.name) throw new Error('makeZip: every entry needs a name');
    const nameBuf = Buffer.from(e.name, 'utf8');
    // A name that is not pure ASCII needs the UTF-8 flag (bit 11) or readers guess CP437 and
    // mangle it. Cheap to set correctly; expensive to debug when a filename comes back as mojibake.
    const needsUtf8 = nameBuf.length !== e.name.length;
    const raw = Buffer.isBuffer(e.data) ? e.data : Buffer.from(String(e.data == null ? '' : e.data), 'utf8');
    const crc = crc32(raw);
    const stored = e.store === true;
    const body = stored ? raw : zlib.deflateRawSync(raw, { level: 9 });
    const method = stored ? 0 : 8;

    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);         // local file header signature
    local.writeUInt16LE(stored ? 10 : 20, 4);   // version needed (2.0 for deflate)
    local.writeUInt16LE(needsUtf8 ? 0x0800 : 0, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(FIXED_DOS_TIME, 10);
    local.writeUInt16LE(FIXED_DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);                 // extra field length: 0. EPUB's mimetype entry
                                                // must have none, and nothing here needs one.
    nameBuf.copy(local, 30);
    locals.push(local, body);

    const cd = Buffer.alloc(46 + nameBuf.length);
    cd.writeUInt32LE(0x02014b50, 0);            // central directory header signature
    cd.writeUInt16LE(0x031E, 4);                // version made by: 3.0, UNIX
    cd.writeUInt16LE(stored ? 10 : 20, 6);
    cd.writeUInt16LE(needsUtf8 ? 0x0800 : 0, 8);
    cd.writeUInt16LE(method, 10);
    cd.writeUInt16LE(FIXED_DOS_TIME, 12);
    cd.writeUInt16LE(FIXED_DOS_DATE, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(body.length, 20);
    cd.writeUInt32LE(raw.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt32LE(offset, 42);               // relative offset of the local header
    nameBuf.copy(cd, 46);
    central.push(cd);

    offset += local.length + body.length;
  }

  const cdBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);             // end of central directory
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cdBuf.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...locals, cdBuf, end]);
}

/**
 * Zip a { path: contents } map. `storeFirst` names the one entry that must lead the archive
 * uncompressed — 'mimetype' for EPUB. Passing a name that is not in the map is an error rather
 * than a no-op, because silently producing a non-conforming EPUB is the failure mode this
 * whole file exists to prevent.
 */
function zipFileMap(files, storeFirst) {
  const names = Object.keys(files || {});
  if (!names.length) throw new Error('zipFileMap: no files');
  const entries = [];
  if (storeFirst) {
    if (!names.includes(storeFirst)) throw new Error("zipFileMap: storeFirst '" + storeFirst + "' is not in the file map");
    entries.push({ name: storeFirst, data: files[storeFirst], store: true });
  }
  for (const n of names) {
    if (n === storeFirst) continue;
    entries.push({ name: n, data: files[n] });
  }
  return makeZip(entries);
}

module.exports = { makeZip, zipFileMap, crc32 };
