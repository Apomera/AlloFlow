/* Deployment-owned request policy. Never read approval from localStorage.
 * Browser checks prevent accidental routing; the district must also enforce
 * identity, authorization and provider controls on its own server/network.
 */
function managedAIProfile() {
  return typeof window === 'undefined' ? null : window.ALLOFLOW_MANAGED_AI_POLICY;
}
function managedAIError() {
  const error = new Error('This connection or operation is not approved by the managed AI deployment.');
  error.code = 'managed-ai-blocked';
  return error;
}
function managedAIRecord(value, allowed, required) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw managedAIError();
  const keys = Reflect.ownKeys(value);
  if (keys.some(key => typeof key !== 'string' || !allowed.includes(key)) || required.some(key => !Object.prototype.hasOwnProperty.call(value, key))) throw managedAIError();
  const result = {};
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) throw managedAIError();
    result[key] = descriptor.value;
  }
  return result;
}
function managedAIArray(value, maximum) {
  if (!Array.isArray(value) || value.length > maximum) throw managedAIError();
  if (Reflect.ownKeys(value).some(key => key !== 'length' && (typeof key !== 'string' || !/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length))) throw managedAIError();
  const result = [];
  for (let index = 0; index < value.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) throw managedAIError();
    result.push(descriptor.value);
  }
  return result;
}
function managedAIEndpoint(value) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 2048) return '';
  try {
    const u = new URL(value);
    if (u.username || u.password || u.search || u.hash) return '';
    if (u.protocol !== 'https:' && !(u.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname))) return '';
    return u.href.replace(/\/+$/, '');
  } catch (_) { return ''; }
}
function managedAISnapshot() {
  try {
    const raw = managedAIProfile();
    if (raw == null) return { raw, policy: null, signature: 'unmanaged' };
    const p = managedAIRecord(raw, ['version', 'connections', 'allowExternalSearch'], ['version', 'connections']);
    if (p.version !== 1 || (Object.prototype.hasOwnProperty.call(p, 'allowExternalSearch') && typeof p.allowExternalSearch !== 'boolean')) throw managedAIError();
    const connections = managedAIArray(p.connections, 64).map(value => {
      const row = managedAIRecord(value, ['backend', 'baseUrl', 'keyless', 'canvasHost', 'apiKeySha256'], ['backend', 'baseUrl']);
      if (typeof row.backend !== 'string' || !/^[a-z][a-z0-9_-]{0,63}$/i.test(row.backend)) throw managedAIError();
      const baseUrl = managedAIEndpoint(row.baseUrl);
      if (!baseUrl || ['keyless', 'canvasHost'].some(key => Object.prototype.hasOwnProperty.call(row, key) && typeof row[key] !== 'boolean')) throw managedAIError();
      const fingerprints = Object.prototype.hasOwnProperty.call(row, 'apiKeySha256') ? managedAIArray(row.apiKeySha256, 64) : [];
      if (fingerprints.some(value => typeof value !== 'string' || !/^[a-f0-9]{64}$/i.test(value))) throw managedAIError();
      return Object.freeze({ backend: row.backend, baseUrl, keyless: row.keyless === true, canvasHost: row.canvasHost === true,
        apiKeySha256: Object.freeze(fingerprints.map(value => value.toLowerCase())) });
    });
    const policy = Object.freeze({ version: 1, connections: Object.freeze(connections), allowExternalSearch: p.allowExternalSearch === true });
    return { raw, policy, signature: JSON.stringify(policy) };
  } catch (_) { throw managedAIError(); }
}
function managedAIDispatchGuard(snapshot) {
  return function () {
    const current = managedAISnapshot();
    if (current.raw !== snapshot.raw || current.signature !== snapshot.signature) throw managedAIError();
    return true;
  };
}
function managedExternalSearchAllowed() {
  try { const snapshot = managedAISnapshot(); return !snapshot.policy || snapshot.policy.allowExternalSearch; }
  catch (_) { return false; }
}
async function assertManagedAIConnection({ backend, baseUrl, apiKey = '', canvasHost = false, operation = 'text', search = false }) {
  const snapshot = managedAISnapshot(), guard = managedAIDispatchGuard(snapshot), policy = snapshot.policy;
  if (!policy) return guard;
  // Version 1 deliberately covers text inference. Media routes can use separate
  // providers/fallbacks; keep them blocked until their destinations are approved.
  if (operation !== 'text' || (search && !policy.allowExternalSearch) || typeof apiKey !== 'string') throw managedAIError();
  const endpoint = managedAIEndpoint(baseUrl);
  const entries = policy.connections.filter(row => row.backend === backend && endpoint && row.baseUrl === endpoint);
  if (entries.some(entry => (canvasHost && entry.canvasHost) || (!apiKey && entry.keyless))) { guard(); return guard; }
  if (apiKey && entries.some(entry => entry.apiKeySha256.length) && globalThis.crypto?.subtle) {
    let digest;
    try { digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(apiKey)); }
    catch (_) { throw managedAIError(); }
    guard();
    const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    if (entries.some(entry => entry.apiKeySha256.includes(fingerprint))) return guard;
  }
  throw managedAIError();
}
