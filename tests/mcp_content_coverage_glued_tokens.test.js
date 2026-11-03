// Source-coverage false "missing words" from PDF text layers (2026-11-02 keyless corpus re-run): glued words,
// glued running headers and page numbers, 2-page running footers, raised ordinals read as a group, check/star
// bullets, letter-spaced numbers and hyphen fragments split across columns. Each rule has a guard: the same
// layout with the words really absent from the output stays missing.
// ALLO_NARRATION_PLAN=<copy.cjs> runs these against another copy (mutation checks).
import {it,expect,describe} from 'vitest';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url);
const P=require(process.env.ALLO_NARRATION_PLAN||resolve('desktop/mcp/remediation_narration_plan.cjs'));
// The connector serializes the function and evals it in the page: run it the same way, so an outside reference fails here.
const assess=(0,eval)('('+P.assessSourceCoverage.toString()+')');
const cov=(sourceText,outputHtml,pages)=>assess({sourceText,outputHtml,pages,method:'pdfjs'});
const words=r=>Object.fromEntries(r.missingWords.map(w=>[w.word,w.count]));

describe('glued words: credited only when the output prints the pieces as consecutive words beside the same neighbour',()=>{
  it('credits "approvalof", "Oct2019Dragos", "31,2024" and "suspension2.5mg" when the output prints them apart',()=>{
    const r=cov('The study was deferred with approvalof NDA 021957. Date: 03 Oct2019Dragos Roman wrote. Until May 31,2024 for the suspension2.5mg dose.',
      '<p>The study was deferred with approval of NDA 021957.</p><p>Date: 03 Oct 2019 Dragos Roman wrote.</p><p>Until May 31, 2024 for the suspension 2.5 mg dose.</p>');
    expect(r.missingTokens,JSON.stringify(r.missingWords)).toBe(0);
  });
  it('keeps "inthe" missing when the output never prints "in the"',()=>{
    const r=cov('Put the paper inthe box today.','<p>Put the paper the box today in.</p>');
    expect(words(r).inthe).toBe(1);
  });
  it('keeps "inthe" missing when "in the" is printed only somewhere else (no shared neighbour)',()=>{
    // the output's second, unclaimed "in the" sits between other words: not this sentence's
    const r=cov('Our cat sat inthe hat. Look in the garden.','<p>Our cat sat. Hat. Look in the garden. It is in the box.</p>');
    expect(words(r).inthe).toBe(1);
  });
  it('never splits a number at its decimal point or thousands comma; a comma before a 4-digit year may split',()=>{
    expect(words(cov('The rate of 2019.20 percent held.','<p>The rate of 2019. 20 percent held.</p>'))['2019.20']).toBe(1);
    expect(words(cov('A total of 1,500 dollars paid.','<p>A total of 1, 500 dollars paid.</p>'))['1,500']).toBe(1);
    expect(cov('Extended until May 31,2024 for review.','<p>Extended until May 31, 2024 for review.</p>').missingTokens).toBe(0);
  });
  it('a word ending in a lone capital is a glued label: credited only by the colon rule ("InformationP 877")',()=>{
    const html='<h2>Contact Information</h2><ul><li>P: 877-770-8883</li></ul>';
    expect(words(cov('Contact InformationP 877-770-8883',html)).informationp).toBe(1);
    // initials after a heading ("HarassmentM.S.A.D.") are not a label
    expect(cov('Ridicule or remarks. HarassmentM.S.A.D. recognizes the right of each student.','<p>Ridicule or remarks.</p><h2>Harassment</h2><p>M.S.A.D. recognizes the right of each student.</p>').missingTokens).toBe(0);
  });
  it('one printed "approval of" credits one glued copy, not two',()=>{
    const r=cov('Deferred with approvalof NDA 1. Deferred with approvalof NDA 2.','<p>Deferred with approval of NDA 1. Deferred with NDA 2.</p>');
    expect(words(r).approvalof).toBe(1);
  });
  it('reads picture labels around their figures: "DrillDrinkingStrawNutcracker" printed as one label per figure',()=>{
    const fig=n=>'<figure><img alt="Picture of a '+n+'"><figcaption>Picture labelled '+n+': a drawing.</figcaption></figure>';
    const r=cov('Match the tools. DrillDrinkingStrawNutcracker Thanks to the park.',
      '<p>Match the tools.</p><p>Drill</p>'+fig('drill')+'<p>Drinking Straw</p>'+fig('straw')+'<p>Nutcracker</p>'+fig('nutcracker')+'<p>Thanks to the park.</p>');
    expect(r.missingTokens,JSON.stringify(r.missingWords)).toBe(0);
    // the labels themselves dropped from the output: still missing
    const lost=cov('Match the tools. DrillDrinkingStrawNutcracker Thanks to the park.','<p>Match the tools.</p>'+fig('drill')+fig('straw')+'<p>Thanks to the park.</p>');
    expect(words(lost).drilldrinkingstrawnutcracker).toBe(1);
  });
});

