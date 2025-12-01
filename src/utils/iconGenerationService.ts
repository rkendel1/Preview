import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";

export interface IconGenerationOptions {
  appName: string;
  appDescription: string;
  category?: string | undefined;
  keywords?: string[] | undefined;
  style?: "flat" | "3d" | "gradient" | "minimal" | undefined;
  primaryColor?: string | undefined;
  outputDir: string;
  size?: "256x256" | "512x512" | "1024x1024" | undefined;
}

export interface IconResult {
  filePath: string;
  prompt: string;
  revisedPrompt?: string | undefined;
}

/**
 * Service for generating app icons using OpenAI's DALL-E
 */
export class IconGenerationService {
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate a prompt for app icon creation based on app information
   */
  private buildPrompt(options: IconGenerationOptions): string {
    const {
      appName,
      appDescription,
      category = "general",
      keywords = [],
      style = "gradient",
      primaryColor,
    } = options;

    let prompt = `Create a professional, modern app icon for an application called "${appName}". `;
    prompt += `The app is about: ${appDescription}. `;
    prompt += `Category: ${category}. `;

    if (keywords.length > 0) {
      prompt += `Key themes: ${keywords.join(", ")}. `;
    }

    // Style instructions
    switch (style) {
      case "flat":
        prompt += "Use a flat design style with clean shapes and no shadows. ";
        break;
      case "3d":
        prompt += "Use a 3D style with depth, shadows, and highlights. ";
        break;
      case "gradient":
        prompt += "Use a modern gradient style with smooth color transitions. ";
        break;
      case "minimal":
        prompt += "Use a minimalist design with simple shapes and limited colors. ";
        break;
    }

    if (primaryColor) {
      prompt += `Primary color scheme should include ${primaryColor}. `;
    }

    prompt += "The icon should be square, centered, with rounded corners suitable for iOS App Store. ";
    prompt += "No text or letters should appear in the icon. ";
    prompt += "High quality, professional look suitable for the App Store.";

    return prompt;
  }

  /**
   * Generate an app icon using OpenAI's DALL-E
   */
  async generateIcon(options: IconGenerationOptions): Promise<IconResult> {
    const { outputDir, size = "1024x1024" } = options;

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const prompt = this.buildPrompt(options);
    console.log("🎨 Generating icon with prompt:", prompt);

    try {
      const response = await this.client.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size,
        quality: "hd",
        style: "vivid",
      });

      const imageUrl = response.data?.[0]?.url;
      const revisedPrompt = response.data?.[0]?.revised_prompt;

      if (!imageUrl) {
        throw new Error("No image URL returned from OpenAI");
      }

      // Download the image
      const imageResponse = await fetch(imageUrl);
      const arrayBuffer = await imageResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const fileName = `icon_${options.appName.replace(/\s+/g, "_").toLowerCase()}_${Date.now()}.png`;
      const filePath = path.join(outputDir, fileName);

      fs.writeFileSync(filePath, buffer);
      console.log(`✅ Icon generated and saved to: ${filePath}`);

      return {
        filePath,
        prompt,
        revisedPrompt,
      };
    } catch (error) {
      console.error("❌ Failed to generate icon:", error);
      throw error;
    }
  }

  /**
   * Generate multiple icon variations
   */
  async generateIconVariations(
    options: IconGenerationOptions,
    styles: Array<NonNullable<IconGenerationOptions["style"]>> = ["flat", "gradient", "3d", "minimal"]
  ): Promise<IconResult[]> {
    const results: IconResult[] = [];

    for (const style of styles) {
      try {
        const result = await this.generateIcon({ ...options, style });
        results.push(result);
      } catch (error) {
        console.error(`Failed to generate ${style} icon variation:`, error);
      }
    }

    return results;
  }
}
