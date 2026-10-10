# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cephalopod-rock-mineral-finish.spec.ts >> Desktop balanced quality >> retains the compiled mineral finish through native movement, paused cameras, inspection and reef recycling
- Location: tests\e2e\cephalopod-rock-mineral-finish.spec.ts:20:6

# Error details

```
Error: page.evaluate: TypeError: Cannot read properties of undefined (reading 'position')
    at w.__mineralRead (eval at evaluate (:302:30), <anonymous>:55:29)
    at eval (eval at evaluate (:302:30), <anonymous>:1:14)
    at UtilityScript.evaluate (<anonymous>:304:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)
```