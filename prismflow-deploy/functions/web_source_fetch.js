"use strict";

const dns = require("node:dns").promises;
const http = require("node:http");
const https = require("node:https");
const net = require("node:net");

const MAX_SOURCE_URL_CHARS = 2048;
const MAX_SOURCE_BYTES = 2 * 1024 * 1024;
const MAX_SOURCE_TEXT_CHARS = 250000;
const MAX_REDIRECTS = 4;
const FETCH_TIMEOUT_MS = 12000;
const MIN_READABLE_TEXT_CHARS = 120;

class SourceFetchError extends Error {
  constructor(code, status = 422, message = code) {
    super(message);
    this.name = "SourceFetchError";
    this.code = code;
    this.status = status;
  }
}

function sourceError(code, status, message) {
  return new SourceFetchError(code, status, message);
}

const blockedIpv4 = new net.BlockList();
const blockedIpv6 = new net.BlockList();
[
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
].forEach(([address, prefix]) => blockedIpv4.addSubnet(address, prefix, "ipv4"));
[
  ["::", 128],
  ["::1", 128],
  ["::ffff:0:0", 96],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 32],
  ["2001:10::", 28],
  ["2001:20::", 28],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8],
].forEach(([address, prefix]) => blockedIpv6.addSubnet(address, prefix, "ipv6"));

function normalizedHostname(value) {
  return String(value || "").trim().toLowerCase().replace(/^\[|\]$/g, "").replace(/\.+$/, "");
}

function isPublicIp(value) {
  const address = normalizedHostname(value);
  const family = net.isIP(address);
  if (!family || address.includes("%")) return false;
  return family === 4 ? !blockedIpv4.check(address, "ipv4") : !blockedIpv6.check(address, "ipv6");
}

function validatePublicHttpUrl(value) {
  const raw = String(value || "").trim();
  if (!raw || raw.length > MAX_SOURCE_URL_CHARS || /[\u0000-\u001F\u007F]/.test(raw)) {
    throw sourceError("invalid-url", 400, "A valid public web address is required.");
  }
  let url;
  try {
    url = new URL(raw);
  } catch (_) {
    throw sourceError("invalid-url", 400, "A valid public web address is required.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw sourceError("invalid-url", 400, "Only HTTP and HTTPS pages can be imported.");
  }
  if (url.username || url.password) {
    throw sourceError("blocked-target", 403, "Addresses containing credentials are not allowed.");
  }
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw sourceError("blocked-target", 403, "Only standard web ports can be imported.");
  }
  const hostname = normalizedHostname(url.hostname);
  if (!hostname || hostname.length > 253 || hostname === "localhost" || hostname.endsWith(".localhost")
      || hostname.endsWith(".local") || hostname.endsWith(".internal") || hostname === "metadata.google") {
    throw sourceError("blocked-target", 403, "Local and internal network addresses are not allowed.");
  }
  if (net.isIP(hostname) && !isPublicIp(hostname)) {
    throw sourceError("blocked-target", 403, "Private, local, and reserved network addresses are not allowed.");
  }
  url.hash = "";
  return url;
}

async function resolvePublicAddresses(urlValue, lookup = dns.lookup) {
  const url = urlValue instanceof URL ? urlValue : validatePublicHttpUrl(urlValue);
  const hostname = normalizedHostname(url.hostname);
  let records;
  if (net.isIP(hostname)) {
    records = [{ address: hostname, family: net.isIP(hostname) }];
  } else {
    try {
      records = await lookup(hostname, { all: true, verbatim: true });
    } catch (_) {
      throw sourceError("dns-failed", 422, "The source host could not be resolved.");
    }
  }
  records = (Array.isArray(records) ? records : [records]).map((record) => ({
    address: String(record && record.address || ""),
    family: Number(record && record.family) || net.isIP(String(record && record.address || "")),
  })).filter((record) => record.address && record.family);
  if (!records.length) throw sourceError("dns-failed", 422, "The source host could not be resolved.");
  if (records.some((record) => !isPublicIp(record.address))) {
    throw sourceError("blocked-target", 403, "The source resolves to a private, local, or reserved network address.");
  }
  const unique = [];
  const seen = new Set();
  records.forEach((record) => {
    const key = record.family + ":" + record.address;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(record);
    }
  });
  return unique;
}

async function assertPublicTarget(value, options = {}) {
  const url = validatePublicHttpUrl(value);
  const addresses = await resolvePublicAddresses(url, options.lookup || dns.lookup);
  return { url, addresses };
}

