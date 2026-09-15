const fs=require('fs'),crypto=require('crypto');const file='desktop/mcp/remediation_narration_plan.cjs',before=fs.readFileSync(file,'utf8'),eol=before.includes('\r\n')?'\r\n':'\n';const start=before.indexOf('  // Detached DOM textContent omits native OL markers.'),end=before.indexOf("  doc.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,td,th,caption,figcaption,div,section,br')",start);if(start<0||end<0)throw Error('Marker block missing');
const block=String.raw`  // Synthetic labels may match only positively identified source list markers,
  // never ordinary numeric prose. Keep these credits outside the text token pool.
  const sourceMarkerCredits=new Set(),originalItems=new Map(),blockedLists=new Set();
  for(const ol of doc.querySelectorAll('ol'))originalItems.set(ol,[...ol.children].filter(node=>node.tagName==='LI'));
  const styles=[...doc.querySelectorAll('style')].map(node=>node.textContent||'');
  let customListNumbering=!!doc.querySelector('link[rel~="stylesheet"]')||styles.some(css=>/\b(?:list-style(?:-type|-image)?|counter-reset|counter-set|counter-increment)\s*:|::?marker\b|@import\b/i.test(css));
  // Resolve ordinary selectors only. Conditional or unparseable numbering stays
  // conservative; no stylesheet, script, or rendering context is loaded here.
  for(const css of styles)for(const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
    if(!/(?:^|;)\s*display\s*:\s*(?!list-item\s*(?:!important\s*)?(?:;|$))/i.test(rule[2]))continue;
    try{for(const node of doc.querySelectorAll(rule[1].trim()))if(node.tagName==='LI'&&node.parentElement.tagName==='OL')blockedLists.add(node.parentElement);}
    catch(_){customListNumbering=true;}
  }
  doc.querySelectorAll('script,style,button,input,select,textarea,template,[hidden],[aria-hidden="true"],annotation,annotation-xml,[data-allo-latex-src]').forEach(node=>node.remove());
  doc.querySelectorAll('[style]').forEach(node=>{if(node.style.display==='none'||node.style.visibility==='hidden')node.remove();});
  doc.querySelectorAll('img').forEach(node=>node.replaceWith(doc.createTextNode(' '+(node.getAttribute('alt')||'')+' ')));
  if(!customListNumbering){
    const normalize=text=>String(text||'').normalize('NFKC').replace(/(\p{L})-\s*\n\s*(?=\p{L})/gu,'$1').toLowerCase().replace(/\s+/g,' ').trim();
    const sourceNormalized=normalize(sourceText),candidates=[];
    let previousOffset=0,tokenOffset=0;
    for(const match of sourceNormalized.matchAll(/(-?\d+)[.)]\s+/g)){
      if(match.index&& !/\s/.test(sourceNormalized[match.index-1]))continue;
      tokenOffset+=tokens(sourceNormalized.slice(previousOffset,match.index)).length;previousOffset=match.index;
      candidates.push({label:match[1],at:tokenOffset,count:tokens(match[1]).length,bodyAt:match.index+match[0].length,used:false});
    }
    const validInteger=value=>/^[+-]?\d+$/.test(String(value).trim())&&Number(value)>=-2147483648&&Number(value)<=2147483647;
    const decimalStyles=node=>{
      for(let current=node;current;current=current.parentElement){
        const css=current.getAttribute('style')||'',type=current.style.listStyleType;
        if(type&&type!=='decimal')return false;
        if(/\b(?:counter-reset|counter-set|counter-increment|list-style-image)\s*:/i.test(css))return false;
        const shorthand=css.match(/(?:^|;)\s*list-style\s*:\s*([^;]+)/i);
        if(shorthand&&shorthand[1].replace(/!important/gi,'').trim().split(/\s+/).some(value=>!['decimal','inside','outside'].includes(value.toLowerCase())))return false;
      }
      return !node.style.display||node.style.display==='list-item';
    };
    for(const ol of doc.querySelectorAll('ol')){
      if(blockedLists.has(ol)||(ol.hasAttribute('type')&&ol.getAttribute('type')!=='1'))continue;
      const items=[...ol.children].filter(node=>node.tagName==='LI');
      // Excluded direct items can change reversed/default/value-based counters.
      if(items.length!==(originalItems.get(ol)||[]).length)continue;
      if(ol.hasAttribute('start')&&!validInteger(ol.getAttribute('start')))continue;
      if(items.some(node=>node.hasAttribute('value')&&!validInteger(node.getAttribute('value'))))continue;
      const step=ol.hasAttribute('reversed')?-1:1;
      let ordinal=ol.hasAttribute('start')?ol.start:step<0?items.length:1;
      for(const item of items){
        if(item.hasAttribute('value'))ordinal=item.value;
        const literal=new RegExp('^\\s*'+ordinal+'[.)]\\s+').test(item.textContent||'');
        if((!item.hasAttribute('type')||item.getAttribute('type')==='1')&&decimalStyles(item)&&!literal){
          // Anchor to this item's actual prose before its first nested list. This
          // also identifies flattened PDF markers without guessing from digits alone.
          let ownText='';for(const child of item.childNodes){if(child.nodeType===1&&(child.tagName==='OL'||child.tagName==='UL'))break;ownText+=child.textContent||'';}
          ownText=normalize(ownText);
          const candidate=ownText&&candidates.find(value=>!value.used&&value.label===String(ordinal)&&sourceNormalized.slice(value.bodyAt).startsWith(ownText)&&(!sourceNormalized[value.bodyAt+ownText.length]||/\s/.test(sourceNormalized[value.bodyAt+ownText.length])));
          if(candidate){candidate.used=true;for(let offset=0;offset<candidate.count;offset++)sourceMarkerCredits.add(candidate.at+offset);}
        }
        ordinal+=step;
      }
    }
  }
`;
let after=before.slice(0,start)+block.replace(/\n/g,eol)+before.slice(end);
after=after.replace("for(const token of source.slice(at,at+40)){const count=available.get(token)||0;if(count)available.set(token,count-1);else missing++;}","for(let offset=0;offset<Math.min(40,source.length-at);offset++){if(sourceMarkerCredits.has(at+offset))continue;const token=source[at+offset],count=available.get(token)||0;if(count)available.set(token,count-1);else missing++;}");
after=after.replace('outputTokens:output.length,matchedTokens:','outputTokens:output.length+sourceMarkerCredits.size,matchedTokens:');
if(after===before||!after.includes('if(sourceMarkerCredits.has(at+offset))continue'))throw Error('Coverage loop patch missing');
const temp=file+'.semantic-marker.tmp';fs.writeFileSync(temp,after);fs.renameSync(temp,file);console.log({sha256:crypto.createHash('sha256').update(after).digest('hex')});
