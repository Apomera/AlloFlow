const fs=require('node:fs'),p='reports/geometry-world-graphics-2026-09-08/verify-artisan-finishes.cjs';let s=fs.readFileSync(p,'utf8');
const a="   await page.evaluate(tier=>__ctx.updateMulti('geometryWorld',{renderQuality:tier}),tier);await page.waitForFunction(tier=>__geoWorldEngine._renderProfile.tier===tier,tier);await page.waitForTimeout(100);";
if(!s.includes(a))throw Error('Quality test anchor missing');
s=s.replace(a,"   await page.getByRole('button',{name:'Open game settings and tools',exact:true}).click();\n   await page.getByRole('combobox',{name:'3D graphics quality',exact:true}).selectOption(tier);\n   await page.waitForFunction(tier=>__geoWorldEngine._renderProfile.tier===tier,tier);\n   await page.getByRole('button',{name:'Close game settings and tools',exact:true}).click();await page.waitForTimeout(100);");
const b="await page.waitForTimeout(700);";
s=s.replace(b,b+"\n  await page.getByRole('button',{name:'Open game settings and tools',exact:true}).focus();\n  await page.evaluate(()=>{__geoWorldEngine.camera.fov=42;__geoWorldEngine.camera.updateProjectionMatrix();});");
const fd=fs.openSync(p,'r+');fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);console.log('Finish verifier now changes quality through its real UI handler.');
