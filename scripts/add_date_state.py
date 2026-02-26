"""Add the date range state variables to StudentAnalyticsPanel."""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    content = SRC.read_text(encoding='utf-8')
    anchor = "const [showRTISettings, setShowRTISettings] = React.useState(false);"
    addition = (
        "\n    const [reportStartDate, setReportStartDate] = React.useState('');"
        "\n    const [reportEndDate, setReportEndDate] = React.useState('');"
    )
    if anchor in content and 'reportStartDate' not in content:
        content = content.replace(anchor, anchor + addition, 1)
        SRC.write_text(content, encoding='utf-8')
        print("Added date range state variables")
    elif 'reportStartDate' in content:
        print("Already present")
    else:
        print("Anchor not found")

if __name__ == "__main__":
    main()
