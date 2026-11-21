'use strict';

function parseOrigin(value) {
  try {
    const parsed = new URL(String(value || ''));
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    if (parsed.username || parsed.password) return '';
    return (!parsed.origin || parsed.origin === 'null') ? '' : parsed.origin;
  } catch (_) {
    return '';
  }
}

function isSameOrigin(candidateUrl, trustedUrl) {
  const candidateOrigin = parseOrigin(candidateUrl);
  const trustedOrigin = parseOrigin(trustedUrl);
  return Boolean(candidateOrigin && trustedOrigin && candidateOrigin === trustedOrigin);
}

function getIpcSenderUrl(event) {
  if (!event || typeof event !== 'object') return '';
  if ('senderFrame' in event) {
    try {
      const frame = event.senderFrame;
      if (!frame || typeof frame.url !== 'string') return '';
      return frame.url;
    } catch (_) {
      return '';
    }
  }
  try {
    if (event.sender && typeof event.sender.getURL === 'function') {
      return String(event.sender.getURL() || '');
    }
  } catch (_) {
    return '';
  }
  return '';
}

function assertTrustedIpcSender(event, trustedUrl) {
  const senderUrl = getIpcSenderUrl(event);
  if (!isSameOrigin(senderUrl, trustedUrl)) {
    throw new Error('Blocked desktop IPC request from an untrusted renderer origin.');
  }
}

module.exports = {
  assertTrustedIpcSender,
  getIpcSenderUrl,
  isSameOrigin,
  parseOrigin,
};
