const fs=require('fs'),crypto=require('crypto'),path=require('path');const file='desktop/mcp/remediation_narration_plan.cjs',before=fs.readFileSync(file,'utf8'),eol=before.includes('\r\n')?'\r\n':'\n';
const reportDir='reports/mcp-calibration-2026-09-12-round2';const beforeHash=crypto.createHash('sha256').update(before).digest('hex');
fs.writeFileSync(path.join(reportDir,'semantic-marker-coverage-function-before.txt'),require(path.resolve(file)).assessSourceCoverage.toString()+'\n',{flag:'wx'});
const anchor="  const doc=new DOMParser().parseFromString(outputHtml||'','text/html');";
const guard=`
  // Detached DOM textContent omits native OL markers. Credit only supported
  // decimal HTML numbering; custom CSS/counters remain conservative.
  const customListNumbering=!!doc.querySelector('link[rel~="stylesheet"]')||[...doc.querySelectorAll('style')].some(node=>/\\b(?:list-style(?:-type|-image)?|counter-reset|counter-set|counter-increment)\\s*:|::?marker\\b/i.test(node.textContent||''));`;
const anchor2="  doc.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,td,th,caption,figcaption,div,section,br').forEach(node=>node.appendChild(doc.createTextNode(' ')));";
const markers=`  if(!customListNumbering){
    const validInteger=value=>/^[+-]?\\d+$/.test(String(value).trim())&&Number(value)>=-2147483648&&Number(value)<=2147483647;
    const decimalStyles=node=>{
      for(let current=node;current;current=current.parentElement){
        const css=current.getAttribute('style')||'',type=current.style.listStyleType;
        if(type&&type!=='decimal')return false;
        if(/\\b(?:counter-reset|counter-set|counter-increment|list-style-image)\\s*:/i.test(css))return false;
        const shorthand=css.match(/(?:^|;)\\s*list-style\\s*:\\s*([^;]+)/i);
        if(shorthand&&shorthand[1].replace(/!important/gi,'').trim().split(/\\s+/).some(value=>!['decimal','inside','outside'].includes(value.toLowerCase())))return false;
      }
      return !node.style.display||node.style.display==='list-item';
    };
    for(const ol of doc.querySelectorAll('ol')){
      if(ol.hasAttribute('type')&&ol.getAttribute('type')!=='1')continue;
      const items=[...ol.children].filter(node=>node.tagName==='LI');
      if(ol.hasAttribute('start')&&!validInteger(ol.getAttribute('start')))continue;
      if(items.some(node=>node.hasAttribute('value')&&!validInteger(node.getAttribute('value'))))continue;
      const step=ol.hasAttribute('reversed')?-1:1;
      let ordinal=ol.hasAttribute('start')?ol.start:step<0?items.length:1;
      for(const item of items){
        if(item.hasAttribute('value'))ordinal=item.value;
        // A literal item number is already represented by textContent. Never
        // double-credit it and accidentally hide another missing numeric fact.
        const literal=new RegExp('^\\\\s*'+ordinal+'[.)]\\\\s+').test(item.textContent||'');
        if((!item.hasAttribute('type')||item.getAttribute('type')==='1')&&decimalStyles(item)&&!literal)item.insertBefore(doc.createTextNode(ordinal+'. '),item.firstChild);
        ordinal+=step;
      }
    }
  }
`;
if(before.split(anchor).length!==2||before.split(anchor2).length!==2)throw Error('Expected unique coverage anchors');let after=before.replace(anchor,anchor+guard.replace(/\n/g,eol)).replace(anchor2,markers.replace(/\n/g,eol)+anchor2);
if(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==beforeHash)throw Error('Source changed before write');const tmp=file+'.semantic-marker.tmp';fs.writeFileSync(tmp,after);fs.renameSync(tmp,file);
const afterHash=crypto.createHash('sha256').update(after).digest('hex');fs.writeFileSync(path.join(reportDir,'semantic-marker-patch.json'),JSON.stringify({file,beforeSha256:beforeHash,afterSha256:afterHash,scope:'Semantic decimal OL marker representation only; no thresholds or original live artifacts changed.'},null,2)+'\n');console.log({file,beforeHash,afterHash});
