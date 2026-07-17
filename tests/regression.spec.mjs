import { expect, test } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const testRoot = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(testRoot, "..");
const mobileReviewDir = resolve(siteRoot, "output/playwright/mobile-review");

const landingUrl = "https://joeywilkes12.github.io/4AMJ/";
const siteUrl = "https://joeywilkes12.github.io/4amj-genealogy/";
const isLiveLayer = process.env.REGRESSION_LAYER === "live";
const biographyPages = [
  {
    path: "./william-henry-adams.html",
    title: "William Henry Adams | Adams Family Life Histories",
    heading: "William Henry Adams Life History",
    portrait: "./assets/Adams_William%20Henry%20KWJ5-42R.jpg",
    portraitFile: "./assets/Adams_William Henry KWJ5-42R.jpg",
    portraitAlt: "Portrait of William Henry Adams.",
    pdf: "./assets/William%20Henry%20Adams%20Life%20History.pdf",
    pdfFile: "./assets/William Henry Adams Life History.pdf",
    firstSentence: "William Henry Adams, son of John Adams and Mary Nash Adams",
    sections: [
      ["early-life", "Early Life in England"],
      ["apprenticeship", "Apprenticeship and Preservation"],
      ["marriage-conversion", "Marriage, Illness, and Conversion"],
      ["gathering-zion", "Gathering to Zion"],
      ["crossing-plains", "Crossing the Plains"],
      ["salt-lake-call", "Salt Lake City and the Call South"],
      ["founding-pleasant-grove", "Founding Pleasant Grove"],
      ["masonry-service", "Masonry, Schools, and Public Service"],
      ["family-loss-frances", "Family, Loss, and Frances Otten Crossland"],
      ["character-legacy", "Character, Faith, and Legacy"],
    ],
  },
  {
    path: "./frances-otten-adams.html",
    title: "Frances Otten Adams | Adams Family Life Histories",
    heading: "Frances Ann Otten Adams Life History",
    portrait: "./assets/Frances%20Otten%20Adams.jpg",
    portraitFile: "./assets/Frances Otten Adams.jpg",
    portraitAlt: "Portrait of Frances Otten Adams.",
    pdf: "./assets/Life%20History%20of%20Frances%20Otten%20Adams.pdf",
    pdfFile: "./assets/Life History of Frances Otten Adams.pdf",
    firstSentence: "Frances Ann Otten was born in London",
    sections: [
      ["early-life", "Early Life in London"],
      ["marriage-crossland", "Marriage to Junius Crossland"],
      ["journey-loss", "Journey to Utah and Loss on the Plains"],
      ["salt-lake-years", "Years in Salt Lake City"],
      ["marriage-william", "Marriage to William Henry Adams"],
      ["pioneer-hardship", "Pioneer Home and Hardship"],
      ["children-education", "Children, Education, and Daily Life"],
      ["relief-society-faith", "Relief Society Service and Faith"],
      ["final-years", "Final Years and Legacy"],
    ],
  },
];

function readSiteFile(fileName) {
  return readFileSync(resolve(siteRoot, fileName), "utf8");
}

function homeURL(baseURL) {
  return new URL("./", baseURL).toString();
}

function assetURL(baseURL, path) {
  return new URL(path, baseURL).toString();
}

function isAllowedRuntimeRequest(url, baseURL) {
  const home = homeURL(baseURL);
  return url === home || url.startsWith(home) || url.startsWith("data:");
}

function parseRgb(value) {
  const match = value.match(/rgba?\(([^)]+)\)/);
  if (!match) {
    throw new Error(`Could not parse color: ${value}`);
  }

  return match[1]
    .split(",")
    .slice(0, 3)
    .map((part) => Number.parseFloat(part.trim()));
}

