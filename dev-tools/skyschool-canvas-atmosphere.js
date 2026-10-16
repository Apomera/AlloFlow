// Sample the WebGL sky's world-up gradient along an unrolled Canvas view.
// The caller rotates the padded world afterward and retains its original
// focal length, so banking does not zoom or repaint the atmospheric profile.
function getFlightCanvasSkyStops(view, height, palette) {
  function validColor(color) {
    return Array.isArray(color) && color.length === 3 && color.every(function(channel) {
      return Number.isFinite(channel) && channel >= 0 && channel <= 1;
    });
  }
  if (!Number.isFinite(height) || height <= 0 || !palette ||
      !validColor(palette.horizon) || !validColor(palette.zenith)) return [];
  function unit(axis) {
    if (!axis || !Number.isFinite(axis.x) || !Number.isFinite(axis.y) || !Number.isFinite(axis.z)) return null;
    var scale = Math.max(Math.abs(axis.x), Math.abs(axis.y), Math.abs(axis.z));
    if (scale === 0) return null;
    var x = axis.x / scale, y = axis.y / scale, z = axis.z / scale;
    var length = Math.sqrt(x * x + y * y + z * z);
    return { x: x / length, y: y / length, z: z / length };
  }
  var forward = unit(view && view.forward), up = unit(view && view.up);
  if (!forward || !up || Math.abs(forward.x * up.x + forward.y * up.y + forward.z * up.z) > 0.999999) {
    view = null;
    forward = { x: 0, y: 0, z: -1 };
    up = { x: 0, y: 1, z: 0 };
  }
  var fov = view && Number.isFinite(view.fov) && view.fov > 0 && view.fov < 180 ? view.fov : 60;
  var focal = view && Number.isFinite(view.focalLength) && view.focalLength > 0
    ? view.focalLength : height / (2 * Math.tan(fov * Math.PI / 360));
  if (!Number.isFinite(focal) || focal <= 0) focal = height / (2 * Math.tan(Math.PI / 6));
  var stops = [];
  for (var i = 0; i <= 16; i++) {
    var offset = i / 16, pixelOffset = (0.5 - offset) * height;
    // Rescale before combining to keep finite rays for tiny focal lengths or
    // very large dimensions; this has the same direction as forward+up*y/f.
    var scale = Math.max(focal, Math.abs(pixelOffset));
    var f = focal / scale, u = pixelOffset / scale;
    var x = forward.x * f + up.x * u, y = forward.y * f + up.y * u, z = forward.z * f + up.z * u;
    var length = Math.sqrt(x * x + y * y + z * z);
    var skyHeight = Math.max(0, Math.min(1, y / length));
    var amount = Math.max(0, Math.min(1, skyHeight / 0.65));
    amount = amount * amount * (3 - 2 * amount);
    stops.push({ offset: offset, color: [
      palette.horizon[0] + (palette.zenith[0] - palette.horizon[0]) * amount,
      palette.horizon[1] + (palette.zenith[1] - palette.horizon[1]) * amount,
      palette.horizon[2] + (palette.zenith[2] - palette.horizon[2]) * amount
    ] });
  }
  return stops;
}
