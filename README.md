# MCP Visual Server

一个基于 Model Context Protocol（MCP）的服务，使用本地 Ollama 模型提供视觉理解能力。

## 功能特性

这个服务基于 Ollama 的 `qwen2.5vl:7b` 模型，提供 8 个视觉工具：

### 工具列表

1. **ui_to_artifact** - 将 UI 截图转换为代码、设计规范、设计提示词或自然语言描述
2. **extract_text_from_screenshot** - 从截图中提取文字，适用于代码、终端和文档等 OCR 场景
3. **diagnose_error_screenshot** - 分析报错弹窗、堆栈和日志截图
4. **understand_technical_diagram** - 理解架构图、流程图、UML、ER 图等技术图
5. **analyze_data_visualization** - 总结仪表盘和图表中的趋势、异常和洞察
6. **ui_diff_check** - 对比两张 UI 截图，识别视觉差异
7. **image_analysis** - 支持自定义提示词的通用图片理解
8. **video_analysis** - 视频场景解析框架（MVP，后续可增强帧提取能力）

## 安装

### 前置条件

- **Node.js** >= v18.0.0
- **Ollama** 已在本地运行，并可使用 `qwen2.5vl:7b` 模型

### 安装 Ollama 模型

```bash
# 如果还没安装 Ollama，先安装
curl -fsSL https://ollama.ai/install.sh | sh

# 拉取 qwen2.5vl 模型
ollama pull qwen2.5vl:7b

# 确认模型已经可用
ollama list
```

### 安装 MCP 服务

```bash
# 克隆仓库或进入项目目录
cd /path/to/mcp-visual-server

# 安装依赖
npm install

# 构建项目
npm run build
```

## 使用方式

### 在 Claude Code CLI 中使用

使用 `claude mcp add` 命令添加这个服务：

```bash
claude mcp add local-visual \
  --env OLLAMA_BASE_URL=http://127.0.0.1:11434 \
  --env OLLAMA_MODEL=qwen2.5vl:7b \
  -- node /Users/xhm5/work/mcp-visual-server/dist/index.js
```

如果你希望把它加成用户级 MCP，而不是只在当前项目可用：

```bash
claude mcp add local-visual --scope user \
  --env OLLAMA_BASE_URL=http://127.0.0.1:11434 \
  --env OLLAMA_MODEL=qwen2.5vl:7b \
  -- node /Users/xhm5/work/mcp-visual-server/dist/index.js
```

添加完成后可以这样验证：

```bash
claude mcp list
claude mcp get local-visual
```

### 在 Claude Desktop 中使用

把下面的配置加入 Claude Desktop 的配置文件 `claude.json`：

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

### 在 Cline 中使用（VS Code 扩展）

把下面的配置加入 Cline 设置中，例如 `.vscode/settings.json` 或 MCP 配置文件：

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

### 在 OpenCode 中使用

把下面的配置加入 OpenCode 配置中：

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

### 直接运行

你也可以直接启动这个服务：

```bash
node dist/index.js
```

## 配置

### 环境变量

- `OLLAMA_BASE_URL` - Ollama API 地址，默认值：`http://localhost:11434`
- `OLLAMA_MODEL` - 使用的模型名，默认值：`qwen2.5vl:7b`

示例：

```bash
OLLAMA_BASE_URL=http://localhost:11434 OLLAMA_MODEL=qwen2.5vl:7b node dist/index.js
```

## 测试

可以用 MCP Inspector 测试这个服务：

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

这会打开一个网页界面，你可以在里面测试所有可用工具。

## 使用示例

### UI 转代码

```json
{
  "tool": "ui_to_artifact",
  "arguments": {
    "image": "/path/to/screenshot.png",
    "output_type": "code"
  }
}
```

### 从截图中提取文字

```json
{
  "tool": "extract_text_from_screenshot",
  "arguments": {
    "image": "/path/to/code-screenshot.png"
  }
}
```

### 从截图中诊断错误

```json
{
  "tool": "diagnose_error_screenshot",
  "arguments": {
    "image": "/path/to/error-dialog.png"
  }
}
```

### 理解技术图

```json
{
  "tool": "understand_technical_diagram",
  "arguments": {
    "image": "/path/to/architecture-diagram.png"
  }
}
```

### 分析数据可视化图表

```json
{
  "tool": "analyze_data_visualization",
  "arguments": {
    "image": "/path/to/dashboard.png"
  }
}
```

### 对比 UI 截图

```json
{
  "tool": "ui_diff_check",
  "arguments": {
    "image1": "/path/to/ui-design.png",
    "image2": "/path/to/ui-implementation.png"
  }
}
```

### 通用图片分析

```json
{
  "tool": "image_analysis",
  "arguments": {
    "image": "/path/to/image.png",
    "prompt": "Describe the main elements in this image."
  }
}
```

### 视频分析（MVP）

```json
{
  "tool": "video_analysis",
  "arguments": {
    "video_path": "/path/to/video.mp4",
    "task": "summary"
  }
}
```

## 视频分析增强方向（后续工作）

当前的视频分析功能只是一个框架，要真正可用还需要补充额外能力：

1. **安装 ffmpeg**，用于从视频中提取帧：

   ```bash
   # Ubuntu/Debian
   sudo apt-get install ffmpeg

   # macOS
   brew install ffmpeg
   ```

2. **在 `video_analysis` 工具中补充帧提取逻辑**，实现：

   - 从视频中提取关键帧
   - 把关键帧送入视觉模型分析
   - 汇总结果，生成完整总结

## 项目结构

```text
mcp-visual-server/
├── src/
│   ├── index.ts          # MCP 服务入口
│   ├── ollama.ts         # Ollama 客户端封装
│   └── tools/            # 工具实现（按功能组织）
├── dist/                 # 编译后的 JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

## 开发

```bash
# 开发模式，自动监听并重新编译
npm run dev

# 运行测试
npm test

# 生产构建
npm run build
```

## 常见问题

### Ollama 没有启动

```bash
# 检查 Ollama 是否正在运行
curl http://localhost:11434/api/tags

# 如果没有运行，启动 Ollama
ollama serve
```

### 模型不可用

```bash
# 查看当前可用模型
ollama list

# 拉取项目需要的模型
ollama pull qwen2.5vl:7b
```
