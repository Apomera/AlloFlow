'use strict';
module.exports = async ({page,result,check,active,nativeFocus,audit,capture,mount,settle,verify}) => {
  result.interactions = [];
  const observe = async (name, evidence = {}) => { const focus = await active(); const state = await page.evaluate(() => JSON.parse(JSON.stringify(decomposerData))); const status = await page.evaluate(() => ({ announcements:decomposerAnnouncements.slice(), toasts:decomposerToasts.slice(), live:[...document.querySelectorAll('[aria-live],[role=status],[role=log]')].map(element=>({role:element.getAttribute('role'),live:element.getAttribute('aria-live'),text:element.textContent.trim()})) })); const row={name,focus,state,status,...evidence};result.interactions.push(row);return row; };
  const activate = async locator => { await nativeFocus(locator); await page.keyboard.press('Enter'); await settle(); };
  const belongs = async locator => locator.evaluate(element => !!element.closest('[role=tabpanel]'));
  async function panelCheck(name, locator) { const membership=await belongs(locator); check(name+' actual content belongs to its tabpanel', membership); }
  async function sample(name) { await audit(name); const fit=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));check(name+' page does not overflow horizontally',fit.scrollWidth<=fit.width+1,fit); }

  async function reactionFlow(){
  await mount({tab:'reactions'},1280,'normal');
  const first=page.getByRole('button').filter({hasText:/Baking Soda$/}).last();await panelCheck('Reactions',first);await activate(first);await activate(page.getByRole('button').filter({hasText:/Acetic Acid$/}).last());
  await activate(page.getByRole('button',{name:'Mix',exact:true}));const mixed=await observe('reaction mixed');
  check('Reaction result receives useful focus or an announcement',mixed.focus.tag!=='BODY'||mixed.status.announcements.length>0||mixed.status.live.some(item=>/reaction|fizz|bubbl/i.test(item.text)),mixed);
  await page.setViewportSize({width:320,height:1000});await settle();await sample('320-reaction-result');await capture('320-reaction-result',page.getByRole('button',{name:'Try Another Combo',exact:true}).locator('xpath=../..'));
  await activate(page.getByRole('button',{name:'Try Another Combo',exact:true}));const again=await observe('reaction reset');check('Reaction reset restores useful focus',again.focus.tag!=='BODY',again.focus);
  }
  if(process.argv.includes('--reactions-only')){await reactionFlow();return;}
  await mount({tab:'explore'},1280,'normal');
  const compare=page.getByRole('button',{name:'Compare Molecules',exact:true});
  await panelCheck('Explore comparison',compare);
  await activate(compare); const opened=await observe('comparison opened');
  check('Comparison opening preserves useful focus',opened.focus.tag!=='BODY',opened.focus);
  await page.getByRole('combobox',{name:'Compare with material',exact:true}).selectOption('Table Salt');await settle();
  await sample('1280-comparison-open');await capture('1280-comparison-open',page.getByRole('combobox',{name:'Compare with material',exact:true}).locator('xpath=..'));
  await activate(page.getByRole('button',{name:'Close',exact:true}));const closed=await observe('comparison closed');
  check('Comparison close returns to its opener',/Compare Molecules/.test(closed.focus.name),closed.focus);

  await mount({tab:'quiz'},1280,'normal');
  const start=page.getByRole('button',{name:'Start Quiz',exact:true});await panelCheck('Quiz',start);await activate(start);
  const begun=await observe('quiz started');check('Quiz Start focuses the question or an answer',begun.focus.tag!=='BODY',begun.focus);
  let question=await page.evaluate(()=>decomposerData.quizQ);const wrong=question.opts.find(option=>option!==question.answer);
  await activate(page.getByRole('button',{name:wrong,exact:true}));const wrongAnswer=await observe('quiz wrong answer',{question:question.text,wrong});
  check('Quiz answer feedback is announced',wrongAnswer.status.announcements.length>0||wrongAnswer.status.live.some(item=>/Incorrect|answer|correct/i.test(item.text)),wrongAnswer.status);
  await page.setViewportSize({width:320,height:1000});await settle();await sample('320-quiz-wrong-answer');await capture('320-quiz-wrong-answer',page.getByRole('button',{name:'Next Question',exact:true}).locator('xpath=..'));
  await activate(page.getByRole('button',{name:'Next Question',exact:true}));const next=await observe('quiz next question');check('Quiz Next focuses the new question or an answer',next.focus.tag!=='BODY',next.focus);
  question=await page.evaluate(()=>decomposerData.quizQ);await activate(page.getByRole('button',{name:question.answer,exact:true}));await observe('quiz correct answer',{question:question.text,answer:question.answer});
  await activate(page.getByRole('button',{name:'Reset Quiz',exact:true}));const reset=await observe('quiz reset');check('Quiz Reset returns focus to Start',/Start Quiz/.test(reset.focus.name),reset.focus);

  await page.evaluate(()=>{window.qaAiMode='unavailable';});await mount({tab:'tutor'},1280,'normal');
  const input=page.getByRole('textbox',{name:'Ask the Decomposer tutor',exact:true});await panelCheck('Tutor',input);if(!await input.isDisabled()){await input.fill('Why is water important?');await input.press('Enter');await settle();}
  const unavailable=await observe('tutor unavailable submit');check('Unavailable Tutor explains or disables submission',await page.getByRole('textbox',{name:'Ask the Decomposer tutor',exact:true}).isDisabled()||unavailable.status.live.some(item=>/unavailable|connect|not available/i.test(item.text))||await page.getByText(/tutor.*unavailable|unavailable.*tutor/i).count()>0,unavailable);
  const suggestions=await page.getByRole('button').evaluateAll(elements=>elements.filter(element=>/Why is Water important\?|What kind of bond is in H₂O\?|Where is Water found in nature\?|Is Water safe to touch\?|Explain the electron configuration/.test(element.textContent)).map(element=>({text:element.textContent.trim(),name:element.getAttribute('aria-label')||element.textContent.trim()})));
  check('Tutor suggested questions include visible words in their names',suggestions.length===4&&suggestions.every(item=>item.name.includes(item.text)),suggestions);
  await sample('1280-tutor-unavailable');
  await page.evaluate(()=>{window.qaAiMode='complete';});await mount({tab:'tutor'},1280,'normal');
  const liveInput=page.getByRole('textbox',{name:'Ask the Decomposer tutor',exact:true});await liveInput.fill('What is water made of?');await liveInput.press('Enter');await settle();
  await observe('tutor pending');await page.evaluate(()=>qaAiResolve());await page.waitForFunction(()=>decomposerData.aiMessages?.length===2&&decomposerData.aiLoading===false);const completed=await observe('tutor completed locally');
  check('Tutor completion is exposed through a live log or announcement',completed.status.announcements.some(item=>/hydrogen|reply|response/i.test(item))||completed.status.live.some(item=>/Local QA response/.test(item.text)),completed.status);
  check('Fake Tutor provider is called once without network',await page.evaluate(()=>qaAiCalls.length===1));
  await page.setViewportSize({width:320,height:1000});await settle();await sample('320-tutor-completed');await capture('320-tutor-completed',page.locator('#tool-root'));

  await page.evaluate(()=>{window.qaAiMode='unavailable';});await mount({tab:'states'},1280,'normal');
  const slider=page.getByRole('slider');await panelCheck('States',slider);await nativeFocus(slider);await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');await settle();
  const sliderInfo=await slider.evaluate(element=>({name:element.getAttribute('aria-label'),value:element.value,valueText:element.getAttribute('aria-valuetext')}));
  check('States slider identifies temperature and its Celsius value',/temperature/i.test(sliderInfo.name)&&/celsius|°C/i.test(sliderInfo.valueText||''),sliderInfo);
  await page.keyboard.press('End');await settle();const state=await observe('States native slider endpoint');check('States slider changes the real model temperature',state.state._simTemp===500,state.state._simTemp);
  const motionBefore=await page.locator('canvas').evaluate(element=>({positions:element._particles?.slice(0,3).map(p=>[p.x,p.y]),reduced:matchMedia('(prefers-reduced-motion:reduce)').matches}));await page.waitForTimeout(150);const motionAfter=await page.locator('canvas').evaluate(element=>element._particles?.slice(0,3).map(p=>[p.x,p.y]));
  const pause=page.getByRole('button',{name:/pause.*(animation|motion|visual)|pause$/i});check('States particle animation offers a Pause control',await pause.count()>0,{motionBefore,motionAfter});
  await page.setViewportSize({width:320,height:1000});await settle();await sample('320-states-gas');await capture('320-states-gas',page.locator('#tool-root'));

  await mount({tab:'visualize'},1280,'normal');await sample('1280-atoms-visualization');check('Atoms visualization offers a Pause control',await page.getByRole('button',{name:/pause.*(animation|motion|visual)|pause$/i}).count()>0,await page.locator('canvas').evaluate(element=>({running:element._dcAnimRunning,reduced:matchMedia('(prefers-reduced-motion:reduce)').matches})));

  await reactionFlow();
};
