"""
Label Challenge Feature — Part 1: Core Logic
Adds: props, state, challenge functions, and toolbar modifications.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
with open(filepath, 'rb') as f:
    content = f.read().decode('utf-8')
lines = content.split('\n')
original_count = len(lines)
fixed = 0

# ============================================================
# FIX 1: Update VisualPanelGrid signature to add new props
# ============================================================
for i in range(len(lines)):
    if 'const VisualPanelGrid = React.memo' in lines[i] and 'visualPlan' in lines[i]:
        if 'isTeacherMode' not in lines[i]:
            lines[i] = lines[i].replace(
                'initialAnnotations, onAnnotationsChange })',
                'initialAnnotations, onAnnotationsChange, isTeacherMode, onChallengeSubmit, callGemini })'
            )
            fixed += 1
            print(f"  [OK] FIX 1: Updated signature at L{i+1}")
        break

# ============================================================
# FIX 2: Add challenge state variables after existing state
# Insert after the refineInput state
# ============================================================
for i in range(len(lines)):
    if "const [refineInput, setRefineInput] = React.useState('');" in lines[i] and i < 2000:
        challenge_state = [
            '    // === Label Challenge State ===\r',
            '    const [challengeMode, setChallengeMode] = React.useState(initialAnnotations?.challengeActive || false);\r',
            '    const [challengeSubmitted, setChallengeSubmitted] = React.useState(false);\r',
            '    const [challengeResult, setChallengeResult] = React.useState(null);\r',
            '    const [studentLabels, setStudentLabels] = React.useState({});\r',
            '    const [showComparison, setShowComparison] = React.useState(false);\r',
            '    const [isAnalyzing, setIsAnalyzing] = React.useState(false);\r',
            '    const isStudentChallenge = !isTeacherMode && challengeMode;\r',
        ]
        lines[i+1:i+1] = challenge_state
        fixed += 1
        print(f"  [OK] FIX 2: Added challenge state after L{i+1}")
        break

# Rebuild lines after insert
content_tmp = '\n'.join(lines)
lines = content_tmp.split('\n')

# ============================================================
# FIX 3: Update annotation persistence useEffect to include challengeActive
# ============================================================
for i in range(len(lines)):
    if 'onAnnotationsChange({ userLabels, drawings, captionOverrides, aiLabelPositions, panelOrder })' in lines[i]:
        lines[i] = lines[i].replace(
            'onAnnotationsChange({ userLabels, drawings, captionOverrides, aiLabelPositions, panelOrder })',
            'onAnnotationsChange({ userLabels, drawings, captionOverrides, aiLabelPositions, panelOrder, challengeActive: challengeMode })'
        )
        fixed += 1
        print(f"  [OK] FIX 3: Added challengeActive to annotations persist at L{i+1}")
        break

# ============================================================
# FIX 4: Add student label add handler + Gemini analysis function
# Insert after pushVisualSnapshot function block
# ============================================================
for i in range(len(lines)):
    if '// === F7: Undo/Redo for ALL Visual Actions ===' in lines[i] and i < 2000:
        challenge_funcs = [
            '    // === Label Challenge Functions ===\r',
            '    const handleAddStudentLabel = (panelIdx, e) => {\r',
            '        if (addingLabelPanel === null || !isStudentChallenge) return;\r',
            '        const rect = e.currentTarget.getBoundingClientRect();\r',
            '        const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);\r',
            '        const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);\r',
            '        const newLabel = { id: Date.now(), text: "New Label", x: parseFloat(x), y: parseFloat(y) };\r',
            '        setStudentLabels(prev => ({ ...prev, [panelIdx]: [...(prev[panelIdx] || []), newLabel] }));\r',
            '        setAddingLabelPanel(null);\r',
            '    };\r',
            '\r',
            '    const handleDeleteStudentLabel = (panelIdx, labelId) => {\r',
            '        setStudentLabels(prev => ({\r',
            '            ...prev,\r',
            '            [panelIdx]: (prev[panelIdx] || []).filter(l => l.id !== labelId)\r',
            '        }));\r',
            '    };\r',
            '\r',
            '    const handleStudentLabelTextChange = (panelIdx, labelId, newText) => {\r',
            '        setStudentLabels(prev => ({\r',
            '            ...prev,\r',
            '            [panelIdx]: (prev[panelIdx] || []).map(l => l.id === labelId ? { ...l, text: newText } : l)\r',
            '        }));\r',
            '    };\r',
            '\r',
            '    const handleChallengeSubmit = async () => {\r',
            '        if (!callGemini || isAnalyzing) return;\r',
            '        setIsAnalyzing(true);\r',
            '        try {\r',
            '            const teacherLabelsList = [\r',
            '                ...visualPlan.panels.flatMap((p, i) => (p.labels || []).map((l, li) => ({ panel: i, text: l, type: "ai" }))),\r',
            '                ...Object.entries(userLabels).flatMap(([i, labels]) => labels.map(l => ({ panel: parseInt(i), text: l.text, x: l.x, y: l.y, type: "teacher" })))\r',
            '            ];\r',
            '            const studentLabelsList = Object.entries(studentLabels).flatMap(([i, labels]) =>\r',
            '                labels.map(l => ({ panel: parseInt(i), text: l.text, x: l.x, y: l.y }))\r',
            '            );\r',
            '            const panelDescriptions = visualPlan.panels.map((p, i) => ({ panel: i, caption: p.caption || "", role: p.role || "" }));\r',
            '            const analysisPrompt = `You are an educational assessment evaluator reviewing a student diagram labeling exercise.\r',
            'Concept: "${visualPlan.title || "diagram"}"\r',
            'Panel descriptions: ${JSON.stringify(panelDescriptions)}\r',
            'Teacher answer key (correct labels): ${JSON.stringify(teacherLabelsList)}\r',
            'Student submitted labels: ${JSON.stringify(studentLabelsList)}\r',
            '\r',
            'Evaluate each student label for accuracy. A label is "correct" if it identifies the right concept and is placed in approximately the right area. A label is "close" if the concept is right but placement is significantly off, or if the text is a reasonable synonym. A label is "incorrect" if the concept is wrong.\r',
            '\r',
            'Return ONLY valid JSON:\r',
            '{\r',
            '  "score": 0-100,\r',
            '  "totalCorrect": N,\r',
            '  "totalExpected": N,\r',
            '  "feedback": "2-3 sentence encouraging summary for a student",\r',
            '  "labelResults": [{"studentLabel": "...", "verdict": "correct|close|incorrect", "note": "brief explanation"}]\r',
            '}`;\r',
            '            const rawResult = await callGemini(analysisPrompt);\r',
            '            let parsed;\r',
            '            try {\r',
            '                const jsonMatch = rawResult.match(/\\{[\\s\\S]*\\}/);\r',
            '                parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawResult);\r',
            '            } catch(e) {\r',
            '                parsed = { score: 50, totalCorrect: 0, totalExpected: teacherLabelsList.length, feedback: "Analysis complete.", labelResults: [] };\r',
            '            }\r',
            '            setChallengeResult(parsed);\r',
            '            setChallengeSubmitted(true);\r',
            '            setShowComparison(true);\r',
            '            if (onChallengeSubmit) onChallengeSubmit(parsed);\r',
            '        } catch(err) {\r',
            '            console.error("[LabelChallenge] Analysis failed:", err);\r',
            '            setChallengeResult({ score: 0, feedback: "Could not analyze labels. Try again.", labelResults: [] });\r',
            '            setChallengeSubmitted(true);\r',
            '        } finally {\r',
            '            setIsAnalyzing(false);\r',
            '        }\r',
            '    };\r',
            '\r',
            '    const handleToggleChallenge = () => {\r',
            '        const newVal = !challengeMode;\r',
            '        setChallengeMode(newVal);\r',
            '        if (!newVal) {\r',
            '            setChallengeSubmitted(false);\r',
            '            setChallengeResult(null);\r',
            '            setStudentLabels({});\r',
            '            setShowComparison(false);\r',
            '        }\r',
            '    };\r',
            '\r',
            '    const handleResetChallenge = () => {\r',
            '        setStudentLabels({});\r',
            '        setChallengeSubmitted(false);\r',
            '        setChallengeResult(null);\r',
            '        setShowComparison(false);\r',
            '    };\r',
            '\r',
        ]
        lines[i:i] = challenge_funcs
        fixed += 1
        print(f"  [OK] FIX 4: Added challenge functions before L{i+1}")
        break

# Write intermediate
content = '\n'.join(lines)
new_count = len(content.split('\n'))
diff = new_count - original_count
print(f"\nLine count: {original_count} -> {new_count} (diff: {diff:+d})")
print(f"Fixes applied: {fixed}")

with open(filepath, 'wb') as f:
    f.write(content.encode('utf-8'))
print("Part 1 done!")
