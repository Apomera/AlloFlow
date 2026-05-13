# NVIDIA NIM Integration — AlloFlow Setup Guide

AlloFlow supports NVIDIA NIM (Neural Inference Microservices) as a fourth AI provider, enabling **multimodal content generation** with images, audio, and video alongside text.

---

## Overview

| Feature | Details |
|---|---|
| **Provider ID** | `nvidia` |
| **API Base** | `https://integrate.api.nvidia.com/v1` |
| **Format** | OpenAI-compatible (`/v1/chat/completions`) |
| **Multimodal** | Images, audio files, microphone recordings, video |
| **Reasoning** | Chain-of-thought via `/think` system prompt |
| **Cost** | Free tier available at build.nvidia.com |

---

## Step 1 — Get a Free NVIDIA API Key

1. Go to **[build.nvidia.com](https://build.nvidia.com)** and sign in (free account, no credit card required)
2. Click your avatar icon (top-right) → **Get API Key**
3. Click **Generate Key** and copy the key (starts with `nvapi-`)

> **Note:** The free tier includes generous rate limits for educational use. No billing information is needed to start.

---

## Step 2 — Configure in AlloFlow Admin

1. Open **AlloFlow Admin** → **Settings** → **AI Config**
2. Under **AI Provider**, select **⚡ NVIDIA NIM**
3. Paste your API key in the **API Key** field
4. Choose a **Model** (see Available Models below)
5. Set **Reasoning Mode** (ON recommended for text; OFF required for audio/video)
6. Click **Save Configuration**
7. Restart the AlloFlow local app (or reload the browser tab)

---

## Available Models

| Model ID | Best For | Notes |
|---|---|---|
| `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` | **All modalities** — text, image, audio, video | Flagship multimodal + reasoning model. **Recommended.** |
| `nvidia/nemotron-nano-12b-v2-vl` | Text + images, fast responses | Vision-language model, 12B parameters |
| `nvidia/llama-3.1-nemotron-nano-vl-8b-v1` | Text + images, lightest | Llama-based, 8B — fastest inference |

---

## Multimodal Inputs

When NVIDIA NIM is the active provider, the **Source Material** panel in AlloFlow shows an **⚡ NVIDIA Multimodal Attachments** toolbar. You can attach:

### Images
- Click **🖼️ Image** to select a JPEG, PNG, WebP, or GIF file
- Images ≤ 180 KB are sent inline as base64
- Larger images are uploaded to NVIDIA's NVCF asset storage automatically

### Audio Files
- Click **🎵 Audio** to attach an MP3, WAV, OGG, or other audio file
- Audio input **requires Reasoning Mode OFF** (the app handles this automatically)

### Microphone Recording
- Click **🎤 Record** to start recording from your microphone
- Click **⏹ Stop** when done — the recording is added as an attachment
- Recordings are saved as WebM audio

### Video Files
- Click **🎬 Video** to attach an MP4, WebM, or MOV file
- Video input **requires Reasoning Mode OFF**
- Large videos are uploaded via NVCF asset storage (presigned S3 URL)

### Remove Attachments
- Click **×** on any chip to remove a single attachment
- Click **✕ Clear all** to remove all attachments at once

---

## Reasoning Mode

The Nemotron Omni model supports chain-of-thought reasoning controlled by a system prompt:

| Mode | System Prompt | Temperature | Best For |
|---|---|---|---|
| **ON** (default) | `/think` | 0.6, top_p 0.95 | Complex lesson plans, analysis, deep explanations |
| **OFF** | `/no_think` | 0 (greedy) | Fast responses, audio/video inputs, simple Q&A |

> **Important:** Audio and video attachments always force Reasoning OFF regardless of your setting, as the model requires this for multimodal inference.

The `<think>...</think>` reasoning traces are automatically stripped from responses before they appear in AlloFlow.

---

## Large File Handling (NVCF Asset Upload)

Files larger than **180 KB** are automatically uploaded via NVIDIA's NVCF Asset API:

1. AlloFlow requests a presigned upload slot from its local server
2. The file is uploaded directly to NVIDIA's S3 storage
3. The asset ID is referenced in the inference request via `NVCF-INPUT-ASSET-REFERENCES` header

This happens transparently — you don't need to do anything extra for large files.

---

## Rate Limits & Free Tier

- **Free tier:** ~1,000 inference calls/month per model (varies by model)
- **No credit card required** for free tier
- If you hit a limit, the API returns a `429` error — wait until the next billing cycle or add billing at [build.nvidia.com](https://build.nvidia.com)
- Rate limit status: visit your dashboard at build.nvidia.com → Usage

---

## Troubleshooting

### "NVIDIA API key not configured"
→ Go to Admin → AI Config → set the NVIDIA provider and paste your key → Save

### "401 Unauthorized"
→ Your API key may be expired or invalid. Generate a new one at build.nvidia.com → Get API Key

### "NVIDIA request timed out after 60s"
→ Large multimodal requests can take longer. Try a smaller attachment or switch to a faster model (nano-12b)

### Audio/video input not working
→ Ensure Reasoning Mode is **OFF** in AI Config (audio/video always require `/no_think`)

### Response contains `<think>...</think>` text
→ This should be stripped automatically. If you see it, reload the app and try again

### "Mic access denied"
→ Allow microphone access in your browser/OS settings for the AlloFlow app

---

## Security Notes

- Your NVIDIA API key is stored in `~/.alloflow/ai_config.json` (local only, never uploaded)
- The key is **never sent to the client browser** — all requests go through the AlloFlow local server proxy
- Files uploaded via NVCF asset storage are temporary and managed by NVIDIA

---

## Example Use Cases

- **OCR + Analysis**: Attach a photo of a student worksheet → ask AlloFlow to extract and analyze the content
- **Audio Transcription**: Record a classroom discussion → ask for a summary or quiz questions
- **Video Description**: Attach a short educational video clip → generate comprehension questions
- **Image-based Lesson Plans**: Upload a diagram → ask AlloFlow to create a lesson plan around it
