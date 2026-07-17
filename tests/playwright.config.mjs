import { defineConfig } from "@playwright/test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const testRoot = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(testRoot, "..");
const resultsRoot = resolve(siteRoot, ".test-results");
const port = Number(process.env.REGRESSION_PORT || 4173);
const localBaseURL = `http://127.0.0.1:${port}/`;
const configuredBaseURL = process.env.REGRESSION_BASE_URL;
const workers = Number(process.env.PLAYWRIGHT_WORKERS || 2);

function normalizeBaseURL(value) {
  const url = new URL(value);
  if (!url.pathname.endsWith("/")) {
    url.pathname = `${url.pathname}/`;
  }
  return url.toString();
}

const baseURL = configuredBaseURL ? normalizeBaseURL(configuredBaseURL) : localBaseURL;
const usesLocalServer = !configuredBaseURL;

const viewportProjects = [
  {
    name: "mobile-320",
    use: { viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true },
  },
  {
    name: "mobile-390",
    use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  },
  {
    name: "tablet-768",
    use: { viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true },
  },
  {
    name: "tablet-landscape-1024",
    use: { viewport: { width: 1024, height: 768 }, isMobile: true, hasTouch: true },
  },
  {
    name: "desktop-1366",
    use: { viewport: { width: 1366, height: 768 } },
  },
  {
    name: "desktop-wide-1440",
    use: { viewport: { width: 1440, height: 1000 } },
  },
];

export default defineConfig({
  testDir: testRoot,
  fullyParallel: true,
  workers,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: resolve(resultsRoot, "playwright-report"), open: "never" }],
  ],
  outputDir: resolve(resultsRoot, "artifacts"),
  projects: viewportProjects,
  use: {
    baseURL,
    browserName: "chromium",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: usesLocalServer
    ? {
        command: `python3 -m http.server ${port} --bind 127.0.0.1`,
        cwd: siteRoot,
        reuseExistingServer: !process.env.CI,
        stdout: "pipe",
        stderr: "pipe",
        timeout: 10_000,
        url: baseURL,
      }
    : undefined,
});