function makePinnedLookup(records) {
  let cursor = 0;
  return function pinnedLookup(_hostname, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    options = options || {};
    let available = records;
    const requestedFamily = Number(options.family) || 0;
    if (requestedFamily) available = records.filter((record) => record.family === requestedFamily);
    if (!available.length) {
      const error = new Error("No approved address matches the requested family.");
      error.code = "ENOTFOUND";
      callback(error);
      return;
    }
    if (options.all) {
      callback(null, available.map((record) => ({ address: record.address, family: record.family })));
      return;
    }
    const record = available[cursor++ % available.length];
    callback(null, record.address, record.family);
  };
}

function requestPinnedPage(url, addresses, options = {}) {
  const maxBytes = Number(options.maxBytes) || MAX_SOURCE_BYTES;
  const timeoutMs = Math.max(1, Number(options.timeoutMs) || FETCH_TIMEOUT_MS);
  const transport = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      fn(value);
    };
    const req = transport.request(url, {
      method: "GET",
      agent: false,
      lookup: makePinnedLookup(addresses),
      headers: {
        Accept: "text/html, application/xhtml+xml, text/plain;q=0.9",
        "Accept-Encoding": "identity",
        "Accept-Language": "en,*;q=0.5",
        "User-Agent": "AlloFlow-Lumen/1.0 (educational source importer)",
      },
    }, (response) => {
      const status = Number(response.statusCode) || 0;
      const headers = response.headers || {};
      if ([301, 302, 303, 307, 308].includes(status)) {
        response.resume();
        finish(resolve, { status, headers, body: Buffer.alloc(0) });
        return;
      }
      const declared = Number.parseInt(headers["content-length"], 10);
      if (Number.isFinite(declared) && declared > maxBytes) {
        const error = sourceError("source-too-large", 413, "The source page is too large to import.");
        response.destroy(error);
        finish(reject, error);
        return;
      }
      const chunks = [];
      let size = 0;
      response.on("data", (chunk) => {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += bytes.length;
        if (size > maxBytes) {
          const error = sourceError("source-too-large", 413, "The source page is too large to import.");
          response.destroy(error);
          finish(reject, error);
          return;
        }
        chunks.push(bytes);
      });
      response.on("end", () => finish(resolve, { status, headers, body: Buffer.concat(chunks), bytes: size }));
      response.on("error", (error) => finish(reject, error));
    });
    req.setTimeout(timeoutMs, () => req.destroy(sourceError("source-timeout", 504, "The source page took too long to respond.")));
    req.on("error", (error) => finish(reject, error));
    req.end();
  });
}

function decodeEntities(value) {
  const named = {
    amp: "&", apos: "'", copy: "©", emsp: " ", ensp: " ", gt: ">", hellip: "…",
    ldquo: "“", lsquo: "‘", lt: "<", mdash: "—", nbsp: " ", ndash: "–",
    quot: '"', rdquo: "”", reg: "®", rsquo: "’", trade: "™",
  };
  return String(value || "").replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (match, entity) => {
    if (entity[0] !== "#") return Object.prototype.hasOwnProperty.call(named, entity.toLowerCase()) ? named[entity.toLowerCase()] : " ";
    const code = entity[1].toLowerCase() === "x" ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10);
    try { return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : " "; } catch (_) { return " "; }
  });
}

function stripTags(value) {
  return String(value || "").replace(/<[^>]*>/g, " ");
}

function normalizeReadableText(value) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_SOURCE_TEXT_CHARS);
}

function extractHtmlDocument(html) {
  const raw = String(html || "");
  const titleMatch = raw.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i);
  const h1Match = raw.match(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/i);
  const title = normalizeReadableText(decodeEntities(stripTags(titleMatch && titleMatch[1] || h1Match && h1Match[1] || ""))).slice(0, 300);
  const articleMatch = raw.match(/<article\b[^>]*>([\s\S]*?)<\/article\s*>/i);
  const mainMatch = raw.match(/<main\b[^>]*>([\s\S]*?)<\/main\s*>/i);
  let body = articleMatch && articleMatch[1] || mainMatch && mainMatch[1] || raw;
  body = body
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|template|noscript|svg|canvas|form|nav|footer|aside)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n• ")
    .replace(/<\/(p|div|li|section|article|main|h[1-6]|tr|td|th|blockquote|pre)\s*>/gi, "\n")
    .replace(/<[^>]*>/g, " ");
  return { title, text: normalizeReadableText(decodeEntities(body)) };
}

