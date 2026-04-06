# Phase 1b: WCAG 2.1 AA Remediation for generateResourceHTML()
# Fixes heading hierarchy, ARIA roles, and tag mismatches

$file = "c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
$content = [System.IO.File]::ReadAllText($file)
$count = 0

# ── Fix 1: enhancedHeader closing tag </div> → </h2> + aria-hidden on icon ──
$old1 = 'const enhancedHeader = `<h2 class="resource-header" role="heading" aria-level="2" style="border-left:4px solid ${tv.color};background:${tv.bg};display:flex;align-items:center;gap:8px;"><span style="font-size:1.3em;">${tv.icon}</span> ${title}${item.meta ? ` <span style="font-weight:normal;font-size:0.8em;color:#64748b;">(${item.meta})</span>` : ''''}</div>`;'
$new1 = 'const enhancedHeader = `<h2 class="resource-header" role="heading" aria-level="2" style="border-left:4px solid ${tv.color};background:${tv.bg};display:flex;align-items:center;gap:8px;"><span aria-hidden="true" style="font-size:1.3em;">${tv.icon}</span> ${title}${item.meta ? ` <span style="font-weight:normal;font-size:0.8em;color:#64748b;">(${item.meta})</span>` : ''''}</h2>`;'
if ($content.Contains($old1)) {
    $content = $content.Replace($old1, $new1)
    $count++
    Write-Host "[OK] Fix 1: enhancedHeader closing tag and aria-hidden on icon"
} else {
    Write-Host "[SKIP] Fix 1: enhancedHeader pattern not found"
}

# ── Fix 2: Structured Outline default inner <h2> → <h3> ──
$old2 = '`<h2 style="margin: 0;">${main}</h2>` +'
$new2 = '`<h3 style="margin: 0;">${main}</h3>` +'
if ($content.Contains($old2)) {
    $content = $content.Replace($old2, $new2)
    $count++
    Write-Host "[OK] Fix 2: Structured Outline inner h2 -> h3"
} else {
    Write-Host "[SKIP] Fix 2: Structured Outline h2 pattern not found"
}

# ── Fix 3: Analysis section - add role="region" + aria-label ──
$old3 = '<div class="section" id="${item.id}">' + "`r`n" + '                   ${enhancedHeader}' + "`r`n" + '                   <div style="background:#f8fafc; padding:15px; border-radius:5px; border:1px solid #e2e8f0;">' + "`r`n" + '                       <p><strong>${t(''simplified.level_estimate_label'')}:'
$new3 = '<div class="section" id="${item.id}" role="region" aria-label="${title}">' + "`r`n" + '                   ${enhancedHeader}' + "`r`n" + '                   <div style="background:#f8fafc; padding:15px; border-radius:5px; border:1px solid #e2e8f0;">' + "`r`n" + '                       <p><strong>${t(''simplified.level_estimate_label'')}:'
if ($content.Contains($old3)) {
    $content = $content.Replace($old3, $new3)
    $count++
    Write-Host "[OK] Fix 3: Analysis section role=region"
} else {
    Write-Host "[SKIP] Fix 3: Analysis section pattern not found"
}

# ── Fix 4: FAQ - add role="article" + aria-label, question to h3, aria-hidden on number ──
$old4a = '<div style="margin-bottom:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;page-break-inside:avoid;">'
$new4a = '<div role="article" style="margin-bottom:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;page-break-inside:avoid;">'
if ($content.Contains($old4a)) {
    $content = $content.Replace($old4a, $new4a)
    $count++
    Write-Host "[OK] Fix 4a: FAQ role=article"
} else {
    Write-Host "[SKIP] Fix 4a: FAQ article pattern not found"
}

# FAQ number badge - aria-hidden
$old4b = '<span style="background:#0891b2;color:white;font-weight:800;font-size:11px;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${i+1}</span>'
$new4b = '<span aria-hidden="true" style="background:#0891b2;color:white;font-weight:800;font-size:11px;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${i+1}</span>'
if ($content.Contains($old4b)) {
    $content = $content.Replace($old4b, $new4b)
    $count++
    Write-Host "[OK] Fix 4b: FAQ number badge aria-hidden"
} else {
    Write-Host "[SKIP] Fix 4b: FAQ number badge pattern not found"
}

