const fs=require('fs');
const update=(p,edits)=>{let s=fs.readFileSync(p,'utf8');for(const [before,after] of edits){if(!s.includes(before))throw Error('Missing anchor '+before.slice(0,100));s=s.replace(before,after);}fs.writeFileSync(p,s);};
update('memory_aid_source.jsx',[
 ["{ label: tr('review_date_tomorrow', 'Tomorrow'), value: offsetDate(1) }","{ label: tr('review_date_tomorrow', 'Tomorrow'), days: 1 }"],
 ["{ label: tr('review_date_week', 'In one week'), value: offsetDate(7) }","{ label: tr('review_date_week', 'In one week'), days: 7 }"],
 ["{ label: tr('review_date_none', 'No date'), value: '' }","{ label: tr('review_date_none', 'No date'), days: null }"],
 ["key={choice.value || 'none'} type=\"button\" onClick={() => onChange(choice.value)}","key={choice.days ?? 'none'} type=\"button\" onClick={() => onChange(choice.days === null ? '' : offsetDate(choice.days))}"],
]);
update('tests/memory_aid_refinement_20260919.test.js',[
 ["vi.setSystemTime(new Date(2026,11,31,23,40));","vi.setSystemTime(new Date(2026,11,30,23,40));"],
 ["await click('Continue my application and plan');const id=saved().solid[0].id;","await click('Continue my application and plan');const id=saved().solid[0].id;\n   vi.setSystemTime(new Date(2026,11,31,23,40));"],
]);
const builder='reports/memory-aid-ux-review-2026-09-12/build-pass4-browser-qa.cjs';
let b=fs.readFileSync(builder,'utf8').replace(/\r/g,'');
const first="  await page.clock.setFixedTime(new Date('2026-11-01T03:30:00Z'));\n  await page.getByRole('button',{name:'Continue my application and plan',exact:true}).click();";
if(!b.includes(first))throw Error('Clock fixture anchor missing');
b=b.replace(first,"  await page.getByRole('button',{name:'Continue my application and plan',exact:true}).click();\n  await page.clock.setFixedTime(new Date('2026-11-01T03:30:00Z'));" );
fs.writeFileSync(builder,b);console.log('Date shortcuts now use the calendar at click time; added long-session coverage.');
