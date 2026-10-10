  // Production bakes the fixed dust catalog into the vertex shader. The only
  // dust uniform is u_dust, set explicitly for each test ray in native-check.cjs.
  global.__native.setProbeDust = function () {};