describe('page furniture glued to text',()=>{
  const head='NDA 021957: NEXIUM suspension, delayed-release oral';
  const pages=[{pageNum:1,text:'Dear Doctor Roman, this letter asks for more time.'},{pageNum:2,text:head+'11 years of age were studied.'},{pageNum:3,text:head+'Safety data were fine.'},{pageNum:4,text:head+'On 1 October the agency wrote back.'}];
  const text=pages.map(p=>p.text).join('\n\n');
  // The output prints the header once, at the top: "oral" and "11" are never side by side there.
  it('a running header glued to each page\'s first word ("oral11", "oralSafety") is one header plus the page\'s words',()=>{
    const r=cov(text,'<p>'+head+'</p><p>Dear Doctor Roman, this letter asks for more time.</p><p>11 years of age were studied.</p><p>Safety data were fine.</p><p>On 1 October the agency wrote back.</p>',pages);
    expect(r.missingTokens,JSON.stringify(r.missingWords)).toBe(0);
  });
  it('the words glued to the header still count: a dropped first sentence is reported',()=>{
    const r=cov(text,'<p>'+head+'</p><p>Dear Doctor Roman, this letter asks for more time.</p><p>11 years of age were studied.</p><p>On 1 October the agency wrote back.</p>',pages);
    expect(words(r)).toMatchObject({safety:1,data:1,fine:1});
  });
  it('first words the output prints whole are content, never cut at a shared start ("Unit1a", "Unit2a")',()=>{
    const hp=[{pageNum:1,text:'Each unit has parts.'},...[1,2,3].map(n=>({pageNum:n+1,text:'Annual Report of the Board Unit'+n+'a covers the plan.'}))];
    const r=cov(hp.map(p=>p.text).join('\n\n'),'<p>Each unit has parts.</p><p>Annual Report of the Board</p>'+[1,2,3].map(n=>'<p>Unit'+n+'a covers the plan.</p>').join(''),hp);
    expect(r.missingTokens,JSON.stringify(r.missingWords)).toBe(0);
  });
  it('a shared start the output never prints as a word is not a header end: lost names are reported whole',()=>{
    const hp=[{pageNum:1,text:'The board met in June.'},...['McDonald spoke first.','McArthur spoke next.','McBride spoke last.'].map((t,i)=>({pageNum:i+2,text:'Annual Report of the Board '+t}))];
    const r=cov(hp.map(p=>p.text).join('\n\n'),'<p>The board met in June.</p><p>Annual Report of the Board</p><p>spoke first.</p><p>spoke next.</p><p>spoke last.</p>',hp);
    expect(words(r)).toMatchObject({mcdonald:1,mcarthur:1,mcbride:1});
  });
  const scan=[{pageNum:1,text:'Form 1040 income tax return for the year.'},{pageNum:2,text:'2GROSS INCOME. This statement must show all gains.'},{pageNum:3,text:'3GENERAL DEDUCTIONS. The amount of expenses paid.'},{pageNum:4,text:'4INSTRUCTIONS. This return shall be made by every citizen.'}];
  const out='<p>Form 1040 income tax return for the year.</p><h2>GROSS INCOME.</h2><p>This statement must show all gains.</p><h2>GENERAL DEDUCTIONS.</h2><p>The amount of expenses paid.</p><h2>INSTRUCTIONS.</h2><p>This return shall be made by every citizen.</p>';
  it('a page number glued to the page\'s first heading ("2GROSS") is a page number plus the heading',()=>{
    const r=cov(scan.map(p=>p.text).join('\n\n'),out,scan);
    expect(r.missingTokens,JSON.stringify(r.missingWords)).toBe(0);
  });
  it('a glued number that is not the page\'s own number stays missing',()=>{
    const off=scan.map(p=>p.pageNum===3?{...p,text:'7GENERAL DEDUCTIONS. The amount of expenses paid.'}:p);
    const r=cov(off.map(p=>p.text).join('\n\n'),out,off);
    expect(words(r)['7general']).toBe(1);
  });
});

