# Offline spoken-math runtime

This directory contains pinned, unmodified runtime assets used by
`sre_loader.js`:

- Speech Rule Engine 4.1.4 (`sre.js` and `mathmaps/*.json`), Apache-2.0.
- Temml 0.10.34 (`temml.min.js`), MIT.

The files came from the corresponding official npm release archives. Their
license texts are included beside the runtime files. AlloFlow loads these local
copies first so spoken math remains available without a network connection.
Pinned upstream CDN URLs are recovery fallbacks for incomplete web deployments
and can be disabled through:

```js
window.AlloMathSpeech.configure({ allowRemoteFallback: false });
```

The Speech Rule Engine configuration is process-global, so the AlloFlow wrapper
serializes engine configuration and rendering. This is required for safe
concurrent requests in different languages.
