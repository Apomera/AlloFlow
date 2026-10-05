# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: maine-sld-practice.spec.ts >> keyboard layout and axe 390px contrast
- Location: tests\e2e\maine-sld-practice.spec.ts:99:82

# Error details

```
Tearing down "context" exceeded the test timeout of 120000ms.
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - button "Outside dialog" [ref=e2] [cursor=pointer]
  - main [ref=e3]:
    - dialog "Maine SLD Case Lab" [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]:
          - generic [ref=e8]:
            - generic [ref=e9]: Leadership Hub / Professional learning
            - heading "Maine SLD Case Lab" [level=1] [ref=e10]
            - paragraph [ref=e11]: Examine a fictional record. Weigh the evidence. Explain a defensible decision path.
          - generic [ref=e12]:
            - button "Copy activity link" [active] [ref=e13] [cursor=pointer]
            - button "Download worksheet" [ref=e14] [cursor=pointer]
            - button "Print" [ref=e15] [cursor=pointer]
            - button "Restore worksheet" [ref=e16] [cursor=pointer]
            - button "Reset this case" [ref=e17] [cursor=pointer]
            - button "Leadership Hub" [ref=e18] [cursor=pointer]
            - button "Close Maine SLD Case Lab" [ref=e19] [cursor=pointer]: Close ✕
        - generic [ref=e20]:
          - generic [ref=e21]:
            - generic [ref=e22]: Practice case
            - combobox "Practice case" [ref=e23]:
              - 'option "Alex, Grade 4: evidence and instruction need" [selected]'
              - 'option "Alex variation: general education is adequate"'
              - 'option "Jordan, Grade 5: achievement and family concerns"'
          - generic [ref=e24]:
            - generic [ref=e25]:
              - strong [ref=e26]: "0"
              - text: supporting
            - generic [ref=e27]:
              - strong [ref=e28]: "0"
              - text: complicating
            - generic [ref=e29]:
              - strong [ref=e30]: 0/9
              - text: form notes
        - generic [ref=e31]:
          - navigation "Case activity steps" [ref=e32]:
            - button "Case record" [ref=e33] [cursor=pointer]:
              - generic [ref=e34]: "1"
              - generic [ref=e35]: Case record
            - button "Score record" [ref=e36] [cursor=pointer]:
              - generic [ref=e37]: "2"
              - generic [ref=e38]: Score record
            - button "Evidence board" [ref=e39] [cursor=pointer]:
              - generic [ref=e40]: "3"
              - generic [ref=e41]: Evidence board
            - button "Form reasoning" [ref=e42] [cursor=pointer]:
              - generic [ref=e43]: "4"
              - generic [ref=e44]: Form reasoning
            - button "Debrief" [ref=e45] [cursor=pointer]:
              - generic [ref=e46]: "5"
              - generic [ref=e47]: Debrief
          - region "Activity content" [ref=e48]:
            - generic [ref=e50]:
              - generic [ref=e51]: 05 / Compare and discuss
              - heading "A reviewed debrief" [level=2] [ref=e52]
              - paragraph [ref=e53]: Explain your reasoning before revealing the guide. The guide is a discussion reference for this fictional case.
            - generic [ref=e54]:
              - heading "Pause for a team explanation" [level=3] [ref=e55]
              - list [ref=e56]:
                - listitem [ref=e57]: Which findings carry the most weight, and which complicate the picture?
                - listitem [ref=e58]: Where does the form direct you next?
                - listitem [ref=e59]: What does the record establish about general education sufficiency?
                - listitem [ref=e60]: What additional evidence would you request?
              - button "Reveal reviewed case debrief" [ref=e62] [cursor=pointer]
            - generic [ref=e63]:
              - heading "Check your understanding of the process" [level=3] [ref=e64]
              - paragraph [ref=e65]: These questions have reviewed answers about form directions and distinctions. Your case evidence is not graded.
              - generic [ref=e66]:
                - heading "1. Q2 is YES because underachievement is due to inadequate instruction. Which question comes next?" [level=3] [ref=e67]
                - radiogroup "Q2 is YES because underachievement is due to inadequate instruction. Which question comes next?" [ref=e68]:
                  - generic [ref=e69]:
                    - 'radio "Q3: primary causes" [ref=e70]'
                    - generic [ref=e71]: "Q3: primary causes"
                  - generic [ref=e72]:
                    - 'radio "Q8: SLD conclusion" [ref=e73]'
                    - generic [ref=e74]: "Q8: SLD conclusion"
                  - generic [ref=e75]:
                    - 'radio "Q9: instruction required" [ref=e76]'
                    - generic [ref=e77]: "Q9: instruction required"
              - generic [ref=e78]:
                - heading "2. A child has anxiety and reading difficulty. What must Q3 determine?" [level=3] [ref=e79]
                - radiogroup "A child has anxiety and reading difficulty. What must Q3 determine?" [ref=e80]:
                  - generic [ref=e81]:
                    - radio "Whether anxiety is present" [ref=e82]
                    - generic [ref=e83]: Whether anxiety is present
                  - generic [ref=e84]:
                    - radio "Whether reading scores fall below a fixed cutoff" [ref=e85]
                    - generic [ref=e86]: Whether reading scores fall below a fixed cutoff
                  - generic [ref=e87]:
                    - radio "Whether an exclusionary factor primarily explains the underachievement" [ref=e88]
                    - generic [ref=e89]: Whether an exclusionary factor primarily explains the underachievement
              - generic [ref=e90]:
                - heading "3. Q8 is YES. General education adequately meets the need. Which Q9 option fits?" [level=3] [ref=e91]
                - radiogroup "Q8 is YES. General education adequately meets the need. Which Q9 option fits?" [ref=e92]:
                  - generic [ref=e93]:
                    - 'radio "9a: specially designed instruction is required" [ref=e94]'
                    - generic [ref=e95]: "9a: specially designed instruction is required"
                  - generic [ref=e96]:
                    - 'radio "9b: general education adequately meets the need" [ref=e97]'
                    - generic [ref=e98]: "9b: general education adequately meets the need"
                  - generic [ref=e99]:
                    - radio "Q8 must automatically change to NO" [ref=e100]
                    - generic [ref=e101]: Q8 must automatically change to NO
              - button "Show understanding-check explanations" [disabled] [ref=e103]
            - generic [ref=e104]:
              - heading "Try the contrast" [level=3] [ref=e105]
              - paragraph [ref=e106]: Compare Alex’s original evidence gap with the changed premise that general education adequately meets the need. Then explore Jordan’s complete achievement record. Your notes stay separate for each case.
              - generic [ref=e107]:
                - 'button "Alex variation: general education is adequate" [ref=e108] [cursor=pointer]'
                - 'button "Jordan, Grade 5: achievement and family concerns" [ref=e109] [cursor=pointer]'
            - status [ref=e110]
        - generic [ref=e112]: Progress retained in this tab for up to 12 hours. Download to keep a copy.
      - button "Restore downloaded Case Lab worksheet" [ref=e113]
```