const fs = require('fs');
const f = 'c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt';
let content = fs.readFileSync(f, 'utf8');

// Current prompt injection:
const currentLang = "IMPORTANT: Generate ALL text content (questions, explanations, steps, real-world applications) in ' + targetTranslationLang + '. Keep mathematical expressions and JSON keys in English.";

const bilingualLang = "IMPORTANT: Generate ALL text content (questions, explanations, steps, real-world applications) in ' + targetTranslationLang + '. After each text field, include an English translation in parentheses. For example: \"question\": \"¿Cuántos lápices quedan? (How many pencils are left?)\". Keep mathematical expressions and JSON keys in English.";

if (content.includes(currentLang)) {
    content = content.split(currentLang).join(bilingualLang);
    console.log('✅ Updated Math Curriculum Designer prompts to bilingual');
} else {
    console.log('❌ Math Curriculum Designer prompt not found');
}

// Also update the STEM solver prompt
const currentSolver = "IMPORTANT: Generate ALL text content (problems, explanations, steps) in ' + targetTranslationLang + '. Keep mathematical expressions and JSON keys in English.";

const bilingualSolver = "IMPORTANT: Generate ALL text content (problems, explanations, steps) in ' + targetTranslationLang + '. After each text field, include an English translation in parentheses. Keep mathematical expressions and JSON keys in English.";

if (content.includes(currentSolver)) {
    content = content.replace(currentSolver, bilingualSolver);
    console.log('✅ Updated STEM solver prompt to bilingual');
} else {
    console.log('❌ STEM solver prompt not found');
}

fs.writeFileSync(f, content, 'utf8');
console.log('Saved! (' + content.length + ' bytes)');
