import { test, expect } from "@playwright/test";
import path from "node:path";
import { pathToFileURL } from "node:url";

const fileUrl = pathToFileURL(path.resolve("tipitaka-study.html")).href;
const shots = path.resolve("dist/screenshots");

const views = [
  ["home", "#/"],
  ["volume", "#/vol/1"],
  ["unit", "#/vol/1/parajika/pj1"],
  ["people", "#/people"],
  ["dhamma", "#/dhamma"],
  ["map", "#/map"],
  ["glossary", "#/glossary"],
  ["plan", "#/plan"],
  ["quiz", "#/quiz"],
  ["about", "#/about"]
];

function watch(page) {
  const errors = [];
  page.on("pageerror", (err) => errors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("request", (req) => {
    const url = req.url();
    if (!url.startsWith("file:")) errors.push("external " + url);
  });
  return errors;
}

async function open(page, hash) {
  await page.goto(fileUrl + hash);
  await page.waitForSelector("#reader h1");
}

test("desktop screenshots ไม่มี pageerror", async ({ page }) => {
  const errors = watch(page);
  for (const [name, hash] of views) {
    await open(page, hash);
    await page.screenshot({ path: path.join(shots, `desktop-${name}.png`), fullPage: true });
  }
  expect(errors).toEqual([]);
});

test("mobile ไม่ล้นและไม่มี pageerror", async ({ page }) => {
  const errors = watch(page);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [name, hash] of views) {
    await open(page, hash);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow, name).toBe(false);
    await page.screenshot({ path: path.join(shots, `mobile-${name}.png`), fullPage: true });
  }
  await page.locator("#mobile-tabs button[data-pane=notes]").click();
  await expect(page.locator("#notes")).toBeVisible();
  expect(errors).toEqual([]);
});
