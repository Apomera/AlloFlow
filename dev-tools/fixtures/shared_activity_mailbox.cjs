// Runs the real Apps Script handlers against in-memory Google service substitutes.
const fs = require('fs');
const path = require('path');
const gsSource = fs.readFileSync(path.resolve(__dirname, '../../apps_script/session_mailbox/Code.gs'),'utf8');
function makeGsSandbox({ now = Date.now } = {}) {
    const cacheStore = new Map(), expires = new Map();
    const props = new Map();
    const driveFiles = new Map();
    let uuidCounter = 0;
    const cache = {
        get: k => { if (expires.has(k) && expires.get(k) <= now()) { cacheStore.delete(k); expires.delete(k); } return cacheStore.has(k) ? cacheStore.get(k) : null; },
        put: (k, v, ttl = 600) => { cacheStore.set(k, String(v)); expires.set(k, now() + ttl * 1000); },
        getAll: keys => { const o = {}; keys.forEach(k => { const value = cache.get(k); if (value !== null) o[k] = value; }); return o; },
        remove: k => { cacheStore.delete(k); expires.delete(k); },
    };
    const fileObj = name => ({
        setContent: c => { driveFiles.set(name, String(c)); },
        getBlob: () => ({ getDataAsString: () => driveFiles.get(name) }),
        setTrashed: () => { driveFiles.delete(name); },
    });
    const folder = {
        getFilesByName: name => {
            let used = false;
            return { hasNext: () => driveFiles.has(name) && !used, next: () => { used = true; return fileObj(name); } };
        },
        createFile: (name, content) => { driveFiles.set(name, String(content)); return fileObj(name); },
    };
    const services = {
        CacheService: { getScriptCache: () => cache },
        PropertiesService: { getScriptProperties: () => ({
            getProperty: k => (props.has(k) ? props.get(k) : null),
            setProperty: (k, v) => props.set(k, String(v)),
            deleteProperty: k => { props.delete(k); },
            getProperties: () => Object.fromEntries(props),
        }) },
        LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
        ContentService: (() => {
            const svc = { MimeType: { JSON: 'json' } };
            svc.createTextOutput = s => { const o = { _c: s, setMimeType: () => o, getContent: () => o._c }; return o; };
            return svc;
        })(),
        DriveApp: { getFoldersByName: () => ({ hasNext: () => true, next: () => folder }), createFolder: () => folder },
        Utilities: {
            getUuid: () => 'aaaaaaaa-bbbb-cccc-dddd-' + String(uuidCounter++).padStart(12, '0'),
            computeHmacSha256Signature: (value, key) => Array.from(Buffer.from((String(key) + '|' + String(value)).repeat(8)).subarray(0, 32)),
            base64EncodeWebSafe: bytes => Buffer.from(bytes).toString('base64url'),
        },
    };
    const factory = new Function(...Object.keys(services), gsSource + '; return { handle: handle };');
    const api = factory(...Object.values(services));
    const call = payload => JSON.parse(api.handle(payload).getContent());
    return { call, driveFiles, readDocument: (code, token = 's') => JSON.parse(cache.get('d:' + code + ':' + token) || 'null')?.d };
}

module.exports = { makeGsSandbox };
