'use strict';
const source = require('./item_content.cjs');
const byId = Object.fromEntries(source.map((entry) => [entry.id, entry]));
function part(id, sourceId, start, count, label, chapter) { const bank=byId[sourceId]; return { id, chapterId:'ec5025-ch-'+String(chapter).padStart(2,'0'), domainId:bank.domainId, domain:bank.domain, label, references:bank.references.slice(), questions:bank.questions.slice(start,start+count) }; }
module.exports = [
 part('oral-language-emergent-literacy','language-literacy',0,10,'Oral Language and Emergent Literacy',1), part('phonological-phonics-word-reading','language-literacy',10,10,'Phonological Awareness, Phonics, and Word Reading',2), part('comprehension-writing-literature','language-literacy',20,10,'Comprehension, Writing, and Children’s Literature',3),
 part('number-operations','mathematics',0,9,'Number, Operations, and Algebraic Thinking',4), part('measurement-data','mathematics',9,8,'Measurement, Data, and Probability',5), part('geometry-reasoning','mathematics',17,8,'Geometry and Mathematical Reasoning',6),
 part('history-civics-culture','social-studies',0,7,'History, Civics, and Culture',7), part('geography-economics-inquiry','social-studies',7,7,'Geography, Economics, and Social Inquiry',8),
 part('physical-earth-science','science',0,7,'Physical and Earth Science',9), part('life-science-engineering','science',7,7,'Life Science, Environment, and Engineering',10),
 part('health-physical-development','health-physical-arts',0,9,'Health, Safety, and Physical Development',11), part('creative-performing-arts','health-physical-arts',9,8,'Creative and Performing Arts',12),
];
