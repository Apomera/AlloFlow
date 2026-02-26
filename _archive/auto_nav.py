#!/usr/bin/env python3
"""
Add auto-navigation to Review Panel when word preloading completes in WordSoundsGenerator.
"""

from pathlib import Path

def add_auto_navigation(file_path: Path):
    content = file_path.read_text(encoding='utf-8')
    
    # Find location after state definitions in WordSoundsGenerator
    # Add a useEffect that auto-navigates when words are ready
    old_section = """// Processing State
        const [isProcessing, setIsProcessing] = React.useState(false);
        const [isMinimized, setIsMinimized] = React.useState(false); // Fake Minimize State
        const [generatedCount, setGeneratedCount] = React.useState(0);
        const [selectedIndices, setSelectedIndices] = React.useState(new Set());

        
        // Helper for syllable counting"""
    
    new_section = """// Processing State
        const [isProcessing, setIsProcessing] = React.useState(false);
        const [isMinimized, setIsMinimized] = React.useState(false); // Fake Minimize State
        const [generatedCount, setGeneratedCount] = React.useState(0);
        const [selectedIndices, setSelectedIndices] = React.useState(new Set());
        
        // Track if we already auto-navigated this session
        const hasAutoNavigated = React.useRef(false);
        
        // AUTO-NAVIGATION: Automatically open Review Panel when words are ready
        React.useEffect(() => {
            if (preloadedWords.length > 0 && !isProcessing && onShowReview && !hasAutoNavigated.current) {
                console.log("📋 Words preloaded! Auto-navigating to Review Panel...");
                hasAutoNavigated.current = true;
                // Small delay to ensure UI is settled
                const timer = setTimeout(() => {
                    onShowReview();
                }, 300);
                return () => clearTimeout(timer);
            }
        }, [preloadedWords.length, isProcessing, onShowReview]);

        
        // Helper for syllable counting"""
    
    if old_section in content:
        content = content.replace(old_section, new_section)
        file_path.write_text(content, encoding='utf-8')
        print("✓ Added auto-navigation useEffect to WordSoundsGenerator")
        return True
    else:
        print("✗ Could not find location to add auto-navigation")
        return False

if __name__ == "__main__":
    file_path = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
    add_auto_navigation(file_path)
