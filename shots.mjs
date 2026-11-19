// Leonida Ledger — screenshot maker (development tooling, not part of
// the entry: main.ts copies only app/ and screenshots/ to /output).
// Serves app/ on localhost:8080, opens it in Playwright's Chromium at
// 1280x800, seeds 13 of 55 trophies as earned, and takes four real
// renders as JPEGs into screenshots/. Nothing is edited or composited:
// each file is exactly what the browser showed.
//
// Run from the repository root:  node shots.mjs
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(
  "/home/hatch/workspace/makefun/shot-tool/package.json",
);
const { chromium } = require("playwright-core");

const here = fileURLToPath(new URL(".", import.meta.url));
const home = process.env.HOME;
const chromePath = join(
  home,
  ".cache/ms-playwright/chromium-1255/chrome-linux64/chrome",
);

// Thirteen trophies seeded as earned, so the progress bar reads 13/55
// and the checklist shows both earned and unearned rows.
const SEEDED_EARNED = [
  "Just Like Paradise",
  "Paradise Lost",
  "T**s Ass Drug Money",
  "Vice City, Baby!",
  "Trust",
  "Baited My Tackle",
  "Stick Fiddler",
  "In The Beginning…",
  "Let’s Go Bowling",
  "Personal Best",
  "Treat Yo Self",
  "On the Spot",
  "Whip It Good",
];

const BASE = "http://localhost:8080";

async function waitForServer(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // Not up yet.
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server did not answer at ${url}`);
}

async function main() {
  const server = spawn("node", ["serve.ts", "--port", "8080"], {
    cwd: here,
    stdio: "ignore",
  });
  try {
    await waitForServer(`${BASE}/index.html`);
    const browser = await chromium.launch({
      executablePath: existsSync(chromePath) ? chromePath : undefined,
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    });
    try {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
      });
      // Seed progress before the app's own scripts read localStorage.
      await context.addInitScript((names) => {
        localStorage.setItem(
          "leonida-ledger-progress-v1",
          JSON.stringify(names),
        );
      }, SEEDED_EARNED);
      const page = await context.newPage();

      // 1 — cover: checklist, platinum guide open in the detail pane.
      await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
      await page.waitForSelector(".trophy-row");
      await page.waitForTimeout(400);
      await page.screenshot({
        path: join(here, "screenshots/1-checklist.jpg"),
        type: "jpeg",
        quality: 80,
      });

      // 2 — roadmap to the platinum, all six stages.
      await page.click('button[data-view="roadmap"]');
      await page.waitForSelector(".stage");
      await page.waitForTimeout(300);
      await page.screenshot({
        path: join(here, "screenshots/2-roadmap.jpg"),
        type: "jpeg",
        quality: 80,
      });

      // 3 — missables, with the spoiler setting switched on so hidden
      // story names show masked until earned.
      await page.click('button[data-view="missables"]');
      await page.check("#spoilerToggle");
      await page.waitForTimeout(300);
      await page.screenshot({
        path: join(here, "screenshots/3-missables.jpg"),
        type: "jpeg",
        quality: 80,
      });

      // 4 — checklist filtered to silver, The Shootist's guide open
      // with its sources.
      await page.click('button[data-view="checklist"]');
      await page.uncheck("#spoilerToggle");
      await page.selectOption("#gradeFilter", "silver");
      await page.waitForTimeout(300);
      await page.click(".trophy-row:has-text('The Shootist')");
      await page.waitForTimeout(300);
      await page.screenshot({
        path: join(here, "screenshots/4-silver-guide.jpg"),
        type: "jpeg",
        quality: 80,
      });

      await context.close();
    } finally {
      await browser.close();
    }
  } finally {
    server.kill();
  }
  console.log("screenshots done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
