# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: document_builder_responsive_keyboard.spec.ts >> Tab from editor entry reaches its native control and editable inspector badge
- Location: tests\e2e\document_builder_responsive_keyboard.spec.ts:162:5

# Error details

```
Tearing down "context" exceeded the test timeout of 120000ms.
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
        - button "Document settings" [ref=e9] [cursor=pointer]
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
        - button "Find a tool" [ref=e28] [cursor=pointer]
        - group "Quick formatting" [ref=e29]:
          - combobox "Paragraph style" [ref=e30]:
            - option "Normal" [selected]
            - option "Title"
            - option "Subtitle"
            - option "Heading 1"
            - option "Heading 2"
            - option "Heading 3"
            - option "Quote"
            - option "Caption"
            - option "Callout"
          - button "Bold" [pressed] [ref=e31] [cursor=pointer]: B
          - button "Italic" [pressed] [ref=e32] [cursor=pointer]: I
          - button "Underline" [ref=e33] [cursor=pointer]: U
        - tablist "Document Builder ribbon" [ref=e34]:
          - tab "Home" [selected] [ref=e35] [cursor=pointer]
          - tab "Insert" [ref=e36] [cursor=pointer]
          - tab "Layout" [ref=e37] [cursor=pointer]
          - tab "Review" [ref=e38] [cursor=pointer]
          - tab "View" [ref=e39] [cursor=pointer]
          - tab "🤖 Expert Workbench" [ref=e40] [cursor=pointer]
          - button "Expand ribbon" [active] [ref=e41] [cursor=pointer]
      - iframe [ref=e44]:
        - generic [active] [ref=f1e1]:
          - main [ref=f1e2]:
            - 'heading "Classroom handout H1 #1" [level=1] [ref=f1e3]':
              - text: Classroom handout
              - generic [ref=f1e4]: "H1 #1"
            - paragraph [ref=f1e5]: Original lesson text.
            - button "Run lesson action" [ref=f1e6]:
              - text: Run
              - 'button "Edit aria-label: Run lesson action" [ref=f1e7] [cursor=pointer]': "ARIA: Run lesson action"
          - generic [ref=f1e8]: "LANG: en | DIR: ltr"
          - generic [ref=f1e9]:
            - strong [ref=f1e10]: ♿ A11y Inspector
            - text: ■ Headings ■ Images/Alt ■ ARIA Labels ■ Roles ■ Tables ■ Input Labels ■ Landmarks
            - emphasis [ref=f1e11]: Use Enter, Space, or click on ALT, ARIA, role, and label badges to edit
      - generic "Document status bar" [ref=e45]:
        - generic [ref=e46]:
          - generic [ref=e47]: Editing enabled
          - status [ref=e48]: No local changes yet
          - 'button "Track: Off · 0 changes" [ref=e50] [cursor=pointer]'
          - 'button "Words: 6" [ref=e52] [cursor=pointer]'
          - generic [ref=e53]: Page 1 of 2
          - group [ref=e54]:
            - generic "Details & shortcuts" [ref=e55] [cursor=pointer]
        - generic [ref=e56]:
          - combobox "Preview zoom mode" [ref=e57]:
            - option "Fit width" [selected]
            - option "Fit page"
            - option "Custom zoom"
          - generic "Editor zoom controls" [ref=e58]:
            - button "Zoom out" [ref=e59] [cursor=pointer]: −
            - slider "Editor zoom" [ref=e60]: "165"
            - button "Zoom in" [ref=e61] [cursor=pointer]: +
            - button "Reset editor zoom to 100 percent" [ref=e62] [cursor=pointer]: 165%
```