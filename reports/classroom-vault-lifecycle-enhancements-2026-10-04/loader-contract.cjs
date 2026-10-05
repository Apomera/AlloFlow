'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..'), host = fs.readFileSync(path.join(root, 'AlloFlowANTI.txt'), 'utf8').replace(/\r\n/g, '\n');
const a = host.indexOf('const _alloGetRecoveryVaultStack = async () => {'), b = host.indexOf('\nconst LENGTH_THRESHOLDS =', a);
assert.ok(a >= 0 && b > a); const section = host.slice(a, b);
const Crypto = require(path.join(root, 'allo_crypto_module.js')), Vault = require(path.join(root, 'allo_device_vault_module.js')), Integration = require(path.join(root, 'allo_recovery_vault_integration_module.js'));
const pin = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'allo_device_vault_module.js'))).digest('hex').slice(0, 8);
(async () => {
  const environments = [];
  for (const desktop of [false, true]) {
    const oldVault = { ...Vault }; delete oldVault.SESSION_OWNERSHIP_VERSION;
    const window = { AlloModules: { AlloCrypto: Crypto, AlloDeviceVault: oldVault, AlloRecoveryVaultIntegration: Integration } }, calls = [];
    const loader = async (url, get, options) => {
      calls.push({ url, cacheKey: options.cacheKey });
      if (url.includes('allo_device_vault_module.js')) {
        assert.equal(get(), null, 'Reject cached controller without ownership contract');
        window.AlloModules.AlloDeviceVault = Vault;
        assert.equal(get(), Vault, 'Accept updated controller');
      }
      return get();
    };
    const load = new Function('window', '_isDesktopBundledApp', '_alloLoadScriptGlobal', section + '\nreturn _alloGetRecoveryVaultStack;')(window, desktop, loader);
    const stack = await load(); assert.equal(stack.vault, Vault); assert.equal(stack.crypto, Crypto); assert.equal(stack.integration, Integration);
    const vaultCall = calls.find(x => x.url.includes('allo_device_vault_module.js'));
    assert.equal(vaultCall.url, (desktop ? './' : 'https://alloflow-cdn.pages.dev/') + 'allo_device_vault_module.js?v=' + pin);
    assert.equal(vaultCall.cacheKey, 'allo-device-vault-v3-session');
    environments.push({ desktop, passed: true, calls });
  }
  const result = { passed: true, completedAt: new Date().toISOString(), vaultPin: pin, environments, scope: 'Actual host loader contract with controlled script acquisition; cached legacy API rejection, current API acceptance, desktop and CDN URL/cache checks. No CDN request made.' };
  fs.writeFileSync(path.join(__dirname, 'loader-contract.json'), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify({ passed: true, environments: environments.length }));
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
