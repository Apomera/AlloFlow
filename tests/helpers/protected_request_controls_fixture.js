// Contract fixture for business-workflow tests. The real-service tests cover
// immutable capabilities, malformed guards and provider dispatch boundaries.
export function attachRequestControlsFixture(session) {
  session.createRequestControls = (epoch, assertOperation, inherited) => {
    const previous = inherited && inherited.beforeRequest;
    const beforeRequest = () => {
      session.assertCurrent(epoch); session.assertCanTransmit('ai');
      assertOperation?.(); previous?.();
      session.assertCurrent(epoch); session.assertCanTransmit('ai');
      return true;
    };
    beforeRequest();
    return Object.freeze({ beforeRequest });
  };
  return session;
}
