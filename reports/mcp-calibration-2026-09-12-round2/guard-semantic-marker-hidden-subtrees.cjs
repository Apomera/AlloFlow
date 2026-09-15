const fs=require('fs'),crypto=require('crypto');const file='desktop/mcp/remediation_narration_plan.cjs';let s=fs.readFileSync(file,'utf8');const start=s.indexOf('  for(const css of styles)for(const rule of css.matchAll'),end=s.indexOf("  doc.querySelectorAll('script,style,button",start);if(start<0||end<0)throw Error('Style guard anchors missing');const eol=s.includes('\r\n')?'\r\n':'\n';const replacement=String.raw`  for(const css of styles)for(const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
    const declarations=[...rule[2].matchAll(/(?:^|;)\s*(display|visibility)\s*:\s*([^;]+)/gi)].map(match=>({property:match[1].toLowerCase(),value:match[2].replace(/!important/gi,'').trim().toLowerCase()}));
    const suppressesItem=declarations.some(value=>value.property==='display'&&value.value!=='list-item');
    const hidesSubtree=declarations.some(value=>value.property==='display'&&value.value==='none'||value.property==='visibility'&&['hidden','collapse'].includes(value.value));
    if(!suppressesItem&&!hidesSubtree)continue;
    try{for(const node of doc.querySelectorAll(rule[1].trim())){
      if(node.tagName==='LI'&&node.parentElement.tagName==='OL')blockedLists.add(node.parentElement);
      if(hidesSubtree){if(node.tagName==='OL')blockedLists.add(node);for(const ol of node.querySelectorAll('ol'))blockedLists.add(ol);}
    }}catch(_){customListNumbering=true;}
  }
`;s=s.slice(0,start)+replacement.replace(/\n/g,eol)+s.slice(end);fs.writeFileSync(file+'.tmp',s);fs.renameSync(file+'.tmp',file);
const test='tests/semantic_list_marker_coverage.test.js';let t=fs.readFileSync(test,'utf8');t=t.replace("  it('leaves numeric prose unchanged for unordered lists',()=>{",String.raw`  it.each([
    '<style>ol{display:none}</style><ol><li>Alpha.</li></ol>',
    '<style>main{display:none}</style><main><ol><li>Alpha.</li></ol></main>',
    '<style>main{visibility:hidden}</style><main><ol><li>Alpha.</li></ol></main>',
    '<style>ol{visibility:collapse}</style><ol><li>Alpha.</li></ol>'
  ])('withholds synthetic marker credit from stylesheet-hidden list subtrees: %s',html=>{
    expect(check('1. Alpha.',html)).toMatchObject({status:'review_required',missingTokens:1});
  });
  it('permits ordinary ancestor display:block without changing list numbering',()=>{
    expect(check('1. Alpha.','<style>main{display:block}</style><main><ol><li>Alpha.</li></ol></main>')).toMatchObject({status:'matched',missingTokens:0});
  });
  it('leaves numeric prose unchanged for unordered lists',()=>{`);fs.writeFileSync(test,t);console.log({moduleSha256:crypto.createHash('sha256').update(s).digest('hex')});
