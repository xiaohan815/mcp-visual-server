# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server that provides visual understanding capabilities using local Ollama models. It bridges AI coding assistants (Claude Desktop, Cline, OpenCode) with the `qwen2.5vl:7b` vision model for image analysis tasks.

## Common Commands

```bash
# Build TypeScript to JavaScript
npm run build

# Watch mode for development (auto-rebuild on changes)
npm run dev

# Run the compiled MCP server
npm run start

# Run Node.js native tests
npm test

# Test MCP server with interactive inspector UI
npx @modelcontextprotocol/inspector node dist/index.js
```

## Architecture

```
Client (Claude/Cline/OpenCode)
    → MCP Protocol (STDIO via StdioServerTransport)
    → src/index.ts (MCP Server with 8 visual tools)
    → src/ollama.ts (OllamaClient wrapper)
    → Ollama API (localhost:11434) → qwen2.5vl:7b model
```

### Key Components

**src/index.ts** - Main MCP server entry point (~320 lines)
- Implements 8 visual tools via `CallToolRequestSchema`
- Uses `@modelcontextprotocol/sdk` for MCP protocol handling
- Each tool maps to a specific prompt for the vision model

**src/ollama.ts** - Ollama client wrapper (~94 lines)
- `generate(prompt, images)` - Core generation with optional base64 images
- `analyzeImage(imagePath, prompt)` - High-level API that uses sharp to resize images to max 1024x1024 before processing
- `chat(messages)` - Chat-based API (currently unused but available)

### Environment Variables

- `OLLAMA_BASE_URL` - Ollama API endpoint (default: `http://localhost:11434`)
- `OLLAMA_MODEL` - Vision model to use (default: `qwen2.5vl:7b`)

## MCP Tools

The server exposes 8 tools for different visual analysis tasks:

| Tool | Purpose | Key Prompt Strategy |
|------|---------|-------------------|
| `ui_to_artifact` | Convert UI to code/design specs/prompts | Prompt varies by `output_type` (code/design_specs/design_prompt/description) |
| `extract_text_from_screenshot` | OCR for code, terminal, documents | "Extract and transcribe ALL text... preserving formatting" |
| `diagnose_error_screenshot` | Error dialogs, stack traces, logs | Structured: error type, location, root causes, solutions |
| `understand_technical_diagram` | Architecture, flowcharts, UML, ER | Structured: type, components, relationships, patterns |
| `analyze_data_visualization` | Dashboards, charts | Type, trends, anomalies, insights |
| `ui_diff_check` | Compare two UI screenshots | Analyzes both images separately, then compares descriptions |
| `image_analysis` | General image understanding | Custom prompt with default "Describe this image in detail" |
| `video_analysis` | Video scene parsing (MP4/MOV/M4V) | MVP only - framework exists but needs ffmpeg for frame extraction |

## Video Analysis Status

The `video_analysis` tool is a framework MVP. Full implementation requires:
1. Installing ffmpeg for frame extraction
2. Adding logic to extract key frames from video
3. Passing frames to `ollama.analyzeImage()`

Currently returns a message describing the limitation rather than processing video.

## Image Processing

All images are preprocessed using sharp before sending to Ollama:
- Resized to max 1024x1024 with `fit: 'inside'` and `withoutEnlargement: true`
- Converted to JPEG at 90% quality
- Encoded as base64 for API transmission

This is done in `ollama.ts:57-67` within the `analyzeImage()` method.