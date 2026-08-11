/**
 * image-privacy.mjs
 * -------------------------------------------------------------------------
 * Strip location and identifying metadata from a student's photo BEFORE it
 * leaves the device or reaches Gemini. Phone cameras embed GPS coordinates,
 * timestamps, and device IDs in EXIF; a photo taken at school leaks precise
 * location. Closing that is a pre-ship blocker (FERPA-adjacent).
 *
 * Two paths, both provided:
 *   1. sanitizeForUpload() / browserStripViaCanvas() — the DEFAULT in the app.
 *      Re-encodes pixels through a canvas, which drops ALL metadata by
 *      construction (EXIF, GPS, XMP, thumbnails) and bakes in orientation so
 *      the image can't come out sideways. Format-agnostic. Recompresses.
 *   2. stripJpegMetadata() — a pure, lossless fallback that surgically removes
 *      the metadata JPEG segments (APP1 EXIF/XMP, COM comments) without
 *      recompressing the pixels. No DOM, so it is unit-tested in Node.
 *
 * Rule of thumb: use the canvas path for the upload (simplest, bulletproof);
 * keep the pure path for when you must preserve the original bytes.
 * -------------------------------------------------------------------------
 */

const MARKER_NAMES = {
  0xE0: "APP0", 0xE1: "APP1", 0xE2: "APP2", 0xEC: "APP12", 0xED: "APP13", 0xEE: "APP14", 0xEF: "APP15",
  0xFE: "COM", 0xDB: "DQT", 0xC0: "SOF0", 0xC2: "SOF2", 0xC4: "DHT", 0xDD: "DRI", 0xDA: "SOS", 0xD9: "EOI",
};
const markerName = (m) => MARKER_NAMES[m] || (m >= 0xE0 && m <= 0xEF ? "APP" + (m - 0xE0) : "0x" + m.toString(16).toUpperCase());

function toU8(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(input)) return new Uint8Array(input);
  return new Uint8Array(input);
}
function concat(chunks) {
  let len = 0; for (const c of chunks) len += c.length;
  const out = new Uint8Array(len);
  let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}
export function looksLikeJpeg(input) {
  const b = toU8(input);
  return b.length > 3 && b[0] === 0xFF && b[1] === 0xD8;
}
/** True if any APP1 EXIF segment is present (i.e. there is location/device metadata to remove). */
export function containsExif(input) {
  return listMetadataSegments(input).some((s) => s.name === "APP1" && s.exif);
}

/** Enumerate the metadata-bearing segments (APPn / COM) for auditing pre/post scrub. */
export function listMetadataSegments(input) {
  const b = toU8(input);
  if (!looksLikeJpeg(b)) return [];
  const found = [];
  let p = 2;
  const n = b.length;
  while (p < n - 1) {
    if (b[p] !== 0xFF) { p++; continue; }
    const marker = b[p + 1];
    if (marker === 0xFF) { p++; continue; }
    if (marker === 0xDA || marker === 0xD9) break; // SOS/EOI — image data begins
    if ((marker >= 0xD0 && marker <= 0xD7) || marker === 0x01) { p += 2; continue; } // no length
    const len = (b[p + 2] << 8) | b[p + 3];
    if ((marker >= 0xE0 && marker <= 0xEF) || marker === 0xFE) {
      const head = String.fromCharCode(...b.subarray(p + 4, Math.min(p + 10, n)));
      found.push({ name: markerName(marker), offset: p, length: len, exif: /^Exif/.test(head) });
    }
    p += 2 + len;
  }
  return found;
}

/**
 * Lossless metadata scrub: drop APP1 (EXIF/GPS/XMP) and COM (comments); keep
 * APP0 (JFIF) and all pixel/structure segments. Returns { data, jpeg, removed }.
 */
