const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');
const { expect } = require('@playwright/test');
const { makeGsSandbox } = require('./fixtures/shared_activity_mailbox.cjs');

(async () => {
  const { call } = makeGsSandbox();
  const admin = call({a:'claim'}).admin;
  const id = 'PK-62345678-1234-1234-1234-123456789012';
  const secret = 'fixture_secret_fixture_secret';
  const activityId = n => `AC-62345678-1234-1234-1234-${String(n).padStart(12,'0')}`;
  const activities = [
    {activityId:activityId(1),type:'survey',identityMode:'real_name',prompt:'Reflect on your learning',items:[
      {type:'likert',text:'How confident do you feel?',required:true,labels:['Need support','Getting there','Ready']},
      {type:'numeric',text:'Hours spent practicing',min:0,max:10},
      {type:'freetext',text:'What helped you learn?'},
      {type:'choice',text:'Preferred support',options:['Read-aloud','A worked example']},
    ]},
    {activityId:activityId(2),type:'signup',identityMode:'real_name',prompt:'Choose a feedback meeting',options:[{id:'o1',label:'Tuesday at 3:15 PM',capacity:1},{id:'o2',label:'Wednesday at 3:15 PM',capacity:1}],maxPerPerson:1},
    {activityId:activityId(3),type:'availability',identityMode:'codename',prompt:'When can we meet?',options:[{id:'o1',label:'Tuesday at 3:15 PM'},{id:'o2',label:'Wednesday at 3:15 PM'}],allowMaybe:true,multiSelect:true},
  ];
  const hosted = call({a:'putpack',admin,id,k:secret,part:1,of:1,data:'PACK',title:'Browser activity fixture',expiresAt:new Date(Date.now()+86400000).toISOString(),activities});
  if(!hosted.ok) throw Error('Fixture hosting failed '+JSON.stringify(hosted));
  const manifest = JSON.parse(fs.readFileSync('desktop/web-app/public/app/asset-manifest.json', 'utf8'));
  const css = fs.readFileSync(path.join('desktop/web-app/public/app/static/css', path.basename(manifest.files['main.css'])));
  const server = http.createServer((req,res) => {
    if(req.url==='/style.css'){res.writeHead(200,{'Content-Type':'text/css'});res.end(css);return;}
    res.writeHead(200,{'Content-Type':'text/html'});
    res.end('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><style>body{margin:0;background:#f1f5f9;font-family:Arial,sans-serif}#root{max-width:880px;margin:24px auto;padding:12px}button:focus-visible,input:focus-visible,textarea:focus-visible{outline:3px solid #4338ca;outline-offset:2px}</style></head><body><div id="root"></div></body></html>');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true}), errors=[], pages=[];
  const out='docs/shared-activity-refinements';fs.mkdirSync(out,{recursive:true});
  try {
    async function newPage(mode='student') {
      const page=await browser.newPage({viewport:{width:mode==='teacher'?1280:390,height:mode==='teacher'?960:844}});
      pages.push(page);page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
      await page.exposeFunction('mailboxFixtureCall',p=>call(p));
      await page.addScriptTag({path:'desktop/web-app/node_modules/react/umd/react.development.js'});
      await page.addScriptTag({path:'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'});
      await page.evaluate(()=>{
        window.AlloModules={};
        window.__alloSharedActivityMailboxCallWithRetry=async(_url,p)=>{
          if(p.a==='activityupsert'&&window.failNextSave){window.failNextSave=false;throw Error('Simulated offline request');}
          const result=await window.mailboxFixtureCall(p);
          if(result.ok===false)throw Object.assign(Error(result.e),{code:result.e});
          return result;
        };
      });
      await page.addScriptTag({path:'shared_activity_module.js'});
      await page.evaluate(({activities,mailbox,mode,admin})=>{
        window.fixtureRoot=null;
        window.openActivity=index=>{
          fixtureRoot?.unmount();window.fixtureRoot=ReactDOM.createRoot(document.getElementById('root'));
          fixtureRoot.render(React.createElement(AlloModules.SharedActivity.SharedAssignmentActivityPanel,{activity:activities[index],mailbox,mode,admin}));
        };
      },{activities,mailbox:{url:url+'/exec',id,secret},mode,admin:mode==='teacher'?admin:''});
      return page;
    }
    const student=await newPage(),other=await newPage(),teacher=await newPage('teacher');
    const open=async(page,index)=>{await page.evaluate(index=>openActivity(index),index);await expect(page.locator('section')).toHaveAttribute('aria-busy','false');};
    await open(student,0);
    await student.getByRole('textbox',{name:'Your name'}).fill('Morgan');
    await student.getByRole('button',{name:'3: Ready',exact:true}).click();
    await student.getByRole('spinbutton',{name:'Hours spent practicing'}).fill('1.5');
    await student.getByRole('textbox',{name:'What helped you learn?'}).fill('Working through an example and explaining it to a partner.');
    await student.getByRole('button',{name:'A worked example',exact:true}).click();
    await student.getByRole('button',{name:'Send my answers',exact:true}).click();
    await expect(student.getByRole('status')).toContainText('Your answers were saved');
    await open(student,0);
    await expect(student.getByRole('textbox',{name:'Your name'})).toHaveValue('Morgan');
    await expect(student.getByRole('spinbutton')).toHaveValue('1.5');
    await expect(student.getByRole('button',{name:'3: Ready',exact:true})).toHaveAttribute('aria-pressed','true');
    await student.getByRole('spinbutton').fill('11');await student.getByRole('button',{name:'Update my answers',exact:true}).click();
    await expect(student.getByRole('spinbutton')).toBeFocused();await expect(student.getByRole('alert')).toContainText('no greater than 10');
    await student.getByRole('spinbutton').fill('2.75');await student.evaluate(()=>window.failNextSave=true);
    await student.getByRole('button',{name:'Update my answers',exact:true}).click();await expect(student.getByRole('alert')).toContainText('draft is still here');
    await expect(student.getByRole('spinbutton')).toHaveValue('2.75');await student.getByRole('button',{name:'Update my answers',exact:true}).click();
    await expect(student.getByRole('status')).toContainText('Your answers were saved');
    await student.screenshot({path:out+'/mobile-survey.png',fullPage:true});
    await open(teacher,0);await expect(teacher.locator('section')).toContainText('mean 2.75');await teacher.screenshot({path:out+'/teacher-survey.png',fullPage:true});
    console.log('Survey reload, decimal validation, failed-save recovery, and teacher results passed.');

    await open(student,1);await student.getByRole('textbox',{name:'Your name'}).fill('Morgan');
    await student.getByRole('button',{name:'Select slot',exact:true}).first().click();await student.getByRole('button',{name:'Save my choice',exact:true}).click();
    await expect(student.getByRole('status')).toContainText('reservation is saved');
    await open(other,1);await other.getByRole('textbox',{name:'Your name'}).fill('Riley');await other.getByRole('button',{name:'Select slot',exact:true}).click();
    await student.getByRole('button',{name:'Select slot',exact:true}).click();await student.getByRole('button',{name:'Save my choice',exact:true}).click();
    await expect(student.getByRole('button',{name:'Reserved · deselect',exact:true})).toBeVisible();
    await other.getByRole('button',{name:'Save my choice',exact:true}).click();await expect(other.getByRole('alert')).toContainText('slot filled');
    await other.screenshot({path:out+'/mobile-slot-conflict.png',fullPage:true});
    await other.getByRole('button',{name:'Selected · remove',exact:true}).click();await expect(other.getByRole('button',{name:'Full',exact:true})).toBeDisabled();
    await other.getByRole('button',{name:'Select slot',exact:true}).click();await other.getByRole('button',{name:'Save my choice',exact:true}).click();
    await expect(other.getByRole('status')).toContainText('reservation is saved');
    await open(student,1);await expect(student.getByRole('textbox',{name:'Your name'})).toHaveValue('Morgan');await expect(student.getByRole('button',{name:'Reserved · deselect',exact:true})).toBeEnabled();
    await student.getByRole('button',{name:'Reserved · deselect',exact:true}).click();await student.getByRole('button',{name:'Save my choice',exact:true}).click();await expect(student.getByRole('status')).toContainText('slot was released');
    console.log('Two-person slot conflict, recovery, reservation reload, and release passed.');

    await open(student,2);
    await student.getByRole('group',{name:'Tuesday at 3:15 PM',exact:true}).getByRole('button',{name:'No',exact:true}).click();
    await student.getByRole('group',{name:'Wednesday at 3:15 PM',exact:true}).getByRole('button',{name:'Yes',exact:true}).click();
    await student.getByRole('button',{name:'Save my availability',exact:true}).click();await expect(student.getByRole('status')).toContainText('availability was saved');
    await open(student,2);await expect(student.getByRole('group',{name:'Tuesday at 3:15 PM',exact:true}).getByRole('button',{name:'No',exact:true})).toHaveAttribute('aria-pressed','true');
    await student.screenshot({path:out+'/mobile-availability.png',fullPage:true});
    for(const page of pages) {
      if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow');
      await expect(page.locator('section')).not.toContainText('cloud appears');
    }
    const survey=call({a:'getactivityadmin',admin,id,aid:activityId(1)}),signup=call({a:'getactivityadmin',admin,id,aid:activityId(2)}),poll=call({a:'getactivityadmin',admin,id,aid:activityId(3)});
    if(survey.participantCount!==1||poll.participantCount!==1)throw Error('Reload created a duplicate respondent');
    if(signup.slots.reduce((sum,slot)=>sum+slot.taken,0)!==1)throw Error('Reservation/release count mismatch');
    const result={actualMailboxHandlers:true,simulatedGoogleServices:true,surveyReload:true,decimalResponse:2.75,saveRetry:true,slotConflict:true,slotRelease:true,availabilityReload:true,mobileOverflow:false,errors};
    fs.writeFileSync(out+'/browser-results.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(errors.length)throw Error('Page errors');
  } catch(error) {
    for(let i=0;i<pages.length;i++)console.error('PAGE '+i+' '+(await pages[i].locator('body').innerText()).slice(0,3000));throw error;
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