describe('a running footer on both pages of a 2-page document',()=>{
  const footer='The University of Maine is an EEO/AA employer and does not discriminate on the grounds of race or color.';
  const pages=[{pageNum:1,text:'Rain in a Jar. Fill your jar with water. Add shaving cream. '+footer},{pageNum:2,text:'Learn more at www.example.org/clouds '+footer}];
  const text=pages.map(p=>p.text).join('\n\n');
  it('pages that are one line each: the footer printed once in the output is complete',()=>{
    const r=cov(text,'<p>Rain in a Jar. Fill your jar with water. Add shaving cream.</p><p>Learn more at www.example.org/clouds</p><footer><p>'+footer+'</p></footer>',pages);
    expect(r.missingTokens,JSON.stringify(r.missingWords)).toBe(0);
  });
  it('a footer missing from the output is still reported (one copy)',()=>{
    const r=cov(text,'<p>Rain in a Jar. Fill your jar with water. Add shaving cream.</p><p>Learn more at www.example.org/clouds</p>',pages);
    expect(words(r)).toMatchObject({university:1,maine:1,discriminate:1,grounds:1});
  });
  it('a shared ending under 4 words is content, not a footer: both copies count',()=>{
    const p2=[{pageNum:1,text:'First we fill the jar. Thank you all.'},{pageNum:2,text:'Then we add the cream. Thank you all.'}];
    const r=cov(p2.map(p=>p.text).join('\n\n'),'<p>First we fill the jar. Thank you all.</p><p>Then we add the cream.</p>',p2);
    expect(words(r)).toMatchObject({thank:1,you:1,all:1});
  });
});

describe('raised ordinal suffixes read as a group',()=>{
  const src='No office hours that day. th The Textbook: Biology by Campbell, et al. There is a 12 edition already, but all editions are the same, th th th th including the 10 , 9 , and 8 editions. My advice: buy a cheap used 8 edition.';
  it('each suffix goes, in order, to the next number the output prints with it',()=>{
    const r=cov(src,'<p>No office hours that day. The Textbook: Biology by Campbell, et al. There is a 12<sup>th</sup> edition already, but all editions are the same, including the 10th, 9th, and 8th editions. My advice: buy a cheap used 8th edition.</p>');
    expect(r.missingTokens,JSON.stringify(r.missingWords)).toBe(0);
  });
  it('a suffix whose ordinal the output does not print stays missing',()=>{
    const r=cov(src,'<p>No office hours that day. The Textbook: Biology by Campbell, et al. There is a 12 edition already, but all editions are the same, including the 10, 9, and 8 editions. My advice: buy a cheap used 8 edition.</p>');
    expect(words(r).th).toBe(5);
  });
});

describe('bullet glyphs and letter-spaced numbers',()=>{
  it('check marks and stars that the output draws as list items are bullets',()=>{
    const r=cov('To-Do List: ✅ Buy school supplies ✅ Meet the teacher ★ Monday is the first day','<p>To-Do List:</p><ul><li>Buy school supplies</li><li>Meet the teacher</li><li>Monday is the first day</li></ul>');
    expect(r.missingTokens,JSON.stringify(r.missingWords)).toBe(0);
  });
  it('the same glyphs with no list in the output are still missing',()=>{
    const r=cov('To-Do List: ✅ Buy school supplies ✅ Meet the teacher ★ Monday is the first day','<p>To-Do List: Buy school supplies. Meet the teacher. Monday is the first day.</p>');
    expect(words(r)).toMatchObject({'✅':2,'★':1});
  });
  it('"# 4 9" is the output\'s "#49"; a different printed number keeps both digits missing',()=>{
    expect(cov('M.S.A.D. # 4 9 Parent Notifications','<h1>M.S.A.D. #49 Parent Notifications</h1>').missingTokens).toBe(0);
    expect(words(cov('M.S.A.D. # 4 9 Parent Notifications','<h1>M.S.A.D. #50 Parent Notifications</h1>'))).toMatchObject({4:1,9:1});
  });
});

describe('a word broken at a line end whose rest the text layer put elsewhere',()=>{
  const src='Every class has a teacher with the appropriate back- Parents may ask. Our teachers bring ground and training. It covers 7 consecu-tiveabsences during a year.';
  it('pairs the hyphen fragment with its far-away rest when the output prints the whole word',()=>{
    const r=cov(src,'<p>Every class has a teacher with the appropriate background and training. Parents may ask. Our teachers bring. It covers 7 consecutive absences during a year.</p>');
    expect(r.missingTokens,JSON.stringify(r.missingWords)).toBe(0);
  });
  it('the fragments stay missing when the output does not print the whole word',()=>{
    const r=cov(src,'<p>Every class has a teacher with the appropriate training. Parents may ask. Our teachers bring. It covers 7 absences during a year.</p>');
    expect(words(r)).toMatchObject({back:1,ground:1,consecu:1,tiveabsences:1});
  });
  it('without the printed hyphen, two unmatched words are never joined',()=>{
    const r=cov('Every class has a teacher with the appropriate back Parents may ask. Our teachers bring ground and training.','<p>Every class has a teacher with the appropriate background and training. Parents may ask. Our teachers bring.</p>');
    expect(words(r)).toMatchObject({back:1,ground:1});
  });
});
