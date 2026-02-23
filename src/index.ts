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
        description: 'Convert UI screenshot to code, design specs, design prompts, or natural language description. Covers the full process from frontend implementation to generative design prompts.',
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
        description: 'Extract and recognize text from screenshots using advanced OCR capabilities. Specialized for code, terminal output, documents, and general text extraction.',
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
        description: 'Parse error dialog, stack, and log screenshots to provide localization and fix suggestions.',
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
        description: 'Generate structured understanding of technical diagrams such as architecture diagrams, flowcharts, UML, ER diagrams, etc.',
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
        description: 'Read dashboards and statistical charts to summarize trends, anomalies, and business insights.',
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
        description: 'Compare two UI screenshots to identify visual differences and implementation deviations. Specialized for UI quality assurance and design-to-implementation verification.',
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
        description: 'General image understanding capability for visual content not covered by specialized tools.',
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
        description: 'Support video scene parsing for MP4/MOV/M4V (local max 8M) formats to capture key frames, events, and key points.',
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
        const imagePath = args.image as string;
        const outputType = (args.output_type as string) || 'code';

        const prompts: Record<string, string> = {
          code: 'Analyze this UI screenshot and provide complete, production-ready code (HTML/CSS/JavaScript or React) to implement it. Include responsive design.',
          design_specs: 'Extract detailed design specifications from this UI including colors, typography, spacing, components, and layout patterns.',
          design_prompt: 'Convert this UI into detailed prompts for AI design tools like Figma AI or generative design.',
          description: 'Describe this UI in detail, explaining its structure, components, purpose, and user experience.',
        };

        const result = await ollama.analyzeImage(imagePath, prompts[outputType]);
        return { content: [{ type: 'text', text: result }] };
      }

      case 'extract_text_from_screenshot': {
        const imagePath = args.image as string;

        const result = await ollama.analyzeImage(
          imagePath,
          'Extract and transcribe ALL text from this image. Return the text exactly as it appears, preserving formatting and structure. If there is code, return it as a code block. If there are multiple text regions, organize them clearly.'
        );

        return { content: [{ type: 'text', text: result }] };
      }

      case 'diagnose_error_screenshot': {
        const imagePath = args.image as string;

        const result = await ollama.analyzeImage(
          imagePath,
          'This is an error screenshot. Analyze it carefully. Identify: 1) The error type and message, 2) The stack trace or error location, 3) Likely root causes, 4) Specific solutions or fixes to resolve this error. Be precise and actionable.'
        );

        return { content: [{ type: 'text', text: result }] };
      }

      case 'understand_technical_diagram': {
        const imagePath = args.image as string;

        const result = await ollama.analyzeImage(
          imagePath,
          'Analyze this technical diagram and provide a structured understanding. Include: 1) Diagram type (architecture, flowchart, UML, ER, etc.), 2) Main components and their roles, 3) Relationships and data flow between components, 4) Key patterns or decisions represented. Format your response as markdown.'
        );

        return { content: [{ type: 'text', text: result }] };
      }

      case 'analyze_data_visualization': {
        const imagePath = args.image as string;

        const result = await ollama.analyzeImage(
          imagePath,
          'Analyze this data visualization or dashboard. Identify: 1) Type of chart and what it shows, 2) Key trends and patterns, 3) Any anomalies or outliers, 4) Business insights or conclusions. Provide specific numbers when visible.'
        );

        return { content: [{ type: 'text', text: result }] };
      }

      case 'ui_diff_check': {
        const image1Path = args.image1 as string;
        const image2Path = args.image2 as string;

        const result1 = await ollama.analyzeImage(image1Path, 'Describe this UI in detail.');
        const result2 = await ollama.analyzeImage(image2Path, 'Describe this UI in detail.');

        const comparison = await ollama.generate(
          `Compare these two UI descriptions and identify ALL differences:\n\nUI 1:\n${result1}\n\nUI 2:\n${result2}\n\n\nProvide: 1) Visual differences (colors, spacing, alignment), 2) Content differences (text, elements, components), 3) Structural differences (layout, hierarchy), 4) Implementation deviations from design. Be thorough and specific.`
        );

        return { content: [{ type: 'text', text: comparison }] };
      }

      case 'image_analysis': {
        const imagePath = args.image as string;
        const prompt = (args.prompt as string) || 'Describe this image in detail.';

        const result = await ollama.analyzeImage(imagePath, prompt);
        return { content: [{ type: 'text', text: result }] };
      }

      case 'video_analysis': {
        const videoPath = args.video_path as string;
        const task = (args.task as string) || 'summary';

        // Video analysis requires extracting frames first
        // For MVP, we'll provide a simple implementation
        if (!fs.existsSync(videoPath)) {
          throw new Error(`Video file not found: ${videoPath}`);
        }

        const prompts: Record<string, string> = {
          summary: 'Analyze the provided video frames and provide a summary of what happens.',
          key_frames: 'Identify and describe the key frames in this video.',
          events: 'List and describe the main events occurring in this video.',
          transcript: 'Attempt to transcribe text or dialogue visible in this video.',
        };

        // Note: Full video frame extraction would require ffmpeg or similar
        // For MVP, return a message about video support
        return {
          content: [{
            type: 'text',
            text: `Video analysis requested for: ${videoPath}\n\nTask: ${task}\n\nNote: Full video frame extraction requires ffmpeg. The MCP server framework is ready - you can enhance this by adding frame extraction logic using ffmpeg or similar tools.\n\nFor now, the visual analysis tools work well with single images. If you have specific frames extracted, use the image_analysis tool.`
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