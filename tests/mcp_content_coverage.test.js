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
