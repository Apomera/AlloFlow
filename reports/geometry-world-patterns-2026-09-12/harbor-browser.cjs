const fs=require('fs');let source=fs.readFileSync(__dirname+'/browser.cjs','utf8');
const start=source.indexOf("  await jump('arch');"),end=source.indexOf("  await page.setViewportSize({width:1440,height:960});await page.evaluate(()=>__ctx.updateMulti",start);
if(start<0||end<0)throw Error('Expected browser workflow before final layout pass');
source=source.slice(0,start)+source.slice(end);
source=source.replace("await page.evaluate(()=>__ctx.updateMulti('geometryWorld',{activeLesson:'geometryHarbor',worldActive:true,showGeometryHome:false,showLessonIntro:false,hudPanel:'',sandboxDockCollapsed:false}));","await page.getByRole('button',{name:'Open game settings and tools',exact:true}).click();await page.getByRole('combobox',{name:'Choose lesson',exact:true}).selectOption('geometryHarbor');await page.getByRole('button',{name:'Start lesson without the guided tutorial',exact:true}).click();");
source=source.replace("'browser.json'","'harbor-browser.json'");
eval(source);
