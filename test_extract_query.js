// Quick test script to verify _extractSearchQuery patterns
// Run with: node test_extract_query.js

const _extractSearchQuery = function(prompt) {
    if (prompt.length <= 100) return prompt;

    // Priority 1: Explicit Topic/Query fields (matches all callGemini callers)
    const topicPatterns = [
        [/Topic:\s*"([^"]{2,120})"/i,                'Topic:"..."'],
        [/Topic:\s*'([^']{2,120})'/i,                "Topic:'...'"],
        [/User Query\/Skill:\s*"([^"]{2,120})"/i,    'UserQuery/Skill'],
        [/Learning Goal:\s*"([^"]{2,120})"/i,        'LearningGoal'],
        [/resources?\s+about:?\s+(.{3,100}?)(?:\.\s|\.\s*$|$)/im, 'resources about'],
        [/(?:text|content)\s+about\s*:?\s*"([^"]{2,120})"/i, 'content about'],
        [/Analyze\s+.*?about\s+"([^"]{2,120})"/i,    'Analyze about'],
        [/standard[:\s]+"([^"]{2,120})"/i,            'Standard'],
        [/Academic Standard:\s*"([^"]{2,120})"/i,     'AcademicStandard'],
    ];

    for (const [pattern, label] of topicPatterns) {
        const match = prompt.match(pattern);
        if (match && match[1] && match[1].trim().length >= 2) {
            const extracted = match[1].trim();
            // Reject if the extracted text looks like more template boilerplate
            if (/^(the following|this|these|a |an )\b/i.test(extracted)) continue;
            console.log(`  ✅ Extracted via ${label}: "${extracted}"`);
            return extracted;
        }
    }

    // Priority 2: Generic "about/regarding" with quoted or unquoted content
    const genericPatterns = [
        [/(?:about|regarding)\s+["""\u201C]([^"""\u201D]{3,80})["""\u201D]/i, 'about "..."'],
        [/(?:about|regarding)\s+([^.,\n"]{3,60}?)(?:\.|,|\n|$)/im, 'about ...'],
    ];

    for (const [pattern, label] of genericPatterns) {
        const match = prompt.match(pattern);
        if (match && match[1]) {
            const extracted = match[1].trim();
            // Reject boilerplate-looking matches
            if (/^(the following|this|these|a |an )\b/i.test(extracted)) continue;
            if (extracted.length < 3) continue;
            console.log(`  ✅ Extracted via ${label}: "${extracted}"`);
            return extracted;
        }
    }

    // Priority 3: First short quoted string in the prompt
    const quotedMatch = prompt.match(/"([^"]{3,80})"/);
    if (quotedMatch && quotedMatch[1]) {
        const q = quotedMatch[1].trim();
        if (!/^(code|description|framework|name|role|text|task|format|return|here|source|the |a )(?:\b|$)/i.test(q) && q.length >= 3) {
            console.log(`  ✅ Extracted via first-quoted: "${q}"`);
            return q;
        }
    }

    // Priority 4: First meaningful sentence
    const skipLine = /^(research|write|generate|task|you are|instructions?|system|note|critical|important|verification|synthesis|strict|do not|return only|use google|find\s+official|find\s+high|identify|extract|cross-reference|verify|base your|also use|focus on|ensure|the following|include|keep|webb|target|return|use |if |for |---|format|output|rules?|text segment|\*|✓|✗|#|\d+[.)]\s)/i;
    const sentences = prompt.split(/[.\n]/).map(s => s.trim()).filter(s => s.length > 10 && s.length < 120);
    for (const s of sentences) {
        if (!skipLine.test(s)) {
            console.log(`  ✅ Extracted via first-sentence: "${s.slice(0, 100)}"`);
            return s.slice(0, 100);
        }
    }

    // Final fallback
    const byLength = sentences.slice().sort((a, b) => a.length - b.length);
    const shortest = byLength.find(s => s.length > 10 && s.length < 100 && !skipLine.test(s));
    if (shortest) {
        console.log(`  ✅ Extracted via shortest-sentence: "${shortest}"`);
        return shortest;
    }
    console.log('  ⚠️ FALLBACK: using truncated prompt');
    return sentences[0]?.slice(0, 100) || prompt.slice(0, 80);
};

// ── Test cases from actual callGemini invocations ──
const tests = [
    {
        name: "Resource Discovery (basic)",
        prompt: "Find high-quality, text-based educational resources about: photosynthesis. Target audience: 5th grade.",
        expected: "photosynthesis"
    },
    {
        name: "Resource Discovery (with grade)",
        prompt: "Find high-quality, text-based educational resources about: the water cycle 5th grade educational resource",
        expected: "the water cycle 5th grade educational resource"
    },
    {
        name: "Standards Lookup (goal)",
        prompt: `Task: Find official educational standards using Google Search.
Target Grade Level: 5th
Learning Goal: "Students will understand fractions and decimals",
Use Google Search to find relevant state or national standards.
Return only JSON.`,
        expected: "Students will understand fractions and decimals"
    },
    {
        name: "Standards Lookup (query/skill)",
        prompt: `Task: Find official educational standards using Google Search.
User Query/Skill: "multiplication of two-digit numbers"
Target Grade: 4th
Use Google Search to find relevant state or national standards.
Return only JSON.`,
        expected: "multiplication of two-digit numbers"
    },
    {
        name: "Content Verification",
        prompt: `Verify the factual accuracy of the following text segment. Cross-reference with reliable web sources.
Text Segment:
"The mitochondria is the powerhouse of the cell. It produces ATP through cellular respiration."
Return JSON analysis.`,
        expected: "The mitochondria is the powerhouse of the cell"  // Should get the text content, not boilerplate
    },
    {
        name: "Research Brief",
        prompt: `Research the following topic for educational content creation.
Topic: "Ancient Egyptian civilization"
Target Audience: Middle School
Return a comprehensive brief.`,
        expected: "Ancient Egyptian civilization"
    },
    {
        name: "Persona Generation",
        prompt: `You are an expert at identifying historical figures related to topics.
Analyze the following text about "The American Revolution". 
Source Text: "The colonists were upset about taxation without representation..."
Task: Identify 3 specific historical figures related to this topic.
Return JSON.`,
        expected: "The American Revolution"
    },
    {
        name: "URL Search",
        prompt: `Find high-quality, text-based educational resources about: solar system planets. Target audience: 3rd grade.`,
        expected: "solar system planets"
    },
    {
        name: "Simple research topic",
        prompt: `Research the following topic for educational content creation.
Topic: "climate change effects on ecosystems"
Include recent scientific findings.`,
        expected: "climate change effects on ecosystems"
    },
    {
        name: "Academic Standard search",
        prompt: `Task: Find official educational standards using Google Search.
Academic Standard: "NGSS MS-PS1-2 Matter and Its Interactions"
Target Grade: 6th`,
        expected: "NGSS MS-PS1-2 Matter and Its Interactions"
    },
];

console.log("═══════════════════════════════════════════════════════");
console.log("Testing _extractSearchQuery against actual prompt formats");
console.log("═══════════════════════════════════════════════════════\n");

let passed = 0;
let failed = 0;

for (const test of tests) {
    console.log(`\n── Test: ${test.name} ──`);
    const result = _extractSearchQuery(test.prompt);
    const success = result.includes(test.expected) || test.expected.includes(result);
    if (success) {
        passed++;
        console.log(`  Result: "${result}"`);
    } else {
        failed++;
        console.log(`  ❌ FAILED`);
        console.log(`  Expected: "${test.expected}"`);
        console.log(`  Got:      "${result}"`);
    }
}

console.log(`\n═══════════════════════════════════════════════════════`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${tests.length}`);
console.log(`═══════════════════════════════════════════════════════`);
