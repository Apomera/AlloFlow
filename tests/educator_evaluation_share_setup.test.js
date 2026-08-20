import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

describe('principal-managed evaluation setup walkthrough', () => {
  it('presents all three record paths in the evaluator setup source', () => {
    const source = read('educator_evaluation_source.jsx');
    expect(source).toContain('Private on-device');
    expect(source).toContain('Principal-managed Drive');
    expect(source).toContain('District portal');
    expect(source).toContain('https://script.new/');
    expect(source).toContain('<AeCopyShareSource name="Code.gs"');
    expect(source).toContain('<AeCopyShareSource name="Index.html"');
    expect(source).toContain('<AeCopyShareSource name="appsscript.json"');
    expect(source).toContain('Drive API v3 ready');
    expect(source).toContain('download the file and open it in a browser');
    expect(source).toContain('Record path setup');
    expect(source).toContain('Principal helper setup progress');
    expect(source).toContain('Next step:');
    expect(source).toContain("selected === 'principal_share'");
    expect(source).toContain("selected === 'district_portal'");
  });

  it('publishes every copyable helper file with byte-for-byte parity', () => {
    for (const name of ['Code.gs', 'Index.html', 'appsscript.json', 'README.md']) {
      expect(read('desktop', 'web-app', 'public', 'apps_script', 'educator_evaluation_share', name))
        .toBe(read('apps_script', 'educator_evaluation_share', name));
    }
    expect(read('build.js')).toContain("'apps_script/educator_evaluation_share'");
  });

  it('makes sharing a reviewed two-step action and avoids HTML injection in listings', () => {
    const page = read('apps_script', 'educator_evaluation_share', 'Index.html');
    expect(page).toContain('type="file"');
    expect(page).toContain('Review; do not share yet');
    expect(page).toContain('id="review" disabled');
    expect(page).toContain('var deploymentReady = false');
    expect(page).toContain('var reviewedRequest = null');
    expect(page).toContain('reviewedRequest = clone(req)');
    expect(page).toContain('var req = clone(reviewedRequest)');
    expect(page).toContain('function parsePacketSource(source)');
    expect(page).toContain('Only an AlloFlow educator packet, version 1');
    expect(page).toContain('A field changed. Review the complete request again before sharing.');
    expect(page).toContain('Run the deployment check before reviewing or sharing a packet.');
    expect(page).toContain('Confirm and share this packet');
    expect(page).toContain('Retype the educator email');
    expect(page).toContain('Revoke this educator access now');
    expect(page).toContain('Drive re-read confirmed that access is absent');
    expect(page).toContain('live Drive access differs from the helper record');
    expect(page).toContain('download the .html file and open it in a browser');
    expect(page.indexOf('<option value="view">')).toBeLessThan(page.indexOf('<option value="comment">'));
    expect(page).not.toContain('.innerHTML');
  });

  it('documents copy, private deployment, verification, and HTML delivery', () => {
    const manual = read('educator-evaluation-manual.html');
    expect(manual).toContain('three record paths');
    expect(manual).toContain('apps_script/educator_evaluation_share/Code.gs');
    expect(manual).toContain('Who has access: Only myself');
    expect(manual).toContain('Drive API v3');
    expect(manual).toContain('same seven setup stages shown in the app');
    expect(manual).toContain('download the shared .html file and open it in a browser');
    expect(read('desktop', 'web-app', 'public', 'educator-evaluation-manual.html')).toBe(manual);
  });

  it('links Project Settings to the middle-path setup center', () => {
    const source = read('view_project_settings_source.jsx');
    expect(source).toContain('Need the middle path?');
    expect(source).toContain('Principal-managed Drive');
    expect(source).toContain('three source-copy buttons');
    expect(source).toContain('resumable seven-step checklist');
  });
});
