import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { ScreenshotService, type DeviceType, APP_STORE_DEVICES, type AppInfo } from "../utils/screenshotService.js";
import { IconGenerationService, type IconGenerationOptions } from "../utils/iconGenerationService.js";

/**
 * Configuration for the App Store Preview Kernel job
 */
export interface AppStorePreviewConfig {
  // URL to capture screenshots from
  url: string;

  // App information for icon generation
  appInfo: {
    name: string;
    description: string;
    category?: string | undefined;
    keywords?: string[] | undefined;
  };

  // Output directory for screenshots and icons
  outputDir?: string | undefined;

  // Device types for screenshots (defaults to all)
  devices?: DeviceType[] | undefined;

  // Screenshot options
  screenshotOptions?: {
    fullPage?: boolean | undefined;
    waitForSelector?: string | undefined;
    waitTime?: number | undefined;
  } | undefined;

  // Icon generation options
  iconOptions?: {
    style?: IconGenerationOptions["style"] | undefined;
    primaryColor?: string | undefined;
    generateVariations?: boolean | undefined;
  } | undefined;
}

/**
 * Result of the App Store Preview job
 */
export interface AppStorePreviewResult {
  screenshots: Array<{
    deviceName: string;
    filePath: string;
    width: number;
    height: number;
  }>;
  icon?: {
    filePath: string;
    prompt: string;
    revisedPrompt?: string | undefined;
  } | undefined;
  iconVariations?: Array<{
    filePath: string;
    prompt: string;
    revisedPrompt?: string | undefined;
  }> | undefined;
  appInfo: AppInfo;
  timestamp: string;
}

/**
 * Main kernel job for App Store Preview generation
 * This job:
 * 1. Opens Playwright browser
 * 2. Navigates to the specified URL
 * 3. Takes screenshots in various App Store sizes
 * 4. Extracts app information
 * 5. Generates app icon using OpenAI
 */
export async function runAppStorePreviewJob(
  config: AppStorePreviewConfig
): Promise<AppStorePreviewResult> {
  console.log("🚀 Starting App Store Preview Job...");
  console.log("📍 URL:", config.url);
  console.log("📱 App Name:", config.appInfo.name);

  const outputDir = config.outputDir || path.join(process.cwd(), "output");
  const screenshotDir = path.join(outputDir, "screenshots");
  const iconDir = path.join(outputDir, "icons");

  // Ensure output directories exist
  [outputDir, screenshotDir, iconDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  const screenshotService = new ScreenshotService();
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  const iconService = hasOpenAIKey ? new IconGenerationService() : null;

  try {
    // Initialize browser
    console.log("\n📸 Initializing browser for screenshots...");
    await screenshotService.initialize();

    // Capture screenshots for all device sizes
    console.log("\n📱 Capturing screenshots for App Store...");
    const screenshots = await screenshotService.captureScreenshots({
      url: config.url,
      outputDir: screenshotDir,
      devices: config.devices,
      ...config.screenshotOptions,
    });

    // Extract additional app info from the page
    console.log("\n🔍 Extracting app information...");
    const extractedInfo = await screenshotService.extractAppInfo(config.url);

    // Merge provided and extracted app info
    const appInfo: AppInfo = {
      name: config.appInfo.name || extractedInfo.name || "Unknown App",
      description: config.appInfo.description || extractedInfo.description || "",
      category: config.appInfo.category || "General",
      keywords: config.appInfo.keywords || extractedInfo.keywords || [],
      screenshotPaths: screenshots.map((s) => s.filePath),
    };

    // Generate app icon using OpenAI
    console.log("\n🎨 Generating app icon with OpenAI...");
    let icon;
    let iconVariations;

    if (iconService) {
      try {
        const baseIconOptions = {
          appName: appInfo.name,
          appDescription: appInfo.description,
          category: appInfo.category,
          keywords: appInfo.keywords,
          outputDir: iconDir,
        };

        if (config.iconOptions?.generateVariations) {
          iconVariations = await iconService.generateIconVariations({
            ...baseIconOptions,
            style: config.iconOptions.style ?? "gradient",
            ...(config.iconOptions.primaryColor && { primaryColor: config.iconOptions.primaryColor }),
          });
          icon = iconVariations[0];
        } else {
          icon = await iconService.generateIcon({
            ...baseIconOptions,
            style: config.iconOptions?.style ?? "gradient",
            ...(config.iconOptions?.primaryColor && { primaryColor: config.iconOptions.primaryColor }),
          });
        }
      } catch (error) {
        console.warn("⚠️ Icon generation failed:", error);
      }
    } else {
      console.warn("⚠️ OPENAI_API_KEY not set. Skipping icon generation.");
    }

    // Create result summary
    const result: AppStorePreviewResult = {
      screenshots,
      icon,
      iconVariations,
      appInfo,
      timestamp: new Date().toISOString(),
    };

    // Save result manifest
    const manifestPath = path.join(outputDir, "manifest.json");
    fs.writeFileSync(manifestPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 Manifest saved to: ${manifestPath}`);

    console.log("\n✅ App Store Preview Job completed successfully!");
    console.log(`   - Screenshots captured: ${screenshots.length}`);
    console.log(`   - Icon generated: ${icon ? "Yes" : "No"}`);
    console.log(`   - Output directory: ${outputDir}`);

    return result;
  } finally {
    await screenshotService.close();
  }
}

// CLI execution
async function main() {
  // Example configuration - can be customized via environment variables or config file
  const config: AppStorePreviewConfig = {
    url: process.env.APP_URL || "https://example.com",
    appInfo: {
      name: process.env.APP_NAME || "My App",
      description: process.env.APP_DESCRIPTION || "A fantastic mobile application",
      category: process.env.APP_CATEGORY || "Productivity",
      keywords: process.env.APP_KEYWORDS?.split(",") || ["productivity", "tools", "utility"],
    },
    outputDir: process.env.OUTPUT_DIR || "./output",
    devices: process.env.DEVICES
      ? (process.env.DEVICES.split(",") as DeviceType[])
      : undefined,
    screenshotOptions: {
      fullPage: process.env.FULL_PAGE === "true",
      waitTime: parseInt(process.env.WAIT_TIME || "2000"),
    },
    iconOptions: {
      style: (process.env.ICON_STYLE as IconGenerationOptions["style"]) || "gradient",
      primaryColor: process.env.PRIMARY_COLOR,
      generateVariations: process.env.GENERATE_VARIATIONS === "true",
    },
  };

  try {
    const result = await runAppStorePreviewJob(config);
    console.log("\n📊 Job Result Summary:");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("❌ Job failed:", error);
    process.exit(1);
  }
}

// Run if executed directly
main();
