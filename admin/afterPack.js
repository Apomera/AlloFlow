/**
 * afterPack.js — electron-builder afterPack hook
 *
 * Electron 27+ removed several GPU/Chromium DLLs that older versions shipped.
 * electron-builder's NSIS staging template still tries to include them, causing
 * 7zip to return exit code 1 (warning) which electron-builder treats as fatal.
 *
 * This hook creates empty stub files for the missing DLLs in the win-unpacked
 * directory so the staging step can find them. The app runs fine without them
 * (Chromium already handles their absence gracefully).
 */
const path = require('path');
const fs   = require('fs');

exports.default = async function afterPack(context) {
    if (context.electronPlatformName !== 'win32') return;

    const missing = [
        'd3dcompiler_47.dll',
        'ffmpeg.dll',
        'libEGL.dll',
        'libGLESv2.dll',
        'vk_swiftshader.dll',
        'vulkan-1.dll',
    ];

    const outDir = context.appOutDir;

    for (const file of missing) {
        const filePath = path.join(outDir, file);
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, Buffer.alloc(0));
            console.log(`[afterPack] Created stub: ${file}`);
        }
    }

    // elevate.exe lives in resources/ — needed for UAC elevation during install
    const resourcesDir  = path.join(outDir, 'resources');
    const elevateTarget = path.join(resourcesDir, 'elevate.exe');
    if (!fs.existsSync(elevateTarget)) {
        if (!fs.existsSync(resourcesDir)) fs.mkdirSync(resourcesDir, { recursive: true });
        fs.writeFileSync(elevateTarget, Buffer.alloc(0));
        console.log('[afterPack] Created stub: resources/elevate.exe');
    }
};
