export const tr = (t, key, fallback, params = {}) => {
  const full = 'lesson_board.' + key, value = typeof t === 'function' ? t(full, params) : '';
  return Object.entries(params).reduce((text, [name, replacement]) => text.replaceAll('{' + name + '}', String(replacement)), typeof value === 'string' && value && value !== full ? value : fallback);
};
