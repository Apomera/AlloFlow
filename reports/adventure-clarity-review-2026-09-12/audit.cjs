// Current shipped-view review. Reuses the established fixture loader; no AI calls.
const fs = require('node:fs');
const path = require('node:path');
let harness = fs.readFileSync(path.join(__dirname, '../adventure-settings-review-2026-09-08/audit.cjs'), 'utf8');
const begin = harness.indexOf('    for (const config of [');
const end = harness.indexOf('    ]) {', begin) + '    ]) {'.length;
harness = harness.slice(0, begin) + `    for (const config of [
 { name:'teacher-desktop',width:1200,teacher:true },
 { name:'teacher-phone',width:375,teacher:true },
 { name:'student-locked-phone',width:375,teacher:false,locked:true },
 { name:'social-setup',width:1200,teacher:true,social:true },
 { name:'active-desktop',width:1200,teacher:false,active:true },
 { name:'active-phone',width:375,teacher:false,active:true },
 { name:'active-short-phone',width:375,height:667,teacher:false,active:true },
 { name:'active-phone-dark',width:375,teacher:false,active:true,theme:'dark' },
 { name:'written-phone',width:375,teacher:false,active:true,written:true },
 { name:'debate-phone',width:375,teacher:false,active:true,written:true,debate:true },
 { name:'systems-desktop',width:1200,teacher:true,active:true,systems:true },
 { name:'ending-phone',width:375,teacher:false,active:true,ending:true },
 { name:'recovery-phone',width:375,teacher:false,active:true,recovery:true },
 { name:'loading-phone',width:375,teacher:false,active:true,loading:true },
 { name:'immersive-phone',width:375,teacher:false,active:true,immersive:true }
    ]) {` + harness.slice(end);
harness = harness.replace("const translate = key => key.split('.').reduce((v,k) => v && v[k], strings) || key;", `const translate = (key, values = {}) => {
 const text = key.split('.').reduce((v,k) => v && v[k], strings) || key;
 return typeof text === 'string' ? text.replace(/\\{(\\w+)\\}/g, (whole, key) => values[key] ?? whole) : key;
};`);
harness = harness.replace("theme: 'light', t: translate", "theme: config.theme || 'light', t: translate");
harness = harness.replace('        const appRoot =', `
        props.sourceTopic = 'The Water Cycle';
        props.gradeLevel = '6th Grade';
        props.adventureEffects = {xp:null,energy:null,gold:null,levelUp:null};
        props.adventureAutoRead = false;
        props.adventureChanceMode = false;
        props.isAdventureStoryMode = true;
        props.isProcessing = false;
        props.failedAdventureAction = config.recovery ? {choice:'Compare the water measurements'} : null;
        props.adventureImageSize = 200;
        props.handleSetShowLedgerToTrue = () => props.setShowLedger(true);
        props.handleSetShowLedgerToFalse = () => props.setShowLedger(false);
        props.handleSetIsAdventureStoryModeToFalse = () => props.setIsAdventureStoryMode(false);
        if (config.active) {
          document.querySelector('#root').style.height = '100vh';
          document.body.style.background = config.theme === 'dark' ? '#0b1120' : '#f1f5f9';
          props.showNewGameSetup = false;
          props.adventureFreeResponseEnabled = !!config.written;
          props.adventureInputMode = config.debate ? 'debate' : config.systems ? 'system' : 'choice';
          props.immersiveShowChoices = false;
          const scene = 'The river runs low beside the town. Maya shows you two jars: one holds clear water from the wetland, and the other holds cloudy water from the farm. The mayor wants a plan before the next dry season. You remember that heat makes water evaporate and plants release water into the air. A farmer says more trees will use too much water. What evidence would help you decide how to protect the town’s supply?';
          const options = ['Compare water measurements at both sites', 'Plant trees beside the river and explain the tradeoff', 'Ask the farmer for observations from last summer'];
          Object.assign(props.adventureState, {
            currentScene:{text:scene,options}, level:2,xp:35,xpToNextLevel:150,energy:75,gold:20,
            turnCount:4,stats:{decisions:3,conceptsFound:['Evaporation','Transpiration']},
            isImmersiveMode:!!config.immersive,
            isLoading:!!config.loading,loadingStage:config.loading?'Considering your decision…':'',
            pendingChoice:config.loading?options[0]:null,
            isGameOver:!!config.ending,canStartSequel:!!config.ending,
            narrativeLedger:'You arrived by the river and compared observations about the water supply.',
            history:[{type:'scene',text:'You arrived by the river.'},{type:'choice',text:'Talk to Maya.'},{type:'scene',text:'Maya shared the water observations.'},{type:'choice',text:'Ask for evidence.'},{type:'scene',text:'The farmer described last summer.'},{type:'choice',text:'Compare the observations.'},{type:'scene',text:scene}],
            lastConsequence:{version:1,mode:config.systems?'system':config.debate?'debate':'choice',reasoning:'strategic_success',choice:'Compare the observations.',explanation:'You connected the water observations to evaporation.',concepts:['Evaporation'],changes:[{key:'energy',label:'Energy',before:80,after:75,unit:''}]},
            systemResources:config.systems?[{name:'Water supply',quantity:75,unit:'%',icon:'💧'},{name:'Budget',quantity:900,unit:'credits',icon:'💰'}]:[]
          });
        }
        const appRoot =`);
