// CRA auto-loads this file before the test framework runs.
// jest-environment-jsdom does not expose Node's TextEncoder/TextDecoder globals,
// which the local-streaming code (and its tests) rely on. Polyfill them.
const { TextEncoder, TextDecoder } = require('util');
if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder;
if (typeof global.TextDecoder === 'undefined') global.TextDecoder = TextDecoder;
