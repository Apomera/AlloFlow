'use strict';

function parseDeclarations(style) {
  const declarations = Object.create(null);
  String(style || '').split(';').forEach(function (entry) {
    const separator = entry.indexOf(':');
    if (separator < 0) return;
    const property = entry.slice(0, separator).trim().toLowerCase();
    const value = entry.slice(separator + 1).trim().toLowerCase().replace(/\s*!important\s*$/, '');
    if (property) declarations[property] = value;
  });
  return declarations;
}

function pixelValue(value) {
  const match = String(value || '').trim().match(/^(\d+(?:\.\d+)?)px$/i);
  return match ? Number(match[1]) : null;
}

function hasLargeFixedWidth(style, widthAttribute, threshold, intrinsicThreshold) {
  const minimum = Number.isFinite(threshold) ? threshold : 700;
  const intrinsicMinimum = Number.isFinite(intrinsicThreshold) ? intrinsicThreshold : minimum;
  const declarations = parseDeclarations(style);
  const width = pixelValue(declarations.width);
  const minWidth = pixelValue(declarations['min-width']);
  const responsiveCap = declarations['max-width'] === '100%' || declarations['max-width'] === '100vw';

  if (minWidth !== null && minWidth >= minimum) return true;
  if (width !== null && width >= minimum && !responsiveCap) return true;

  const intrinsicMatch = String(widthAttribute || '').trim().match(/^(\d+(?:\.\d+)?)$/);
  if (!intrinsicMatch || Number(intrinsicMatch[1]) < intrinsicMinimum) return false;
  if (declarations.width === '100%' || responsiveCap) return false;
  return true;
}

module.exports = { hasLargeFixedWidth, parseDeclarations, pixelValue };
