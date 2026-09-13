// Board control writes use a fresh document and an atomic update when provided by the transport.
export async function writeBoardDocument(fb, ref, plan) {
  const checked = latest => {
    const patch = plan(latest);
    if (!patch || !Object.keys(patch).length) return null;
    return patch;
  };
  if (ref.__alloMbRef) {
    if (typeof window.__alloLessonBoardConditionalUpdate !== 'function') throw Error('Reload the app before changing the live board.');
    return window.__alloLessonBoardConditionalUpdate(ref, checked);
  }
  if (!ref.__alloLanRef && typeof fb.runTransaction === 'function') {
    return fb.runTransaction(fb.db || window.__alloShared?.db, async transaction => {
      const snapshot = await transaction.get(ref), patch = checked(snapshot.data());
      if (patch) transaction.update(ref, patch);
    });
  }
  const snapshot = await fb.getDoc(ref), patch = checked(snapshot.data());
  if (patch) await fb.updateDoc(ref, patch);
}
