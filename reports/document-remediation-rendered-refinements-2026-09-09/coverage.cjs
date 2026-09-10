const fs=require('fs');const p='dev-tools/rendered_document_fidelity.cjs';let s=fs.readFileSync(p,'utf8');
s=s.replace(".normalize('NFKC')", ".normalize('NFC')");
s=s.replace("link[rel~=\"stylesheet\"],img[src],iframe,object,embed", "link[rel~=\"stylesheet\"],img[src],img[srcset],source[srcset],source[src],video[src],video[poster],audio[src],iframe,object,embed");
s=s.replace("      if (/^(IFRAME|OBJECT|EMBED)$/.test(el.tagName)) return true;", "      if (/^(IFRAME|OBJECT|EMBED)$/.test(el.tagName) || el.hasAttribute('srcset')) return true;");
s=s.replace("el.getAttribute('data') || '';", "el.getAttribute('data') || el.getAttribute('poster') || '';");
fs.writeFileSync(p,s);
