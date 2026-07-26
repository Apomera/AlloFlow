# MathLive offline assets

This directory vendors the browser assets used by `mathlive_loader.js`.

- MathLive: `0.110.0`
- Source: the official `mathlive@0.110.0` npm package
- License: MIT (`LICENSE-MATHLIVE.txt`)
- Runtime files: `mathlive.min.js` and the complete `fonts/` directory

AlloFlow loads these files locally first. Pinned CDN URLs are optional recovery
sources for incomplete hosted deployments and can be disabled through
`window.AlloMathInput.configure({ allowRemoteFallback: false })`.

MathLive is an input and serialization layer. It does not replace STEM Lab,
AlgebraCAS, the Math problem generator, or AlloFlow's grading rules.