# FAQ question <p> → <h3>
$old4c = '<p style="font-weight:700;color:#0891b2;margin:0;font-size:1em;">${faq.question}</p>'
$new4c = '<h3 style="font-weight:700;color:#0891b2;margin:0;font-size:1em;">${faq.question}</h3>'
if ($content.Contains($old4c)) {
    $content = $content.Replace($old4c, $new4c)
    $count++
    Write-Host "[OK] Fix 4c: FAQ question p -> h3"
} else {
    Write-Host "[SKIP] Fix 4c: FAQ question p pattern not found"
}

# ── Fix 5: Brainstorm - grid role=list, card role=listitem, h4 → h3 ──
# brainstorm grid
$old5a = '<div class="grid">' + "`r`n" + '                        ${item.data.map(idea => `' + "`r`n" + '                           <div class="card">' + "`r`n" + '                               <h4>${idea.title}</h4>'
$new5a = '<div class="grid" role="list">' + "`r`n" + '                        ${item.data.map(idea => `' + "`r`n" + '                           <div class="card" role="listitem">' + "`r`n" + '                               <h3 style="margin: 0 0 8px 0; font-size: 1em; color: #1e293b;">${idea.title}</h3>'
if ($content.Contains($old5a)) {
    $content = $content.Replace($old5a, $new5a)
    $count++
    Write-Host "[OK] Fix 5: Brainstorm grid roles + h4->h3"
} else {
    Write-Host "[SKIP] Fix 5: Brainstorm grid pattern not found"
}

# ── Fix 6: Timeline - semantic <ol> + <li>, aria-hidden on decorative dot, role=text on badge ──
$old6a = '<div style="position: relative; padding-left: 24px; border-left: 3px solid #4338ca; margin-left: 10px;">'
$new6a = '<ol style="position: relative; padding-left: 24px; border-left: 3px solid #4338ca; margin-left: 10px; list-style: none;">'
# Only replace the timeline instance (check context)
$old6ctx = '${enhancedHeader}' + "`r`n" + '                   <div style="position: relative; padding-left: 24px; border-left: 3px solid #4338ca; margin-left: 10px;">'
$new6ctx = '${enhancedHeader}' + "`r`n" + '                   <ol style="position: relative; padding-left: 24px; border-left: 3px solid #4338ca; margin-left: 10px; list-style: none;">'
if ($content.Contains($old6ctx)) {
    $content = $content.Replace($old6ctx, $new6ctx)
    $count++
    Write-Host "[OK] Fix 6a: Timeline div -> ol"
} else {
    Write-Host "[SKIP] Fix 6a: Timeline div pattern not found"
}

# Timeline closing </div> for the container → </ol>
$old6b = '                   </div>' + "`r`n" + '               </div>' + "`r`n" + '           `;' + "`r`n" + '       } else if (item.type === ''concept-sort'')'
$new6b = '                   </ol>' + "`r`n" + '               </div>' + "`r`n" + '           `;' + "`r`n" + '       } else if (item.type === ''concept-sort'')'
if ($content.Contains($old6b)) {
    $content = $content.Replace($old6b, $new6b)
    $count++
    Write-Host "[OK] Fix 6b: Timeline closing </div> -> </ol>"
} else {
    Write-Host "[SKIP] Fix 6b: Timeline closing tag pattern not found"
}

# Timeline items <div> → <li>
$old6c = '                           <div style="margin-bottom: 20px; position: relative;">' + "`r`n" + '                               <div style="position: absolute; left: -32px; top: 0; width: 16px; height: 16px; background: #4f46e5; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 2px #4338ca;"></div>'
$new6c = '                           <li style="margin-bottom: 20px; position: relative;">' + "`r`n" + '                               <div aria-hidden="true" style="position: absolute; left: -32px; top: 0; width: 16px; height: 16px; background: #4f46e5; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 2px #4338ca;"></div>'
if ($content.Contains($old6c)) {
    $content = $content.Replace($old6c, $new6c)
    $count++
    Write-Host "[OK] Fix 6c: Timeline item div -> li + aria-hidden on dot"
} else {
    Write-Host "[SKIP] Fix 6c: Timeline item pattern not found"
}

# Timeline item closing </div> → </li> (the outer wrapper)
$old6d = '                               </div>' + "`r`n" + '                           </div>' + "`r`n" + '                       `).join('''')'
$new6d = '                               </div>' + "`r`n" + '                           </li>' + "`r`n" + '                       `).join('''')'
if ($content.Contains($old6d)) {
    $content = $content.Replace($old6d, $new6d)
    $count++
    Write-Host "[OK] Fix 6d: Timeline item closing </div> -> </li>"
} else {
    Write-Host "[SKIP] Fix 6d: Timeline item closing pattern not found"
}

