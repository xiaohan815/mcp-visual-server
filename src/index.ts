#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { OllamaClient } from './ollama.js';
import * as fs from 'fs';
import * as path from 'path';

const ollama = new OllamaClient(
  process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  process.env.OLLAMA_MODEL || 'qwen2.5vl:7b'
);

const IMAGE_PRESETS = {
  default: { format: 'jpeg' as const, maxWidth: 1400, maxHeight: 1400, quality: 90 },
  diagram: { format: 'png' as const, maxWidth: 1800, maxHeight: 1800 },
  text: { format: 'png' as const, maxWidth: 2000, maxHeight: 2000 },
  ui: { format: 'png' as const, maxWidth: 1600, maxHeight: 1600 },
};

function getRequiredStringArg(args: Record<string, unknown>, key: string): string {
  const value = args[key];

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid argument "${key}": expected a non-empty string.`);
  }

  return value.trim();
}

function getExistingFilePath(filePath: string, label: string): string {
  const resolvedPath = path.resolve(filePath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`${label} not found: ${filePath}`);
  }

  if (!fs.statSync(resolvedPath).isFile()) {
    throw new Error(`${label} is not a file: ${filePath}`);
  }

  return resolvedPath;
}

function getEnumArg<T extends string>(
  args: Record<string, unknown>,
  key: string,
  allowedValues: readonly T[],
  fallback: T
): T {
  const value = args[key];

  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== 'string' || !allowedValues.includes(value as T)) {
    throw new Error(`Invalid argument "${key}": expected one of ${allowedValues.join(', ')}.`);
  }

  return value as T;
}

const server = new Server(
  {
    name: 'mcp-visual-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'ui_to_artifact',
        description: '将 UI 截图转换为代码、设计规范、设计提示词或自然语言说明，覆盖从界面还原到设计产出的完整流程。',
        inputSchema: {
          type: 'object',
          properties: {
            image: {
              type: 'string',
              description: 'Path to the UI screenshot image',
            },
            output_type: {
              type: 'string',
              enum: ['code', 'design_specs', 'design_prompt', 'description'],
              description: 'Type of output to generate',
              default: 'code',
            },
          },
          required: ['image'],
        },
      },
      {
        name: 'extract_text_from_screenshot',
        description: '从截图中提取并识别文字，适用于代码、终端输出、文档内容和通用 OCR 场景。',
        inputSchema: {
          type: 'object',
          properties: {
            image: {
              type: 'string',
              description: 'Path to the screenshot image',
            },
          },
          required: ['image'],
        },
      },
      {
        name: 'diagnose_error_screenshot',
        description: '解析报错弹窗、堆栈和日志截图，帮助定位问题并给出修复建议。',
        inputSchema: {
          type: 'object',
          properties: {
            image: {
              type: 'string',
              description: 'Path to the error screenshot',
            },
          },
          required: ['image'],
        },
      },
      {
        name: 'understand_technical_diagram',
        description: '对架构图、流程图、UML、ER 图等技术图进行结构化理解和说明。',
        inputSchema: {
          type: 'object',
          properties: {
            image: {
              type: 'string',
              description: 'Path to the technical diagram',
            },
          },
          required: ['image'],
        },
      },
      {
        name: 'analyze_data_visualization',
        description: '分析仪表盘和统计图表，总结趋势、异常点以及可能的业务洞察。',
        inputSchema: {
          type: 'object',
          properties: {
            image: {
              type: 'string',
              description: 'Path to the data visualization',
            },
          },
          required: ['image'],
        },
      },
      {
        name: 'ui_diff_check',
        description: '直接对比两张 UI 截图，识别视觉差异和实现偏差，并将 image1 视为参考设计、image2 视为待检查实现。',
        inputSchema: {
          type: 'object',
          properties: {
            image1: {
              type: 'string',
              description: 'Path to the first UI screenshot',
            },
            image2: {
              type: 'string',
              description: 'Path to the second UI screenshot',
            },
          },
          required: ['image1', 'image2'],
        },
      },
      {
        name: 'image_analysis',
        description: '通用图片理解工具，适用于不属于其他专项工具范围的视觉内容分析。',
        inputSchema: {
          type: 'object',
          properties: {
            image: {
              type: 'string',
              description: 'Path to the image',
            },
            prompt: {
              type: 'string',
              description: 'Custom prompt for analysis (optional)',
              default: 'Describe this image in detail.',
            },
          },
          required: ['image'],
        },
      },
      {
        name: 'video_analysis',
        description: '实验性视频分析占位工具，当前会校验 MP4/MOV/M4V 文件并说明后续基于 ffmpeg 的增强方向。',
        inputSchema: {
          type: 'object',
          properties: {
            video_path: {
              type: 'string',
              description: 'Path to the video file',
            },
            task: {
              type: 'string',
              enum: ['summary', 'key_frames', 'events', 'transcript'],
              description: 'Type of analysis to perform',
              default: 'summary',
            },
          },
          required: ['video_path'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    throw new Error('No arguments provided');
  }

  try {
    switch (name) {
      case 'ui_to_artifact': {
        const imagePath = getExistingFilePath(getRequiredStringArg(args, 'image'), 'Image');
        const outputType = getEnumArg(
          args,
          'output_type',
          ['code', 'design_specs', 'design_prompt', 'description'] as const,
          'code'
        );

        const prompts: Record<string, string> = {
          code: 'Analyze this UI screenshot and produce production-ready frontend code. Match the layout, spacing, hierarchy, copy, states, and responsive behavior as closely as possible. Call out any details that are visually ambiguous instead of inventing them.',
          design_specs: 'Extract detailed design specifications from this UI including colors, typography, spacing, components, and layout patterns.',
          design_prompt: 'Convert this UI into detailed prompts for AI design tools like Figma AI or generative design.',
          description: 'Describe this UI in detail, explaining its structure, components, purpose, and user experience.',
        };

        const result = await ollama.analyzeImage(imagePath, prompts[outputType], IMAGE_PRESETS.ui);
        return { content: [{ type: 'text', text: result }] };
      }

      case 'extract_text_from_screenshot': {
        const imagePath = getExistingFilePath(getRequiredStringArg(args, 'image'), 'Image');

        const result = await ollama.analyzeImage(
          imagePath,
          'Extract and transcribe ALL visible text from this image. Preserve line breaks, indentation, tables, and section order as faithfully as possible. If any text is partially illegible, mark it as [unclear] instead of guessing. If there is code, return it in fenced code blocks.',
          IMAGE_PRESETS.text
        );

        return { content: [{ type: 'text', text: result }] };
      }

      case 'diagnose_error_screenshot': {
        const imagePath = getExistingFilePath(getRequiredStringArg(args, 'image'), 'Image');

        const result = await ollama.analyzeImage(
          imagePath,
          'This is an error screenshot. First transcribe the exact visible error text, stack trace, and file locations. Then identify: 1) the primary error, 2) likely root causes, 3) the most relevant code or config area to inspect, and 4) specific fixes. If the screenshot is blurry or incomplete, say what is uncertain.',
          IMAGE_PRESETS.text
        );

        return { content: [{ type: 'text', text: result }] };
      }

      case 'understand_technical_diagram': {
        const imagePath = getExistingFilePath(getRequiredStringArg(args, 'image'), 'Image');

        const result = await ollama.analyzeImage(
          imagePath,
          'Analyze this technical diagram and provide a structured explanation in markdown. Include: 1) diagram type, 2) main components and responsibilities, 3) relationships or data flow, and 4) notable architectural patterns or decisions. If any labels are hard to read, call that out explicitly.',
          IMAGE_PRESETS.diagram
        );

        return { content: [{ type: 'text', text: result }] };
      }

      case 'analyze_data_visualization': {
        const imagePath = getExistingFilePath(getRequiredStringArg(args, 'image'), 'Image');

        const result = await ollama.analyzeImage(
          imagePath,
          'Analyze this data visualization or dashboard. Identify: 1) chart type and what is being measured, 2) clearly visible values or ranges, 3) key trends and anomalies, and 4) reasonable business insights. Separate direct observations from inferences, and do not fabricate numbers that are not legible.',
          IMAGE_PRESETS.diagram
        );

        return { content: [{ type: 'text', text: result }] };
      }

      case 'ui_diff_check': {
        const image1Path = getExistingFilePath(getRequiredStringArg(args, 'image1'), 'Reference image');
        const image2Path = getExistingFilePath(getRequiredStringArg(args, 'image2'), 'Candidate image');

        const comparison = await ollama.analyzeImages(
          [image1Path, image2Path],
          'Compare the two provided UI screenshots directly. Treat the first image as the reference design and the second image as the candidate implementation. Report only visible differences and organize the result into: 1) Summary, 2) Visual differences, 3) Content differences, 4) Structural differences, and 5) Implementation risks or QA follow-ups. Mention uncertainty when a detail is too small or blurry to verify.',
          IMAGE_PRESETS.ui
        );

        return { content: [{ type: 'text', text: comparison }] };
      }

      case 'image_analysis': {
        const imagePath = getExistingFilePath(getRequiredStringArg(args, 'image'), 'Image');
        const prompt = typeof args.prompt === 'string' && args.prompt.trim() !== ''
          ? args.prompt.trim()
          : 'Describe this image in detail.';

        const result = await ollama.analyzeImage(imagePath, prompt, IMAGE_PRESETS.default);
        return { content: [{ type: 'text', text: result }] };
      }

      case 'video_analysis': {
        const videoPath = getExistingFilePath(getRequiredStringArg(args, 'video_path'), 'Video file');
        const task = getEnumArg(
          args,
          'task',
          ['summary', 'key_frames', 'events', 'transcript'] as const,
          'summary'
        );
        const extension = path.extname(videoPath).toLowerCase();
        const supportedExtensions = ['.mp4', '.mov', '.m4v'];

        if (!supportedExtensions.includes(extension)) {
          throw new Error(`Unsupported video format "${extension || 'unknown'}". Supported formats: ${supportedExtensions.join(', ')}.`);
        }

        const fileSizeMb = (fs.statSync(videoPath).size / (1024 * 1024)).toFixed(2);

        return {
          content: [{
            type: 'text',
            text: `Video analysis is currently experimental.\n\nValidated input: ${videoPath}\nTask: ${task}\nFormat: ${extension}\nSize: ${fileSizeMb} MB\n\nThis tool does not extract frames yet. The next implementation step is to add ffmpeg-based frame extraction, then pass key frames into the image analysis pipeline. Until then, extract representative frames manually and run them through image_analysis or ui_diff_check.`
          }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true,
    };
  }
});

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources: [] };
});

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return { prompts: [] };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Visual Server running...');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
