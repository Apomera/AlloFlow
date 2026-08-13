#!/usr/bin/env node
'use strict';

const { runNativeQualityWave } = require('./run_eppp_native_quality_wave.cjs');

runNativeQualityWave({
  dataFile: 'eppp_native_quality_wave_23_data.cjs',
  waveNumber: '23',
  expectedRevisionCount: 8,
});
