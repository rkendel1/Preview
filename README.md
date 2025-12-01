# Preview

App Store Screenshot and Icon Generation Tool using Playwright and OpenAI.

## Overview

This tool provides a kernel job that:
1. Opens Playwright browser and navigates to a specified URL
2. Takes screenshots in various App Store device sizes (iPhone & iPad)
3. Extracts app information from the page
4. Generates app icons using OpenAI's DALL-E

## Installation

```bash
npm install
npx playwright install chromium
```

## Configuration

Create a `.env` file with the following variables:

```env
# Required for icon generation
OPENAI_API_KEY=your_openai_api_key

# App configuration
APP_URL=https://your-app-url.com
APP_NAME=Your App Name
APP_DESCRIPTION=A description of your app
APP_CATEGORY=Productivity
APP_KEYWORDS=keyword1,keyword2,keyword3

# Output configuration
OUTPUT_DIR=./output

# Screenshot options
FULL_PAGE=false
WAIT_TIME=2000

# Icon options
ICON_STYLE=gradient  # flat, 3d, gradient, minimal
PRIMARY_COLOR=blue
GENERATE_VARIATIONS=false
```

## Usage

### Running the Kernel Job

```bash
# Run the App Store Preview job
npm run kernel

# Or with custom environment variables
APP_URL=https://example.com APP_NAME="My App" npm run kernel
```

### Programmatic Usage

```typescript
import { runAppStorePreviewJob } from "./src/kernel/appStorePreview.js";

const result = await runAppStorePreviewJob({
  url: "https://your-app.com",
  appInfo: {
    name: "My App",
    description: "A fantastic mobile application",
    category: "Productivity",
    keywords: ["productivity", "tools"],
  },
  outputDir: "./output",
  devices: ["iPhone 6.7\"", "iPad Pro 12.9\""],
  screenshotOptions: {
    fullPage: false,
    waitTime: 2000,
  },
  iconOptions: {
    style: "gradient",
    primaryColor: "blue",
    generateVariations: false,
  },
});
```

## Supported Device Sizes

| Device | Resolution |
|--------|------------|
| iPhone 6.7" | 1290 x 2796 |
| iPhone 6.5" | 1242 x 2688 |
| iPhone 5.5" | 1242 x 2208 |
| iPad Pro 12.9" | 2048 x 2732 |
| iPad Pro 11" | 1668 x 2388 |

## Output

The job generates:
- Screenshots in the `screenshots/` subdirectory
- App icon(s) in the `icons/` subdirectory
- A `manifest.json` file with all metadata

## Development

```bash
# Build the project
npm run build

# Run tests
npm run test
```

## License

ISC