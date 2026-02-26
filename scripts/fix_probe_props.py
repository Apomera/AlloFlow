"""
fix_probe_props.py — Add missing probe-related props to StudentAnalyticsPanel
Fixes: ReferenceError: probeGradeLevel is not defined
"""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    content = SRC.read_text(encoding='utf-8')
    
    # Missing props that need to be added to the StudentAnalyticsPanel signature and render call
    missing_props = [
        'probeGradeLevel', 'setProbeGradeLevel',
        'probeActivity', 'setProbeActivity',
        'probeForm', 'setProbeForm',
        'isProbeMode', 'setIsProbeMode',
        'setProbeTargetStudent',
        'setWsPreloadedWords',
        'setWordSoundsActivity',
        'setIsWordSoundsMode',
        'setActiveView',
        'setGeneratedContent',
        'setIsFluencyMode',
        'setFluencyStatus',
        'setFluencyResult',
    ]
    
    # 1. Fix component signature (add to prop destructuring)
    old_sig = 'const StudentAnalyticsPanel = React.memo(({ isOpen, onClose, t, rosterKey, setRosterKey, latestProbeResult, setLatestProbeResult, rosterQueue, setRosterQueue, screenerSession, setScreenerSession, onLaunchORF, probeHistory, interventionLogs, addToast }) => {'
    
    # Add the missing props before the closing }) =>
    new_props_str = ', '.join(missing_props)
    new_sig = old_sig.replace('addToast })', f'addToast, {new_props_str} }})')
    
    if old_sig in content:
        content = content.replace(old_sig, new_sig)
        print("✅ Added missing props to StudentAnalyticsPanel signature")
    else:
        print("❌ Could not find component signature")
        return
    
    # 2. Fix render call (add props when rendering <StudentAnalyticsPanel>)
    # Find the closing /> of the StudentAnalyticsPanel render
    render_anchor = 'addToast={addToast}\n\n          />'
    
    # Build the new props
    prop_lines = []
    for prop in missing_props:
        prop_lines.append(f'              {prop}={{{prop}}}')
    
    new_render = 'addToast={addToast}\n' + '\n'.join(prop_lines) + '\n\n          />'
    
    if render_anchor in content:
        content = content.replace(render_anchor, new_render)
        print("✅ Added missing props to StudentAnalyticsPanel render call")
    else:
        print("⚠️  Render anchor not found - trying alternate...")
        # Try finding the render more flexibly
        import re
        # Find addToast={addToast} followed by /> in the StudentAnalyticsPanel area
        pattern = r'(addToast=\{addToast\}\s*\n\s*\n\s*/>)'
        matches = list(re.finditer(pattern, content))
        # Find the one near line 71600+
        for match in matches:
            pos = match.start()
            line_count = content[:pos].count('\n')
            if line_count > 71000:
                prop_jsx = '\n'.join([f'              {p}={{{p}}}' for p in missing_props])
                replacement = f'addToast={{addToast}}\n{prop_jsx}\n\n          />'
                content = content[:match.start()] + replacement + content[match.end():]
                print(f"✅ Added missing props to render call (found at line {line_count + 1})")
                break
        else:
            print("❌ Could not find render call")
    
    SRC.write_text(content, encoding='utf-8')
    print(f"\n✅ Saved {SRC.name}")
    print(f"Added {len(missing_props)} props: {', '.join(missing_props)}")

if __name__ == "__main__":
    main()
