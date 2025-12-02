/**
 * Basic tests for the App Store Preview functionality
 */
import { ScreenshotService, APP_STORE_DEVICES } from "./utils/screenshotService.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const TEST_OUTPUT_DIR = path.join(os.tmpdir(), "preview-test-output");

async function testScreenshotService() {
  console.log("🧪 Testing Screenshot Service...");

  const service = new ScreenshotService();

  try {
    // Test initialization
    await service.initialize();
    console.log("✅ Browser initialized successfully");

    // Test taking screenshots
    const screenshots = await service.captureScreenshots({
      url: "https://example.com",
      outputDir: TEST_OUTPUT_DIR,
      devices: ["iPhone 6.7\""],
      waitTime: 1000,
    });

    if (screenshots.length > 0) {
      console.log(`✅ Captured ${screenshots.length} screenshot(s)`);
      
      // Verify file exists
      const firstScreenshot = screenshots[0];
      if (firstScreenshot && fs.existsSync(firstScreenshot.filePath)) {
        console.log("✅ Screenshot file created successfully");
      } else {
        console.error("❌ Screenshot file not found");
      }
    } else {
      console.error("❌ No screenshots captured");
    }

    // Test app info extraction
    const appInfo = await service.extractAppInfo("https://example.com");
    console.log("✅ App info extracted:", appInfo);

  } catch (error) {
    console.error("❌ Screenshot Service test failed:", error);
  } finally {
    await service.close();
  }
}

function testDeviceConstants() {
  console.log("\n🧪 Testing Device Constants...");

  const expectedDevices = [
    "iPhone 6.7\"",
    "iPhone 6.5\"",
    "iPhone 5.5\"",
    "iPad Pro 12.9\"",
    "iPad Pro 11\"",
  ];

  for (const device of expectedDevices) {
    if (device in APP_STORE_DEVICES) {
      const spec = APP_STORE_DEVICES[device as keyof typeof APP_STORE_DEVICES];
      console.log(`✅ ${device}: ${spec.width}x${spec.height}`);
    } else {
      console.error(`❌ Missing device: ${device}`);
    }
  }
}

async function runTests() {
  console.log("🚀 Running App Store Preview Tests\n");
  console.log("=".repeat(50));

  // Ensure test output directory exists
  if (!fs.existsSync(TEST_OUTPUT_DIR)) {
    fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
  }

  testDeviceConstants();
  await testScreenshotService();

  console.log("\n" + "=".repeat(50));
  console.log("🏁 Tests completed");
}

runTests().catch(console.error);
