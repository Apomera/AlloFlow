#!/usr/bin/env python3
"""
Update renderPrompt to use visibility mode - direct replace
"""

from pathlib import Path

def update_render_prompt(file_path: Path) -> bool:
    """Update renderPrompt image condition to respect visibility mode."""
    
    content = file_path.read_text(encoding='utf-8')
    
    # The old pattern
    old_pattern = """    // Common Prompt Renderer
    const renderPrompt = () => (
        <div className="text-center mb-6 relative">

            {!showWordText && currentWordImage ? (
                <div className="flex flex-col items-center animate-in fade-in zoom-in">"""
    
    # New pattern with visibility mode logic
    new_pattern = """    // Common Prompt Renderer
    const renderPrompt = () => {
        // Determine if image should be shown based on visibility mode
        const shouldShowImage = currentWordImage && (
            imageVisibilityMode === 'alwaysOn' ||
            (imageVisibilityMode !== 'alwaysOff' && showImageForCurrentWord)
        );
        
        return (
        <div className="text-center mb-6 relative">

            {shouldShowImage && !showWordText ? (
                <div className="flex flex-col items-center animate-in fade-in zoom-in">"""
    
    if old_pattern in content:
        content = content.replace(old_pattern, new_pattern)
        
        # Also need to close the function properly - find the matching closing paren
        # The function ends with );  we need to change it to );}
        # Find where renderPrompt ends
        old_end = "    );\n\n    // Common Answer Checker"
        new_end = "    );\n    };\n\n    // Common Answer Checker"
        
        if old_end in content:
            content = content.replace(old_end, new_end, 1)
        
        file_path.write_text(content, encoding='utf-8')
        print("✓ Updated renderPrompt to respect image visibility mode")
        return True
    else:
        print("✗ Could not find renderPrompt pattern - may already be updated")
        # Check if already updated
        if "const shouldShowImage = currentWordImage" in content:
            print("  ℹ Already updated")
            return True
        return False

if __name__ == "__main__":
    file_path = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
    update_render_prompt(file_path)