harness = harness.replace("      await page.locator('select').first().waitFor({ timeout: 10000 });", "      await page.locator(config.active ? '[data-adventure-header]' : 'select').first().waitFor({ state:'attached', timeout:10000 });\n      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));");
harness = harness.replace("        height: document.documentElement.scrollHeight", `        text:document.body.innerText,
        scrollAreas:[...document.querySelectorAll('*')].filter(el=>el.scrollHeight>el.clientHeight+4 && ['auto','scroll'].includes(getComputedStyle(el).overflowY)).map(el=>({tag:el.tagName,role:el.getAttribute('role'),label:el.getAttribute('aria-label'),class:el.className,height:el.clientHeight,scrollHeight:el.scrollHeight})),
        height: document.documentElement.scrollHeight`);
harness = harness.replace("      await page.screenshot({ path:", `      if (config.active && !config.immersive) {
        await page.screenshot({path:path.join(__dirname,config.name+'-initial.png'),fullPage:true});
        const target = page.locator(config.ending ? '[data-adventure-recap]' : config.loading ? '[data-adventure-turn-status]' : '[aria-labelledby="adventure-current-scene-heading"]').first();
        if (await target.count()) await target.screenshot({path:path.join(__dirname,config.name+'-content.png')});
      }
      await page.screenshot({ path:`);
harness = harness.replace("      await page.close();", `
      if (config.name === 'teacher-phone') {
        await page.getByRole('button',{name:/Guided Story/}).click();
        await page.getByText('Learning supports',{exact:true}).click();
        await page.getByRole('checkbox',{name:'Read each scene automatically',exact:true}).check();
        await page.getByText('Learning supports',{exact:true}).click();
        fs.writeFileSync(path.join(__dirname,'support-summary.json'), JSON.stringify(await page.evaluate(()=>({text:document.body.innerText,autoRead:window.__props.adventureAutoRead})),null,2));
      }
      if (config.name === 'social-setup') {
        await page.getByRole('button',{name:/Social Practice/}).click();
        fs.writeFileSync(path.join(__dirname,'social-summary.json'),JSON.stringify(await page.evaluate(()=>({text:document.querySelector('.as-summary').innerText,social:window.__props.isSocialStoryMode,focus:window.__props.socialStoryFocus})),null,2));
      }
      await page.close();`);
harness = harness.replace('width: config.width, height: 900', 'width: config.width, height: config.height || 900');
harness = harness.replace("controls: [...document.querySelectorAll('input,select,textarea,button')].map(el => ({", "controls: [...document.querySelectorAll('input,select,textarea,button')].filter(el => el.checkVisibility()).map(el => ({");
new Function('require','__dirname',harness)(require,__dirname);
