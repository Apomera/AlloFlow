#!/usr/bin/env node
'use strict';

const { build } = require('./build_plt_grade_band_learning_library.cjs');
const config = require('./plt_5_9_5623_learning_library.config.cjs');

build(config);
