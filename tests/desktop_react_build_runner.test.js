import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const runnerPath = resolve('desktop/scripts/run-desktop-react-build.cjs');
const appRoot = resolve('desktop/web-app');
const configPath = require.resolve('../desktop/web-app/node_modules/react-scripts/config/webpack.config.js');
const { configureDesktopMinimizers } = require(runnerPath);
const minimizerTypes = {
  TerserPlugin: require(require.resolve('terser-webpack-plugin', { paths: [configPath] })),
  CssMinimizerPlugin: require(require.resolve('css-minimizer-webpack-plugin', { paths: [configPath] })),
};

describe('desktop React production runner', () => {
  it('limits both real installed minimizers without changing compression settings or the input', () => {
    const { TerserPlugin, CssMinimizerPlugin } = minimizerTypes;
    const jsMinify = () => ({ code: 'custom javascript' });
    const cssMinify = () => ({ code: 'custom css' });
    const filter = () => false;
    const terser = new TerserPlugin({
      parallel: 4, minify: jsMinify, terserOptions: { mangle: false },
      extractComments: false, include: /application/, exclude: /vendor/,
    });
    const css = new CssMinimizerPlugin({
      parallel: 2, minify: cssMinify, minimizerOptions: { preset: 'default' },
      warningsFilter: filter,
    });
    const input = {
      mode: 'production', plugins: [{}], output: { publicPath: './' },
      optimization: { minimize: true, splitChunks: { chunks: 'all' }, minimizer: [terser, css] },
    };

    const output = configureDesktopMinimizers(input, minimizerTypes);
    expect(output).not.toBe(input);
    expect(output.plugins).toBe(input.plugins);
    expect(output.output).toBe(input.output);
    expect(output.optimization.splitChunks).toBe(input.optimization.splitChunks);
    expect(output.optimization.minimize).toBe(true);
    for (const [index, original] of [terser, css].entries()) {
      const configured = output.optimization.minimizer[index];
      expect(Object.getPrototypeOf(configured)).toBe(Object.getPrototypeOf(original));
      expect(configured.apply).toBe(original.apply);
      expect(configured.options).toEqual({ ...original.options, parallel: false });
      expect(configured.options.minimizer).toBe(original.options.minimizer);
    }
    expect(terser.options.parallel).toBe(4);
    expect(css.options.parallel).toBe(2);
    expect(output.optimization.minimizer[0].options.minimizer.implementation).toBe(jsMinify);
    expect(output.optimization.minimizer[1].options.warningsFilter).toBe(filter);
    expect(TerserPlugin.getAvailableNumberOfCores(false)).toBe(0);
    expect(CssMinimizerPlugin.getAvailableNumberOfCores(false)).toBe(0);
  });

  it('leaves unknown minimizers, disabled entries, and similarly named plugins untouched', () => {
    const TerserPlugin = class TerserPlugin { constructor() { this.options = { parallel: 7 }; } };
    const fake = new TerserPlugin();
    const custom = { options: { parallel: 3 }, apply() {} };
    const minimize = () => {};
    const input = { optimization: { minimizer: [fake, custom, false, '...', minimize] } };
    expect(configureDesktopMinimizers(input, minimizerTypes)).toBe(input);
    expect(fake.options.parallel).toBe(7);
    expect(custom.options.parallel).toBe(3);
  });

  it('supports absent minimizers and preserves already limited configurations', () => {
    const input = { optimization: { minimizer: [new minimizerTypes.TerserPlugin({ parallel: false })] } };
    expect(configureDesktopMinimizers(input, minimizerTypes)).toBe(input);
    for (const value of [undefined, {}, { optimization: {} }]) {
      expect(configureDesktopMinimizers(value, minimizerTypes)).toBe(value);
    }
  });

  it('loads real CRA environment before config and wraps only its production factory', () => {
    const script = `
      const assert = require('assert');
      const runner = require(${JSON.stringify(runnerPath)});
      const originalCpuCount = require('os').cpus;
      const prepared = runner.prepareDesktopReactBuild();
      const factory = require(prepared.configPath);
      const config = factory('production');
      const development = factory('development');
      assert.equal(require('os').cpus, originalCpuCount);
      assert.equal(process.env.NODE_ENV, 'production');
      assert.equal(process.env.BABEL_ENV, 'production');
      assert.equal(config.optimization.minimize, true);
      assert.deepEqual(config.optimization.minimizer.map(value => value.options.parallel), [false, false]);
      assert.deepEqual(development.optimization.minimizer.map(value => value.options.parallel), [true, true]);
      assert.equal(config.devtool, false);
      assert.equal(config.output.publicPath, './');
      assert.equal(require.cache[prepared.buildScript], undefined);
      process.stdout.write('prepared production configuration without starting webpack');
    `;
    const output = execFileSync(process.execPath, ['-e', script], {
      cwd: appRoot,
      env: {
        ...process.env, NODE_ENV: 'test', BABEL_ENV: 'test', REACT_APP_DESKTOP: '1',
        GENERATE_SOURCEMAP: 'false', DISABLE_ESLINT_PLUGIN: 'true', PUBLIC_URL: '.',
      },
      encoding: 'utf8', windowsHide: true, timeout: 60000,
    });
    expect(output).toContain('prepared production configuration without starting webpack');
  });

  it('rejects hosted invocation before loading CRA', () => {
    const result = spawnSync(process.execPath, [runnerPath], {
      cwd: appRoot, env: { ...process.env, REACT_APP_DESKTOP: '0' },
      encoding: 'utf8', windowsHide: true, timeout: 60000,
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('requires REACT_APP_DESKTOP=1');
    expect(result.stdout).not.toContain('Creating an optimized production build');
  });

  it('rejects a working directory that could build the hosted app', () => {
    const result = spawnSync(process.execPath, [runnerPath], {
      cwd: resolve('.'), env: { ...process.env, REACT_APP_DESKTOP: '1' },
      encoding: 'utf8', windowsHide: true, timeout: 60000,
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('from desktop/web-app');
    expect(result.stdout).not.toContain('Creating an optimized production build');
  });
});
