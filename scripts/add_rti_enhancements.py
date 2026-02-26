#!/usr/bin/env python3
"""
RTI Enhancements — Phase 2:
1. Add rtiTierOverrides state + tier override dropdown in the RTI panel
2. Add Math DCPM to classifyRTITier
3. Add rtiDecisionRuleMethod + rtiDecisionRuleThreshold state variables
4. Make decision rule thresholds configurable
5. Add Math DCPM sparkline
"""

import sys, os

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

def read_file():
    with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
        return f.readlines()

def write_file(lines):
    with open(FILE, 'w', encoding='utf-8', newline='\r\n') as f:
        for l in lines:
            f.write(l.rstrip('\r\n') + '\n')

def apply():
    lines = read_file()
    print(f"Original: {len(lines)} lines")
    total_inserted = 0

    # === MOD 1: Add RTI state variables (tier override, decision rule config) ===
    anchor1 = None
    for i, l in enumerate(lines):
        if 'rtiGoals' in l and 'useState' in l:
            anchor1 = i
            break
    if anchor1 is None:
        for i, l in enumerate(lines):
            if 'rtiThresholds' in l and 'useState' in l:
                anchor1 = i
                break
    if anchor1 is None:
        for i, l in enumerate(lines):
            if 'interventionLogs' in l and 'useState' in l:
                anchor1 = i
                break
    if anchor1 is None:
        print("ERROR: Could not find RTI state variables area")
        sys.exit(1)
    print(f"MOD 1: Adding RTI state vars after L{anchor1+1}: {lines[anchor1].rstrip()[:80]}")
    new_state = [
        '  // === RTI ENHANCEMENTS: Tier Overrides & Decision Rule Config ===',
        '  const [rtiTierOverrides, setRtiTierOverrides] = useState({});',
        '  const [rtiDecisionRuleMethod, setRtiDecisionRuleMethod] = useState("four_point");',
        '  const [rtiDecisionRuleThreshold, setRtiDecisionRuleThreshold] = useState(4);',
        '  const [rtiDismissedAlerts, setRtiDismissedAlerts] = useState({});',
    ]
    for j, sl in enumerate(new_state):
        lines.insert(anchor1 + 1 + j, sl)
    total_inserted += len(new_state)
    print(f"  Inserted {len(new_state)} lines")

    # === MOD 2: Add Math DCPM to classifyRTITier ===
    anchor2 = None
    for i, l in enumerate(lines):
        if 'labelChallengeMin' in l and 'recs.push' in lines[min(i+1, len(lines)-1)]:
            # Find closing brace
            for k in range(i+1, min(i+6, len(lines))):
                if lines[k].strip() == '}':
                    anchor2 = k
                    break
            break
    if anchor2 is None:
        # Alternate: find the line with "from-scratch labeling" recommendation
        for i, l in enumerate(lines):
            if 'from-scratch labeling' in l or 'from-scratch label' in l:
                for k in range(i, min(i+4, len(lines))):
                    if lines[k].strip() == '}':
                        anchor2 = k
                        break
                break
    if anchor2 is None:
        print("WARN: Could not find Label Challenge closing brace")
    else:
        print(f"MOD 2: Adding Math DCPM after L{anchor2+1}")
        dcpm_block = [
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
        for j, dl in enumerate(dcpm_block):
            lines.insert(anchor2 + 1 + j, dl)
        total_inserted += len(dcpm_block)
        print(f"  Inserted {len(dcpm_block)} lines")

    # === MOD 3: Add tier override dropdown in the RTI panel ===
    anchor3 = None
    for i, l in enumerate(lines):
        if 'RTI Progress Monitor' in l and i > 13000:
            # Find the date display line
            for k in range(i, min(i + 12, len(lines))):
                if 'new Date().toLocaleDateString()' in lines[k]:
                    # Find closing </div> after the date
                    for m in range(k, min(k + 4, len(lines))):
                        if '</div>' in lines[m]:
                            anchor3 = m + 1
                            break
                    break
            break
    if anchor3 is None:
        print("WARN: Could not find RTI Progress Monitor date section")
    else:
        print(f"MOD 3: Adding tier override dropdown at L{anchor3+1}")
        override_ui = [
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
            '                                                {rtiTierOverrides[selectedStudent.name] && <span style={{ fontSize: "11px" }} title="Manually assigned tier">📌</span>}',
            '                                            </div>',
        ]
        for j, ol in enumerate(override_ui):
            lines.insert(anchor3 + j, ol)
        total_inserted += len(override_ui)
        print(f"  Inserted {len(override_ui)} lines")

    # === MOD 4: Add decision rule configuration UI ===
    anchor4 = None
    for i, l in enumerate(lines):
        if 'Intervention Log' in l and i > 13000 and 'fontWeight' in l:
            # The parent div is a few lines above
            for k in range(max(0, i-4), i):
                if '<div className=' in lines[k] or 'mt-3 p-3 bg-white' in lines[k]:
                    anchor4 = k
                    break
            break
    if anchor4 is None:
        print("WARN: Could not find Intervention Log section")
    else:
        print(f"MOD 4: Adding decision rule config before L{anchor4+1}")
        config_ui = [
            '                                        {/* Decision Rule Configuration */}',
            '                                        <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200">',
            '                                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#7c3aed", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}>',
            '                                                ⚙️ Decision Rule Settings',
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
        for j, cl in enumerate(config_ui):
            lines.insert(anchor4 + j, cl)
        total_inserted += len(config_ui)
        print(f"  Inserted {len(config_ui)} lines")

    # === MOD 5: Add Math DCPM sparkline alongside existing sparklines ===
    anchor5 = None
    for i, l in enumerate(lines):
        if 'Game Scores Trend' in l and i > 13000:
            # Find the closing of the game scores sparkline section
            for k in range(i, min(i + 10, len(lines))):
                stripped = lines[k].strip()
                if stripped == ')}':
                    anchor5 = k + 1
                    break
            break
    if anchor5 is None:
        print("WARN: Could not find Game Scores Trend closing")
    else:
        print(f"MOD 5: Adding Math DCPM sparkline after L{anchor5+1}")
        dcpm_sparkline = [
            '                                                {mathFluencyHistory.length >= 2 && (',
            '                                                    <div className="bg-white rounded-lg p-2 border border-slate-100">',
            '                                                        <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", marginBottom: "4px" }}>🔢 Math DCPM Trend</div>',
            '                                                        {renderSparkline(mathFluencyHistory.map(h => h.dcpm), "#f59e0b")}',
            '                                                    </div>',
            '                                                )}',
        ]
        for j, sl in enumerate(dcpm_sparkline):
            lines.insert(anchor5 + j, sl)
        total_inserted += len(dcpm_sparkline)
        print(f"  Inserted {len(dcpm_sparkline)} lines")

    print(f"\nTotal lines inserted: {total_inserted}")
    print(f"New total: {len(lines)} lines")
    write_file(lines)
    print("File written successfully")

if __name__ == '__main__':
    apply()
