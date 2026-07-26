'use strict';

const { runNativeQualityWave } = require('./run_eppp_native_quality_wave.cjs');

runNativeQualityWave({
  waveNumber: 13,
  dataFile: 'eppp_native_quality_wave_13_data.cjs'
});
