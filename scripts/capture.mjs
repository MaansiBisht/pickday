import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const URL = process.env.URL || "http://localhost:5179";
const OUT = path.resolve("assets");
const FRAMES = path.resolve(".frames");
rmSync(FRAMES, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({
  viewport: { width: 560, height: 460 },
  deviceScaleFactor: 2,
});
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector(".grid");
await page.waitForTimeout(400);

let n = 0;
const shot = async (hold = 1) => {
  const file = path.join(FRAMES, String(n++).padStart(3, "0") + ".png");
  await page.screenshot({ path: file });
  for (let i = 1; i < hold; i++) {
    execSync(`cp ${file} ${path.join(FRAMES, String(n++).padStart(3, "0") + ".png")}`);
  }
};

const day = (t) =>
  page.locator(".day:not([data-outside])", { hasText: new RegExp(`^${t}$`) }).first();

await shot(5);                                  // rest on initial month
await day("8").click(); await shot(2);          // pick range start
for (const d of ["10", "12", "14", "16", "18"]) {
  await day(d).hover(); await shot(2);          // live hover preview
}
await day("18").click(); await shot(6);         // pick range end
await page.getByText("Last 7 days").click(); await shot(6);
await page.getByText("This month").click(); await shot(6);
await page.locator(".nav", { hasText: "›" }).click(); await shot(4);
await day("5").click(); await shot(2);
await day("12").hover(); await shot(2);
await day("12").click(); await shot(6);

await browser.close();

const palette = path.join(FRAMES, "palette.png");
const fps = 8;
execSync(
  `ffmpeg -y -framerate ${fps} -i ${FRAMES}/%03d.png -vf "palettegen=stats_mode=diff" ${palette}`,
  { stdio: "inherit" }
);
execSync(
  `ffmpeg -y -framerate ${fps} -i ${FRAMES}/%03d.png -i ${palette} -lavfi "paletteuse=dither=bayer:bayer_scale=3" ${OUT}/demo.gif`,
  { stdio: "inherit" }
);
console.log("✔ wrote", path.join(OUT, "demo.gif"));
