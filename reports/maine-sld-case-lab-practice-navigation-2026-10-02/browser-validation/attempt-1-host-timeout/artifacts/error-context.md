# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: maine-sld-practice.spec.ts >> full source application host >> public deep link opens the case directly and configured educator access protects Leadership return
- Location: tests\e2e\maine-sld-practice.spec.ts:431:6

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Tearing down "context" exceeded the test timeout of 120000ms.
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - complementary "About this tool" [ref=e4]:
      - generic [ref=e5]: One tool from AlloFlow, a free teaching platform.
      - link "Explore the full app" [ref=e6] [cursor=pointer]:
        - /url: /app/
      - button "Dismiss this note" [ref=e7] [cursor=pointer]: ✕
    - link "Skip to Content" [ref=e8] [cursor=pointer]:
      - /url: "#main-content"
    - link "Skip to resource" [ref=e9] [cursor=pointer]:
      - /url: "#allo-resource"
    - status [ref=e10]
    - alert [ref=e11]
    - banner "Main application header" [ref=e12]:
      - generic [ref=e14]:
        - generic [ref=e15]:
          - heading "AlloFlow" [level=1] [ref=e16]:
            - img [ref=e18]
            - generic [ref=e22]: AlloFlow
          - generic [ref=e23]:
            - generic [ref=e24]: Student / Source Material
            - 'generic "Note: Do not input Personally Identifiable Information (PII)." [ref=e25]':
              - img [ref=e26]
              - generic [ref=e28]: "Note: Do not input Personally Identifiable Information (PII)."
        - generic [ref=e29]:
          - navigation "Content tabs" [ref=e30]:
            - button "Progress" [ref=e31] [cursor=pointer]:
              - img [ref=e32]
          - button "Join Class" [ref=e34] [cursor=pointer]:
            - img [ref=e35]
            - generic [ref=e42]: Join Class
          - button "More information" [ref=e43] [cursor=pointer]:
            - generic [ref=e44]: More information
            - img [ref=e45]
    - main "Main content" [ref=e47]:
      - region "Gemini Powered Scaffolds" [ref=e48]:
        - region "Save Your Progress" [ref=e49]:
          - generic [ref=e50]:
            - img [ref=e52]
            - generic [ref=e56]:
              - heading "Save Your Progress" [level=4] [ref=e57]
              - paragraph [ref=e58]: Back up your resources to keep a copy of your work.
          - generic [ref=e59]:
            - button "Load File" [ref=e60] [cursor=pointer]:
              - img [ref=e61]
              - text: Load File
            - button "Save File" [disabled] [ref=e63]:
              - img [ref=e64]
              - text: Save File
            - button "Submit" [ref=e67] [cursor=pointer]:
              - img [ref=e68]
              - text: Submit
        - generic [ref=e72]:
          - generic [ref=e74]:
            - generic [ref=e75]:
              - heading "My Resources 0 resources" [level=3] [ref=e76]:
                - img [ref=e78]
                - generic [ref=e82]: My Resources
                - status "0 resources" [ref=e83]: "0"
              - generic [ref=e85]:
                - img [ref=e86]
                - text: Autosaved 05:26 PM
            - button "More resource pack actions" [ref=e90] [cursor=pointer]:
              - generic [ref=e91]:
                - text: More
                - img [ref=e92]
          - generic [ref=e95]: No resources generated yet.
      - separator "Resize Create and Preview panes" [ref=e96]:
        - img [ref=e98]
      - generic [ref=e105]:
        - generic [ref=e106]:
          - heading "Ready" [level=2] [ref=e108]:
            - img [ref=e109]
            - text: Ready
          - button "Maximize View" [ref=e113] [cursor=pointer]:
            - img [ref=e114]
        - region "Current resource" [ref=e119]:
          - generic [ref=e120]:
            - img [ref=e122]
            - paragraph [ref=e125]: Connected
            - heading "Waiting for your class" [level=2] [ref=e126]
            - paragraph [ref=e127]: You are connected. Activities will appear here as soon as your teacher shares them — you do not need to do anything.
    - button "Open Student Tools" [ref=e129] [cursor=pointer]:
      - img [ref=e130]
      - generic [ref=e132]: Student tools
    - dialog "Admin Access Required" [ref=e133]:
      - generic [ref=e134]:
        - img [ref=e136]
        - heading "Admin Access Required" [level=2] [ref=e139]
        - paragraph [ref=e140]: Restricted to Teachers & Parents.
        - generic [ref=e141]:
          - generic [ref=e142]:
            - generic [ref=e143]: Enter Access Code...
            - textbox "Enter Access Code..." [ref=e144]
          - button "Unlock" [disabled] [ref=e145]
        - button "Cancel" [ref=e146] [cursor=pointer]:
          - img [ref=e147]
    - dialog "AI Backend Settings" [active] [ref=e151]:
      - button "Close" [ref=e152] [cursor=pointer]:
        - img [ref=e153]
      - generic [ref=e156]:
        - img [ref=e158]
        - heading "AI Backend Settings" [level=3] [ref=e165]
      - generic [ref=e166]:
        - generic [ref=e167]:
          - status [ref=e168]: First-time setup · Choose your AI
          - paragraph [ref=e169]: AlloFlow uses an AI engine to create lessons, read aloud, and answer questions. Pick how you'd like it to work — you can change this any time.
          - 'button "Use AlloFlow inside Gemini Canvas No setup The easiest way to get AI: open AlloFlow inside Google Gemini. Free with a Google account, using your Gemini plan''s daily quota (personal, Education, or paid plans all work). Nothing to install and no key to manage. Opens gemini.google.com in a new tab. Plan details at google.com/gemini" [ref=e170] [cursor=pointer]':
            - generic [ref=e171]:
              - generic [ref=e172]: 🚀
              - generic [ref=e173]: Use AlloFlow inside Gemini Canvas
              - generic [ref=e174]: No setup
            - paragraph [ref=e175]: "The easiest way to get AI: open AlloFlow inside Google Gemini. Free with a Google account, using your Gemini plan's daily quota (personal, Education, or paid plans all work). Nothing to install and no key to manage."
            - paragraph [ref=e176]: Opens gemini.google.com in a new tab. Plan details at google.com/gemini
          - button "Google Gemini Recommended Best quality and speed. Runs in Google's cloud with a free key — we'll walk you through getting one (about 2 minutes). Works anywhere · needs internet" [ref=e177] [cursor=pointer]:
            - generic [ref=e178]:
              - generic [ref=e179]: ✨
              - generic [ref=e180]: Google Gemini
              - generic [ref=e181]: Recommended
            - paragraph [ref=e182]: Best quality and speed. Runs in Google's cloud with a free key — we'll walk you through getting one (about 2 minutes).
            - paragraph [ref=e183]: Works anywhere · needs internet
          - button "Private AI on this computer Most private Everything stays on this computer — no account, no internet needed after setup. One click downloads a starter AI model. 8 GB+ memory recommended · ~2.5 GB one-time download" [ref=e184] [cursor=pointer]:
            - generic [ref=e185]:
              - generic [ref=e186]: 🔒
              - generic [ref=e187]: Private AI on this computer
              - generic [ref=e188]: Most private
            - paragraph [ref=e189]: Everything stays on this computer — no account, no internet needed after setup. One click downloads a starter AI model.
            - paragraph [ref=e190]: 8 GB+ memory recommended · ~2.5 GB one-time download
          - button "An AI app I already run Already use LM Studio, Ollama, or LocalAI on this computer? Connect it." [ref=e191] [cursor=pointer]:
            - generic [ref=e192]:
              - generic [ref=e193]: 🔌
              - generic [ref=e194]: An AI app I already run
            - paragraph [ref=e195]: Already use LM Studio, Ollama, or LocalAI on this computer? Connect it.
        - region "Saved work on this device" [ref=e196]:
          - generic [ref=e197]:
            - generic [ref=e198]:
              - heading "Saved work on this device" [level=4] [ref=e199]
              - paragraph [ref=e200]: Open your saved resource packs to restore, pin, export, or erase them. Also shows space used and the offline voice models such as Whisper and Kokoro.
            - button "Open saved work" [ref=e201] [cursor=pointer]
        - button "Advanced settings" [ref=e202] [cursor=pointer]:
          - generic [ref=e203]: ▼
          - text: Advanced settings
  - status [ref=e204]
  - status [ref=e205]
  - status [ref=e206]
  - status [ref=e207]
  - status [ref=e208]
  - status [ref=e209]
  - status [ref=e210]
  - status [ref=e211]
  - status [ref=e212]
  - status [ref=e213]
```