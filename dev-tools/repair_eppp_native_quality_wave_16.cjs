#!/usr/bin/env node
'use strict';

const { runNativeQualityWave } = require('./run_eppp_native_quality_wave.cjs');

runNativeQualityWave({
  dataFile: 'eppp_native_quality_wave_16_data.cjs',
  waveNumber: '16',
});
