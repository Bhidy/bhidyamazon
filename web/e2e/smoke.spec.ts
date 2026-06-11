import { test, expect, type Page } from "@playwright/test";

/**
 * Smoke gate against the PRODUCTION server (real committed data, real CSP):
 * the app must render the real dataset with a clean console, and the
 * persistent watchlist must actually persist across navigation.
 *
 * Any console error fails the test on purpose — that is how a too-strict CSP
 * (e.g. a blocked image host or an eval the prod bundle suddenly needs) gets
 * caught here instead of in production.
 */

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  return errors;
}

test("dashboard renders with a clean console under the production CSP", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Dashboard/ })).toBeVisible();
  await expect(page.locator("#main")).toContainText("EGP");
  expect(errors).toEqual([]);
});

test("best sellers list shows ranked products with EGP prices", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/bestsellers");
  const productLinks = page.locator('#main a[href^="/products/"]');
  await expect(productLinks.first()).toBeVisible();
  expect(await productLinks.count()).toBeGreaterThan(3);
  await expect(page.locator("#main")).toContainText("EGP");
  expect(errors).toEqual([]);
});

test("watchlist add survives navigation (real persistence, not a toast)", async ({ page }) => {
  await page.goto("/bestsellers");
  const first = page.locator('#main a[href^="/products/"]').first();
  const href = await first.getAttribute("href");
  await first.click();
  await page.waitForURL("**/products/**");

  const addButton = page.getByRole("button", { name: /Add .* to watchlist/ });
  await expect(addButton).toBeEnabled();
  await addButton.click();
  await expect(page.getByRole("button", { name: /Remove .* from watchlist/ })).toBeVisible();

  // The honesty bar: after FULL navigation away, the item must still be there.
  await page.goto("/watchlists");
  await expect(page.getByText(/1 product tracked/)).toBeVisible();
  await expect(page.locator(`#main a[href="${href}"]`).first()).toBeVisible();
});

test("alerts page starts honestly empty (no fabricated demo rules)", async ({ page }) => {
  await page.goto("/alerts");
  await expect(page.getByText("No alerts yet")).toBeVisible();
});

test("/api/health reports dataset status with schema-issue visibility", async ({ request }) => {
  const res = await request.get("/api/health");
  expect([200, 503]).toContain(res.status());
  const body = await res.json();
  expect(["ok", "degraded"]).toContain(body.status);
  expect(body).toHaveProperty("scrapedAt");
  expect(body).toHaveProperty("issues");
  if (res.status() === 200) {
    expect(body.productCount).toBeGreaterThan(0);
    expect(Object.keys(body.issues)).toHaveLength(0);
  }
});
