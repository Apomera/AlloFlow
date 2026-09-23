#!/usr/bin/env bash
# K4 final batch (v3 harness: label-independent launch-pad and wizard-close locators).
cd /c/tmp/alloflow_dispatch/wave1/K4_scratch || exit 1
S=C:/tmp/alloflow_dispatch/wave1/K4_scratch
run() { echo "=== $(date +%T) $*"; node "$@" 2>&1 | grep -E "FAILED|done|LOST" | tail -2; }
for r in 1 2 3; do for net in wifi fast3g; do for flow in teacher student; do
  run measure.mjs --target=live --net=$net --flow=$flow --run=$r --out=$S/runs
done; done; done
for net in wifi fast3g; do for flow in teacher student; do
  run measure_whatif.mjs --target=live --net=$net --flow=$flow --run=1 --whatif=load,link,bytes,vendor --out=$S/runs_whatif
done; done
for net in wifi_shared slow3g; do run measure_boot.mjs --target=live --net=$net --flow=teacher --run=1 --out=$S/runs_boot; done
for flow in teacher student; do run measure.mjs --target=live --net=wifi --flow=$flow --run=1 --shots=1 --out=$S/runs_shots; done
run measure_whatif.mjs --target=live --net=fast3g --flow=teacher --run=2 --whatif=load,link,bytes,vendor --out=$S/runs_whatif
echo "=== final finished $(date +%T)"
