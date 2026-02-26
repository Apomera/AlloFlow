"""
Expand getRandomTip() in AlloFlowANTI.txt to:
1. Extract lesson context (topic, glossary terms, resource count, missing types)
2. Pass dynamic interpolation params to t() calls
3. Wire in parent role tips
4. Wire in fallback_lesson_plan tip
5. Add fallback to _fallback variants when dynamic data is unavailable
"""
import re, sys, os

FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'AlloFlowANTI.txt')

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# ── Find the OLD getRandomTip body ──
# The function starts with "const getRandomTip = () => {"
# and we need to replace the body up to the closing of the function
OLD_BODY = """    const getRandomTip = () => {
        const has = (type) => history && Array.isArray(history) && history.some(h => h && h.type === type);
        const tips = [];
        if (activeView === 'simplified') {
            tips.push(t('tips.simplified_def'));
            if (!has('quiz')) tips.push(t('tips.simplified_quiz'));
            if (!has('glossary')) tips.push(t('tips.simplified_glossary'));
        } else if (activeView === 'glossary') {
            tips.push(t('tips.glossary_bingo'));
            if (!has('image')) tips.push(t('tips.glossary_visuals'));
        } else if (activeView === 'quiz') {
            tips.push(t('tips.quiz_autograder'));
        } else if (activeView === 'adventure') {
            tips.push(t('tips.adventure_context'));
        } else if (activeView === 'input') {
            if (history.length === 0) tips.push(t('tips.input_ready'));
            else tips.push(t('tips.input_next'));
        }
        if (tips.length === 0) {
            tips.push(t('tips.fallback_brainstorm'));
            tips.push(t('tips.fallback_export'));
        }
        return tips[Math.floor(Math.random() * tips.length)];
    };"""

NEW_BODY = """    const getRandomTip = () => {
        const has = (type) => history && Array.isArray(history) && history.some(h => h && h.type === type);
        const tips = [];

        // ── Extract lesson context for dynamic tips ──
        const latestText = history && Array.isArray(history) && history.find(h => h && h.type === 'simplified');
        const topic = (latestText && latestText.topic) || (typeof generatedContent !== 'undefined' && generatedContent && generatedContent.topic) || '';
        const glossaryEntry = history && Array.isArray(history) && history.find(h => h && h.type === 'glossary');
        const glossaryTerms = (glossaryEntry && glossaryEntry.data && glossaryEntry.data.terms) || [];
        const resourceCount = (history && Array.isArray(history)) ? history.length : 0;
        const allTypes = ['quiz', 'glossary', 'adventure', 'lesson-plan', 'image', 'timeline', 'brainstorm'];
        const missingTypes = allTypes.filter(tp => !has(tp));
        const suggestion = missingTypes.length > 0 ? missingTypes[Math.floor(Math.random() * missingTypes.length)].replace('-', ' ') : 'review game';

        // Pick a random word from glossary terms for the simplified_def tip
        const randomWord = glossaryTerms.length > 0
            ? (glossaryTerms[Math.floor(Math.random() * glossaryTerms.length)].term || glossaryTerms[Math.floor(Math.random() * glossaryTerms.length)])
            : '';
        const term1 = glossaryTerms.length > 0 ? (glossaryTerms[0].term || glossaryTerms[0]) : '';
        const term2 = glossaryTerms.length > 1 ? (glossaryTerms[1].term || glossaryTerms[1]) : '';

        if (activeView === 'simplified') {
            // Dynamic: mention a specific word, or fall back to generic
            if (randomWord) {
                tips.push(t('tips.simplified_def', { word: randomWord }));
            } else {
                tips.push(t('tips.simplified_def_fallback') || t('tips.simplified_def'));
            }
            if (!has('quiz')) tips.push(t('tips.simplified_quiz'));
            if (!has('glossary')) {
                if (term1 && term2) {
                    tips.push(t('tips.simplified_glossary', { term1, term2 }));
                } else {
                    tips.push(t('tips.simplified_glossary_fallback') || t('tips.simplified_glossary'));
                }
            }
        } else if (activeView === 'glossary') {
            tips.push(t('tips.glossary_bingo'));
            if (!has('image')) tips.push(t('tips.glossary_visuals'));
        } else if (activeView === 'quiz') {
            tips.push(t('tips.quiz_autograder'));
        } else if (activeView === 'adventure') {
            if (topic) {
                tips.push(t('tips.adventure_context', { topic, suggestion }));
            } else {
                tips.push(t('tips.adventure_context_fallback') || t('tips.adventure_context'));
            }
        } else if (activeView === 'input') {
            if (history.length === 0) {
                tips.push(t('tips.input_ready'));
            } else {
                if (topic) {
                    tips.push(t('tips.input_next', { count: resourceCount, topic, suggestion }));
                } else {
                    tips.push(t('tips.input_next_fallback') || t('tips.input_next'));
                }
            }
        }

        // Parent role tips
        if (typeof userRole !== 'undefined' && userRole === 'parent') {
            tips.push(t('tips.parent_bedtime'));
            tips.push(t('tips.parent_adventure'));
            tips.push(t('tips.parent_read_along'));
        }

        // Lesson plan suggestion when user has 3+ resources but no lesson plan
        if (resourceCount >= 3 && !has('lesson-plan')) {
            tips.push(t('tips.fallback_lesson_plan'));
        }

        if (tips.length === 0) {
            tips.push(t('tips.fallback_brainstorm'));
            if (topic && resourceCount > 0) {
                tips.push(t('tips.fallback_export', { count: resourceCount, topic }));
            } else {
                tips.push(t('tips.fallback_export_fallback') || t('tips.fallback_export'));
            }
        }
        return tips[Math.floor(Math.random() * tips.length)];
    };"""

if OLD_BODY not in content:
    print("ERROR: Could not find the OLD getRandomTip body. The file may have changed.")
    # Try to find it with normalized whitespace
    normalized_old = ' '.join(OLD_BODY.split())
    normalized_content = ' '.join(content.split())
    if normalized_old in normalized_content:
        print("Found with normalized whitespace — trying line-by-line match...")
    else:
        print("Could not find even with normalized whitespace.")
    sys.exit(1)

content = content.replace(OLD_BODY, NEW_BODY, 1)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

# Verify
with open(FILE, 'r', encoding='utf-8') as f:
    verify = f.read()

if 'const getRandomTip = () => {' in verify and 'tips.parent_bedtime' in verify and 'tips.fallback_lesson_plan' in verify:
    print("SUCCESS: getRandomTip() expanded with dynamic tips, parent tips, and lesson plan suggestion.")
    # Count the new tip references
    count = verify.count("tips.push(")
    print(f"Total tips.push() calls in file: {count}")
else:
    print("ERROR: Verification failed — replacement may not have applied correctly.")
    sys.exit(1)
