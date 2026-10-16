// Sprite textures are screen-aligned by default. Rotate their vertical axis
// toward projected world-up so cloud bases bank with the actual horizon.
// The camera quaternion is current immediately after lookAt; matrixWorld may
// still describe the previous frame until the renderer updates the scene.
function getFlightCloudRoll(quaternion, previousRoll) {
  var fallback = Number.isFinite(previousRoll) ? previousRoll : 0;
  if (!quaternion || !Number.isFinite(quaternion.x) || !Number.isFinite(quaternion.y) ||
      !Number.isFinite(quaternion.z) || !Number.isFinite(quaternion.w)) return fallback;
  // Scale before normalization to avoid overflow for otherwise finite input.
  var scale = Math.max(Math.abs(quaternion.x), Math.abs(quaternion.y), Math.abs(quaternion.z), Math.abs(quaternion.w));
  if (!(scale > 0)) return fallback;
  var x = quaternion.x / scale, y = quaternion.y / scale;
  var z = quaternion.z / scale, w = quaternion.w / scale;
  var length = Math.sqrt(x * x + y * y + z * z + w * w);
  x /= length; y /= length; z /= length; w /= length;
  var rightY = 2 * (x * y + z * w);
  var upY = 1 - 2 * (x * x + z * z);
  // Looking almost straight up/down leaves no meaningful projected horizon.
  // Keep the last orientation there instead of amplifying floating-point noise.
  if (rightY * rightY + upY * upY <= 0.00000001) return fallback;
  return Math.atan2(-rightY, upY);
}

// Recycle a distant cloud in one bounded operation, including after a large
// camera move. Do not round a cloud already in range: it must stay world-fixed.
function wrapFlightCloudCoordinate(value, center, halfSpan) {
  var fallback = Number.isFinite(center) ? center : 0;
  if (!Number.isFinite(value) || !Number.isFinite(center) || !Number.isFinite(halfSpan) || halfSpan <= 0) return fallback;
  var lower = center - halfSpan, upper = center + halfSpan, width = halfSpan * 2;
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || !Number.isFinite(width) || !(upper > lower)) return fallback;
  if (value >= lower && value < upper) return value;
  var offset = value - lower;
  // Opposite large finite coordinates can overflow during subtraction even
  // though their remainders and the final wrapped position are representable.
  if (!Number.isFinite(offset)) offset = value % width - lower % width;
  var wrapped = offset % width;
  if (wrapped < 0) wrapped += width;
  var result = lower + wrapped;
  // Rounding at extreme coordinate magnitudes must not return the open edge.
  return result < upper ? result : lower;
}

// Fade fully before any square torus edge. A radial fade also suppresses the
// corners, so a cloud cannot reappear at the opposite edge at nonzero opacity.
function getFlightCloudEdgeFade(offsetX, offsetZ, halfSpan) {
  if (!Number.isFinite(offsetX) || !Number.isFinite(offsetZ) || !Number.isFinite(halfSpan) || halfSpan <= 0) return 0;
  var radius = Math.hypot(offsetX, offsetZ);
  if (radius >= halfSpan) return 0;
  if (radius <= halfSpan * 0.55) return 1;
  var t = (radius / halfSpan - 0.55) / 0.45;
  return 1 - t * t * (3 - 2 * t);
}

// Weather/quality changes adjust a sprite's presence without changing its
// position. The caller seeds first-frame presence to the target and can snap
// for reduced motion. A held paused frame supplies zero elapsed time.
function stepFlightCloudPresence(current, target, dtSeconds) {
  var goal = Number.isFinite(target) ? Math.max(0, Math.min(1, target)) : 0;
  if (!Number.isFinite(current)) return goal;
  var present = Math.max(0, Math.min(1, current));
  var delta = Number.isFinite(dtSeconds) ? Math.max(0, Math.min(0.1, dtSeconds)) : 0;
  var step = delta * 0.6;
  if (Math.abs(goal - present) <= step) return goal;
  return present + (goal > present ? step : -step);
}
