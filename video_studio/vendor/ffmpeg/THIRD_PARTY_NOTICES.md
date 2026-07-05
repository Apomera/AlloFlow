# Third-Party Notices for Video Studio FFmpeg Assets

AlloFlow Video Studio vendors browser-side FFmpeg assets so Strict MP4 export can run locally without loading converter code from a live CDN at export time.

Vendored packages:

- `@ffmpeg/ffmpeg` 0.12.15, MIT license
- `@ffmpeg/core` 0.12.10, GPL-2.0-or-later license

Source project: https://github.com/ffmpegwasm/ffmpeg.wasm

These assets are loaded only when Video Studio needs the local Strict MP4 conversion path.
