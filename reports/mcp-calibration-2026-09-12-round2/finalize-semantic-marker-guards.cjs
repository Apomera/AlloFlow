const fs=require('fs'),crypto=require('crypto');const file='desktop/mcp/remediation_narration_plan.cjs';let s=fs.readFileSync(file,'utf8');const before=s;
s=s.replace("let ownText='';for(const child of item.childNodes){if(child.nodeType===1&&(child.tagName==='OL'||child.tagName==='UL'))break;ownText+=child.textContent||'';}","let ownText='',child;const walker=doc.createTreeWalker(item,5);while((child=walker.nextNode())){if(child.nodeType===1&&(child.tagName==='OL'||child.tagName==='UL'))break;if(child.nodeType===3)ownText+=child.textContent||'';}");
s=s.replace('        ordinal+=step;','        ordinal=Math.min(2147483647,Math.max(-2147483648,ordinal+step));');
const anchor="  doc.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,td,th,caption,figcaption,div,section,br')";
s=s.replace(anchor,"  doc.querySelectorAll('ol,ul').forEach(node=>node.insertBefore(doc.createTextNode(' '),node.firstChild));"+(s.includes('\r\n')?'\r\n':'\n')+anchor);
if(s===before||!s.includes('createTreeWalker(item,5)'))throw Error('Final guards not applied');fs.writeFileSync(file+'.tmp',s);fs.renameSync(file+'.tmp',file);
const test='tests/semantic_list_marker_coverage.test.js';let t=fs.readFileSync(test,'utf8');t=t.replace("  it('leaves numeric prose unchanged for unordered lists',()=>{",String.raw`  it('saturates native marker counters at signed integer limits',()=>{
    expect(check('2147483647. Alpha. 2147483647. Beta.','<ol start="2147483647"><li>Alpha.</li><li>Beta.</li></ol>')).toMatchObject({status:'matched',missingTokens:0});
    expect(check('-2147483648. Alpha. -2147483648. Beta.','<ol reversed start="-2147483648"><li>Alpha.</li><li>Beta.</li></ol>')).toMatchObject({status:'matched',missingTokens:0});
  });
  it('does not reuse one source occurrence across duplicate list prose or match ordinal suffixes',()=>{
    expect(check('1. Alpha. There is 1 unit.','<ol><li>Alpha.</li></ol><ol><li>Alpha.</li></ol><p>There is unit.</p>')).toMatchObject({status:'review_required',missingTokens:1});
    expect(check('12. Alpha.','<ol start="2"><li>Alpha.</li></ol>')).toMatchObject({status:'review_required',missingTokens:1});
  });
  it('excludes descendant nested lists from the parent prose anchor',()=>{
    expect(check('1. Outer. 1. Inner.','<ol><li><div>Outer.<ol><li>Inner.</li></ol></div></li></ol>')).toMatchObject({status:'matched',missingTokens:0});
  });
  it('leaves numeric prose unchanged for unordered lists',()=>{`);fs.writeFileSync(test,t);console.log({moduleSha256:crypto.createHash('sha256').update(s).digest('hex')});
