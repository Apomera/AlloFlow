'use strict';

const path = require('node:path');
const swc = require(path.resolve(__dirname, '..', '..', 'desktop', 'web-app', 'node_modules', '@swc', 'core'));

module.exports = function alloflowE2ESwcLoader(source) {
  this.cacheable(true);
  const result = swc.transformSync(source, {
    filename: this.resourcePath,
    sourceMaps: false,
    jsc: {
      parser: {
        syntax: 'ecmascript',
        jsx: true,
        dynamicImport: true,
      },
      target: 'es2020',
      transform: {
        react: {
          runtime: 'classic',
          pragma: 'React.createElement',
          pragmaFrag: 'React.Fragment',
          throwIfNamespace: false,
          useBuiltins: true,
        },
      },
    },
    module: { type: 'es6' },
  });
  return result.code;
};