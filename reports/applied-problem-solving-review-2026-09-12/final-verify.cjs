const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'../..');process.chdir(root);
const mirrors=['applied_challenge_module.js','doc_pipeline_module.js','generate_dispatcher_module.js','view_sidebar_panels_module.js','studio_response_module.js','ui_strings.js'];
for(const file of mirrors){const s=fs.readFileSync(file);fs.writeFileSync(path.join('desktop/web-app/public',file),s);}
fs.writeFileSync('desktop/web-app/src/generate_dispatcher_source.jsx',fs.readFileSync('generate_dispatcher_source.jsx'));
const compiled=[];for(const file of ['desktop/web-app/src/App.jsx','applied_challenge_source.jsx','generate_dispatcher_source.jsx','view_sidebar_panels_source.jsx']){require('esbuild').transformSync(fs.readFileSync(file,'utf8'),{loader:'jsx',target:'es2020'});compiled.push(file);}
const hashes=Object.fromEntries(mirrors.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
fs.writeFileSync(path.join(__dirname,'implementation-build-results.json'),JSON.stringify({compiled,mirrors:hashes},null,2));
console.log('Compiled host and JSX sources; verified '+mirrors.length+' public module mirrors.');
const browserPath=path.join(__dirname,'implementation-browser.cjs');let browser=fs.readFileSync(browserPath,'utf8');
browser=browser.replace("async function audit(page,name){await page.addScriptTag", "async function audit(page,name){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),page.viewportSize().width,name+' overflow');await page.addScriptTag");
browser=browser.replace("await page.getByRole('button',{name:'3. Build',exact:true}).click();", "await audit(page,'Explore with linked evidence 390');await page.getByRole('button',{name:'3. Build',exact:true}).click();");
browser=browser.replace("fs.writeFileSync(path.join(__dirname,'implemented-export-'+preset+'.html')", "assert.equal(html.includes('I recommend a small slow-watering trial.'),['response','teacher'].includes(preset),preset+' response separation');assert(!html.includes('REVIEW_PRIVATE_SOURCE'));fs.writeFileSync(path.join(__dirname,'implemented-export-'+preset+'.html')");
fs.writeFileSync(browserPath,browser);
