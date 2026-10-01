# Spectral.js vendor provenance

- Upstream: <https://github.com/rvanwijnen/spectral.js>
- Version/branch: `3.0.0`
- Pinned commit: `bb2b05c9d1e65ae824d47e3b1cc17ea32c8ee68f`
- Original source: <https://raw.githubusercontent.com/rvanwijnen/spectral.js/bb2b05c9d1e65ae824d47e3b1cc17ea32c8ee68f/spectral.js>
- Downloaded source SHA-256: `DBAA1A8B44D2C734B48B6D44777B1F182C9740E9220D2CBDED02002C8E6D271A`
- License: MIT, copyright 2025 Ronald van Wijnen; retained in the source and adjacent `.LICENSE` file.

The source was inspected for its color parsing, spectral calculation, gamut mapping, and module initialization. It has no network or DOM dependency. Art Studio supplies validated hex inputs and bounded numeric mixing factors. Exact input endpoints and identical-color mixtures bypass a spectral round trip.

`node dev-tools/build_artstudio_spectral.cjs` embeds this unchanged source, including its license, in a private module scope inside the standalone Art Studio file, then updates the public mirror. `--check` verifies the embedded source and mirror without writing. The embed comment records a hash of the source after line-ending normalization and trailing-newline removal; the hash above identifies the downloaded file bytes.

No runtime script fetch or global `spectral` object is introduced. The library is used for Color Mixer's pigment approximation. Watercolor's painting engine is not replaced by this library.
