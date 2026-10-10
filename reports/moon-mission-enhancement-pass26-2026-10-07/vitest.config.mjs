import {defineConfig} from 'vitest/config';
export default defineConfig({test:{environment:'node',setupFiles:[],include:['tests/moonmission_descent_dust_terrain.test.js'],pool:'threads',maxWorkers:1,fileParallelism:false,testTimeout:30000,hookTimeout:30000}});
