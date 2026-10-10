// The historical pins describe five-field xyz/UV records. The renderer adds
// a sixth field and a projected bulge suffix; keep testing those original bytes.
export function originalGalaxySurface(values, originalFloats) {
  const result = new Float32Array(originalFloats);
  for (let vertex = 0; vertex < originalFloats / 5; vertex++) {
    result.set(values.subarray(vertex * 6, vertex * 6 + 5), vertex * 5);
  }
  return result;
}

// One rounded bulge per spiral; the cosmic region's 46 ellipticals retain
// their existing projected grids. Nearby clouds remain eleven-field records.
export function galaxySurfaceFloats(region, originalFloats) {
  return originalFloats / 5 * 6 + ({ neighborhood: 0, galaxy: 1, cosmic: 88 }[region]) * (8 * 8 * 6 * 6);
}
