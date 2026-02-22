# MCP Visual Server

A Model Context Protocol (MCP) server that provides visual understanding capabilities using local Ollama models.

## Features

This server implements 8 visual tools using the `qwen2.5vl:7b` model from Ollama:

### Tools

1. **ui_to_artifact** - Convert UI screenshots to code, design specs, design prompts, or natural language descriptions
2. **extract_text_from_screenshot** - OCR text extraction from screenshots (code, terminal, documents)
3. **diagnose_error_screenshot** - Analyze error dialogs, stack traces, and logs
4. **understand_technical_diagram** - Understand architecture diagrams, flowcharts, UML, ER diagrams
5. **analyze_data_visualization** - Summarize trends, anomalies, and insights from dashboards and charts
6. **ui_diff_check** - Compare two UI screenshots to identify visual differences
7. **image_analysis** - General image understanding with custom prompts
8. **video_analysis** - Video scene parsing (MVP - frame extraction to be enhanced)

## Installation

### Prerequisites

- **Node.js** >= v18.0.0
- **Ollama** running locally with `qwen2.5vl:7b` model

### Install Ollama Model

```bash
# Install Ollama if not already installed
curl -fsSL https://ollama.ai/install.sh | sh

# Pull the qwen2.5vl model
ollama pull qwen2.5vl:7b

# Verify the model is available
ollama list
```

### Install MCP Server

```bash
# Clone or navigate to the project directory
cd /path/to/mcp-visual-server

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### with Claude Desktop (Claude Code)

Add to your Claude Desktop configuration (`claude.json`):

```json
{
  "mcpServers": {
    "local-visual": {
      "command": "node",
      "args": ["/home/lpsadmin/work/mcp-visual-server/dist/index.js"]
    }
  }
}
```

### with Cline (VS Code Extension)

Add to your Cline settings (`.vscode/settings.json` or MCP configuration):

```json
{
  "mcpServers": {
    "local-visual": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/mcp-visual-server/dist/index.js"]
    }
  }
}
```

### with OpenCode

Add to your OpenCode configuration:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "local-visual": {
      "type": "local",
      "command": ["node", "/path/to/mcp-visual-server/dist/index.js"]
    }
  }
}
```

### Direct Execution

You can also run the server directly:

```bash
node dist/index.js
```

## Configuration

### Environment Variables

- `OLLAMA_BASE_URL` - Ollama API base URL (default: `http://localhost:11434`)
- `OLLAMA_MODEL` - Model to use (default: `qwen2.5vl:7b`)

Example:

```bash
OLLAMA_BASE_URL=http://localhost:11434 OLLAMA_MODEL=qwen2.5vl:7b node dist/index.js
```

## Testing

Test the MCP server with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

This will launch a web interface where you can test all available tools.

## Example Usage

### UI to Code

```json
{
  "tool": "ui_to_artifact",
  "arguments": {
    "image": "/path/to/screenshot.png",
    "output_type": "code"
  }
}
```

### Extract Text from Screenshot

```json
{
  "tool": "extract_text_from_screenshot",
  "arguments": {
    "image": "/path/to/code-screenshot.png"
  }
}
```

### Diagnose Error from Screenshot

```json
{
  "tool": "diagnose_error_screenshot",
  "arguments": {
    "image": "/path/to/error-dialog.png"
  }
}
```

### Understand Technical Diagram

```json
{
  "tool": "understand_technical_diagram",
  "arguments": {
    "image": "/path/to/architecture-diagram.png"
  }
}
```

### Analyze Data Visualization

```json
{
  "tool": "analyze_data_visualization",
  "arguments": {
    "image": "/path/to/dashboard.png"
  }
}
```

### Compare UI Screenshots

```json
{
  "tool": "ui_diff_check",
  "arguments": {
    "image1": "/path/to/ui-design.png",
    "image2": "/path/to/ui-implementation.png"
  }
}
```

### General Image Analysis

```json
{
  "tool": "image_analysis",
  "arguments": {
    "image": "/path/to/image.png",
    "prompt": "Describe the main elements in this image."
  }
}
```

### Video Analysis (MVP)

```json
{
  "tool": "video_analysis",
  "arguments": {
    "video_path": "/path/to/video.mp4",
    "task": "summary"
  }
}
```

## Video Analysis Enhancement (Future Work)

The current video analysis feature provides a framework but requires additional tooling for full functionality:

To enhance:
1. **Install ffmpeg** for video frame extraction:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install ffmpeg

   # macOS
   brew install ffmpeg
   ```

2. **Add frame extraction logic** in the video_analysis tool to:
   - Extract key frames from the video
   - Pass frames to the visual model for analysis
   - Compile results into a comprehensive summary

## Architecture

```
mcp-visual-server/
├── src/
│   ├── index.ts          # MCP server entry point
│   ├── ollama.ts         # Ollama client wrapper
│   └── tools/            # Tool implementations (organized by functionality)
├── dist/                 # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

## Development

```bash
# Watch mode for development
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Troubleshooting

### Ollama Not Running

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama if not running
ollama serve
```

### Model Not Available

```bash
# List available models
ollama list

# Pull the required model
ollama pull qwen2.5vl:7b
```

### TypeScript Build Errors

```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

## Performance Considerations

- The `qwen2.5vl:7b` model is relatively large (~6GB) and may take some time to load initially
- Images are resized to max 1024x1024 before analysis for performance
- First request may be slower as the model warms up

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Credits

- Based on [Model Context Protocol](https://modelcontextprotocol.io/) by Anthropic
- Uses [Ollama](https://ollama.ai/) for local model inference
- Visual model: Qwen2.5-VL by Alibaba Cloud