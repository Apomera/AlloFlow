# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: moon-mission-descent-dust.spec.ts >> real WebGL consumes the same ballistic samples, draws dust pixels and retains grains on context loss
- Location: tests\e2e\moon-mission-descent-dust.spec.ts:144:5

# Error details

```
Error: page.evaluate: TypeError: Cannot read properties of undefined (reading 'dust')
    at eval (eval at evaluate (:302:30), <anonymous>:3:13)
    at UtilityScript.evaluate (<anonymous>:304:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)
```