function linearize(channel) {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(rgb) {
  const [r, g, b] = rgb.map(linearize);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground, background) {
  const light = Math.max(luminance(parseRgb(foreground)), luminance(parseRgb(background)));
  const dark = Math.min(luminance(parseRgb(foreground)), luminance(parseRgb(background)));
  return (light + 0.05) / (dark + 0.05);
}

function durationToMs(value) {
  if (value.endsWith("ms")) {
    return Number.parseFloat(value);
  }

  if (value.endsWith("s")) {
    return Number.parseFloat(value) * 1000;
  }

  throw new Error(`Could not parse duration: ${value}`);
}

test.describe("static source contract", () => {
  test("keeps the site dependency-free and GitHub Pages-ready", async () => {
    const index = readSiteFile("index.html");
    const william = readSiteFile("william-henry-adams.html");
    const frances = readSiteFile("frances-otten-adams.html");
    const styles = readSiteFile("styles.css");
    const readme = readSiteFile("README.md");
    const agents = readSiteFile("agents.md");

    expect(existsSync(resolve(siteRoot, ".nojekyll"))).toBe(true);
    expect(existsSync(resolve(siteRoot, "package.json"))).toBe(false);
    expect(existsSync(resolve(siteRoot, "package-lock.json"))).toBe(false);

    expect(index).toContain(`<meta http-equiv="refresh" content="0; url=${landingUrl}">`);
    expect(index).toContain(`<a class="action-button action-primary" href="${landingUrl}">`);
    expect(index).toContain('<a href="./william-henry-adams.html">William Henry Adams</a>');
    expect(index).toContain('<a href="./frances-otten-adams.html">Frances Otten Adams</a>');
    expect(index).toContain(`<meta property="og:url" content="${siteUrl}">`);
    expect(index).toContain(`<link rel="canonical" href="${siteUrl}">`);

    for (const source of [index, william, frances]) {
      expect(source).toContain('<meta name="viewport" content="width=device-width, initial-scale=1">');
      expect(source).toContain('<link rel="stylesheet" href="./styles.css">');
      expect(source).not.toContain("fonts.googleapis");
      expect(source).not.toContain("cdn");
      expect(source).not.toContain("analytics");
      expect(source).not.toMatch(/<script\b/i);
    }

    for (const page of biographyPages) {
      const source = readSiteFile(page.path.replace("./", ""));
      expect(source).toContain(`alt="${page.portraitAlt}"`);
      expect(source).toContain(`src="${page.portrait}"`);
      expect(source).toContain(`href="${page.pdf}"`);
      expect(source).toContain(page.firstSentence);
      for (const [id, heading] of page.sections) {
        expect(source).toContain(`<a href="#${id}">${heading}</a>`);
        expect(source).toContain(`<section id="${id}"`);
        expect(source).toContain(`<h2 id="${id}-heading">${heading}</h2>`);
      }
    }

    expect(styles).toContain("--color-page: #0d2448;");
    expect(styles).toContain("--color-accent: #d6bb72;");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain('"Trajan Pro"');
    expect(readme).toContain("bash tests/run-regression.sh");
    expect(agents).toContain("https://joeywilkes12.github.io/4amj-genealogy/");
    expect(agents).toContain("plain HTML/CSS");

    for (const page of biographyPages) {
      const portraitPath = resolve(siteRoot, page.portraitFile);
      const pdfPath = resolve(siteRoot, page.pdfFile);
      expect(existsSync(portraitPath), `${page.portraitFile} should exist`).toBe(true);
      expect(statSync(portraitPath).size, `${page.portraitFile} should stay lightweight`).toBeLessThan(25 * 1024);
      expect(existsSync(pdfPath), `${page.pdfFile} should exist`).toBe(true);
      expect(statSync(pdfPath).size, `${page.pdfFile} should not be empty`).toBeGreaterThan(1024);
    }
  });
});

test.describe("responsive biography pages", () => {
  test.beforeEach(async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];

    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    page.consoleErrors = consoleErrors;
    page.pageErrors = pageErrors;
  });

  test("serves the redirect page, biography pages, stylesheet, images, and PDFs", async ({ request, baseURL }) => {
    if (!isLiveLayer) {
      const indexResponse = await request.get(homeURL(baseURL));
      expect(indexResponse.status()).toBe(200);
      expect(await indexResponse.text()).toContain(`url=${landingUrl}`);
    }

    const stylesheetResponse = await request.get(assetURL(baseURL, "./styles.css"));
    expect(stylesheetResponse.status()).toBe(200);
    expect(await stylesheetResponse.text()).toContain("--color-page: #0d2448;");

    for (const page of biographyPages) {
      const pageResponse = await request.get(assetURL(baseURL, page.path));
      expect(pageResponse.status(), `${page.path} should be served`).toBe(200);
      expect(await pageResponse.text()).toContain(page.heading);

      const portraitResponse = await request.get(assetURL(baseURL, page.portrait));
      expect(portraitResponse.status(), `${page.portrait} should be served`).toBe(200);
      expect((await portraitResponse.body()).length).toBeLessThan(25 * 1024);

      const pdfResponse = await request.get(assetURL(baseURL, page.pdf));
      expect(pdfResponse.status(), `${page.pdf} should be served`).toBe(200);
      expect((await pdfResponse.body()).length).toBeGreaterThan(1024);
    }
  });

  for (const biography of biographyPages) {
    test(`renders ${biography.heading} with accessible navigation`, async ({ page, baseURL }, testInfo) => {
      const requestedUrls = [];
      page.on("request", (request) => requestedUrls.push(request.url()));

      await page.goto(assetURL(baseURL, biography.path));

      await expect(page).toHaveTitle(biography.title);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(biography.heading);
      await expect(page.getByAltText(biography.portraitAlt)).toBeVisible();
      const backLink = page.locator(".top-actions a").first();
      await expect(backLink).toBeVisible();
      await expect(backLink).toHaveAttribute("href", /^https:\/\/joeywilkes12\.github\.io\//);
      await expect(page.getByRole("link", { name: "Open original PDF" })).toHaveAttribute(
        "href",
        biography.pdf,
      );

      const toc = page.getByRole("navigation", { name: "Contents" });
      await expect(toc).toBeVisible();
      const tocLinks = toc.getByRole("link");
      await expect(tocLinks).toHaveCount(biography.sections.length);

      for (const [index, [id, heading]] of biography.sections.entries()) {
        await expect(tocLinks.nth(index)).toHaveText(heading);
        await expect(tocLinks.nth(index)).toHaveAttribute("href", `#${id}`);
        await expect(page.locator(`#${id}`)).toBeVisible();
        await expect(page.locator(`#${id}-heading`)).toHaveText(heading);
      }

      await expect(page.getByText(biography.firstSentence)).toBeVisible();

      const metrics = await page.evaluate(() => {
        const viewportWidth = window.innerWidth;
        const boxes = Array.from(
          document.querySelectorAll(".reader, .top-actions, .history-header, .portrait-card img, .toc, .history-content, .history-section"),
        ).map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
          };
        });
        const paragraphs = Array.from(document.querySelectorAll(".history-section p")).map((element) => {
          const rect = element.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        });
        const header = document.querySelector(".history-header").getBoundingClientRect();
        const portrait = document.querySelector(".portrait-card").getBoundingClientRect();
        const heading = document.querySelector("h1").getBoundingClientRect();

        return {
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          viewportWidth,
          boxes,
          paragraphs,
          headerCenter: header.left + header.width / 2,
          portraitCenter: portrait.left + portrait.width / 2,
          headingCenter: heading.left + heading.width / 2,
        };
      });

      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
      for (const box of metrics.boxes) {
        expect(box.width).toBeGreaterThan(0);
        expect(box.height).toBeGreaterThan(0);
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(Math.ceil(box.right)).toBeLessThanOrEqual(metrics.viewportWidth);
      }

      for (const paragraph of metrics.paragraphs) {
        expect(paragraph.width).toBeLessThanOrEqual(768);
        expect(paragraph.height).toBeGreaterThan(0);
      }
      expect(Math.abs(metrics.portraitCenter - metrics.headerCenter)).toBeLessThanOrEqual(1);
      expect(Math.abs(metrics.headingCenter - metrics.headerCenter)).toBeLessThanOrEqual(1);

      const unexpectedRequests = requestedUrls.filter(
        (url) => !isAllowedRuntimeRequest(url, baseURL),
      );
      expect(unexpectedRequests).toEqual([]);
      expect(page.consoleErrors).toEqual([]);
      expect(page.pageErrors).toEqual([]);

      if (testInfo.project.name.startsWith("mobile-")) {
        mkdirSync(mobileReviewDir, { recursive: true });
        await page.screenshot({
          path: resolve(mobileReviewDir, `${testInfo.project.name}-${biography.path.replace(/[^a-z0-9]/gi, "-")}.png`),
          fullPage: true,
        });
      }
    });
  }

  test("keeps keyboard order and visible focus states", async ({ page, baseURL }) => {
    const biography = biographyPages[0];
    await page.goto(assetURL(baseURL, biography.path));

    const links = page.locator(".top-actions a, .toc a");
    await expect(links).toHaveCount(biography.sections.length + 2);

    for (let index = 0; index < biography.sections.length + 2; index += 1) {
      await page.keyboard.press("Tab");
      await expect(links.nth(index)).toBeFocused();

      const outline = await links.nth(index).evaluate((element) => {
        const styles = getComputedStyle(element);
        return {
          outlineStyle: styles.outlineStyle,
          outlineWidth: styles.outlineWidth,
        };
      });

      expect(outline.outlineStyle).toBe("solid");
      expect(Number.parseFloat(outline.outlineWidth)).toBeGreaterThanOrEqual(3);
    }
  });

  test("maintains readable contrast in the navy theme and reading surface", async ({ page, baseURL }) => {
    await page.goto(assetURL(baseURL, "./william-henry-adams.html"));

    const samples = await page.evaluate(() => {
      const bodyBackground = getComputedStyle(document.body).backgroundColor;
      const surfaceBackground = getComputedStyle(document.querySelector(".history-content")).backgroundColor;
      const samples = [
        {
          name: "body text",
          foreground: getComputedStyle(document.body).color,
          background: bodyBackground,
        },
        {
          name: "heading",
          foreground: getComputedStyle(document.querySelector("h1")).color,
          background: bodyBackground,
        },
        {
          name: "section heading",
          foreground: getComputedStyle(document.querySelector(".history-section h2")).color,
          background: surfaceBackground,
        },
        {
          name: "paragraph",
          foreground: getComputedStyle(document.querySelector(".history-section p")).color,
          background: surfaceBackground,
        },
        {
          name: "toc link",
          foreground: getComputedStyle(document.querySelector(".toc a")).color,
          background: getComputedStyle(document.querySelector(".toc")).backgroundColor,
        },
      ];
      const subtitle = document.querySelector(".subtitle");
      if (subtitle) {
        samples.push({
          name: "subtitle",
          foreground: getComputedStyle(subtitle).color,
          background: bodyBackground,
        });
      }
      return samples;
    });

    for (const sample of samples) {
      expect(contrastRatio(sample.foreground, sample.background), sample.name).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("honors reduced motion preferences", async ({ page, baseURL }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(assetURL(baseURL, "./william-henry-adams.html"));

    const transitionDurations = await page.locator(".toc a").first().evaluate((element) =>
      getComputedStyle(element)
        .transitionDuration.split(",")
        .map((value) => value.trim()),
    );

    expect(transitionDurations.every((value) => durationToMs(value) <= 0.02)).toBe(true);
  });
});
