import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url),P=require('../desktop/mcp/remediation_narration_plan.cjs');
const shared=new Function('DOMParser',readFileSync(resolve('document_narration_text_module.js'),'utf8')+';return AlloNarrationText;')(DOMParser),helpers={...shared,sanitize:html=>html};
const plan=(html,mode='accessible',override={})=>P.planDocument({html:'<html lang="en"><body>'+html+'</body></html>',mode,labels:P.LABELS},{...helpers,...override});
it('catches serializer omissions within each block even if another block repeats the missing words',()=>{
 const result=plan('<p id="a">Keep this.</p><p id="b">Keep this. Missing sentence.</p>','accessible',{accessibleText:()=>[{language:'en',text:'Keep this.'}]});
 expect(result.contentCoverage).toMatchObject({status:'blocked',expectedUnits:2,matchedUnits:1,missingUnits:1});expect(result.contentCoverage.issues[0]).toMatchObject({code:'text_omission',targetId:'b'});
});
it('covers inline image descriptions, captions, definitions and author verification notes in both styles',()=>{
 const html='<p>Before <img alt="Sales chart"> after.</p><figure><img alt="A black cat"><figcaption>A pet. <em>Verify this description.</em></figcaption></figure><dl><dt>Term</dt><dd>Definition</dd></dl><details><summary>More information</summary><p>Useful detail.</p></details>';
 for(const mode of ['accessible','natural']){const result=plan(html,mode);expect(result.contentCoverage.status).toBe('matched');expect(result.contentCoverage.missingUnits).toBe(0);const text=result.segments.map(s=>s.text).join(' ');for(const phrase of ['Sales chart','A black cat','A pet.','Verify this description.','Term','Definition','More information','Useful detail.'])expect(text).toContain(phrase);}
});
it('blocks undescribed visuals and math before synthesis, while honoring explicit decorative images',()=>{
 const result=plan('<p id="picture"><img src="x.png"></p><math id="fraction"><mfrac><mn>1</mn><mn>2</mn></mfrac></math><svg id="shape"><path d="M0 0"></path></svg><img alt="">');
 expect(result.contentCoverage).toMatchObject({status:'blocked',unresolvedVisuals:3,excluded:{decorative_images:1}});expect(result.contentCoverage.issues.map(i=>i.code)).toEqual(['image_description_missing','spoken_description_required','spoken_description_required']);
 const described=plan('<math aria-label="one half"><mfrac><mn>1</mn><mn>2</mn></mfrac></math><svg><title>A rising trend</title></svg>');expect(described.contentCoverage.status).toBe('matched');expect(described.segments.map(s=>s.text).join(' ')).toContain('one half');
});
it('reports deliberate exclusions and preserves words split across formatting tags and synthesis chunks',()=>{
 const long='A complete sentence about accessible documents. '.repeat(35),result=plan('<p>Hel<strong>lo</strong> friends.</p><p>'+long+'</p><p hidden>Hidden</p><button>Controls</button><p aria-hidden="true">Other hidden</p>','natural');
 expect(result.contentCoverage).toMatchObject({status:'matched',excluded:{hidden_content:2,interface_controls:1}});expect(result.segments.length).toBeGreaterThan(3);expect(result.segments.map(s=>s.text).join(' ')).not.toContain('Hidden');
});
it('source retention checks catch equal-length substitutions and repeated-word omissions without exposing source text',()=>{
 const result=P.assessSourceCoverage({sourceText:'Alpha beta beta.\n\nThe total is 120 dollars.',outputHtml:'<p>Alpha beta gamma. The total is 130 dollars.</p>',method:'text'});
 expect(result).toMatchObject({status:'review_required',reviewRequired:true,missingTokens:2});expect(result.missingPassages[0].missingTokens).toBe(2);expect(JSON.stringify(result)).not.toMatch(/Alpha|dollars|gamma/);
 expect(P.assessSourceCoverage({sourceText:'Accessi-\nbility and 120 dollars.',outputHtml:'<p>Accessibility and <strong>120</strong> dollars.</p>'})).toMatchObject({status:'matched',missingTokens:0});
});
it('matches an Arabic word whose tanween the text layer stored as a separate glyph after a space (2026-10-19)',()=>{
 // PPS Arabic family letter: "مذهلا ً" and "علنيا ً" in the PDF, "مذهلاً" and "علنياً" in the HTML. The miss withheld its tagged PDF.
 const base='نحن نشكركم على الدعم ';
 expect(P.assessSourceCoverage({sourceText:base+'كان مذهلا ً جدا وأعلن علنيا ً',outputHtml:'<p>'+base+'كان مذهلاً جدا وأعلن علنياً</p>'})).toMatchObject({status:'matched',missingTokens:0});
 // a real change is still caught: a missing word, and a different word that happens to share letters
 expect(P.assessSourceCoverage({sourceText:base+'كان مذهلا ً جدا',outputHtml:'<p>'+base+'كان جدا</p>'})).toMatchObject({status:'review_required',missingTokens:1});
 expect(P.assessSourceCoverage({sourceText:base+'كان مذهلا ً جدا',outputHtml:'<p>'+base+'كان مذهل جدا</p>'})).toMatchObject({status:'review_required',missingTokens:1});
});
it('distinguishes missing source evidence, extraction problems and page-range scope from matching text',()=>{
 expect(P.assessSourceCoverage({sourceText:'Visible information',outputHtml:'<p style="display:none">Visible information</p>'})).toMatchObject({status:'review_required',missingTokens:2});
 expect(P.assessSourceCoverage({outputHtml:'<p>Unverified content.</p>'})).toMatchObject({status:'unavailable',reviewRequired:true,tokenRecall:null});
 const result=P.assessSourceCoverage({sourceText:'Retained words.',outputHtml:'<p>Retained words.</p>',pages:[{pageNum:2,text:'Retained words.'},{pageNum:3,text:''}],pageErrors:[{pageNum:3}],lowConfidencePages:[2],pageRange:[2,3]});
 expect(result).toMatchObject({status:'review_required',missingTokens:0,extraction:{pagesExamined:2,emptyPageCandidates:1,pageErrorCount:1,errorPages:[3],lowConfidencePages:[2]},scope:{pageRange:[2,3],wholeDocument:false}});
});