function charsetFromContentType(contentType) {
  const match = String(contentType || "").match(/charset\s*=\s*["']?([^;"'\s]+)/i);
  return match ? match[1].trim().toLowerCase() : "utf-8";
}

function decodeBody(buffer, contentType) {
  const charset = charsetFromContentType(contentType);
  try { return new TextDecoder(charset, { fatal: false }).decode(buffer); }
  catch (_) { return new TextDecoder("utf-8", { fatal: false }).decode(buffer); }
}

function extractReadableDocument(body, contentType = "") {
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body || "");
  let mime = String(contentType || "").split(";", 1)[0].trim().toLowerCase();
  const decoded = decodeBody(buffer, contentType);
  if (!mime) {
    const sample = decoded.slice(0, 512).trimStart().toLowerCase();
    if (sample.startsWith("<!doctype html") || sample.startsWith("<html") || sample.startsWith("<article") || sample.startsWith("<main")) mime = "text/html";
    else if (!buffer.includes(0)) mime = "text/plain";
  }
  if (mime === "text/html" || mime === "application/xhtml+xml") return { ...extractHtmlDocument(decoded), contentType: mime };
  if (mime === "text/plain" || mime === "text/markdown" || mime === "text/csv") {
    return { title: "", text: normalizeReadableText(decoded), contentType: mime };
  }
  throw sourceError("unsupported-content-type", 415, "This release imports readable HTML and plain-text pages only.");
}

async function fetchPublicPage(value, options = {}) {
  const lookup = options.lookup || dns.lookup;
  const requestImpl = options.requestImpl || requestPinnedPage;
  const maxBytes = Math.max(1024, Number(options.maxBytes) || MAX_SOURCE_BYTES);
  const maxRedirects = Math.max(0, Number.isFinite(options.maxRedirects) ? Number(options.maxRedirects) : MAX_REDIRECTS);
  const timeoutMs = Math.max(100, Number(options.timeoutMs) || FETCH_TIMEOUT_MS);
  const deadline = Date.now() + timeoutMs;
  let current = validatePublicHttpUrl(value);
  const visited = new Set();

  for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
    const key = current.toString();
    if (visited.has(key)) throw sourceError("redirect-loop", 422, "The source page redirects in a loop.");
    visited.add(key);
    const target = await assertPublicTarget(current, { lookup });
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw sourceError("source-timeout", 504, "The source page took too long to respond.");
    let response;
    try {
      response = await requestImpl(target.url, target.addresses, { maxBytes, timeoutMs: remaining });
    } catch (error) {
      if (error instanceof SourceFetchError) throw error;
      throw sourceError("source-unreachable", 422, "The source page could not be reached.");
    }
    const status = Number(response && response.status) || 0;
    const headers = response && response.headers || {};
    if ([301, 302, 303, 307, 308].includes(status)) {
      if (redirects >= maxRedirects) throw sourceError("too-many-redirects", 422, "The source page redirects too many times.");
      const location = Array.isArray(headers.location) ? headers.location[0] : headers.location;
      if (!location) throw sourceError("invalid-redirect", 422, "The source page returned an invalid redirect.");
      try { current = validatePublicHttpUrl(new URL(String(location), current).toString()); }
      catch (error) { throw error instanceof SourceFetchError ? error : sourceError("invalid-redirect", 422); }
      continue;
    }
    if (status < 200 || status >= 300) throw sourceError("source-http-error", 422, "The source page did not return readable content.");
    const encoding = String(headers["content-encoding"] || "identity").trim().toLowerCase();
    if (encoding && encoding !== "identity") throw sourceError("unsupported-content-encoding", 415, "The source returned an unsupported content encoding.");
    const body = Buffer.isBuffer(response.body) ? response.body : Buffer.from(response.body || "");
    if (body.length > maxBytes) throw sourceError("source-too-large", 413, "The source page is too large to import.");
    const contentType = Array.isArray(headers["content-type"]) ? headers["content-type"][0] : headers["content-type"] || "";
    const document = extractReadableDocument(body, contentType);
    if (document.text.length < MIN_READABLE_TEXT_CHARS) {
      throw sourceError("not-enough-readable-text", 422, "The page did not contain enough readable source text.");
    }
    return {
      url: current.toString(),
      title: document.title,
      text: document.text,
      contentType: document.contentType,
      bytes: body.length,
      redirects,
    };
  }
  throw sourceError("too-many-redirects", 422, "The source page redirects too many times.");
}

module.exports = {
  FETCH_TIMEOUT_MS,
  MAX_REDIRECTS,
  MAX_SOURCE_BYTES,
  MAX_SOURCE_TEXT_CHARS,
  MAX_SOURCE_URL_CHARS,
  MIN_READABLE_TEXT_CHARS,
  SourceFetchError,
  assertPublicTarget,
  decodeEntities,
  extractReadableDocument,
  fetchPublicPage,
  isPublicIp,
  makePinnedLookup,
  normalizeReadableText,
  requestPinnedPage,
  resolvePublicAddresses,
  validatePublicHttpUrl,
};