# ── Fix 7: Concept-sort - role=list + role=listitem, category header div → h3 ──
$old7a = '<div style="display: flex; flex-wrap: wrap; gap: 20px;">'
$new7a = '<div style="display: flex; flex-wrap: wrap; gap: 20px;" role="list">'
# Context-specific for concept-sort
$old7ctx = '${enhancedHeader}' + "`r`n" + '                   <div style="display: flex; flex-wrap: wrap; gap: 20px;">' + "`r`n" + '                       ${categories.map'
$new7ctx = '${enhancedHeader}' + "`r`n" + '                   <div style="display: flex; flex-wrap: wrap; gap: 20px;" role="list">' + "`r`n" + '                       ${categories.map'
if ($content.Contains($old7ctx)) {
    $content = $content.Replace($old7ctx, $new7ctx)
    $count++
    Write-Host "[OK] Fix 7a: Concept-sort grid role=list"
} else {
    Write-Host "[SKIP] Fix 7a: Concept-sort grid pattern not found"
}

# Concept-sort category item
$old7b = '<div style="flex: 1; min-width: 200px; border: 2px solid ${catColor}33; border-radius: 12px; overflow: hidden;">' + "`r`n" + '                                   <div style="background:${catColor};color:white; padding: 10px; font-weight: bold; text-align: center;">'
$new7b = '<div role="listitem" style="flex: 1; min-width: 200px; border: 2px solid ${catColor}33; border-radius: 12px; overflow: hidden;">' + "`r`n" + '                                   <h3 style="background:${catColor};color:white; padding: 10px; font-weight: bold; text-align: center; margin: 0; font-size: 1em;">'
if ($content.Contains($old7b)) {
    $content = $content.Replace($old7b, $new7b)
    $count++
    Write-Host "[OK] Fix 7b: Concept-sort category item role=listitem + h3"
} else {
    Write-Host "[SKIP] Fix 7b: Concept-sort category item pattern not found"
}

# Concept-sort category header closing </div> → </h3>
$old7c = '                                       ${cat.label}' + "`r`n" + '                                   </div>'
$new7c = '                                       ${cat.label}' + "`r`n" + '                                   </h3>'
if ($content.Contains($old7c)) {
    $content = $content.Replace($old7c, $new7c)
    $count++
    Write-Host "[OK] Fix 7c: Concept-sort category header closing -> h3"
} else {
    Write-Host "[SKIP] Fix 7c: Concept-sort category header closing not found"
}

# ── Fix 8: Lesson-plan heading mismatches - </h4> → </h3> where opens with <h3> ──
# Objectives
$old8a = '                           <h3 style="margin: 0 0 5px 0; color: #6366f1; font-size: 0.9em; text-transform: uppercase;">' + "`r`n" + '                               ${renderHeader(''objectives'')}' + "`r`n" + '                           </h4>'
$new8a = '                           <h3 style="margin: 0 0 5px 0; color: #6366f1; font-size: 0.9em; text-transform: uppercase;">' + "`r`n" + '                               ${renderHeader(''objectives'')}' + "`r`n" + '                           </h3>'
if ($content.Contains($old8a)) {
    $content = $content.Replace($old8a, $new8a)
    $count++
    Write-Host "[OK] Fix 8a: Lesson-plan objectives </h4> -> </h3>"
} else {
    Write-Host "[SKIP] Fix 8a: Objectives heading pattern not found"
}

# Hook
$old8b = '<span style="margin-right:6px;">&#127907;</span>${renderHeader(''hook'')}' + "`r`n" + '                           </h4>'
$new8b = '<span aria-hidden="true" style="margin-right:6px;">&#127907;</span>${renderHeader(''hook'')}' + "`r`n" + '                           </h3>'
if ($content.Contains($old8b)) {
    $content = $content.Replace($old8b, $new8b)
    $count++
    Write-Host "[OK] Fix 8b: Lesson-plan hook </h4> -> </h3> + aria-hidden"
} else {
    Write-Host "[SKIP] Fix 8b: Hook heading pattern not found"
}

