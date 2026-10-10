// The historical pins describe five-field xyz/UV records. The renderer adds
// a sixth field and projected bulge/disk suffixes; keep testing those original bytes.
export function originalGalaxySurface(values, originalFloats) {
  const result = new Float32Array(originalFloats);
  for (let vertex = 0; vertex < originalFloats / 5; vertex++) {
    result.set(values.subarray(vertex * 6, vertex * 6 + 5), vertex * 5);
  }
  return result;
}

// One rounded bulge and one smooth disk per spiral; the cosmic region's
// 46 ellipticals retain their existing grids. Nearby clouds stay eleven-field records.
export function galaxySurfaceFloats(region, originalFloats) {
  return originalFloats / 5 * 6 + 2 * ({ neighborhood: 0, galaxy: 1, cosmic: 88 }[region]) * (8 * 8 * 6 * 6);
}
