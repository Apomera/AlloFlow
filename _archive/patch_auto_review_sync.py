
import os

file_path = "c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt"

def patch_auto_review_sync():
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # The issue: useState(initialShowReviewPanel) only reads the prop on FIRST render.
    # If WordSoundsModal is already mounted and the prop changes, the state doesn't update.
    # Solution: Add a useEffect to sync the prop to state.
    
    # Anchor: `const [showReviewPanel, setShowReviewPanel] = React.useState(initialShowReviewPanel || false);`
    # Insert AFTER: a useEffect that updates showReviewPanel when initialShowReviewPanel changes.
    
    anchor = "const [showReviewPanel, setShowReviewPanel] = React.useState(initialShowReviewPanel || false);"
    
    sync_effect = """
    // Sync showReviewPanel state with initialShowReviewPanel prop changes
    React.useEffect(() => {
        if (initialShowReviewPanel) {
            setShowReviewPanel(true);
        }
    }, [initialShowReviewPanel]);
    """
    
    # Check if already exists
    if "Sync showReviewPanel state with" in content:
        print("Sync effect already exists. Skipping injection.")
    elif anchor in content:
        content = content.replace(anchor, anchor + sync_effect)
        print("Injected useEffect to sync showReviewPanel with prop")
    else:
        print("Warning: Anchor not found")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Auto-Review Sync Patch Complete")

if __name__ == "__main__":
    patch_auto_review_sync()
