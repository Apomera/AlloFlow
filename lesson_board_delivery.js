export const BOARD_DELIVERY_TIMEOUT_MS = 20000;

// A timeout releases the UI; it does not cancel or disprove the underlying write.
// Callers must retry the same action ID until the teacher confirms it.
export async function waitForBoardDelivery(request) {
  let timer;
  try {
    return await Promise.race([
      request,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(Object.assign(Error('Board delivery is taking longer than expected.'), { code: 'board-delivery-timeout' })), BOARD_DELIVERY_TIMEOUT_MS);
      }),
    ]);
  } finally { clearTimeout(timer); }
}

export function useBoardOnline() {
  const { useState, useEffect } = window.React;
  const read = () => window.navigator.onLine !== false;
  const [online, setOnline] = useState(read);
  useEffect(() => {
    const update = () => setOnline(read());
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}
