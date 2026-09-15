const fs=require('node:fs'),vm=require('node:vm'),src=fs.readFileSync('reports/geometry-world-preview-navigation-2026-09-12/browser.cjs','utf8');
const stop=src.indexOf("   await page.locator('.gwe-preview-camera-tools>summary')"),tail=src.indexOf(' }catch(error)');if(stop<0||tail<0)throw Error('Missing browser section');
let phone=src.slice(0,stop)+`
  await page.setViewportSize({width:320,height:844});await frames();const b=await bounds();
  check('Phone review uses the clear canvas width for a larger model',fits(b)&&b.maxX-b.minX>200,b);
  check('Phone review keeps Back to tools visible while hiding the duplicate dock',await page.getByRole('button',{name:'Back to tools',exact:true}).isVisible()&&!await page.locator('.gwe-builder-dock').isVisible());await shot('07-phone-full-width-review');
  await page.locator('.gwe-preview-camera-tools>summary').click();await frames();check('Expanded phone controls still leave the entire model visible',fits(await bounds()),await bounds());await shot('08-phone-full-width-controls');
  await page.getByRole('button',{name:'Back to tools',exact:true}).click();await frames();check('Returning to tools restores the phone dock and preserves the pending proposal',await page.locator('.gwe-builder-dock').isVisible()&&await page.getByRole('button',{name:'Apply preview',exact:true}).isVisible()&&await page.evaluate(()=>!!__geoWorldEngine._buildBatchPreview&&!__geoWorldEngine._previewReviewCamera));
 `+src.slice(tail);
phone=phone.replace("'browser.json'","'phone-browser.json'");new vm.Script(phone);fs.writeFileSync('reports/geometry-world-preview-navigation-2026-09-12/phone-browser.cjs',phone);console.log('Phone layout validation prepared.');