# Direct Instruction
$old8c = '<span style="margin-right:6px;">&#128214;</span>${renderHeader(''directInstruction'')}' + "`r`n" + '                           </h4>'
$new8c = '<span aria-hidden="true" style="margin-right:6px;">&#128214;</span>${renderHeader(''directInstruction'')}' + "`r`n" + '                           </h3>'
if ($content.Contains($old8c)) {
    $content = $content.Replace($old8c, $new8c)
    $count++
    Write-Host "[OK] Fix 8c: Lesson-plan directInstruction </h4> -> </h3>"
} else {
    Write-Host "[SKIP] Fix 8c: Direct Instruction heading pattern not found"
}

# Guided Practice
$old8d = '<span style="margin-right:6px;">&#128101;</span>${renderHeader(''guidedPractice'')}' + "`r`n" + '                               </h4>'
$new8d = '<span aria-hidden="true" style="margin-right:6px;">&#128101;</span>${renderHeader(''guidedPractice'')}' + "`r`n" + '                               </h3>'
if ($content.Contains($old8d)) {
    $content = $content.Replace($old8d, $new8d)
    $count++
    Write-Host "[OK] Fix 8d: Lesson-plan guidedPractice </h4> -> </h3>"
} else {
    Write-Host "[SKIP] Fix 8d: Guided Practice heading pattern not found"
}

# Independent Practice
$old8e = '<span style="margin-right:6px;">&#9999;&#65039;</span>${renderHeader(''independentPractice'')}' + "`r`n" + '                               </h4>'
$new8e = '<span aria-hidden="true" style="margin-right:6px;">&#9999;&#65039;</span>${renderHeader(''independentPractice'')}' + "`r`n" + '                               </h3>'
if ($content.Contains($old8e)) {
    $content = $content.Replace($old8e, $new8e)
    $count++
    Write-Host "[OK] Fix 8e: Lesson-plan independentPractice </h4> -> </h3>"
} else {
    Write-Host "[SKIP] Fix 8e: Independent Practice heading pattern not found"
}

# Closure
$old8f = '<span style="margin-right:6px;">&#127919;</span>${renderHeader(''closure'')}' + "`r`n" + '                           </h4>'
$new8f = '<span aria-hidden="true" style="margin-right:6px;">&#127919;</span>${renderHeader(''closure'')}' + "`r`n" + '                           </h3>'
if ($content.Contains($old8f)) {
    $content = $content.Replace($old8f, $new8f)
    $count++
    Write-Host "[OK] Fix 8f: Lesson-plan closure </h4> -> </h3>"
} else {
    Write-Host "[SKIP] Fix 8f: Closure heading pattern not found"
}

# ── Fix 9: Lesson-plan essential question header ──
$old9 = '<h4 style="margin: 0 0 5px 0; color: #7c3aed; font-size: 0.9em; text-transform: uppercase;">' + "`r`n" + '                               <span style="margin-right:6px;">&#10067;</span>${renderHeader(''essentialQuestion'')}'+ "`r`n" + '                           </h4>'
$new9 = '<h3 style="margin: 0 0 5px 0; color: #7c3aed; font-size: 0.9em; text-transform: uppercase;">' + "`r`n" + '                               <span aria-hidden="true" style="margin-right:6px;">&#10067;</span>${renderHeader(''essentialQuestion'')}'+ "`r`n" + '                           </h3>'
if ($content.Contains($old9)) {
    $content = $content.Replace($old9, $new9)
    $count++
    Write-Host "[OK] Fix 9: Essential question h4 -> h3"
} else {
    Write-Host "[SKIP] Fix 9: Essential question heading not found"
}

# ── Fix 10: Lesson-plan materials header h4 → h3 ──
$old10 = '<h4 style="margin: 0 0 10px 0; color: #059669; font-size: 0.9em; text-transform: uppercase; font-weight: 800;">' + "`r`n" + '                               <span style="margin-right:6px;">&#128230;</span>${t(''lesson_plan.materials_header'')}'+ "`r`n" + '                           </h4>'
$new10 = '<h3 style="margin: 0 0 10px 0; color: #059669; font-size: 0.9em; text-transform: uppercase; font-weight: 800;">' + "`r`n" + '                               <span aria-hidden="true" style="margin-right:6px;">&#128230;</span>${t(''lesson_plan.materials_header'')}'+ "`r`n" + '                           </h3>'
if ($content.Contains($old10)) {
    $content = $content.Replace($old10, $new10)
    $count++
    Write-Host "[OK] Fix 10: Materials header h4 -> h3"
} else {
    Write-Host "[SKIP] Fix 10: Materials header not found"
}

# ── Save ──
[System.IO.File]::WriteAllText($file, $content)
Write-Host "`n=== Applied $count Phase 1b accessibility fixes ==="
