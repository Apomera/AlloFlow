/* Reproducible synthetic-screen QA. No AI service or external network used. */
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'reports', 'it-coach-browser-review');
async function main() {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      const files = {
        '/it_coach/it_coach.html': 'text/html',
        '/it_coach/image_review.js': 'application/javascript',
        '/video_studio_module.js': 'application/javascript',
        '/ai_backend.js': 'application/javascript'
      };
      if (url.hostname === 'coach.test' && files[url.pathname]) {
        return route.fulfill({ contentType: files[url.pathname], body: fs.readFileSync(path.join(root, url.pathname.slice(1))) });
      }
      return route.fulfill({ status: 200, body: '' });
    });
    await page.goto('https://coach.test/it_coach/it_coach.html');
    await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 720;
      const g = canvas.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 1280, 720);
      g.fillStyle = '#f00'; g.fillRect(0, 0, 128, 72);
      g.fillStyle = '#000'; g.font = '30px sans-serif'; g.fillText('Synthetic settings screen', 180, 120);
      window.testScreen = canvas; window.sentImages = [];
      setInterval(() => { g.fillStyle='#fff'; g.fillRect(1200,700,10,10); },100);
      Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', { configurable: true, value: async () => canvas.captureStream(5) });
      window.AIProvider = class {
        async analyzeImage(prompt, image) {
          window.sentImages.push(image);
          return JSON.stringify({ guidance: 'Open the captions control.', target: { x: .5, y: .3, w: .2, h: .1 }, done: false, kind: 'navigation' });
        }
      };
      document.getElementById('beSaveBtn').click();
      document.getElementById('coachGoal').value = 'Turn on captions';
    });
    await page.locator('#coachWatchBtn').click();
    await page.waitForFunction(() => document.getElementById('previewVideo').videoWidth === 1280).catch(async e => { throw new Error(e.message+' '+JSON.stringify({errors,state:await page.evaluate(()=>({status:document.getElementById('coachStatus').textContent,width:document.getElementById('previewVideo').videoWidth}))})); });
    await page.locator('#coachReviewChk').check();
    await page.locator('#coachSuggestBtn').click();
    await page.locator('#screenReview').waitFor({ state: 'visible' });
    assert.equal(await page.evaluate(() => window.sentImages.length), 0);
    async function area(x, y, w, h) {
      for (const [key, value] of Object.entries({ X:x, Y:y, W:w, H:h })) await page.locator('#review' + key).fill(String(value));
    }
    await area(0, 0, 50, 100); await page.locator('#reviewCropBtn').click();
    await area(0, 0, 10, 10); await page.locator('#reviewHideBtn').click();
    const preview = await page.evaluate(() => {
      const c = document.getElementById('reviewOutput');
      return { width:c.width, height:c.height, hiddenPixel:Array.from(c.getContext('2d').getImageData(5,5,1,1).data) };
    });
    assert.deepEqual(preview, { width:640, height:720, hiddenPixel:[0,0,0,255] });
    await page.locator('#screenReview').screenshot({ path: path.join(out, 'desktop-review.png') });
    await page.setViewportSize({ width:390, height:844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.locator('#screenReview').screenshot({ path: path.join(out, 'mobile-review.png') });
    await page.locator('#coachPrivacyAck').check();
    await page.locator('#reviewApproveChk').check();
    await page.locator('#reviewSendBtn').click();
    await page.waitForFunction(() => window.sentImages.length === 1);
    const sent = await page.evaluate(async () => {
      const image = new Image(); image.src = 'data:image/jpeg;base64,' + window.sentImages[0]; await image.decode();
      const c = document.createElement('canvas'); c.width = image.width; c.height = image.height;
      c.getContext('2d').drawImage(image,0,0);
      return { width:image.width, height:image.height, hiddenPixel:Array.from(c.getContext('2d').getImageData(5,5,1,1).data), status:document.getElementById('coachStatus').textContent };
    });
    // JPEG may shift black by one or two levels; hidden source red cannot pass this.
    assert.ok(sent.hiddenPixel.slice(0,3).every(value => value <= 2)); assert.equal(sent.hiddenPixel[3],255);
    assert.equal(sent.width,640); assert.equal(sent.height,720);
    assert.match(sent.status, /captions control/);
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ preview, sent, noHorizontalOverflowAt390:true, errors }, null, 2));
    console.log('Browser QA passed: local review, crop dimensions, opaque outgoing JPEG pixels, mobile overflow, suggestion.');
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode=1; });
