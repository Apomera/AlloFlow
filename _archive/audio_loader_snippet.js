// --- AUDIO EXTERNALIZATION LOGIC START ---
let _AUDIO_BANK = null;
const _AUDIO_BANK_URL = 'audio_bank.json';

// Global accessor to retrieve audio data safely
function getAudio(category, key) {
    if (!_AUDIO_BANK) return null;
    if (_AUDIO_BANK[category] && _AUDIO_BANK[category][key]) return _AUDIO_BANK[category][key];
    if (_AUDIO_BANK['misc'] && _AUDIO_BANK['misc'][key]) return _AUDIO_BANK['misc'][key];
    return null;
}

async function _initAudioBank() {
    console.log("Initializing Audio Bank from " + _AUDIO_BANK_URL);
    try {
        const response = await fetch(_AUDIO_BANK_URL);
        if (!response.ok) throw new Error("HTTP " + response.status);
        _AUDIO_BANK = await response.json();
        console.log("Audio Bank loaded successfully. Categories:", Object.keys(_AUDIO_BANK));
        window.dispatchEvent(new Event('audio_bank_loaded'));
    } catch (err) {
        console.error("Failed to load Audio Bank:", err);
    }
}

_initAudioBank();

const LoadAudioButton = ({ className }) => {
    const fileInputRef = React.useRef(null);
    const handleClick = () => { fileInputRef.current?.click(); };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target.result);
                _AUDIO_BANK = json;
                window.dispatchEvent(new Event('audio_bank_loaded'));
                alert("Audio Pack loaded successfully!");
            } catch (err) {
                alert("Failed to parse Audio Pack JSON.");
            }
        };
        reader.readAsText(file);
    };

    return React.createElement(React.Fragment, null,
        React.createElement('input', { type: 'file', ref: fileInputRef, onChange: handleFileChange, style: { display: 'none' }, accept: '.json' }),
        React.createElement('button', { onClick: handleClick, className: className, title: "Load Audio Pack manually", 'aria-label': "Load Audio Pack" },
            React.createElement(Upload, { size: 18 })
        )
    );
};
// --- AUDIO EXTERNALIZATION LOGIC END ---
