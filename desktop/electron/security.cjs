'use strict';

function parseOrigin(value) {
  try {
    return new URL(String(value || '')).origin;
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
  const frameUrl = event && event.senderFrame && event.senderFrame.url;
  if (frameUrl) return String(frameUrl);
  if (event && event.sender && typeof event.sender.getURL === 'function') {
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
