const fs=require('fs');const p='applied_challenge_source.jsx';let s=fs.readFileSync(p,'utf8');
const begin=s.indexOf("      {followups.length > 0 && <aside"),end=s.indexOf('</aside>}',begin)+9;
if(begin<0||end<9)throw Error('Review guide missing');
const block=s.slice(begin,end);s=s.slice(0,begin)+s.slice(end);
const anchor="      <ul className='mt-4 grid gap-2 sm:grid-cols-2' aria-label={tx('applied_challenge.review.coverage',";
if(!s.includes(anchor))throw Error('Review checklist missing');s=s.replace(anchor,block+'\n'+anchor);
s=s.replace("<button type='button' onClick={() => editStage(2)} className='aps-button mt-5'>","<button type='button' onClick={() => editReviewTarget(appliedChallengeReviewTarget(data, 'response'))} className='aps-button mt-5'>");fs.writeFileSync(p,s);
