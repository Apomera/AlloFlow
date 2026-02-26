"""Force-add the date range useState declarations."""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    content = SRC.read_text(encoding='utf-8')
    anchor = "const [showRTISettings, setShowRTISettings] = React.useState(false);"
    
    if 'const [reportStartDate' in content:
        print("useState declaration already exists")
        return
    
    if anchor not in content:
        print("Anchor not found")
        return
    
    new_text = anchor + "\n    const [reportStartDate, setReportStartDate] = React.useState('');\n    const [reportEndDate, setReportEndDate] = React.useState('');"
    content = content.replace(anchor, new_text, 1)
    SRC.write_text(content, encoding='utf-8')
    print("Added useState declarations for reportStartDate and reportEndDate")

if __name__ == "__main__":
    main()
