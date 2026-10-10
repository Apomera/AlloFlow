# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: physics-canvas-callouts.spec.ts >> original launch, apex and impact callouts retain painted text and clearance in nine layouts
- Location: tests\e2e\physics-canvas-callouts.spec.ts:624:5

# Error details

```
Error: write ENOMEM
```

```
Error: page.evaluate: TypeError: Cannot read properties of null (reading 'getContext')
    at eval (eval at evaluate (:302:30), <anonymous>:3:16)
    at UtilityScript.evaluate (<anonymous>:304:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)
```