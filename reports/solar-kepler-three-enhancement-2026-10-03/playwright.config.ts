import {defineConfig} from '@playwright/test';
import {resolve} from 'node:path';
import base from '../../playwright.config';
export default defineConfig({
 ...base,testDir:resolve(process.cwd(),'tests/e2e'),outputDir:resolve(process.cwd(),'reports/solar-kepler-three-enhancement-2026-10-03/browser-results'),
 fullyParallel:false,workers:1,retries:0,timeout:240000,reporter:'line',use:{...base.use,video:'off',trace:'off'},
 projects:base.projects?.map(p=>({...p,use:{...base.use,...p.use,video:'off',trace:'off'}})),
});
