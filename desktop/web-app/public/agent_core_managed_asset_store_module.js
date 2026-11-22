/**
 * AlloFlow Agent Core - managed asset store foundation.
 *
 * In-memory reference implementation for trusted runtime adapters. It is not
 * registered as an MCP tool and performs no file or network I/O. Agent-facing
 * contracts receive opaque handles and metadata only; image bytes are exposed
 * solely through readBytesForAdapter for a future approved provider adapter.
 */
(function () {
  'use strict';

  var MIME_TYPES = Object.freeze(['image/png', 'image/jpeg', 'image/webp']);
  var HANDLE_RE = /^asset_[A-Za-z0-9_-]{8,128}$/;
  var ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
  var FORBIDDEN_META_KEY_RE = /^(?:path|url|uri|data|filePath|localPath|__proto__|constructor|prototype)$|(?:^|[_-]|(?=[A-Z]))(?:api|access|private|auth|signing|client)?[_-]?keys?$|token|secret|password|passwd|credential|authorization|bearer|cookie/i;
  var DEFAULT_MAX_ASSETS = 256;
  var DEFAULT_MAX_ASSET_BYTES = 25 * 1024 * 1024;
  var DEFAULT_MAX_TOTAL_BYTES = 100 * 1024 * 1024;
  var MAX_ATTACHMENTS_PER_ASSET = 1000;

  function stripControlChars(str) {
    return String(str == null ? '' : str).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  }

  function looksLikeActiveMarkup(bytes) {
    if (!bytes || bytes.byteLength < 4) return false;
    var start = (bytes.byteLength >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) ? 3 : 0;
    var limit = Math.min(bytes.byteLength, start + 64);
    var head = '';
    for (var i = start; i < limit; i++) head += String.fromCharCode(bytes[i]);
    return /^\s*(?:<\?xml|<!doctype\s+html|<html\b|<svg\b|<script\b|<iframe\b|<object\b|<embed\b)/i.test(head);
  }

  function matchesMagicBytes(bytes, mimeType) {
    if (!bytes || bytes.byteLength < 4) return false;
    if (mimeType === 'image/png') {
      return bytes.byteLength >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47
        && bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A;
    }
    if (mimeType === 'image/jpeg') {
      return bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
    }
    if (mimeType === 'image/webp') {
      return bytes.byteLength >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
        && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
    }
    return false;
  }

  function cloneBytes(bytes) {
    if (!bytes) return null;
    if (bytes instanceof Uint8Array) return new Uint8Array(bytes);
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer && Buffer.isBuffer(bytes)) return new Uint8Array(bytes);
    if (ArrayBuffer.isView(bytes)) {
      return new Uint8Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    }
    if (bytes instanceof ArrayBuffer || Object.prototype.toString.call(bytes) === '[object ArrayBuffer]') {
      return new Uint8Array(bytes.slice(0));
    }
    return null;
  }

  function createDefaultId() {
    var random = '';
    var cryptoObject = typeof globalThis !== 'undefined' ? globalThis.crypto : null;
    if (cryptoObject && typeof cryptoObject.getRandomValues === 'function') {
      var values = new Uint8Array(12);
      cryptoObject.getRandomValues(values);
      for (var i = 0; i < values.length; i++) random += values[i].toString(16).padStart(2, '0');
    } else {
      random = Date.now().toString(36) + Math.random().toString(36).slice(2, 16);
    }
    return 'asset_' + random;
  }

  function cloneMetadata(record) {
    return {
      handle: record.handle,
      mimeType: record.mimeType,
      byteLength: record.byteLength,
      width: record.width,
      height: record.height,
      altText: record.altText,
      sourceDeclaration: record.sourceDeclaration,
      licenseDeclaration: record.licenseDeclaration,
      createdAt: record.createdAt,
      attachments: record.attachments.map(function (attachment) {
        return { artifactId: attachment.artifactId, slot: attachment.slot };
      })
    };
  }

  function createManagedAssetStore(options) {
    var opts = options || {};
    var maxAssets = Number.isInteger(opts.maxAssets) && opts.maxAssets > 0 ? opts.maxAssets : DEFAULT_MAX_ASSETS;
    var maxAssetBytes = Number.isInteger(opts.maxAssetBytes) && opts.maxAssetBytes > 0 ? opts.maxAssetBytes : DEFAULT_MAX_ASSET_BYTES;
    var maxTotalBytes = Number.isInteger(opts.maxTotalBytes) && opts.maxTotalBytes > 0 ? opts.maxTotalBytes : DEFAULT_MAX_TOTAL_BYTES;
    var createId = typeof opts.createId === 'function' ? opts.createId : createDefaultId;
    var now = typeof opts.now === 'function' ? opts.now : function () { return new Date().toISOString(); };
    var records = new Map();
    var totalBytes = 0;

    function requireHandle(handle) {
      if (typeof handle !== 'string' || !HANDLE_RE.test(handle)) throw new Error('Invalid managed asset handle');
      var record = records.get(handle);
      if (!record) throw new Error('Managed asset not found');
      return record;
    }

    function importAsset(input) {
      var value = input || {};
      var bytes = cloneBytes(value.bytes);
      if (!bytes || !bytes.byteLength) throw new Error('Asset bytes are required');
      if (bytes.byteLength > maxAssetBytes) throw new Error('Asset exceeds the per-asset byte limit');
      if (records.size >= maxAssets) throw new Error('Managed asset count limit reached');
      if (totalBytes + bytes.byteLength > maxTotalBytes) throw new Error('Managed asset total byte limit reached');
      if (MIME_TYPES.indexOf(value.mimeType) === -1) throw new Error('Unsupported managed asset MIME type');
      if (looksLikeActiveMarkup(bytes) || (opts.verifyMagicBytes === true && !matchesMagicBytes(bytes, value.mimeType))) {
        throw new Error('Asset bytes do not match the declared raster MIME type');
      }
      var hasForbiddenField = Object.keys(value).some(function (k) {
        return value[k] !== undefined && FORBIDDEN_META_KEY_RE.test(k);
      });
      if (hasForbiddenField) {
        throw new Error('Paths, URLs, embedded data, and credentials are not accepted by the managed asset store');
      }
      var handle = String(createId());
      if (!HANDLE_RE.test(handle)) throw new Error('Managed asset id factory returned an invalid handle');
      if (records.has(handle)) throw new Error('Managed asset handle collision');
      var width = Number.isInteger(value.width) && value.width > 0 ? value.width : 0;
      var height = Number.isInteger(value.height) && value.height > 0 ? value.height : 0;
      var record = {
        handle: handle,
        mimeType: value.mimeType,
        bytes: bytes,
        byteLength: bytes.byteLength,
        width: width,
        height: height,
        altText: typeof value.altText === 'string' ? stripControlChars(value.altText).slice(0, 2000) : '',
        sourceDeclaration: typeof value.sourceDeclaration === 'string' ? stripControlChars(value.sourceDeclaration).slice(0, 500) : '',
        licenseDeclaration: typeof value.licenseDeclaration === 'string' ? stripControlChars(value.licenseDeclaration).slice(0, 500) : '',
        createdAt: String(now()),
        attachments: []
      };
      records.set(handle, record);
      totalBytes += bytes.byteLength;
      return cloneMetadata(record);
    }

    function getMetadata(handle) {
      return cloneMetadata(requireHandle(handle));
    }

    function readBytesForAdapter(handle, approval) {
      if (!approval || approval.approved !== true || typeof approval.purpose !== 'string' || !approval.purpose.trim()) {
        throw new Error('Explicit adapter byte-read approval and purpose are required');
      }
      return cloneBytes(requireHandle(handle).bytes);
    }

    function attach(handle, target) {
      var record = requireHandle(handle);
      var value = target || {};
      if (typeof value.artifactId !== 'string' || !ID_RE.test(value.artifactId)) throw new Error('Valid artifactId is required');
      if (typeof value.slot !== 'string' || !ID_RE.test(value.slot)) throw new Error('Valid artifact slot is required');
      var exists = record.attachments.some(function (item) {
        return item.artifactId === value.artifactId && item.slot === value.slot;
      });
      if (!exists) {
        if (record.attachments.length >= MAX_ATTACHMENTS_PER_ASSET) throw new Error('Attachment limit reached for managed asset');
        record.attachments.push({ artifactId: value.artifactId, slot: value.slot });
      }
      return cloneMetadata(record);
    }

    function detach(handle, target) {
      var record = requireHandle(handle);
      var value = target || {};
      if (typeof value.artifactId !== 'string' || !ID_RE.test(value.artifactId)) throw new Error('Valid artifactId is required');
      if (value.slot !== undefined && (typeof value.slot !== 'string' || !ID_RE.test(value.slot))) throw new Error('Valid artifact slot is required');
      record.attachments = record.attachments.filter(function (item) {
        if (item.artifactId !== value.artifactId) return true;
        if (value.slot !== undefined && item.slot !== value.slot) return true;
        return false;
      });
      return cloneMetadata(record);
    }

    function detachAllForArtifact(artifactId) {
      if (typeof artifactId !== 'string' || !ID_RE.test(artifactId)) throw new Error('Valid artifactId is required');
      var detached = 0;
      records.forEach(function (record) {
        var before = record.attachments.length;
        record.attachments = record.attachments.filter(function (item) { return item.artifactId !== artifactId; });
        if (record.attachments.length < before) detached += (before - record.attachments.length);
      });
      return detached;
    }

    function remove(handle) {
      var record = requireHandle(handle);
      if (record.attachments.length) throw new Error('Attached assets cannot be removed');
      records.delete(handle);
      totalBytes = Math.max(0, totalBytes - record.byteLength);
      record.bytes.fill(0);
      return true;
    }

    function getStats() {
      return { assetCount: records.size, totalBytes: totalBytes, maxAssets: maxAssets, maxAssetBytes: maxAssetBytes, maxTotalBytes: maxTotalBytes };
    }

    return Object.freeze({
      importAsset: importAsset,
      getMetadata: getMetadata,
      readBytesForAdapter: readBytesForAdapter,
      attach: attach,
      detach: detach,
      detachAllForArtifact: detachAllForArtifact,
      remove: remove,
      getStats: getStats
    });
  }

  var API = Object.freeze({
    createManagedAssetStore: createManagedAssetStore,
    HANDLE_RE: HANDLE_RE,
    MIME_TYPES: Object.freeze(MIME_TYPES.slice())
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.AgentCoreManagedAssetStore = API;
  }
})();
