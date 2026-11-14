'use strict';

function parseOrigin(value) {
  try {
    const parsed = new URL(String(value || ''));
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
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
  if ('senderFrame' in event && event.senderFrame !== undefined) {
    if (!event.senderFrame || typeof event.senderFrame.url !== 'string') return '';
    return event.senderFrame.url;
  }
  if (event.sender && typeof event.sender.getURL === 'function') {
    return String(event.sender.getURL() || '');
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