it('matches Chinese source text when HTML divides it at word boundaries',()=>{
 const result=P.assessSourceCoverage({sourceText:'你好世界',outputHtml:'<h1>你好</h1><p>世界</p>'});
 expect(result).toMatchObject({status:'matched',reviewRequired:false,missingTokens:0});
});

it('retains numeric punctuation so decimal, sign, percentage and fraction changes require review',()=>{
 expect(P.assessSourceCoverage({sourceText:'120.00',outputHtml:'<p>12000</p>'})).toMatchObject({status:'review_required',missingTokens:1});
 const result=P.assessSourceCoverage({sourceText:'The value is -1.5, with 15% and 1/2.',outputHtml:'<p>The value is 15, with 15 and 1 2.</p>'});expect(result.reviewRequired).toBe(true);expect(result.missingTokens).toBeGreaterThanOrEqual(4);
});
it('an OCR transcript\'s markdown table syntax is layout, not missing text; real cell words still count (1954 scan, 2026-10-20)',()=>{
 const md='Schedule B\n\n| Name of payor | Amount |\n| --- | --- |\n| Acme Mills | 120 |\n| Smith Bank | 45 |';
 const html='<h2>Schedule B</h2><table><tr><th>Name of payor</th><th>Amount</th></tr><tr><td>Acme Mills</td><td>120</td></tr><tr><td>Smith Bank</td><td>45</td></tr></table>';
 expect(P.assessSourceCoverage({sourceText:md,outputHtml:html,method:'vision-ocr'})).toMatchObject({status:'matched',missingTokens:0});
 expect(P.assessSourceCoverage({sourceText:md,outputHtml:html.replace('Smith Bank','Smith'),method:'vision-ocr'})).toMatchObject({status:'review_required',missingTokens:1});
 // born-digital text keeps every symbol it printed
 expect(P.assessSourceCoverage({sourceText:'Home | About',outputHtml:'<p>Home About</p>',method:'pdfjs'})).toMatchObject({missingTokens:1});
 // a fill-in blank glued to a number ("195__" for the printed ", 195") is the same number
 expect(P.assessSourceCoverage({sourceText:'ending 195',outputHtml:'<p>ending 195__</p>',method:'vision-ocr'})).toMatchObject({missingTokens:0});
});
// (2026-10-27, expenditures: 109 "missing" words on a delivered document that held every word)
const cov=(pages,html)=>P.assessSourceCoverage({sourceText:pages.map(p=>p.text).join('\n'),outputHtml:html,pages,method:'pdfjs'});
it('a header block of over 80 words repeated at the top of every page is one passage',()=>{
 const head=Array.from({length:100},(_,i)=>'head'+i).join(' ');
 const pages=[1,2,3].map(n=>({pageNum:n,text:head+' body'+n+'a body'+n+'b'}));
 expect(cov(pages,'<p>'+head+'</p>'+[1,2,3].map(n=>'<p>body'+n+'a body'+n+'b</p>').join(''))).toMatchObject({missingTokens:0});
 // the same words on only one page are not furniture: dropping them from the output is still caught
 expect(cov([{pageNum:1,text:head},{pageNum:2,text:'other words'},{pageNum:3,text:'more words'}],'<p>other words more words</p>').missingTokens).toBe(100);
});
it('two words the text layer glued together match the two output words; a glued word with one unknown half does not',()=>{
 expect(P.assessSourceCoverage({sourceText:'Grant departmentscience total',outputHtml:'<p>Grant department science total</p>',method:'pdfjs'})).toMatchObject({missingTokens:0});
 // one unknown half: the whole glued word is reported, not a half of it
 const half=P.assessSourceCoverage({sourceText:'Grant departmentzzzqqq total',outputHtml:'<p>Grant department science total</p>',method:'pdfjs'});
 expect(half).toMatchObject({missingTokens:1});expect(half.missingWords.map(w=>w.word)).toEqual(['departmentzzzqqq']);
 // a word the output has whole is never split (split, its two copies would need two of each half)
 expect(P.assessSourceCoverage({sourceText:'Grant department department',outputHtml:'<p>Grant department department depart ment</p>',method:'pdfjs'})).toMatchObject({missingTokens:0});
});
// (2026-10-27, agenda2: 38 "missing" words, all list markers or words glued across HTML line breaks)
it('a lettered list credits its printed letters, only to items whose own text follows them',()=>{
 const src='Committees: a. Elect the Finance Committee. b. Elect the Policy Committee.';
 const items='<li>Elect the Finance Committee.</li><li>Elect the Policy Committee.</li>';
 const run=html=>P.assessSourceCoverage({sourceText:src,outputHtml:'<p>Committees:</p>'+html,method:'pdfjs'});
 expect(run('<ol style="list-style-type:lower-alpha">'+items+'</ol>')).toMatchObject({missingTokens:0});
 expect(run('<ol type="A">'+items+'</ol>')).toMatchObject({missingTokens:0});
 expect(run('<ol style="list-style:upper-latin inside">'+items+'</ol>')).toMatchObject({missingTokens:0});
 // a list that draws numbers or bullets does not print these letters
 expect(run('<ol>'+items+'</ol>').missingWords.map(w=>w.word)).toEqual(['a','b']);
 expect(run('<ul>'+items+'</ul>').missingWords.map(w=>w.word)).toEqual(['a','b']);
 expect(run('<ol type="i">'+items+'</ol>').missingWords.map(w=>w.word)).toEqual(['a','b']);
 expect(run('<ol style="list-style-type:lower-roman">'+items+'</ol>').missingWords.map(w=>w.word)).toEqual(['a','b']);
 // the letters must sit right before the item's own text
 expect(run('<ol style="list-style-type:lower-alpha"><li>Elect the Policy Committee.</li><li>Elect the Finance Committee.</li></ol>').missingTokens).toBeGreaterThan(0);
});
it('a <br> inside a list item is a word break when matching its printed number',()=>{
 const src='1. Approve the minutes of June 4. Motion: Second: Vote: Yea- Nay-';
 expect(P.assessSourceCoverage({sourceText:src,outputHtml:'<ol><li>Approve the minutes of June 4.<br><em>Motion:</em><br><em>Second:</em><br><em>Vote: Yea- Nay-</em></li></ol>',method:'pdfjs'})).toMatchObject({missingTokens:0});
});
it('a line glued to the next line\'s one-letter label splits there (child-find "InformationP: 877", "6661W: http")',()=>{
 const html='<h2>Contact Information</h2><ul><li>P: 877-770-8883</li><li>F: (207) 624-6661</li><li>W: www.maine.gov</li></ul>';
 expect(P.assessSourceCoverage({sourceText:'Contact InformationP: 877-770-8883 F: (207) 624-6661W: www.maine.gov',outputHtml:html,method:'pdfjs'})).toMatchObject({missingTokens:0});
 // only when the part before the label is an output word, and only before a colon
 expect(P.assessSourceCoverage({sourceText:'Contact InfrmationP: 877-770-8883',outputHtml:html,method:'pdfjs'}).missingWords.map(w=>w.word)).toEqual(['infrmationp']);
 expect(P.assessSourceCoverage({sourceText:'Contact InformationP 877-770-8883',outputHtml:html,method:'pdfjs'}).missingTokens).toBeGreaterThan(0);
});
it('a hyphen before a line break in the HTML source does not glue two output words',()=>{
 const src='Vote: Yea- Nay- Election of Board Officers';
 expect(P.assessSourceCoverage({sourceText:src,outputHtml:'<p><em>Vote: Yea- Nay-</em></p>\n<h2>Election of Board Officers</h2>',method:'pdfjs'})).toMatchObject({missingTokens:0});
 // a hyphen-wrapped word in the SOURCE still rejoins
 expect(P.assessSourceCoverage({sourceText:'the commit-\ntee met',outputHtml:'<p>the committee met</p>',method:'pdfjs'})).toMatchObject({missingTokens:0});
});
it('a bare page number ending each one-line page is furniture; a number that is not the page number still counts',()=>{
 const row=n=>'Row '+['alpha','beta','gamma'][n-1]+' cost '+(n*11);
 const pages=[1,2,3].map(n=>({pageNum:n,text:row(n)+' '+n}));
 const html=[1,2,3].map(n=>'<p>'+row(n)+'</p>').join('');
 expect(cov(pages,html)).toMatchObject({missingTokens:0});
 // numbers that change page to page but are not the page's own (5, 6, 8 on pages 1-3) are content
 const wrong=[[1,5],[2,6],[3,8]].map(([n,v])=>({pageNum:n,text:row(n)+' '+v}));
 expect(cov(wrong,html).missingTokens).toBe(3);
});
it('a footnote number after a sentence-final year reads as the marker it is, not as a decimal (NCES "2019.20 Private")',()=>{
 const src='enrolled in a higher grade in 2019.20 Private school data are collected. Students ages 3\u201321.22 Totals include imputations.';
 const kept='<p>enrolled in a higher grade in 2019.<sup>20</sup> Private school data are collected. Students ages 3\u201321.<sup>22</sup> Totals include imputations.</p>';
 expect(P.assessSourceCoverage({sourceText:src,outputHtml:kept,method:'pdfjs'})).toMatchObject({missingTokens:0});
 // a dropped marker is reported as the marker, never as a number the page does not print
 const dropped='<p>enrolled in a higher grade in 2019. Private school data are collected. Students ages 3\u201321. Totals include imputations.</p>';
 expect(P.assessSourceCoverage({sourceText:src,outputHtml:dropped,method:'pdfjs'}).missingWords.map(w=>w.word).sort()).toEqual(['20','22']);
 // a real decimal the output prints stays one token, and a lowercase continuation is not a footnote
 expect(P.assessSourceCoverage({sourceText:'Total 1234.56 Dollars',outputHtml:'<p>Total 1234.56 Dollars</p>',method:'pdfjs'})).toMatchObject({missingTokens:0});
 expect(P.assessSourceCoverage({sourceText:'rate of 2019.20 percent',outputHtml:'<p>rate of 2019. 20 percent</p>',method:'pdfjs'}).missingWords.map(w=>w.word)).toEqual(['2019.20']);
});
it('a chart tick-label run glues a year to the next label ("2010fall"): split when both parts are output words',()=>{
 const html='<table><tr><th>Fall 2010</th><th>Fall 2015</th></tr></table>';
 expect(P.assessSourceCoverage({sourceText:'Fall 2010fall 2015',outputHtml:html,method:'pdfjs'})).toMatchObject({missingTokens:0});
 expect(P.assessSourceCoverage({sourceText:'Fall 2010falx 2015',outputHtml:html,method:'pdfjs'}).missingWords.map(w=>w.word)).toEqual(['2010falx']);
});
it('a capital split from the rest of its word at a line end rejoins (NSF "T hey also tend")',()=>{
 expect(P.assessSourceCoverage({sourceText:'more often (Figure 3).4 T\nhey also tend to take courses',outputHtml:'<p>more often (Figure 3).<sup>4</sup> They also tend to take courses</p>',method:'pdfjs'})).toMatchObject({missingTokens:0});
 // not when the remainder is a word of its own in the output ("A rose" stays two words)
 expect(P.assessSourceCoverage({sourceText:'A rose grew and arose',outputHtml:'<p>A rose grew and arose</p>',method:'pdfjs'})).toMatchObject({missingTokens:0});
 expect(P.assessSourceCoverage({sourceText:'T hey',outputHtml:'<p>Hey there</p>',method:'pdfjs'}).missingWords.map(w=>w.word)).toEqual(['t']);
});
it('a URL scheme split by a vertical banner ("http" / "s" / "://doi.org") rejoins into the one word the page prints',()=>{
 const html='<p>This publication is available free of charge from: <a href="https://doi.org/10.6028/NIST.SP.800-63-3">https://doi.org/10.6028/NIST.SP.800-63-3</a></p>';
 expect(P.assessSourceCoverage({sourceText:'This publication is available free of charge from: http\ns\n://doi.org/10.6028/NIST.SP.800-63-3',outputHtml:html,method:'pdfjs'})).toMatchObject({missingTokens:0});
 expect(P.assessSourceCoverage({sourceText:'free of charge from: http\ns\n://doi.org/10.6028/NIST.SP.800-63-3',outputHtml:'<p>free of charge from: doi.org/10.6028/NIST.SP.800-63-3</p>',method:'pdfjs'}).missingWords.map(w=>w.word)).toContain('https');
});
it('sub/superscripts and marks read as separate runs rejoin into the output word (USGS "H 2 SO 4", "TM", "person 1")',()=>{
 const html='<p>Add H<sub>2</sub>SO<sub>4</sub> to the WebElements\u2122 Periodic Table list.</p><table><tr><th>30 kg person\u00b9</th></tr></table>';
 expect(P.assessSourceCoverage({sourceText:'Add H 2 SO 4 to the WebElements TM Periodic Table list.\n30 kg person 1',outputHtml:html,method:'pdfjs'})).toMatchObject({missingTokens:0});
 // a long second piece is a word, not a mark: "Data Base" does not become "database"
 expect(P.assessSourceCoverage({sourceText:'the Data Base',outputHtml:'<p>the database and the base</p>',method:'pdfjs'}).missingTokens).toBeGreaterThan(0);
 // nothing joins when the output does not print the joined word
 expect(P.assessSourceCoverage({sourceText:'H 2 SO 4',outputHtml:'<p>sulfuric acid</p>',method:'pdfjs'}).missingTokens).toBeGreaterThan(0);
});
it('a math font text layer that repeats each glyph is not text (HB44 "VV mmmmmm", "mmmmssmmmmmmssss")',()=>{
 const src='The minimum verification scale division VV mmmmmm ssssssssss mmmmssmmmmmmssss shall not exceed';
 expect(P.assessSourceCoverage({sourceText:src,outputHtml:'<p>The minimum verification scale division V<sub>min</sub> shall not exceed</p>',method:'pdfjs'}).missingWords.map(w=>w.word)).toEqual(['vv']);
 // a real word, or one the output prints, is kept
 expect(P.assessSourceCoverage({sourceText:'Mississippi sells cookies',outputHtml:'<p>sells cookies</p>',method:'pdfjs'}).missingWords.map(w=>w.word)).toEqual(['mississippi']);
 expect(P.assessSourceCoverage({sourceText:'buzz zzzz',outputHtml:'<p>buzz zzzz</p>',method:'pdfjs'})).toMatchObject({missingTokens:0,sourceTokens:2}); // printed in the output: still counted
});
