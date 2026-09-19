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
function managedExternalSearchAllowed() {
  const policy = managedAIProfile();
  return policy == null || (policy.version === 1 && policy.allowExternalSearch === true);
}
async function assertManagedAIConnection({ backend, baseUrl, apiKey = '', canvasHost = false, operation = 'text', search = false }) {
  const policy = managedAIProfile();
  if (policy == null) return;
  // Version 1 deliberately covers text inference. Media routes can use separate
  // providers/fallbacks; keep them blocked until their destinations are approved.
  if (policy.version !== 1 || operation !== 'text' || !Array.isArray(policy.connections) || (search && !managedExternalSearchAllowed())) throw managedAIError();
  const normalize = value => {
    try {
      const u = new URL(value);
      if (u.username || u.password || u.search || u.hash) return '';
      if (u.protocol !== 'https:' && !(u.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname))) return '';
      return u.href.replace(/\/+$/, '');
    } catch (_) { return ''; }
  };
  const endpoint = normalize(baseUrl);
  const entries = policy.connections.filter(row => row && row.backend === backend && endpoint && normalize(row.baseUrl) === endpoint);
  for (const entry of entries) {
    if (canvasHost && entry.canvasHost === true) return;
    if (!apiKey && entry.keyless === true) return;
    if (apiKey && Array.isArray(entry.apiKeySha256) && globalThis.crypto?.subtle) {
      const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(apiKey)));
      const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
      if (entry.apiKeySha256.some(value => typeof value === 'string' && value.toLowerCase() === fingerprint)) return;
    }
  }
  throw managedAIError();
}
