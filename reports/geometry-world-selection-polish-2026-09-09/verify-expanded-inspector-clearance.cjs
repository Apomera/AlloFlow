// Supplemental390px check for the concrete expanded-inspector/Build overlap.
// Run only after the parent confirms the final CSS is ready; never parallelize browsers.
const fs=require('node:fs'),path=require('node:path');
const dir=__dirname;fs.mkdirSync(path.join(dir,'supplemental-source'),{recursive:true});
for(const name of ['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js','stem_tool_printlab.js'])fs.copyFileSync(path.join('stem_lab',name),path.join(dir,'supplemental-source',name));
let source=fs.readFileSync(path.join(dir,'verify-selection-baseline.cjs'),'utf8');
source=source.replaceAll('before-source','supplemental-source').replaceAll("'before-","'supplemental-");
const start=source.indexOf('    for(const size of [{width:1440,height:900}');
const end=source.indexOf("    check(!result.errors.length",start);
const replacement=`
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(550);
    await click('Explore measurements');await page.locator('.gw-measure-card summary').focus();await page.keyboard.press('Enter');await page.waitForTimeout(300);
    result.expanded=await snapshot();result.expandedScreenshot=await shot('measurement-expanded-390x844');
    check(!result.expanded.overflow,'Expanded drawer causes no horizontal page overflow');
    const a=result.expanded.inspector,b=result.expanded.dock;
    result.intersection=!!(a?.visible&&b?.visible&&Math.min(a.x+a.width,b.x+b.width)>Math.max(a.x,b.x)&&Math.min(a.y+a.height,b.y+b.height)>Math.max(a.y,b.y));
    check(!result.intersection,'Collapsed Build launcher does not overlap the expanded inspector');
    const close=page.getByRole('button',{name:'Close measurement inspector',exact:true});result.close=await close.evaluate(n=>{const r=n.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {width:r.width,height:r.height,hit:n===top||n.contains(top)};});check(result.close.height>=44&&result.close.hit,'Sticky Close remains44px and hit-testable');
    await page.locator('.gw-measure-card summary').focus();await page.keyboard.press('Enter');await page.waitForTimeout(250);result.collapsedDetails=await snapshot();result.collapsedDetailsScreenshot=await shot('measurement-details-collapsed-390x844');check(result.collapsedDetails.dock.visible,'Collapsing measurement details restores the Build launcher');
    await page.locator('.gw-measure-card summary').focus();await page.keyboard.press('Enter');await page.waitForTimeout(250);result.reexpanded=await snapshot();check(!result.reexpanded.dock.visible,'Re-expanding measurement details hides the overlapping Build launcher again');
    await page.locator('.gw-measure-card').evaluate(n=>n.scrollTop=n.scrollHeight);result.scrolledScreenshot=await shot('measurement-expanded-scrolled-390x844');
    await close.click();await page.waitForTimeout(300);result.closed=await snapshot();result.closedScreenshot=await shot('measurement-closed-390x844');
    const build=page.getByRole('button',{name:'Expand Free Build Studio',exact:true});result.build=await build.evaluate(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {visible:s.display!=='none'&&r.width>0&&r.height>0,hit:n===top||n.contains(top)};});check(result.build.visible&&result.build.hit,'Build is visible and reachable immediately after closing the drawer');
    await build.click();result.dock=await snapshot();for(const name of ['Select and measure aimed build','Send selected build to Print Lab']){const action=result.dock.buttons.find(b=>b.name===name);check(action?.hit&&!action.disabled,'Retained-selection action stays available: '+name);}
    result.final=await signature();check(JSON.stringify(result.final)===JSON.stringify(result.initial),'Drawer hide/close/reopen preserves exact world, selected STL and history');
`;
if(start<0||end<0)throw Error('Baseline harness markers changed');
source=source.slice(0,start)+replacement+source.slice(end);
const localModule=new (require('node:module'))(__filename,module);localModule.filename=__filename;localModule.paths=module.paths;localModule._compile(source,__filename);
