#!/usr/bin/env python3
"""Verify and fix all RTI enhancements — adds any missing pieces."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()

print(f"Starting with {len(lines)} lines")

# Check what's present
checks = {
    'rtiTierOverrides': any('rtiTierOverrides' in l for l in lines),
    'rtiDecisionRuleMethod': any('rtiDecisionRuleMethod' in l for l in lines),
    'mathDCPMTier3': any('mathDCPMTier3' in l for l in lines),
    'Tier Override Dropdown': any('Tier Override Dropdown' in l for l in lines),
    'Decision Rule Settings': any('Decision Rule Settings' in l for l in lines),
    'Math DCPM Trend': any('Math DCPM Trend' in l for l in lines),
}
for k,v in checks.items():
    print(f"  {k}: {'PRESENT' if v else 'MISSING'}")

total_inserted = 0

# === FIX 1: Add Math DCPM to classifyRTITier if missing ===
if not checks['mathDCPMTier3']:
    anchor = None
    for i, l in enumerate(lines):
        if 'from-scratch label' in l:
            for k in range(i, min(i+4, len(lines))):
                if lines[k].strip() == '}':
                    anchor = k
                    break
            break
    if anchor:
        block = [
            '',
            '        // Math Fluency (DCPM)',
            '        if (stats.mathDCPM > 0 && stats.mathDCPM < (t3.mathDCPMTier3 || 20)) {',
            '            tier = Math.max(tier, 3);',
            '            reasons.push(`Math fluency critically below ${t3.mathDCPMTier3 || 20} DCPM`);',
            '            recs.push("Implement daily math fact practice with timed drills; focus on single-operation mastery");',
            '        } else if (stats.mathDCPM > 0 && stats.mathDCPM < (t3.mathDCPMTier2 || 40)) {',
            '            tier = Math.max(tier, 2);',
            '            reasons.push(`Math fluency developing (below ${t3.mathDCPMTier2 || 40} DCPM)`);',
            '            recs.push("Use Fluency Probes 2-3x/week to build automaticity; gradually increase operation complexity");',
            '        }',
        ]
        for j, dl in enumerate(block):
            lines.insert(anchor + 1 + j, dl)
        total_inserted += len(block)
        print(f"FIX 1: Added Math DCPM to classifyRTITier after L{anchor+1}")
    else:
        print("FIX 1: FAILED - could not find anchor")

# === FIX 2: Add Tier Override Dropdown if missing ===
if not checks['Tier Override Dropdown']:
    anchor = None
    for i, l in enumerate(lines):
        if 'RTI Progress Monitor' in l and i > 13000:
            for k in range(i, min(i + 12, len(lines))):
                if 'new Date().toLocaleDateString()' in lines[k]:
                    for m in range(k, min(k + 4, len(lines))):
                        if '</div>' in lines[m]:
                            anchor = m + 1
                            break
                    break
            break
    if anchor:
        block = [
            '                                            {/* Tier Override Dropdown */}',
            '                                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>',
            '                                                <select',
            '                                                    aria-label="Override RTI tier"',
            '                                                    value={rtiTierOverrides[selectedStudent.name] || "auto"}',
            '                                                    onChange={(e) => setRtiTierOverrides(prev => ({ ...prev, [selectedStudent.name]: e.target.value === "auto" ? undefined : parseInt(e.target.value) }))}',
            '                                                    style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "6px", border: "1px solid #e2e8f0", fontWeight: 600, cursor: "pointer" }}',
            '                                                >',
            '                                                    <option value="auto">Auto</option>',
            '                                                    <option value="1">Tier 1</option>',
            '                                                    <option value="2">Tier 2</option>',
            '                                                    <option value="3">Tier 3</option>',
            '                                                </select>',
            '                                                {rtiTierOverrides[selectedStudent.name] && <span style={{ fontSize: "11px" }} title="Manually assigned tier">\U0001F4CC</span>}',
            '                                            </div>',
        ]
        for j, ol in enumerate(block):
            lines.insert(anchor + j, ol)
        total_inserted += len(block)
        print(f"FIX 2: Added Tier Override Dropdown at L{anchor+1}")
    else:
        print("FIX 2: Skipped (could not find anchor)")

# === FIX 3: Add Decision Rule Settings if missing ===
if not checks['Decision Rule Settings']:
    anchor = None
    for i, l in enumerate(lines):
        if '{/* Intervention Log */}' in l and i > 13000:
            anchor = i
            break
    if anchor:
        block = [
            '                                        {/* Decision Rule Configuration */}',
            '                                        <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200">',
            '                                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#7c3aed", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}>',
            '                                                \u2699\uFE0F Decision Rule Settings',
            '                                            </div>',
            '                                            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>',
            '                                                <select',
            '                                                    aria-label="Decision rule method"',
            '                                                    value={rtiDecisionRuleMethod}',
            '                                                    onChange={(e) => setRtiDecisionRuleMethod(e.target.value)}',
            '                                                    style={{ fontSize: "10px", padding: "3px 6px", borderRadius: "6px", border: "1px solid #e2e8f0", fontWeight: 600 }}',
            '                                                >',
            '                                                    <option value="four_point">Four-Point Analysis</option>',
            '                                                    <option value="trend_line">Trend Line Comparison</option>',
            '                                                    <option value="median_3">Median of Last 3</option>',
            '                                                </select>',
            '                                                {rtiDecisionRuleMethod === "four_point" && (',
            '                                                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>',
            '                                                        <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 600 }}>Threshold:</span>',
            '                                                        <select',
            '                                                            aria-label="Decision threshold"',
            '                                                            value={rtiDecisionRuleThreshold}',
            '                                                            onChange={(e) => setRtiDecisionRuleThreshold(parseInt(e.target.value))}',
            '                                                            style={{ fontSize: "10px", padding: "2px 4px", borderRadius: "4px", border: "1px solid #e2e8f0", fontWeight: 600 }}',
            '                                                        >',
            '                                                            <option value={3}>3 points</option>',
            '                                                            <option value={4}>4 points</option>',
            '                                                            <option value={5}>5 points</option>',
            '                                                            <option value={6}>6 points</option>',
            '                                                        </select>',
            '                                                    </div>',
            '                                                )}',
            '                                                <span style={{ fontSize: "9px", color: "#94a3b8", fontStyle: "italic" }}>NCII recommended</span>',
            '                                            </div>',
            '                                        </div>',
        ]
        for j, cl in enumerate(block):
            lines.insert(anchor + j, cl)
        total_inserted += len(block)
        print(f"FIX 3: Added Decision Rule Settings before L{anchor+1}")
    else:
        print("FIX 3: FAILED - could not find Intervention Log comment")

# === FIX 4: Add Math DCPM Sparkline if missing ===
if not checks['Math DCPM Trend']:
    anchor = None
    for i, l in enumerate(lines):
        if 'Game Scores Trend' in l and i > 13000:
            for k in range(i, min(i + 10, len(lines))):
                if lines[k].strip() == ')}':
                    anchor = k + 1
                    break
            break
    if anchor:
        block = [
            '                                                {mathFluencyHistory.length >= 2 && (',
            '                                                    <div className="bg-white rounded-lg p-2 border border-slate-100">',
            '                                                        <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", marginBottom: "4px" }}>\U0001F522 Math DCPM Trend</div>',
            '                                                        {renderSparkline(mathFluencyHistory.map(h => h.dcpm), "#f59e0b")}',
            '                                                    </div>',
            '                                                )}',
        ]
        for j, sl in enumerate(block):
            lines.insert(anchor + j, sl)
        total_inserted += len(block)
        print(f"FIX 4: Added Math DCPM Sparkline after L{anchor+1}")
    else:
        print("FIX 4: FAILED - could not find Game Scores Trend section")

if total_inserted == 0:
    print("\nAll RTI enhancements already present!")
else:
    print(f"\nInserted {total_inserted} lines total")
    with open(FILE, 'w', encoding='utf-8', newline='\r\n') as f:
        for l in lines:
            f.write(l.rstrip('\r\n') + '\n')
    print(f"File saved: {len(lines)} lines")
