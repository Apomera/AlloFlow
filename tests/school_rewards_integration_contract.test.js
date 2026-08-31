import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(process.cwd());
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');

describe('School Rewards integration contract', () => {
  it('ships every HTML file referenced by the Apps Script service', () => {
    const servicePath = path.join(ROOT, 'apps_script/school_rewards/Code.gs');
    const source = fs.readFileSync(servicePath, 'utf8');
    const references = [...source.matchAll(/HtmlService\.(?:createTemplateFromFile|createHtmlOutputFromFile)\(\s*['"]([^'"]+)['"]\s*\)/g)]
      .map(match => match[1]);

    expect(references).toEqual(expect.arrayContaining(['Index', 'Portal']));
    expect(references.length).toBeGreaterThan(0);
    references.forEach(reference => {
      expect(fs.existsSync(path.join(path.dirname(servicePath), `${reference}.html`)), `Missing Apps Script HTML file: ${reference}.html`).toBe(true);
    });
  });

  it('has a parseable Apps Script service and domain-only least-privilege deployment', () => {
    expect(() => new vm.Script(read('apps_script/school_rewards/Code.gs'))).not.toThrow();
    const portalScript = read('apps_script/school_rewards/Portal.html').match(/<script>([\s\S]*)<\/script>/)[1];
    expect(() => new vm.Script(portalScript)).not.toThrow();
    const manifest = JSON.parse(read('apps_script/school_rewards/appsscript.json'));
    expect(manifest.webapp).toEqual({ access: 'DOMAIN', executeAs: 'USER_DEPLOYING' });
    expect(manifest.oauthScopes).toContain('https://www.googleapis.com/auth/script.send_mail');
    expect(manifest.oauthScopes).toContain('https://www.googleapis.com/auth/script.scriptapp');
  });

  it('keeps official points behind the ledger, lock, role, and idempotency boundaries', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    expect(source).toContain("requireRole_(['admin', 'staff'])");
    expect(source).toContain("requireRole_(['admin', 'cashier'])");
    expect(source).toContain('LockService.getScriptLock()');
    expect(source).toContain("kind: 'SPEND'");
    expect(source).toContain("kind: 'REVERSAL'");
    expect(source).toContain("printIdemOperation_('checkout'");
    expect(source).toContain('idemResult_(key, operation)');
    expect(source).not.toMatch(/havenRewards|AlloHaven/i);
  });

  it('ships the connection surface and Leadership Hub launcher in generated modules', () => {
    const settings = read('view_project_settings_module.js');
    const hub = read('admin_hub_module.js');
    expect(settings).toContain('School Rewards & Store');
    expect(settings).toContain('allo_school_rewards_portal_url_v1');
    expect(settings).toContain("url.hostname !== 'script.google.com'");
    expect(hub).toContain('School Rewards & Store');
    expect(hub).toContain('allo_school_rewards_portal_url_v1');
  });

  it('keeps student identity managed and detailed reasons out of routine balance email', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    const readme = read('apps_script/school_rewards/README.md');
    expect(readme).toMatch(/use the system without opening the portal/i);
    expect(readme).toMatch(/opaque student UUID/i);
    expect(source).toContain("subject: (config.schoolName || 'School') + ' rewards update'");
    expect(source).not.toMatch(/subject:[^\n]+balance/);
    expect(source).not.toMatch(/statementHtml_\([\s\S]{0,500}reason/);
  });

  it('separates growth from spending and records order receipts', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    const portal = read('apps_script/school_rewards/Portal.html');
    expect(source).toContain("Categories: ['Id', 'Name'");
    expect(source).toContain("Receipts: ['Id', 'OrderId'");
    expect(source).toContain("actor.role === 'student'");
    expect(source).toContain("entry.kind === 'EARN' || entry.kind === 'REVERSAL'");
    expect(source).toContain("sendOrderReceipt_");
    expect(source).toContain('function resendSchoolRewardsOrderReceipt');
    expect(source).toContain('function resolveSchoolRewardsReceiptDelivery');
    expect(source).toContain('function receiptDto_');
    expect(source).toContain("status = 'PENDING'");
    expect(source).toContain("srError_('receipt_uncertain'");
    expect(portal).toContain('HOWLs & custom categories');
    expect(portal).toContain('Store purchases never lower these levels');
    expect(portal).toContain("rpc('resendSchoolRewardsOrderReceipt'");
    expect(portal).toContain("rpc('resolveSchoolRewardsReceiptDelivery'");
    expect(portal).toContain('data-receipt-kind');
    expect(portal).toContain('data-resolve-receipt');
  });

  it('provides keyboard tabs, contextual cart controls, and an on-screen receipt surface', () => {
    const portal = read('apps_script/school_rewards/Portal.html');
    expect(portal).toContain('role="tablist"');
    expect(portal).toContain('role="tab"');
    expect(portal).toContain('role="tabpanel"');
    expect(portal).toContain("event.key==='ArrowRight'");
    expect(portal).toContain('<caption class="sr-only">');
    expect(portal).toContain('scope="col"');
    expect(portal).toContain('id="checkout-receipt"');
    expect(portal).toContain('aria-label="Add \'+esc(item.name)+\' to cart"');
  });

  it('ships the schema-v4 private asset and immutable revision boundary', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    const portal = read('apps_script/school_rewards/Portal.html');
    expect(source).toContain('var SR_VERSION = 4');
    expect(source).toContain('SR_MAX_PRINT_ASSET_BYTES = 4 * 1024 * 1024');
    expect(source).toContain("PrintAssets: ['Id', 'ModelId'");
    expect(source).toContain("'PreviousRequestId'");
    expect(source).toContain("'SUPERSEDED'");
    expect(source).toContain('function migrateSchoolRewardsRepositoryV4');
    expect(source).toContain('function uploadSchoolRewardsPrintAsset');
    expect(source).toContain('function reviewSchoolRewardsPrintAsset');
    expect(source).toContain('function resubmitSchoolRewardsPrintRequest');
    expect(source).toMatch(/computeDigest\(\s*Utilities\.DigestAlgorithm\.SHA_256/);
    expect(source).not.toMatch(/driveUrl|alternateLink|webContentLink/i);
    expect(portal).toContain("rpc('uploadSchoolRewardsPrintAsset'");
    expect(portal).toContain("rpc('resubmitSchoolRewardsPrintRequest'");
  });

  it('keeps publishing, guardian communication, SIS import, and district reporting authenticated and bounded', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    const portal = read('apps_script/school_rewards/Portal.html');
    [
      'submitSchoolRewardsPrintPublication',
      'reviewSchoolRewardsPrintPublication',
      'remixSchoolRewardsPrintModel',
      'adminUpsertSchoolRewardsGuardian',
      'sendSchoolRewardsGuardianDigests',
      'getSchoolRewardsDistrictSummary',
      'previewSchoolRewardsSisSnapshot',
      'applySchoolRewardsSisSnapshot'
    ].forEach(name => {
      expect(source).toContain(`function ${name}`);
      expect(portal).toContain(`rpc('${name}'`);
    });
    expect(source).toContain("requireRole_(['admin'])");
    expect(source).toContain('SR_MAX_BATCH');
    expect(source).not.toMatch(/sis.*(password|secret|token)|guardian.*student.*reason/i);
  });

  it('carries the moderated publication id through the flat community DTO and report action', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    const portal = read('apps_script/school_rewards/Portal.html');
    expect(source).toMatch(/dto\.publicationId\s*=\s*publishedPublicationByModel\[model\.id\]\.id/);
    expect(portal).toMatch(/entry&&entry\.publicationId\?\{id:entry\.publicationId/);
    expect(portal).toMatch(/payload\.publicationId\s*=\s*button\.dataset\.communityReport/);
  });

  it('keeps manufacturing evidence local and real printer capabilities disabled by default', () => {
    const model = read('printable_model_module.js');
    const tool = read('stem_lab/stem_tool_printlab.js');
    expect(model).toContain('alloflow-print-job/1');
    expect(model).toContain('payloadSha256');
    expect(model).toContain("scope:'ticket-without-integrity'");
    expect(model).toContain('verifyPrintJobTicketIntegrity');
    expect(model).toMatch(/simulator/i);
    expect(model).toMatch(/disabled/i);
    expect(tool).toMatch(/job ticket/i);
    expect(tool).toMatch(/simulator/i);
    expect(`${model}\n${tool}`).not.toMatch(/fetch\([^)]*(octoprint|moonraker)|XMLHttpRequest[^\n]*(octoprint|moonraker)/i);
  });
});
