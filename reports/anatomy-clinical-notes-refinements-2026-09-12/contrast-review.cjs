const fs=require('node:fs'),assert=require('node:assert/strict');const file=__dirname+'/browser.cjs';let source=fs.readFileSync(file,'utf8');
const before='evidence.axe.push({name,...result});';
const after=`evidence.axe.push({name,...result});
    if (result.incomplete.length) {
      assert.equal(name, 'phone-320-flashcards');
      assert.deepEqual(result.incomplete.map(item => item.id), ['color-contrast']);
      // axe reports elmPartiallyObscuring here. Check the actual rendered colors and occlusion independently.
      const review = await page.evaluate(() => {
        const p = document.querySelector('[data-anatomy-clinical-note-text]'), card = p.closest('[data-anatomy-clinical-note]');
        const style = getComputedStyle(p), surface = getComputedStyle(card), r = p.getBoundingClientRect();
        const rgb = color => color.match(/[\\d.]+/g).slice(0,3).map(Number);
        const luminance = color => rgb(color).map(c => c / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4).reduce((sum,c,i) => sum + c * [.2126,.7152,.0722][i],0);
        const fg = luminance(style.color), bg = luminance(surface.backgroundColor), occlusions = [];
        for (let y = r.top + 2; y < r.bottom - 2; y += 12) for (const x of [r.left+2,r.left+r.width/2,r.right-2]) {
          const top = document.elementFromPoint(x,y); if (top !== p && !p.contains(top)) occlusions.push({x,y,tag:top?.tagName});
        }
        return {foreground:style.color,background:surface.backgroundColor,paragraphBackground:style.backgroundColor,backgroundImage:surface.backgroundImage,opacity:style.opacity,contrastRatio:(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05),occlusions};
      });
      assert.equal(review.background, 'rgb(248, 250, 252)'); assert.equal(review.paragraphBackground, 'rgba(0, 0, 0, 0)');
      assert.equal(review.backgroundImage, 'none'); assert.equal(review.opacity, '1');
      assert.ok(review.contrastRatio >= 4.5); assert.deepEqual(review.occlusions,[]);
      evidence.manualContrastReviews = [{name,...review}];
    }`;
assert.ok(source.includes(before));source=source.replace(before,after);
source=source.replace('assert.deepEqual(evidence.axe.flatMap(s => s.incomplete),[]);', "assert.equal(evidence.axe.flatMap(s => s.incomplete).length,(evidence.manualContrastReviews || []).length);");
fs.writeFileSync(file,source);
