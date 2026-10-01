import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url);
const {LABELS,voiceCatalog,selectVoice,normalizeLanguage,planDocument}=require('../desktop/mcp/remediation_narration_plan.cjs');
const catalog=voiceCatalog(resolve('.'));
const generated=readFileSync(resolve('document_narration_text_module.js'),'utf8');
const shared=new Function('DOMParser',generated+';return AlloNarrationText;')(DOMParser);
const accessibleText=shared.accessibleText;
const helpers={...shared,sanitize:html=>html};
it('selects matching Piper voices and retains Kokoro for English without translating',()=>{
 expect(catalog).toHaveLength(29);
 expect(selectVoice({language:'en-US'},catalog)).toMatchObject({provider:'kokoro',voice:'af_heart'});
 expect(selectVoice({language:'es-MX'},catalog)).toMatchObject({provider:'piper',voice:'es_MX-ald-medium'});
 expect(selectVoice({language:'fr-CA',mode:'natural'},catalog)).toMatchObject({provider:'piper',voice:'fr_FR-siwis-medium'});
 expect(selectVoice({language:'en',provider:'piper'},catalog)).toMatchObject({voice:'en_US-lessac-medium'});
 expect(normalizeLanguage('pt_BR')).toBe('pt-BR');
});
it('rejects unsupported language, mismatched voice and untranslated structure cues',()=>{
 expect(()=>selectVoice({language:'xx',mode:'natural'},catalog)).toThrow(/No local Piper voice/);
 expect(()=>selectVoice({language:'es',provider:'kokoro'},catalog)).toThrow(/supports English/);
 expect(()=>selectVoice({language:'es',voice:'af_heart'},catalog)).toThrow(/must match/);
 expect(()=>selectVoice({language:'ar',mode:'accessible'},catalog)).toThrow(/not localized/);
 expect(selectVoice({language:'ar',mode:'natural'},catalog).voice).toBe('ar_JO-kareem-medium');
 expect(()=>normalizeLanguage('../../etc')).toThrow(/BCP-47/);
});
it('localizes structural narration, preserves bare text and gives each block a stable target',()=>{
 const plan=planDocument({html:'<html lang="es"><body><main><h1 id="title">Lectura</h1><div>Texto directo.<p id="title">Contenido.</p></div><ul><li>Primero</li></ul><table><tr><td>Dato</td></tr></table></main></body></html>',mode:'accessible',labels:LABELS},helpers);
 expect(plan.lang).toBe('es');expect(plan.segments).toHaveLength(5);
 expect(new Set(plan.segments.map(s=>s.id)).size).toBe(5);
 expect(plan.segments[0].text).toBe('Encabezado de nivel 1. Lectura.');
 expect(plan.segments[1].text).toBe('Texto directo.');
 expect(plan.segments[3].text).toContain('Lista de un elemento');
 expect(plan.segments[4].text).toContain('Fila 1. Dato.');
 expect(plan.segments.map(s=>s.text).join(' ')).not.toMatch(/Heading level|List end|Table end/);
});
it('preserves English announcements and accepts a language override and routes mixed language blocks',()=>{
 expect(accessibleText('<h2>Lesson</h2><ul><li>One</li></ul>')).toBe('Heading level 2. Lesson.\n\nList, 1 item.\n\nBullet. One.\n\nList end.');
 const p=planDocument({html:'<p>Bonjour.</p>',mode:'natural',language:'fr'},helpers);expect(p.lang).toBe('fr');expect(p.warnings).toEqual([]);
 expect(planDocument({html:'<p>Hello.</p>',mode:'natural'},helpers).warnings).toHaveLength(1);
 const mixed=planDocument({html:'<html lang="en"><body><p>Hello.</p><section lang="es"><p>Hola.</p></section><p lang="fr">Bonjour.</p></body></html>',mode:'natural'},helpers);expect(mixed.segments.map(s=>s.language)).toEqual(['en','es','fr']);
 const inline=planDocument({html:'<html lang="en"><body><p>Hello <span lang="es">amigos</span>.</p></body></html>',mode:'natural'},helpers);expect(inline.segments.map(s=>[s.language,s.text])).toEqual([['en','Hello'],['es','amigos.']]);
 for(const value of [false,0,null,''])expect(()=>normalizeLanguage(value)).toThrow(/BCP-47/);
});

it('routes nested inline languages in accessible headings, lists and tables without losing text or cues',()=>{
 const html='<html lang="en"><body><h2>Welcome <em lang="es">amigos <span lang="fr">et amis</span></em> back.</h2><ul><li lang="es">Hola <strong lang="fr">bonjour</strong></li></ul><table><caption lang="fr">Exemple</caption><tr lang="es"><td>Uno</td><td lang="fr">Deux</td></tr></table></body></html>';
 const plan=planDocument({html,mode:'accessible',labels:LABELS},helpers),spoken=plan.segments.map(s=>s.text).join(' ');
 expect(plan.segments.slice(0,4).map(s=>[s.language,s.text])).toEqual([['en','Heading level 2. Welcome'],['es','amigos'],['fr','et amis'],['en','back..']]);
 expect(spoken).toContain('Viñeta. Hola');expect(spoken).toContain('Fila 1. Uno');expect(spoken).toContain('Exemple');expect(spoken).toContain('Deux');expect(spoken).toContain('List end.');expect(spoken).toContain('Table end.');
 expect(plan.segments.filter(s=>s.text==='bonjour.').map(s=>s.language)).toEqual(['fr']);
 const doc=new DOMParser().parseFromString(plan.html,'text/html');expect(doc.body.textContent).toBe(new DOMParser().parseFromString(html,'text/html').body.textContent);for(const segment of plan.segments)expect(doc.getElementById(segment.id)).not.toBeNull();
 expect(plan.segments.every(s=>/[\p{L}\p{N}]/u.test(s.text))).toBe(true);
});
it('preserves descriptions, caption languages and author notes without English image announcements',()=>{
 const plan=planDocument({html:'<html lang="es"><body><figure><img alt="unused"><figcaption>Gato <em lang="fr">noir</em><em>AI-generated, verify</em></figcaption></figure><p>Fin <button lang="fr">ignore this</button><span lang="en">thanks</span>.</p></body></html>',mode:'natural',labels:LABELS},helpers);
 expect(plan.segments.map(s=>[s.language,s.text])).toEqual([['es','unused. Gato'],['fr','noir'],['es','AI-generated, verify.'],['es','Fin'],['en','thanks.']]);
 expect(plan.segments.map(s=>s.text).join(' ')).not.toMatch(/Image:|ignore/);
 // Legacy app string exports retain their existing behavior.
 expect(shared.naturalText('<figure><img alt="Cat"></figure>')).toBe('Image: Cat.');
});

it('keeps disclosure announcements in the surrounding language and its summary in the tagged language',()=>{
 const plan=planDocument({html:'<html lang="en"><body><details><summary lang="es">Más información</summary><p lang="fr">Bonjour.</p></details></body></html>',mode:'accessible',labels:LABELS},helpers);
 expect(plan.segments.map(s=>[s.language,s.text])).toEqual([['en','Disclosure section,'],['es','Más información.'],['fr','Bonjour.']]);
});
