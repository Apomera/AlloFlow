#!/usr/bin/env node
'use strict';

const { run } = require('./run_plt_grade_band_qa.cjs');
const specs = require('./plt_grade_band_qa.config.cjs');

run(specs.plt_7_12_5624);
