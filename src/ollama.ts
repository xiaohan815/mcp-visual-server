import sharp from 'sharp';

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  done_reason: string;
  context: number[];
  total_duration: number;
  load_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
}

type ImageFormat = 'jpeg' | 'png';

export interface ImageProcessingOptions {
  format?: ImageFormat;
  maxHeight?: number;
  maxWidth?: number;
  quality?: number;
}

export class OllamaClient {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string = 'http://localhost:11434', model: string = 'qwen2.5vl:7b') {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async generate(
    prompt: string,
    images?: Buffer[]
  ): Promise<string> {
    const payload: {
      images?: string[];
      model: string;
      prompt: string;
      stream: boolean;
    } = {
      model: this.model,
      prompt,
      stream: false,
    };

    if (images && images.length > 0) {
      payload.images = images.map(img => img.toString('base64'));
    }

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const details = await response.text();
      const message = details || response.statusText;
      throw new Error(`Ollama API error (${response.status}): ${message}`);
    }

    const data = await response.json() as OllamaResponse;
    return data.response;
  }

  async analyzeImage(
    imagePath: string,
    prompt: string,
    options?: ImageProcessingOptions
  ): Promise<string> {
    try {
      const image = await this.prepareImage(imagePath, options);

      return await this.generate(prompt, [image]);
    } catch (error) {
      throw new Error(`Failed to analyze image: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async analyzeImages(
    imagePaths: string[],
    prompt: string,
    options?: ImageProcessingOptions
  ): Promise<string> {
    try {
      const images = await Promise.all(
        imagePaths.map((imagePath) => this.prepareImage(imagePath, options))
      );

      return await this.generate(prompt, images);
    } catch (error) {
      throw new Error(`Failed to analyze images: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async chat(
    messages: Array<{ role: string; content: string; images?: string[] }>
  ): Promise<string> {
    const payload = {
      model: this.model,
      messages: messages,
      stream: false,
    };

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const details = await response.text();
      const message = details || response.statusText;
      throw new Error(`Ollama API error (${response.status}): ${message}`);
    }

    const data = await response.json() as { message?: { content?: string } };
    return data.message?.content || '';
  }

  private async prepareImage(
    imagePath: string,
    options: ImageProcessingOptions = {}
  ): Promise<Buffer> {
    const {
      format = 'jpeg',
      maxHeight = 1024,
      maxWidth = 1024,
      quality = 90,
    } = options;

    const pipeline = sharp(imagePath)
      .rotate()
      .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true });

    if (format === 'png') {
      return pipeline.png().toBuffer();
    }

    return pipeline.jpeg({ quality }).toBuffer();
  }
}
