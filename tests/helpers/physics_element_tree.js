// Resolve component boundaries for the physics contract tests' element trees.
// Interactive view state is exercised with real React in the browser tests.
export function physicsElementTree(tree) {
  if (Array.isArray(tree)) return tree.map(physicsElementTree);
  if (!tree || typeof tree !== 'object') return tree;
  if (typeof tree.type === 'function') return physicsElementTree(tree.type({ ...tree.props, children: tree.children }));
  return { ...tree, children: physicsElementTree(tree.children) };
}

export function drawPhysicsElementTree(ctx, state) {
  const previous = globalThis.React;
  globalThis.React = ctx.React;
  try { return physicsElementTree(window.StemLab._registry.physics.render({ ...ctx, toolData: state })); }
  finally { globalThis.React = previous; }
}
