# AlloFlow MCP vendor notices

This directory contains pinned browser runtime assets used by the remote
remediation runner. Versions and SHA-256 digests are recorded in
`manifest.json`; this file preserves the package license provenance for the
redistributed artifacts.

- `pdfjs.min.js`, `pdf.worker.min.js`: `pdfjs-dist@3.11.174`, Apache-2.0.
- `pdf-lib.min.js`: `pdf-lib@1.17.1`, MIT.
- `pako.min.js`: `pako@2.1.0`, MIT.
- `fontkit.umd.min.js`: `@pdf-lib/fontkit@1.1.1`, MIT.
- `axe.min.js`: `axe-core@4.10.2`, Mozilla Public License 2.0.
- `tesseract.min.js`, `tesseract.worker.min.js`: `tesseract.js@5.1.1`, Apache-2.0.
- `tesseract-core.wasm`, `tesseract-core.wasm.js`: `tesseract.js-core@5.1.0`, Apache-2.0.
- `tessdata/eng.traineddata.gz`: English traineddata from the pinned
  `@tesseract.js-data/eng/4.0.0_best_int` distribution, Apache-2.0.

The complete license text is supplied by the corresponding package
distribution. Keep this notice beside the assets when copying them into a
runner image; do not replace the files with an unpinned CDN copy.
