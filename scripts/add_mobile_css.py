"""
Mobile/Tablet CSS Pass — inject responsive improvements into existing style block.
Targets the closing of the existing mobile CSS block before the style tag close.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Find the end of the existing mobile CSS — right before the style tag closes
# The pattern is the print block ending, followed by the style tag close
MARKER = """      [class*="fixed"][class*="inset-0"] > div {
        max-width: 100% !important;
        max-height: none !important;
        box-shadow: none !important;
        border: none !important;
      }
    }
  `;
  document.head.appendChild(style);"""

NEW_CSS = """      [class*="fixed"][class*="inset-0"] > div {
        max-width: 100% !important;
        max-height: none !important;
        box-shadow: none !important;
        border: none !important;
      }
    }
    /* =============================================
       MOBILE / TABLET ENHANCEMENTS (Feb 2026)
       ============================================= */
    /* Content Tab Navigation — Horizontal Scroll on Small Screens */
    @media (max-width: 768px) {
      nav[aria-label="Content tabs"] {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        scroll-snap-type: x mandatory;
        scrollbar-width: none; /* Firefox */
        -ms-overflow-style: none; /* IE/Edge */
        flex-wrap: nowrap !important;
        gap: 2px;
      }
      nav[aria-label="Content tabs"]::-webkit-scrollbar {
        display: none; /* Chrome/Safari */
      }
      nav[aria-label="Content tabs"] > button {
        scroll-snap-align: start;
        flex-shrink: 0;
        min-width: max-content;
        white-space: nowrap;
      }
    }
    /* Minimum 44px Touch Targets — WCAG 2.5.5 (AAA) / Apple HIG */
    @media (max-width: 768px) {
      button, [role="button"], a[href], select, input[type="checkbox"], input[type="radio"] {
        min-height: 44px;
        min-width: 44px;
      }
      /* Exempt icon-only small utility buttons that are visually tiny */
      button[class*="p-1"], button[class*="p-0.5"] {
        min-height: 36px;
        min-width: 36px;
      }
      /* Ensure tab buttons have comfortable tappable size */
      nav[aria-label="Content tabs"] > button {
        min-height: 44px;
        padding: 8px 16px;
      }
      /* Make toggle/action buttons easier to tap */
      button[class*="rounded-full"], button[class*="rounded-xl"] {
        min-height: 44px;
        min-width: 44px;
      }
    }
    /* Drag-and-Drop Touch Improvements */
    @media (pointer: coarse) {
      /* Increase grab handle size for touch */
      [class*="cursor-grab"], [class*="cursor-grabbing"],
      [class*="GripVertical"], [class*="GripHorizontal"] {
        min-width: 44px;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      /* Prevent text selection during drag on touch */
      [draggable="true"] {
        -webkit-user-select: none;
        user-select: none;
        touch-action: none;
      }
      /* Larger tap targets for quiz options and choice buttons */
      button[class*="border"][class*="rounded"] {
        min-height: 48px;
        padding-top: 10px;
        padding-bottom: 10px;
      }
    }
    /* Tablet (iPad Portrait ~768px to 1024px) */
    @media (min-width: 768px) and (max-width: 1024px) {
      /* Two-column grids go single on tight tablets */
      .grid-cols-3 { grid-template-columns: repeat(2, 1fr) !important; }
      /* Ensure panels don't clip */
      [class*="max-w-5xl"] { max-width: calc(100vw - 2rem) !important; }
      [class*="max-w-4xl"] { max-width: calc(100vw - 2rem) !important; }
    }
    /* No-Scrollbar Utility (cross-browser) */
    .no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
  `;
  document.head.appendChild(style);"""

if MARKER in content:
    content = content.replace(MARKER, NEW_CSS, 1)
    print("✅ Mobile CSS improvements injected successfully")
else:
    print("❌ Failed to find CSS insertion marker")
    # Check for CRLF
    marker_crlf = MARKER.replace('\n', '\r\n')
    if marker_crlf in content:
        content = content.replace(marker_crlf, NEW_CSS.replace('\n', '\r\n'), 1)
        print("✅ Applied with CRLF line endings")
    else:
        print("❌ Also failed with CRLF - need to debug")
        # Partial check
        if 'max-height: none !important;' in content:
            print("   Found max-height marker")
        if 'document.head.appendChild(style);' in content:
            count = content.count('document.head.appendChild(style);')
            print(f"   Found appendChild(style) {count} times")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ File saved")
