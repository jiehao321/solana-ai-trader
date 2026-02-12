---
name: video-creator
description: Video creation assistant - helps plan scripts, storyboards, select tools, and write automation scripts for video production. Use when the user wants to create videos, needs video editing guidance, script writing, tool recommendations, or automation scripts for video workflows.
---

# Video Creator

AI video generation assistant. Helps with planning, scripting, tool selection, and automation for video production.

## What I Can Do

1. **Script Writing** - Write video scripts, voiceover text, captions
2. **Storyboard Planning** - Plan shots, scenes, visual flow
3. **Tool Recommendations** - Suggest best tools for your needs
4. **Automation Scripts** - Generate Python/FFmpeg scripts for batch processing
5. **Video Analysis** - Describe and analyze uploaded videos

## What I Cannot Do

- ❌ Generate video files directly
- ❌ Access video generation APIs (Runway, Pika, etc.)
- ❌ Execute FFmpeg or video processing tools

## AI Video Generation Tools

| Tool | Best For | Pricing |
|------|----------|---------|
| **Runway Gen-3** | High-quality cinematic videos | Paid |
| **Pika Labs** | Quick short clips, effects | Freemium |
| **HeyGen** | AI avatars, talking heads | Paid |
| **Kling AI** | Realistic motion, China access | Paid |
| **Luma Dream Machine** | Fast generation | Freemium |
| **Sora** (OpenAI) | Longer coherent videos | Limited access |

## Video Editing Tools

| Tool | Platform | Best For |
|------|----------|----------|
| **CapCut** | Mobile/Desktop | Easy editing, templates |
| **剪映专业版** | Desktop | Chinese users, subtitles |
| **Premiere Pro** | Desktop | Professional editing |
| **DaVinci Resolve** | Desktop | Free, color grading |
| **FFmpeg** | Command-line | Automation, conversion |

## Automation Scripts

See [scripts/] directory for:
- `batch_convert.py` - Batch format conversion
- `add_subtitles.py` - Auto-generate and burn subtitles
- `concat_videos.py` - Merge multiple videos

## Workflow

1. **Define Goal** - What type of video? Length? Style?
2. **Choose Tool** - AI generation or traditional editing?
3. **Create Content** - Script, storyboard, assets
4. **Generate/Edit** - Use appropriate tools
5. **Post-Process** - Subtitles, effects, export

## Quick Start Templates

### Short Form (TikTok/Reels/Shorts)
- 15-60 seconds
- Hook in first 3 seconds
- Vertical 9:16 format
- Captions required

### Explainer Video
- 1-3 minutes
- Clear problem → solution structure
- Voiceover + visuals
- 16:9 or 9:16

### AI-Generated Clip
- Text prompt → Video
- 4-10 seconds typical
- Iterate on prompts
- Upscale for quality
