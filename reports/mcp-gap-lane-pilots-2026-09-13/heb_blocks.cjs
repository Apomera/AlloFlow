// Build the structured content blocks for the Hebrew UDHR from the two transcriptions.
const fs = require('node:fs');
const text = [fs.readFileSync(`${__dirname}/heb-ocr-p1-2.md`, 'utf8'), fs.readFileSync(`${__dirname}/heb-ocr-p3-4.md`, 'utf8')].join('\n\n');
const paras = text.split(/\n\s*\n/).map(s => s.trim()).filter(s => s && s !== '[[PAGE BREAK]]');
const title = paras[0].replace(/^#\s*/, '');
const blocks = [{ type: 'banner', title }, { type: 'h1', text: title, id: 'udhr-hebrew' }];
const heb = 'אבגדהוזחטיכלמנסעפצקרשת';
let article = 0, current = null;
const flush = () => { if (current && current.items.length) { blocks.push({ type: 'ol', items: current.items }); current.items = []; } };
for (const p of paras.slice(1)) {
  const m = /^סעיף ([א-ת]{1,2})\.\s*(.*)$/s.exec(p);
  if (m) {
    flush(); article++;
    current = { label: m[1], items: [] };
    blocks.push({ type: 'h2', text: `סעיף ${m[1]}`, id: `article-${article}` });
    const body = m[2].trim();
    const c = /^\((\d)\)\s*(.*)$/s.exec(body);
    if (c) current.items.push(c[2].trim()); else blocks.push({ type: 'p', text: body });
    continue;
  }
  const c = /^\((\d)\)\s*(.*)$/s.exec(p);
  if (c && current) { current.items.push(c[2].trim()); continue; }
  flush();
  blocks.push({ type: 'p', text: p });
}
flush();
// Sanity: every article present once, heading levels sequential, no empty text.
const h2 = blocks.filter(b => b.type === 'h2');
const problems = [];
if (h2.length !== 30) problems.push('articles ' + h2.length);
for (const b of blocks) if ((b.text !== undefined && !b.text) || (b.items && b.items.some(i => !i))) problems.push('empty block');
const joined = blocks.map(b => b.text || (b.items || []).join(' ') || b.title).join(' ');
const sourceWords = text.replace(/\[\[PAGE BREAK\]\]|^#\s*/gm, '').split(/\s+/).filter(Boolean).length;
const outWords = joined.split(/\s+/).filter(Boolean).length;
console.log('blocks', blocks.length, 'h2', h2.length, 'p', blocks.filter(b => b.type === 'p').length, 'ol', blocks.filter(b => b.type === 'ol').length, 'sourceWords', sourceWords, 'outWords', outWords, 'problems', problems);
if (problems.length) process.exit(1);
const out = JSON.stringify(blocks);
fs.writeFileSync(`${__dirname}/heb-blocks.json`, out);
fs.writeFileSync(`${__dirname}/heb-batch-7.json`, JSON.stringify({ run_id: fs.readFileSync(`${__dirname}/run-hebrew.txt`, 'utf8').trim(), wait_seconds: 28, responses: [{ request_id: 'mreq-f5281d86-4564-4414-84b3-d39b583d5b78-9', text: out }] }));
console.log('reply chars', out.length);
