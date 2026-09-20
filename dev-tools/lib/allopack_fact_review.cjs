'use strict';
const {createHash}=require('crypto');
const factHash=facts=>createHash('sha256').update(JSON.stringify(facts)).digest('hex');
function reviewedFacts(record,facts){
 return !!(Array.isArray(facts) && facts.length && facts.every(f=>typeof f==='string'&&f.trim()) && record && record.status==='verified' && typeof record.reviewer==='string' && record.reviewer.trim() && typeof record.reviewedAt==='string' && Number.isFinite(Date.parse(record.reviewedAt)) && Array.isArray(record.sources) && record.sources.length && record.sources.every(s=>typeof s==='string'&&s.trim()) && record.factsHash===factHash(facts));
}
module.exports={factHash,reviewedFacts};
