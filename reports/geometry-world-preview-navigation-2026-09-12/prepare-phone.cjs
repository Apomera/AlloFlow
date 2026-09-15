const source=require('node:fs').readFileSync('reports/geometry-world-preview-navigation-2026-09-12/create-phone-check.cjs','utf8');
eval(source.replace('   await page.locator','await page.locator').replace("indexOf(' }catch(error)')","indexOf('}catch(error)')"));
