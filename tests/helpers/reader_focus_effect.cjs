'use strict';
// Extract the production focus effect without executing the full application.
function extractFocusEffect(source) {
  const start = source.indexOf('  const focusNarrationAudioRef = useRef(null);');
  const marker = '  }, [focusNarrationEnabled, t, selectedVoice, voiceSpeed, voiceVolume]);';
  const end = source.indexOf(marker, start);
  if (start < 0 || end < start) throw new Error('Focus narration effect not found');
  return source.slice(source.indexOf('  useEffect(() => {', start), end + marker.length);
}
module.exports = { extractFocusEffect };
