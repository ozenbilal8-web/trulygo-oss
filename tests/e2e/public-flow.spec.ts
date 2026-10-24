import { mkdir } from "node:fs/promises";
import path from "node:path";
import { test as base, expect, type Page } from "@playwright/test";

const captureScreenshots = process.env.CAPTURE_SCREENSHOTS === "1";
const screenshotDirectory = path.resolve("docs/screenshots");
const draftStorageKey = "trulygo:public-utm-draft:v1";

// Refuse and fail on off-origin traffic instead of mocking external services.
// The URL typed into the UTM tool is only text; no destination is visited.
const test = base.extend<{ localTrafficOnly: void }>({
  localTrafficOnly: [async ({ context, baseURL }, use) => {
    const blockedOrigins: string[] = [];
    await context.route("**/*", async (route) => {
      const requestOrigin = new URL(route.request().url()).origin;
      if (requestOrigin !== baseURL) {
        blockedOrigins.push(requestOrigin);
        await route.abort("blockedbyclient");
        return;
      }
      await route.continue();
    });
    await use();
    expect(blockedOrigins, "The public flow must not contact another service").toEqual([]);
  }, { auto: true }],
});

async function openHome(page: Page) {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/UTM['’]li Link/);
  await page.getByRole("button", { name: "Reddet", exact: true }).click();
}

async function fillCampaign(page: Page, destination = "https://example.com/product?ref=demo&utm_source=old#details") {
  const form = page.locator("#utm-link-olusturucu form");
  await form.locator('[name="destinationUrl"]').fill(destination);
  await form.locator('[name="utmSource"]').fill("newsletter");
  await form.locator('[name="utmMedium"]').fill("email");
  await form.locator('[name="utmCampaign"]').fill("oss-launch");
  await form.locator('[name="utmContent"]').fill("hero-button");
  await form.locator('[name="utmTerm"]').fill("link tools");
  return form;
}

test("the unauthenticated homepage and UTM tool render", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await openHome(page);
  await expect(page.locator('#utm-link-olusturucu [name="destinationUrl"]')).toBeVisible();

  if (captureScreenshots) {
    await mkdir(screenshotDirectory, { recursive: true });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: path.join(screenshotDirectory, "home.png"),
      clip: { x: 0, y: 0, width: 1440, height: 900 },
      animations: "disabled",
    });
  }

  await page.locator('a[href="#utm-link-olusturucu"]').first().click();
  await expect(page).toHaveURL(/#utm-link-olusturucu$/);
  await expect(page.locator('#utm-link-olusturucu [name="destinationUrl"]')).toBeInViewport();
  expect(pageErrors).toEqual([]);
});

test("a visitor generates and copies a UTM URL, then carries its draft to signup", async ({ page, context, baseURL }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: baseURL });
  await openHome(page);
  const form = await fillCampaign(page);
  await form.locator('button[type="submit"]').click();

  const expectedUrl = "https://example.com/product?ref=demo&utm_source=newsletter&utm_medium=email&utm_campaign=oss-launch&utm_content=hero-button&utm_term=link+tools#details";
  await expect(page.getByTitle(expectedUrl, { exact: true })).toBeVisible();
  await expect(page.locator("#utm-link-olusturucu aside")).toContainText("newsletter");
  await page.getByRole("button", { name: /UTM.*kopyala/ }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(expectedUrl);

  if (captureScreenshots) {
    await mkdir(screenshotDirectory, { recursive: true });
    await page.evaluate(() => document.fonts.ready);
    // Fit the whole tool in the viewport so the sticky navigation stays above
    // the element capture instead of appearing across the middle of it.
    await page.setViewportSize({ width: 1440, height: 1800 });
    await page.locator("#utm-link-olusturucu").evaluate((element) => {
      element.scrollIntoView({ block: "start", behavior: "instant" });
    });
    await page.locator("#utm-link-olusturucu").screenshot({
      path: path.join(screenshotDirectory, "utm-builder.png"),
      animations: "disabled",
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
  }

  await page.locator('#utm-link-olusturucu a[href="/register"]').click();
  await expect(page).toHaveURL(`${baseURL}/register`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("hesap");
  const draft = await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key) ?? "null"), draftStorageKey);
  expect(draft).toMatchObject({
    generatedUrl: expectedUrl,
    utmSource: "newsletter",
    utmMedium: "email",
    utmCampaign: "oss-launch",
    utmContent: "hero-button",
    utmTerm: "link tools",
    version: 1,
  });
  expect(pageErrors).toEqual([]);
});

test("the UTM tool rejects unsupported protocols without creating a result", async ({ page }) => {
  await openHome(page);
  const form = await fillCampaign(page, "ftp://example.com/file");
  await form.locator('button[type="submit"]').click();
  await expect(form.locator('[name="destinationUrl"]')).toHaveAttribute("aria-invalid", "true");
  await expect(form.getByRole("alert")).toContainText("http ve https");
  await expect(page.locator('#utm-link-olusturucu a[href="/register"]')).toHaveCount(0);
  expect(await page.evaluate((key) => sessionStorage.getItem(key), draftStorageKey)).toBeNull();
});
