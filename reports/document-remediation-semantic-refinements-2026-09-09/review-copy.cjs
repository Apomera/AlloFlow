const fs=require('fs');
const p='remediation_review_component.jsx';let s=fs.readFileSync(p,'utf8');
s=s.replace('${item.description} Preserve the source wording', '${item.description} ${item.locationLabel || ""} Preserve the source wording');
s=s.replace('Rejection records identify a section, not an exact affected cell or image.', 'Rejection locations describe the input for that attempt; they are not automatically matched to this preview.');
fs.writeFileSync(p,s);
