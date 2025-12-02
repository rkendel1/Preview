import { chromium, type Browser, type Page } from "playwright";
import * as fs from "fs";
import * as path from "path";

/**
 * App Store device screenshot sizes and specifications
 * These match Apple's App Store preview requirements
 */
export const APP_STORE_DEVICES = {
  // iPhone sizes
  "iPhone 6.7\"": { width: 1290, height: 2796, name: "iPhone_6.7_inch" },
  "iPhone 6.5\"": { width: 1242, height: 2688, name: "iPhone_6.5_inch" },
  "iPhone 5.5\"": { width: 1242, height: 2208, name: "iPhone_5.5_inch" },
  // iPad sizes
  "iPad Pro 12.9\"": { width: 2048, height: 2732, name: "iPad_Pro_12.9_inch" },
  "iPad Pro 11\"": { width: 1668, height: 2388, name: "iPad_Pro_11_inch" },
} as const;

export type DeviceType = keyof typeof APP_STORE_DEVICES;

export interface ScreenshotOptions {
  url: string;
  outputDir: string;
  devices?: DeviceType[] | undefined;
  fullPage?: boolean | undefined;
  waitForSelector?: string | undefined;
  waitTime?: number | undefined;
}

export interface ScreenshotResult {
  deviceName: string;
  filePath: string;
  width: number;
  height: number;
}

export interface AppInfo {
  name: string;
  description: string;
  category: string;
  keywords: string[];
  screenshotPaths: string[];
}

/**
 * Service for capturing app screenshots suitable for App Store submissions
 */
export class ScreenshotService {
  private browser: Browser | null = null;

  /**
   * Initialize the browser instance
   */
  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
    });
  }

  /**
   * Close the browser instance
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Capture screenshots for multiple device sizes
   */
  async captureScreenshots(options: ScreenshotOptions): Promise<ScreenshotResult[]> {
    if (!this.browser) {
      throw new Error("Browser not initialized. Call initialize() first.");
    }

    const { url, outputDir, devices: deviceList, fullPage = false, waitForSelector, waitTime = 2000 } = options;

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const selectedDevices = deviceList || (Object.keys(APP_STORE_DEVICES) as DeviceType[]);
    const results: ScreenshotResult[] = [];

    for (const deviceType of selectedDevices) {
      const deviceSpec = APP_STORE_DEVICES[deviceType];
      const context = await this.browser.newContext({
        viewport: {
          width: Math.round(deviceSpec.width / 3), // Scale down for viewport (retina)
          height: Math.round(deviceSpec.height / 3),
        },
        deviceScaleFactor: 3, // High DPI for App Store quality
      });

      const page = await context.newPage();

      try {
        await page.goto(url, { waitUntil: "networkidle" });

        // Wait for specific selector if provided
        if (waitForSelector) {
          await page.waitForSelector(waitForSelector, { timeout: 10000 });
        }

        // Additional wait time for dynamic content
        await page.waitForTimeout(waitTime);

        const fileName = `${deviceSpec.name}_${Date.now()}.png`;
        const filePath = path.join(outputDir, fileName);

        await page.screenshot({
          path: filePath,
          fullPage,
        });

        results.push({
          deviceName: deviceType,
          filePath,
          width: deviceSpec.width,
          height: deviceSpec.height,
        });

        console.log(`📸 Captured screenshot for ${deviceType}: ${filePath}`);
      } catch (error) {
        console.error(`❌ Failed to capture screenshot for ${deviceType}:`, error);
      } finally {
        await context.close();
      }
    }

    return results;
  }

  /**
   * Extract app information from a page
   */
  async extractAppInfo(url: string): Promise<Partial<AppInfo>> {
    if (!this.browser) {
      throw new Error("Browser not initialized. Call initialize() first.");
    }

    const context = await this.browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(url, { waitUntil: "networkidle" });

      // Extract common app information from the page
      const appInfo: Partial<AppInfo> = {};

      // Try to extract title
      appInfo.name = await page.title();

      // Try to extract meta description
      const description = await page.$eval('meta[name="description"]', (el) => el.getAttribute("content")).catch(() => null);

      if (description) {
        appInfo.description = description;
      }

      // Try to extract keywords
      const keywords = await page.$eval('meta[name="keywords"]', (el) => el.getAttribute("content")).catch(() => null);

      if (keywords) {
        appInfo.keywords = keywords.split(",").map((k: string) => k.trim());
      }

      return appInfo;
    } finally {
      await context.close();
    }
  }
}