export function stripJpegMetadata(input) {
  const b = toU8(input);
  if (!looksLikeJpeg(b)) return { data: b, jpeg: false, removed: [] };
  const keep = [b.subarray(0, 2)]; // SOI
  const removed = [];
  let p = 2;
  const n = b.length;
  while (p < n - 1) {
    if (b[p] !== 0xFF) { p++; continue; }
    const marker = b[p + 1];
    if (marker === 0xFF) { p++; continue; } // fill byte
    if (marker === 0xDA || marker === 0xD9) { keep.push(b.subarray(p)); p = n; break; } // SOS/EOI → copy remainder verbatim
    if ((marker >= 0xD0 && marker <= 0xD7) || marker === 0x01) { keep.push(b.subarray(p, p + 2)); p += 2; continue; }
    const len = (b[p + 2] << 8) | b[p + 3];
    const segEnd = p + 2 + len;
    const drop = (marker >= 0xE1 && marker <= 0xEF) || marker === 0xFE; // APP1..APP15, COM
    if (drop) removed.push({ name: markerName(marker), length: len });
    else keep.push(b.subarray(p, segEnd));
    p = segEnd;
  }
  return { data: concat(keep), jpeg: true, removed };
}

// --------------------------------------------------------------- browser paths
/**
 * Re-encode through a canvas — strips ALL metadata and bakes orientation.
 * Browser-only (uses createImageBitmap/OffscreenCanvas). Returns a Blob.
 */
export async function browserStripViaCanvas(fileOrBlob, { type = "image/jpeg", quality = 0.9, maxEdge = 2048 } = {}) {
  if (typeof createImageBitmap !== "function") throw new Error("browserStripViaCanvas requires a browser environment");
  const bmp = await createImageBitmap(fileOrBlob, { imageOrientation: "from-image" }); // bake EXIF orientation
  let { width, height } = bmp;
  const scale = Math.min(1, maxEdge / Math.max(width, height)); // cap size; also drops needless resolution
  width = Math.round(width * scale); height = Math.round(height * scale);
  const canvas = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(width, height) : Object.assign(document.createElement("canvas"), { width, height });
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bmp, 0, 0, width, height);
  bmp.close?.();
  return canvas.convertToBlob ? canvas.convertToBlob({ type, quality }) : new Promise((res) => canvas.toBlob(res, type, quality));
}

/**
 * The ingest entry point: sanitize a captured/selected image before anything
 * else touches it. Returns { blob, method, note }. Prefers the canvas re-encode
 * (bulletproof); the pure JPEG scrub is available as the lossless alternative.
 */
export async function sanitizeForUpload(fileOrBlob, opts = {}) {
  const blob = await browserStripViaCanvas(fileOrBlob, opts);
  return {
    blob,
    method: "canvas-reencode",
    note: "Location and device metadata removed by re-encoding pixels; orientation baked in.",
  };
}

// --------------------------------------------------------------- runnable (Node demo of the pure path)
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) {
  const seg = (marker, payload) => { const len = payload.length + 2; return [0xFF, marker, (len >> 8) & 0xFF, len & 0xFF, ...payload]; };
  const ascii = (s) => [...s].map((c) => c.charCodeAt(0));
  const jpeg = new Uint8Array([
    0xFF, 0xD8,
    ...seg(0xE0, ascii("JFIF\0\x01\x01\0\0\x01\0\x01\0\0")),
    ...seg(0xE1, ascii("Exif\0\0II*\0 GPS 44.9012,-68.6704 iPhone")), // EXIF w/ fake GPS + device
    ...seg(0xFE, ascii("shot at Room 214")),
    0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00,
    0x12, 0x34, 0xFF, 0x00, 0x56, 0x78,
    0xFF, 0xD9,
  ]);
  console.log("\n=== IMAGE PRIVACY (pure JPEG scrub) ===\n");
  console.log("before:", listMetadataSegments(jpeg).map((s) => s.name + (s.exif ? "(EXIF)" : "")).join(", "), "| containsExif:", containsExif(jpeg));
  const res = stripJpegMetadata(jpeg);
  console.log("removed:", res.removed.map((r) => r.name).join(", "));
  console.log("after: ", listMetadataSegments(res.data).map((s) => s.name).join(", "), "| containsExif:", containsExif(res.data));
  const text = String.fromCharCode(...res.data);
  console.log("GPS string still present:", /44\.9012/.test(text), "| 'Room 214' present:", /Room 214/.test(text));
  console.log("valid JPEG frame:", res.data[0] === 0xFF && res.data[1] === 0xD8 && res.data.at(-2) === 0xFF && res.data.at(-1) === 0xD9);
  console.log("pixel/entropy bytes preserved:", text.includes(String.fromCharCode(0x12, 0x34, 0xFF, 0x00, 0x56, 0x78)), "\n");
}
