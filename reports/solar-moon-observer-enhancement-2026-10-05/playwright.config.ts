import base from '../../playwright.config';
export default {...base,testDir:'../../tests/e2e',workers:1,fullyParallel:false,retries:0,timeout:240000,reporter:'line',use:{...base.use,video:'off',trace:'off'}};
