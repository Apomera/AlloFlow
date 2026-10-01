import base from '../../playwright.config';
import {defineConfig} from '@playwright/test';
export default defineConfig({...base,testDir:'../../tests/e2e',use:{...base.use,trace:'off',video:'off'}});
