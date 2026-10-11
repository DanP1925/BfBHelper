// Screenshots a BfbHelper screen at the two QA viewports from CLAUDE.md and
// reports page overflow. Run from frontend/ so Playwright resolves from its
// node_modules:
//
//   node ../.claude/skills/qa-screens/shoot.mjs --screen battle --name respawn-stacked
//
// Flags:
//   --screen home|draft|battle|map   preset flow to reach the screen (default home)
//   --name <slug>                    file name prefix (default: the screen)
//   --out <dir>                      output dir (default: main checkout's screenshots/)
//   --base <url>                     dev server (default http://localhost:3000)
//   --only laptop|monitor            shoot a single viewport
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import path from "node:path";

const require = createRequire(path.join(process.cwd(), "package.json"));
const { chromium } = require("@playwright/test");

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .join(" ")
    .split("--")
    .filter(Boolean)
    .map((s) => s.trim().split(/\s+/)),
);
const screen = args.screen ?? "home";
const name = args.name ?? screen;
const base = args.base ?? "http://localhost:3000";
const mainCheckout = path.dirname(
  path.resolve(execSync("git rev-parse --git-common-dir", { encoding: "utf8" }).trim()),
);
const out = path.resolve(args.out ?? path.join(mainCheckout, "screenshots"));

// Logical (CSS) px. The laptop is the hard baseline.
const viewports = {
  laptop: { width: 1280, height: 800, deviceScaleFactor: 2 },
  monitor: { width: 2560, height: 1440, deviceScaleFactor: 1 },
};

async function draft(page) {
  await page.getByRole("button", { name: "Start Draft" }).click();
  const pick = page.getByRole("button", { name: /^Pick / });
  for (let i = 0; i < 8; i++) await pick.first().click();
  await page.getByText("Draft Complete").waitFor();
}

const flows = {
  home: async () => {},
  draft: async (page) => {
    await page.getByRole("button", { name: "Start Draft" }).click();
  },
  battle: async (page) => {
    await draft(page);
    await page.getByRole("button", { name: "Start Battle →" }).click();
    await page.getByText("Structures").first().waitFor();
  },
  map: async (page) => {
    await flows.battle(page);
    await page.getByRole("button", { name: "Map" }).click();
  },
};

if (!flows[screen]) {
  console.error(`Unknown --screen ${screen}. Options: ${Object.keys(flows).join(", ")}`);
  process.exit(1);
}

const browser = await chromium.launch();
let failed = false;
for (const [label, vp] of Object.entries(viewports)) {
  if (args.only && args.only !== label) continue;
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.deviceScaleFactor,
  });
  const page = await context.newPage();
  await page.goto(base);
  await flows[screen](page);
  await page.waitForLoadState("networkidle");

  const file = path.join(out, `${name}-${vp.width}x${vp.height}.png`);
  await page.screenshot({ path: file });
  const size = await page.evaluate(() => ({
    w: document.documentElement.scrollWidth,
    h: document.documentElement.scrollHeight,
  }));
  const overflow = size.w > vp.width || size.h > vp.height;
  if (overflow && label === "laptop") failed = true;
  console.log(
    `${label} ${vp.width}x${vp.height}: ${file}` +
      (overflow ? `  ⚠ page is ${size.w}x${size.h}, so it overflows the viewport` : "  fits"),
  );
  await context.close();
}
await browser.close();
process.exit(failed ? 2 : 0);
