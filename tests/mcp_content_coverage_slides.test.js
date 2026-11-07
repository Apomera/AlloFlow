// Source-coverage false "missing words" in a slide deck (2026-11-03, RSU 57 budget review keyless re-run: 20
// "missing" words, all harmless, and the tagged PDF stayed held): a chart's axis scale, slide numbers the text layer
// reads mid-page, and a slide title printed again on its continuation slide. Each rule has a guard: the same layout
// with the words really absent from the output stays missing.
// ALLO_NARRATION_PLAN=<copy.cjs> runs these against another copy (mutation checks).
import {it,expect,describe} from 'vitest';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url);
const P=require(process.env.ALLO_NARRATION_PLAN||resolve('desktop/mcp/remediation_narration_plan.cjs'));
// The connector serializes the function and evals it in the page: run it the same way.
const assess=(0,eval)('('+P.assessSourceCoverage.toString()+')');
const run=(pageTexts,outputHtml)=>assess({sourceText:pageTexts.join('\n\n'),outputHtml,pages:pageTexts.map((text,i)=>({pageNum:i+1,text})),method:'pdfjs'});
const words=r=>Object.fromEntries(r.missingWords.map(w=>[w.word,w.count]));
// numbered slides: each ends with its own number (the rule above them already treats those as page furniture)
const deck=(bodies)=>bodies.map((b,i)=>b+' '+(i+1));

describe('an axis scale is the chart the output describes, when the output states both ends',()=>{
  const axis='Town Valuation Total % Increase 14.5 14 13.5 13 12.5 12 11.5 11 10.5 10 9.5 9 8.5 8 7.5 7 6.5 6 5.5 5 4.5 4 3.5 3 2.5 2 1.5 1 0.5 0 FY19 FY20 FY21';
  it('credits the 0.5-step ticks when the caption says "from 0 to 14.5 in steps of 0.5"',()=>{
    const r=run([axis],'<h2>Town Valuation Total % Increase</h2><figure><img alt="Line chart"><figcaption>Vertical axis from 0 to 14.5 in steps of 0.5. FY19 FY20 FY21</figcaption></figure>');
    expect(r.missingTokens,JSON.stringify(r.missingWords)).toBe(0);
  });
  it('keeps them missing when the output does not state the scale',()=>{
    const r=run([axis],'<h2>Town Valuation Total % Increase</h2><p>FY19 FY20 FY21</p>');
    expect(words(r)['13.5']).toBe(1);
  });
  it('numbers that are not evenly spaced (a table row) are never a scale',()=>{
    // the output states both end values, so only the even-step test can keep the middle ones
    const r=run(['Enrollment by school 412 377 95 1203 66 18 total'],'<p>Enrollment by school 412 and 18 total</p>');
    expect(words(r)['377']).toBe(1);
    expect(words(r)['66']).toBe(1);
  });
});

describe('a slide number read mid-page',()=>{
  const bodies=['Budget Overview the district plan','Enrollment trends over time','This chart reflects the total valuation percentage increase','Revenue sources by town','Closing notes for families'];
  it('is credited on a numbered deck when it lands inside the text',()=>{
    const pages=deck(bodies);
    pages[2]='This chart reflects the total valuation 3 percentage increase'; // its number read mid-sentence, not last
    const r=run(pages,'<main>'+bodies.map(b=>'<p>'+b+'</p>').join('')+'</main>');
    expect(r.missingTokens,JSON.stringify(r.missingWords)).toBe(0);
  });
  it('stays missing when the pages are not numbered',()=>{
    const pages=bodies.slice();
    pages[2]='This chart reflects the total valuation 3 percentage increase';
    const r=run(pages,'<main>'+bodies.map(b=>'<p>'+b+'</p>').join('')+'</main>');
    expect(words(r)['3']).toBe(1);
  });
});

describe('a slide title printed again on the next slide',()=>{
  it('"Budget Challenges" opening two consecutive slides is one title the output keeps once',()=>{
    const r=run(['Budget Challenges state funding is a smaller share every year','Budget Challenges the economy has increased costs for staffing'],
      '<h2>Budget Challenges</h2><ul><li>state funding is a smaller share every year</li><li>the economy has increased costs for staffing</li></ul>');
    expect(r.missingTokens,JSON.stringify(r.missingWords)).toBe(0);
  });
  it('a title on two slides that are NOT consecutive counts twice',()=>{
    const r=run(['Budget Challenges state funding is a smaller share','Revenue by town comes next','Budget Challenges the economy has increased costs'],
      '<h2>Budget Challenges</h2><p>state funding is a smaller share</p><p>Revenue by town comes next</p><p>the economy has increased costs</p>');
    expect(words(r).challenges).toBe(1);
  });
  it('lower-case shared openings (sentences, not titles) count twice',()=>{
    // three pages: a 2-page document has its own shared-run rule
    const r=run(['the district will hold a meeting in May','the district will hold a vote in June','Closing notes for families'],
      '<p>the district will hold a meeting in May</p><p>a vote in June</p><p>Closing notes for families</p>');
    expect(words(r).district).toBe(1);
  });
});
