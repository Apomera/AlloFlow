import base from '../../playwright.config';
import path from 'node:path';
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
export default {...base,testDir:'../../tests/e2e',workers:1,fullyParallel:false,retries:0,timeout:240000,expect:{timeout:30000},reporter:[['line'],['json',{outputFile:path.join(__dirname,'browser-results.json')}]],use:{...base.use,actionTimeout:90000,reducedMotion:'reduce',video:'off',trace:'off'}};
