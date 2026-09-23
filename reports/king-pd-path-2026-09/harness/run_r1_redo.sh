#!/usr/bin/env bash
# Re-run the four round-1 live runs that overlapped a stray concurrent job (23:01-23:07).
cd /c/tmp/alloflow_dispatch/wave1/K4_scratch || exit 1
S=C:/tmp/alloflow_dispatch/wave1/K4_scratch
for net in wifi fast3g; do for flow in teacher student; do
  echo "=== $(date +%T) r1 redo $net $flow"
  node measure.mjs --target=live --net=$net --flow=$flow --run=1 --out=$S/runs 2>&1 | grep -E "FAILED|done" | tail -2
done; done
echo "=== r1 redo finished $(date +%T)"
