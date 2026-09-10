# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: document_builder_responsive_keyboard.spec.ts >> mobile settings are reachable, Escape restores focus, and toggling preserves live edits
- Location: tests\e2e\document_builder_responsive_keyboard.spec.ts:101:5

# Error details

```
Tearing down "context" exceeded the test timeout of 45000ms.
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - button "Open document" [ref=e2] [cursor=pointer]
  - dialog "Document Builder" [ref=e3]:
    - banner [ref=e4]:
      - generic [ref=e5]:
        - heading "Document Builder" [level=2] [ref=e6]
        - heading "Classroom handout" [level=3] [ref=e7]
      - generic [ref=e8]:
        - button "Document settings" [active] [ref=e9] [cursor=pointer]
        - button "Focus mode" [ref=e10] [cursor=pointer]:
          - generic [ref=e11]: ↗
          - text: Focus mode
        - group [ref=e12]:
          - generic "Export" [ref=e13] [cursor=pointer]: Export ▾
        - button "Toggle color theme" [ref=e14] [cursor=pointer]: ☀️
        - button "Close Document Builder" [ref=e15] [cursor=pointer]: Close
      - button "Skip to editable preview" [ref=e16] [cursor=pointer]
      - button [ref=e17]
    - generic [ref=e18]:
      - status [ref=e19]
      - generic [ref=e21]:
        - toolbar "Quick Access" [ref=e22]:
          - button "Save a local version snapshot" [ref=e23] [cursor=pointer]: Save
          - button "Undo" [ref=e24] [cursor=pointer]
          - button "Redo" [ref=e25] [cursor=pointer]
          - group [ref=e26]:
            - generic "Customize Quick Access toolbar" [ref=e27] [cursor=pointer]: +
        - group "Quick formatting" [ref=e28]:
          - combobox "Paragraph style" [ref=e29]:
            - option "Normal" [selected]
            - option "Title"
            - option "Subtitle"
            - option "Heading 1"
            - option "Heading 2"
            - option "Heading 3"
            - option "Quote"
            - option "Caption"
            - option "Callout"
          - button "Bold" [ref=e30] [cursor=pointer]: B
          - button "Italic" [ref=e31] [cursor=pointer]: I
          - button "Underline" [ref=e32] [cursor=pointer]: U
        - tablist "Document Builder ribbon" [ref=e33]:
          - tab "Home" [selected] [ref=e34] [cursor=pointer]
          - tab "Insert" [ref=e35] [cursor=pointer]
          - tab "Layout" [ref=e36] [cursor=pointer]
          - tab "Review" [ref=e37] [cursor=pointer]
          - tab "View" [ref=e38] [cursor=pointer]
          - tab "🤖 Expert Workbench" [ref=e39] [cursor=pointer]
      - iframe [ref=e42]:
        - main [ref=f1e2]:
          - heading "Classroom handout" [level=1] [ref=f1e3]
          - paragraph [ref=f1e4]: Original lesson text. Teacher note.
          - button "Run lesson action" [ref=f1e5]: Run
      - generic "Document status bar" [ref=e43]:
        - generic [ref=e44]:
          - generic [ref=e45]: Editing enabled
          - status [ref=e46]: Saved on this device · 06:30 PM
          - 'button "Track: Off · 0 changes" [ref=e48] [cursor=pointer]'
          - 'button "Words: 8" [ref=e50] [cursor=pointer]'
          - generic [ref=e51]: Page 1 of 2
          - group [ref=e52]:
            - generic "Details & shortcuts" [ref=e53] [cursor=pointer]
        - generic [ref=e54]:
          - combobox "Preview zoom mode" [ref=e55]:
            - option "Fit width" [selected]
            - option "Fit page"
            - option "Custom zoom"
          - generic "Editor zoom controls" [ref=e56]:
            - button "Zoom out" [ref=e57] [cursor=pointer]: −
            - slider "Editor zoom" [ref=e58]: "50"
            - button "Zoom in" [ref=e59] [cursor=pointer]: +
            - button "Reset editor zoom to 100 percent" [ref=e60] [cursor=pointer]: 50%
```