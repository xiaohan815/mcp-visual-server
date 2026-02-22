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
    const payload: any = {
      model: this.model,
      prompt: prompt,
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
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json() as OllamaResponse;
    return data.response;
  }

  async analyzeImage(imagePath: string, prompt: string): Promise<string> {
    try {
      const image = await sharp(imagePath)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();

      return await this.generate(prompt, [image]);
    } catch (error) {
      throw new Error(`Failed to analyze image: ${error instanceof Error ? error.message : String(error)}`);
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
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json() as { message?: { content?: string } };
    return data.message?.content || '';
  }
}