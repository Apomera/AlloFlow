// Existing lesson checks explicitly enter the full lab. Studio checks use the
// ordinary harness so a fresh learner's default entry stays under test too.
export * from './stem_widgets_smoke_harness.js';
import { makeCtx as baseMakeCtx, renderTool as baseRenderTool } from './stem_widgets_smoke_harness.js';

function referenceData(data) {
  return { ...data, _nuclearLab: { nkView: 'reference', ...data?._nuclearLab } };
}
export function makeCtx(overrides, store) {
  const ctx = baseMakeCtx(overrides, store);
  return { ...ctx, toolData: referenceData(ctx.toolData) };
}
export function renderTool(id, data, overrides) {
  return baseRenderTool(id, referenceData(data), overrides);
}
