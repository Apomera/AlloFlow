#!/usr/bin/env python3
"""Patch 6 enhancements. Uses safe temp-file write to prevent data loss."""

import sys, os, shutil

# Safe read
with open('AlloFlowANTI.txt', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

original_len = len(content)
print(f'Source file: {original_len} chars')
changes = 0

def find_and_replace(content, old, new, label):
    global changes
    for le_name, le in [('LF', '\n'), ('CRLF', '\r\n')]:
        target = old.replace('\n', le)
        if content.count(target) == 1:
            replacement = new.replace('\n', le)
            content = content.replace(target, replacement)
            changes += 1
            print(f'  {label} ({le_name})')
            return content
        elif content.count(target) > 1:
            print(f'  {label}: AMBIGUOUS ({content.count(target)} matches)')
            return content
    print(f'  {label}: SKIP (not found)')
    return content


# ═══════════════════════════════════════
# 1a. Extended deterministic fixes in SINGLE-FILE
# ═══════════════════════════════════════
print('\n--- Patch 1a: Extended deterministic fixes (single-file) ---')

OLD_1A = (
    "        // 8. Ensure main landmark exists\n"
    "        if (!accessibleHtml.includes('<main')) {\n"
    "          accessibleHtml = accessibleHtml.replace(/<body[^>]*>/, (match) => {\n"
    "            aiFixCount++;\n"
    "            return match + '\\n<main id=\"main-content\" role=\"main\">';\n"
    "          });\n"
    "          accessibleHtml = accessibleHtml.replace('</body>', '</main>\\n</body>');\n"
    "        }\n"
    "\n"
    "        if (aiFixCount > 0) {\n"
)

NEW_1A = (
    "        // 8. Ensure main landmark exists\n"
    "        if (!accessibleHtml.includes('<main')) {\n"
    "          accessibleHtml = accessibleHtml.replace(/<body[^>]*>/, (match) => {\n"
    "            aiFixCount++;\n"
    "            return match + '\\n<main id=\"main-content\" role=\"main\">';\n"
    "          });\n"
    "          accessibleHtml = accessibleHtml.replace('</body>', '</main>\\n</body>');\n"
    "        }\n"
    "\n"
    "        // 9. Fix heading level skips (h1->h3 becomes h1->h2)\n"
    "        const headingLevels = [...accessibleHtml.matchAll(/<h([1-6])[\\\\s>]/gi)].map(m => parseInt(m[1]));\n"
    "        if (headingLevels.length > 1) {\n"
    "          let prevLevel = headingLevels[0];\n"
    "          for (let hi = 1; hi < headingLevels.length; hi++) {\n"
    "            if (headingLevels[hi] > prevLevel + 1) {\n"
    "              const wrongLevel = headingLevels[hi];\n"
    "              const correctLevel = prevLevel + 1;\n"
    "              const skipRe = new RegExp(`<h${wrongLevel}([\\\\\\\\s>])`, 'i');\n"
    "              const closeRe = new RegExp(`</h${wrongLevel}>`, 'i');\n"
    "              if (skipRe.test(accessibleHtml)) {\n"
    "                accessibleHtml = accessibleHtml.replace(skipRe, `<h${correctLevel}$1`);\n"
    "                accessibleHtml = accessibleHtml.replace(closeRe, `</h${correctLevel}>`);\n"
    "                aiFixCount++;\n"
    "              }\n"
    "              headingLevels[hi] = correctLevel;\n"
    "            }\n"
    "            prevLevel = headingLevels[hi];\n"
    "          }\n"
    "        }\n"
    "\n"
    "        // 10. Remove empty headings\n"
    "        accessibleHtml = accessibleHtml.replace(/<h([1-6])[^>]*>\\\\s*<\\\\/h\\\\1>/gi, () => { aiFixCount++; return ''; });\n"
    "\n"
    "        // 11. Fix \"click here\" / \"read more\" link text\n"
    "        accessibleHtml = accessibleHtml.replace(/<a([^>]*href=\"([^\"]*)\"[^>]*)>(click here|read more|here|learn more|more)<\\\\/a>/gi, (match, attrs, href, text) => {\n"
    "          aiFixCount++;\n"
    "          const domain = href.replace(/https?:\\\\/\\\\//, '').split('/')[0].substring(0, 30);\n"
    "          return `<a${attrs}>${domain || 'Link'}</a>`;\n"
    "        });\n"
    "\n"
    "        // 12. Ensure viewport meta tag\n"
    "        if (!accessibleHtml.includes('viewport')) {\n"
    "          accessibleHtml = accessibleHtml.replace('</head>', '<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\\n</head>');\n"
    "          aiFixCount++;\n"
    "        }\n"
    "\n"
    "        // 13. Fix duplicate IDs\n"
    "        const idMatches = [...accessibleHtml.matchAll(/id=\"([^\"]+)\"/g)];\n"
    "        const idCounts = {};\n"
    "        idMatches.forEach(m => { idCounts[m[1]] = (idCounts[m[1]] || 0) + 1; });\n"
    "        Object.entries(idCounts).filter(([, c]) => c > 1).forEach(([id]) => {\n"
    "          let counter = 0;\n"
    "          accessibleHtml = accessibleHtml.replace(new RegExp(`id=\"${id}\"`, 'g'), () => {\n"
    "            counter++;\n"
    "            if (counter === 1) return `id=\"${id}\"`;\n"
    "            aiFixCount++;\n"
    "            return `id=\"${id}-${counter}\"`;\n"
    "          });\n"
    "        });\n"
    "\n"
    "        if (aiFixCount > 0) {\n"
)

content = find_and_replace(content, OLD_1A, NEW_1A, '1a. Extended det fixes (single)')


# ═══════════════════════════════════════
# 1b. Extended deterministic fixes in BATCH
# ═══════════════════════════════════════
print('\n--- Patch 1b: Extended deterministic fixes (batch) ---')

OLD_1B = (
    "    accessibleHtml = accessibleHtml.replace(/<th(?![^>]*scope)/gi, () => { aiFixCount++; return '<th scope=\"col\"'; });\n"
    "    if (aiFixCount > 0) log(`Applied ${aiFixCount} deterministic fixes`);\n"
    "\n"
    "    // ── Phase 4: Dual-engine verification..."
)

NEW_1B = (
    "    accessibleHtml = accessibleHtml.replace(/<th(?![^>]*scope)/gi, () => { aiFixCount++; return '<th scope=\"col\"'; });\n"
    "\n"
    "    // 6. Fix heading level skips\n"
    "    const bHdgs = [...accessibleHtml.matchAll(/<h([1-6])[\\\\s>]/gi)].map(m => parseInt(m[1]));\n"
    "    if (bHdgs.length > 1) { let pv = bHdgs[0]; for (let hi = 1; hi < bHdgs.length; hi++) { if (bHdgs[hi] > pv + 1) { const w = bHdgs[hi], c = pv + 1; const sr = new RegExp(`<h${w}([\\\\\\\\s>])`, 'i'); const cr = new RegExp(`</h${w}>`, 'i'); if (sr.test(accessibleHtml)) { accessibleHtml = accessibleHtml.replace(sr, `<h${c}$1`); accessibleHtml = accessibleHtml.replace(cr, `</h${c}>`); aiFixCount++; } bHdgs[hi] = c; } pv = bHdgs[hi]; } }\n"
    "\n"
    "    // 7. Remove empty headings\n"
    "    accessibleHtml = accessibleHtml.replace(/<h([1-6])[^>]*>\\\\s*<\\\\/h\\\\1>/gi, () => { aiFixCount++; return ''; });\n"
    "\n"
    "    // 8. Fix link text\n"
    "    accessibleHtml = accessibleHtml.replace(/<a([^>]*href=\"([^\"]*)\"[^>]*)>(click here|read more|here|learn more|more)<\\\\/a>/gi, (m, attrs, href) => { aiFixCount++; return `<a${attrs}>${href.replace(/https?:\\\\/\\\\//, '').split('/')[0].substring(0, 30) || 'Link'}</a>`; });\n"
    "\n"
    "    // 9. Ensure viewport meta\n"
    "    if (!accessibleHtml.includes('viewport')) { accessibleHtml = accessibleHtml.replace('</head>', '<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\\n</head>'); aiFixCount++; }\n"
    "\n"
    "    // 10. Fix duplicate IDs\n"
    "    const bIds = [...accessibleHtml.matchAll(/id=\"([^\"]+)\"/g)]; const bIdC = {};\n"
    "    bIds.forEach(m => { bIdC[m[1]] = (bIdC[m[1]] || 0) + 1; });\n"
    "    Object.entries(bIdC).filter(([, c]) => c > 1).forEach(([id]) => { let ct = 0; accessibleHtml = accessibleHtml.replace(new RegExp(`id=\"${id}\"`, 'g'), () => { ct++; if (ct === 1) return `id=\"${id}\"`; aiFixCount++; return `id=\"${id}-${ct}\"`; }); });\n"
    "\n"
    "    if (aiFixCount > 0) log(`Applied ${aiFixCount} deterministic fixes`);\n"
    "\n"
    "    // ── Phase 4: Dual-engine verification..."
)

content = find_and_replace(content, OLD_1B, NEW_1B, '1b. Extended det fixes (batch)')


# ═══════════════════════════════════════
# 2a. Triple audit verification (SINGLE-FILE)
# ═══════════════════════════════════════
print('\n--- Patch 2a: Triple audit verification (single-file) ---')

OLD_2A = (
    "          // Re-audit with BOTH engines in parallel (2 AI audits averaged to reduce variance)\n"
    "          updateProgress(4, `Verifying fix pass ${fixPass + 1} (dual audit)...`);\n"
    "          const [reVerify1, reVerify2, reAxe] = await Promise.all([\n"
    "            auditOutputAccessibility(accessibleHtml),\n"
    "            auditOutputAccessibility(accessibleHtml),\n"
    "            runAxeAudit(accessibleHtml)\n"
    "          ]);\n"
    "\n"
    "          // Average the two AI scores to reduce random variance\n"
    "          const aiScore1 = reVerify1 ? reVerify1.score : bestAiScore;\n"
    "          const aiScore2 = reVerify2 ? reVerify2.score : bestAiScore;\n"
    "          const newAiScore = Math.round((aiScore1 + aiScore2) / 2);\n"
    "          const reVerify = reVerify1 || reVerify2; // use first for issues/passes detail\n"
    "          if (reVerify) reVerify.score = newAiScore; // store averaged score"
)

NEW_2A = (
    "          // Re-audit with 3 AI engines + axe-core for statistical reliability\n"
    "          updateProgress(4, `Verifying fix pass ${fixPass + 1} (triple audit)...`);\n"
    "          const [reVerify1, reVerify2, reVerify3, reAxe] = await Promise.all([\n"
    "            auditOutputAccessibility(accessibleHtml),\n"
    "            auditOutputAccessibility(accessibleHtml),\n"
    "            auditOutputAccessibility(accessibleHtml),\n"
    "            runAxeAudit(accessibleHtml)\n"
    "          ]);\n"
    "\n"
    "          // Average 3 AI scores & compute SEM for significance testing\n"
    "          const reScores = [reVerify1, reVerify2, reVerify3].map(v => v ? v.score : null).filter(s => s !== null);\n"
    "          const newAiScore = reScores.length > 0 ? Math.round(reScores.reduce((a, b) => a + b, 0) / reScores.length) : bestAiScore;\n"
    "          const reSD = reScores.length > 1 ? Math.sqrt(reScores.reduce((s, x) => s + (x - newAiScore) ** 2, 0) / (reScores.length - 1)) : 0;\n"
    "          const reSEM = reScores.length > 1 ? reSD / Math.sqrt(reScores.length) : 0;\n"
    "          const reVerify = reVerify1 || reVerify2 || reVerify3;\n"
    "          if (reVerify) { reVerify.score = newAiScore; reVerify._sem = reSEM; reVerify._sd = reSD; reVerify._scores = reScores; }"
)

content = find_and_replace(content, OLD_2A, NEW_2A, '2a. Triple audit (single)')


# ═══════════════════════════════════════
# 2b. Triple audit verification (BATCH)
# ═══════════════════════════════════════
print('\n--- Patch 2b: Triple audit verification (batch) ---')

OLD_2B = (
    "        const [rv1, rv2, rAxe] = await Promise.all([\n"
    "          auditOutputAccessibility(accessibleHtml),\n"
    "          auditOutputAccessibility(accessibleHtml),\n"
    "          runAxeAudit(accessibleHtml)\n"
    "        ]);\n"
    "\n"
    "        const s1 = rv1 ? rv1.score : bestAiScore;\n"
    "        const s2 = rv2 ? rv2.score : bestAiScore;\n"
    "        const newAi = Math.round((s1 + s2) / 2);\n"
    "        const rv = rv1 || rv2;\n"
    "        if (rv) rv.score = newAi;"
)

NEW_2B = (
    "        const [rv1, rv2, rv3, rAxe] = await Promise.all([\n"
    "          auditOutputAccessibility(accessibleHtml),\n"
    "          auditOutputAccessibility(accessibleHtml),\n"
    "          auditOutputAccessibility(accessibleHtml),\n"
    "          runAxeAudit(accessibleHtml)\n"
    "        ]);\n"
    "\n"
    "        // Average 3 scores + compute SEM\n"
    "        const rvScores = [rv1, rv2, rv3].map(v => v ? v.score : null).filter(s => s !== null);\n"
    "        const newAi = rvScores.length > 0 ? Math.round(rvScores.reduce((a, b) => a + b, 0) / rvScores.length) : bestAiScore;\n"
    "        const rvSD = rvScores.length > 1 ? Math.sqrt(rvScores.reduce((s, x) => s + (x - newAi) ** 2, 0) / (rvScores.length - 1)) : 0;\n"
    "        const rvSEM = rvScores.length > 1 ? rvSD / Math.sqrt(rvScores.length) : 0;\n"
    "        const rv = rv1 || rv2 || rv3;\n"
    "        if (rv) { rv.score = newAi; rv._sem = rvSEM; }"
)

content = find_and_replace(content, OLD_2B, NEW_2B, '2b. Triple audit (batch)')


# ═══════════════════════════════════════
# 4a. Significance threshold (SINGLE-FILE)
# ═══════════════════════════════════════
print('\n--- Patch 4a: Significance threshold (single-file) ---')

OLD_4A = (
    "          // Plateau detection: no improvement on EITHER engine for 2+ consecutive passes\n"
    "          const axeImproved = newAxeViolations < bestAxeViolations;\n"
    "          const aiImproved = newAiScore > bestAiScore + 2; // 2-point tolerance for AI noise\n"
    "          if (!axeImproved && !aiImproved && fixPass > 0) {\n"
)

NEW_4A = (
    "          // Plateau detection with statistical significance threshold\n"
    "          const axeImproved = newAxeViolations < bestAxeViolations;\n"
    "          // Only count AI improvement if it exceeds 1 SEM (statistically meaningful)\n"
    "          const minDetectable = Math.max(2, Math.round(reSEM * 1.5));\n"
    "          const aiImproved = newAiScore > bestAiScore + minDetectable;\n"
    "          if (!axeImproved && !aiImproved && fixPass > 0) {\n"
)

content = find_and_replace(content, OLD_4A, NEW_4A, '4a. Significance threshold (single)')


# ═══════════════════════════════════════
# 4b. Significance threshold (BATCH)
# The text has literal \u2014 as JS unicode escape
# ═══════════════════════════════════════
print('\n--- Patch 4b: Significance threshold (batch) ---')

# The batch file has the em-dash as literal \\u2014 in JavaScript
OLD_4B = "if (newAxe >= bestAxeViolations && newAi <= bestAiScore + 2 && fp > 0) { log('Plateau \\u2014 stopping'); break; }"

NEW_4B = "const bMinDet = Math.max(2, Math.round(rvSEM * 1.5));\n        if (newAxe >= bestAxeViolations && newAi <= bestAiScore + bMinDet && fp > 0) { log(`Plateau (SEM\\u00b1${rvSEM.toFixed(1)}, threshold=${bMinDet}) \\u2014 stopping`); break; }"

content = find_and_replace(content, OLD_4B, NEW_4B, '4b. Significance threshold (batch)')


# ═══════════════════════════════════════
# 3. Structured telemetry JSON
# ═══════════════════════════════════════
print('\n--- Patch 3: Structured telemetry JSON ---')

OLD_3 = "    zip.file('batch_accessibility_report.csv', csvRows.join('\\n'));"

NEW_3 = (
    "    zip.file('batch_accessibility_report.csv', csvRows.join('\\n'));\n"
    "\n"
    "    // Structured telemetry JSON for research validation\n"
    "    const telemetry = {\n"
    "      version: '1.0',\n"
    "      timestamp: new Date().toISOString(),\n"
    "      pipelineConfig: { auditorCount: pdfAuditorCount, autoFixPasses: pdfAutoFixPasses, polishPasses: pdfPolishPasses, verificationSamples: 3 },\n"
    "      summary: pdfBatchSummary,\n"
    "      files: pdfBatchQueue.map(f => ({\n"
    "        fileName: f.fileName, fileSize: f.fileSize, status: f.status, error: f.error || null,\n"
    "        result: f.result ? { beforeScore: f.result.beforeScore, afterScore: f.result.afterScore, improvement: (f.result.afterScore || 0) - (f.result.beforeScore || 0), autoFixPasses: f.result.autoFixPasses, axeViolations: f.result.axeViolations, needsExpertReview: f.result.needsExpertReview, elapsed: f.result.elapsed } : null,\n"
    "      })),\n"
    "    };\n"
    "    zip.file('telemetry.json', JSON.stringify(telemetry, null, 2));"
)

content = find_and_replace(content, OLD_3, NEW_3, '3. Telemetry JSON')


# ═══════════════════════════════════════
# 5. Large PDF chunking in batch
# ═══════════════════════════════════════
print('\n--- Patch 5: Large PDF chunking (batch) ---')

OLD_5 = (
    "    let extractedText = '';\n"
    "    const BATCH_PAGES_PER_CHUNK = 5;\n"
)

# Check if chunking was already added - if so, skip
if OLD_5 in content or OLD_5.replace('\n', '\r\n') in content:
    print('  5. Already has chunking, skipping')
else:
    OLD_5_ALT = "    let extractedText = await callGeminiVision("
    NEW_5_ALT = (
        "    let extractedText = '';\n"
        "    const BATCH_PAGES_PER_CHUNK = 5;\n"
        "    const batchChunks = Math.max(1, Math.ceil(pageCount / BATCH_PAGES_PER_CHUNK));\n"
        "    if (batchChunks <= 1) {\n"
        "      extractedText = await callGeminiVision("
    )
    content = find_and_replace(content, OLD_5_ALT, NEW_5_ALT, '5a. Chunking wrapper start')

    # Close the single-extraction and add multi-chunk path
    OLD_5_END = (
        "      base64Data, 'application/pdf'\n"
        "    );\n"
        "\n"
        "    if (!extractedText"
    )
    NEW_5_END = (
        "      base64Data, 'application/pdf'\n"
        "      );\n"
        "    } else {\n"
        "      log(`Extracting ${batchChunks} chunks (${pageCount} pages)...`);\n"
        "      const cPromises = [];\n"
        "      for (let ci = 0; ci < batchChunks; ci++) {\n"
        "        const sp = ci * BATCH_PAGES_PER_CHUNK + 1;\n"
        "        const ep = Math.min((ci + 1) * BATCH_PAGES_PER_CHUNK, pageCount);\n"
        "        cPromises.push(callGeminiVision(`Extract ALL text from pages ${sp}-${ep}.\\\\n\\\\nRULES: Use # for headings, preserve tables as markdown, describe images. Return ONLY text.`, base64Data, 'application/pdf').catch(() => null));\n"
        "      }\n"
        "      let cResults = [];\n"
        "      for (let b = 0; b < cPromises.length; b += 5) {\n"
        "        const batch = cPromises.slice(b, b + 5);\n"
        "        cResults = cResults.concat(await Promise.all(batch));\n"
        "        if (b + 5 < cPromises.length) await new Promise(r => setTimeout(r, 500));\n"
        "      }\n"
        "      extractedText = cResults.filter(Boolean).join('\\n\\n---\\n\\n');\n"
        "    }\n"
        "\n"
        "    if (!extractedText"
    )
    content = find_and_replace(content, OLD_5_END, NEW_5_END, '5b. Chunking loop')


# ═══════════════════════════════════════
# 6. Experiment mode state + function
# ═══════════════════════════════════════
print('\n--- Patch 6: Experiment mode ---')

OLD_6A = (
    "  const [pdfBatchSummary, setPdfBatchSummary] = useState(null);\n"
    "  // \u2500\u2500 Custom Export Style \u2500\u2500"
)

NEW_6A = (
    "  const [pdfBatchSummary, setPdfBatchSummary] = useState(null);\n"
    "  const [pdfExperimentMode, setPdfExperimentMode] = useState(false);\n"
    "  const [pdfExperimentRuns, setPdfExperimentRuns] = useState(3);\n"
    "  // \u2500\u2500 Custom Export Style \u2500\u2500"
)

content = find_and_replace(content, OLD_6A, NEW_6A, '6a. Experiment state')

# Experiment function - add before proceedWithPdfTransform
OLD_6B = "  const proceedWithPdfTransform = async () => {"

EXPERIMENT_FN = (
    "  // == Test-Retest Experiment Mode ==\n"
    "  // Runs same PDF N times to measure scoring reliability\n"
    "  const runTestRetestExperiment = async (base64Data, fileName, numRuns) => {\n"
    "    const runs = [];\n"
    "    setPdfBatchProcessing(true);\n"
    "    for (let r = 0; r < numRuns; r++) {\n"
    "      setPdfBatchStep(`Experiment run ${r + 1}/${numRuns}...`);\n"
    "      try {\n"
    "        const result = await processSinglePdfForBatch(base64Data, fileName, (msg) => {\n"
    "          setPdfBatchStep(`[Run ${r + 1}/${numRuns}] ${msg}`);\n"
    "        });\n"
    "        runs.push({ run: r + 1, beforeScore: result.beforeScore, afterScore: result.afterScore, autoFixPasses: result.autoFixPasses, elapsed: result.elapsed });\n"
    "      } catch(err) {\n"
    "        runs.push({ run: r + 1, error: err.message });\n"
    "      }\n"
    "      if (r < numRuns - 1) await new Promise(res => setTimeout(res, 3000));\n"
    "    }\n"
    "    const afterScores = runs.filter(r => r.afterScore != null).map(r => r.afterScore);\n"
    "    const beforeScores = runs.filter(r => r.beforeScore != null).map(r => r.beforeScore);\n"
    "    const n = afterScores.length;\n"
    "    const mean = n > 0 ? afterScores.reduce((a, b) => a + b, 0) / n : 0;\n"
    "    const sd = n > 1 ? Math.sqrt(afterScores.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1)) : 0;\n"
    "    const sem = n > 1 ? sd / Math.sqrt(n) : 0;\n"
    "    const cv = mean > 0 ? (sd / mean * 100).toFixed(1) : 'N/A';\n"
    "    const range = n > 0 ? Math.max(...afterScores) - Math.min(...afterScores) : 0;\n"
    "    const bMean = beforeScores.length > 0 ? beforeScores.reduce((a, b) => a + b, 0) / beforeScores.length : 0;\n"
    "    const bSD = beforeScores.length > 1 ? Math.sqrt(beforeScores.reduce((s, x) => s + (x - bMean) ** 2, 0) / (beforeScores.length - 1)) : 0;\n"
    "    const stats = { runs, n, afterMean: Math.round(mean * 10) / 10, afterSD: Math.round(sd * 10) / 10, afterSEM: Math.round(sem * 10) / 10, afterCV: cv, afterRange: range, beforeMean: Math.round(bMean * 10) / 10, beforeSD: Math.round(bSD * 10) / 10 };\n"
    "    const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' });\n"
    "    const url = URL.createObjectURL(blob);\n"
    "    const a = document.createElement('a'); a.href = url; a.download = `experiment_${fileName.replace(/\\.pdf$/i, '')}_${numRuns}runs.json`;\n"
    "    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);\n"
    "    setPdfBatchProcessing(false); setPdfBatchStep('');\n"
    "    addToast(`Experiment: ${n} runs, after=${Math.round(mean)}+/-${sd.toFixed(1)} (SEM=${sem.toFixed(1)}, CV=${cv}%, range=${range})`, 'success');\n"
    "    return stats;\n"
    "  };\n"
    "\n"
)

content = find_and_replace(content, OLD_6B, EXPERIMENT_FN + OLD_6B, '6b. Experiment function')


# ═══════════════════════════════════════
# Safe write
# ═══════════════════════════════════════

if changes > 0:
    # Write to temp file first, then rename
    with open('AlloFlowANTI.txt.tmp', 'w', encoding='utf-8') as f:
        f.write(content)
    
    # Verify temp file is valid
    tmp_size = os.path.getsize('AlloFlowANTI.txt.tmp')
    if tmp_size > original_len * 0.9:  # Should be same size or bigger
        shutil.move('AlloFlowANTI.txt.tmp', 'AlloFlowANTI.txt')
        print(f'\nFile written: {tmp_size} chars (was {original_len})')
    else:
        os.remove('AlloFlowANTI.txt.tmp')
        print(f'\nERROR: Temp file too small ({tmp_size} vs {original_len}), NOT written')
        sys.exit(1)

print(f'\nTotal changes: {changes}/10')
if changes >= 8:
    print('SUCCESS')
else:
    print('WARNING: Some patches may not have applied')
    sys.exit(1)
