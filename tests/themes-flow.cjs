// Uses fixtures only; never creates themes on the backend.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1365, height: 1000 },
  });
  page.setDefaultTimeout(10000);
  const themes = [];
  let fail = false;
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const ok = (data) =>
      route.fulfill({
        status: 200,
        json: { success: true, data, message: "OK", statusCode: 200 },
      });
    if (path.endsWith("/admin/me"))
      return ok({
        id: "staff",
        name: "Alex",
        email: "alex@example.com",
        roles: ["moderator"],
      });
    if (path.endsWith("/themes") && route.request().method() === "GET")
      return ok(themes);
    if (path.match(/\/themes\/[^/]+$/)) {
      const id = path.split("/").pop();
      const index = themes.findIndex((t) => t.id === id);
      if (route.request().method() === "GET") return ok(themes[index]);
      if (route.request().method() === "PATCH") {
        themes[index] = { ...themes[index], ...route.request().postDataJSON() };
        return ok(themes[index]);
      }
      if (fail)
        return route.fulfill({
          status: 409,
          json: {
            message: "This theme is used by profiles and cannot be deleted",
          },
        });
      themes.splice(index, 1);
      return ok(null);
    }
    if (path.endsWith("/themes")) {
      if (fail)
        return route.fulfill({
          status: 409,
          json: { message: "Theme name already exists" },
        });
      themes.push({
        ...route.request().postDataJSON(),
        id: String(themes.length + 1),
        active: true,
        createdAt: "2026-09-09",
      });
      return ok(themes.at(-1));
    }
    return route.fulfill({ status: 404, json: { message: "Not found" } });
  });
  await page.goto("http://127.0.0.1:3001/themes");
  await page.getByText("Make room for a new look.").waitFor();
  await page.getByRole("link", { name: "Create theme" }).click();
  await page.getByLabel("Theme name").fill("Garden");
  await page.getByLabel("Button opacity").fill("45");
  await page.getByLabel("Shape").selectOption("round");
  await page.getByLabel("Italic", { exact: true }).check();
  fail = true;
  await page.getByRole("button", { name: "Create theme", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "already exists" }).waitFor();
  assert.equal(await page.getByLabel("Theme name").inputValue(), "Garden");
  fail = false;
  await page.getByRole("button", { name: "Create theme", exact: true }).click();
  await page.waitForURL("**/themes");
  assert.equal(themes[0].corner_config.opacity, 0.45);
  assert.equal(themes[0].font_config.italic, true);
  assert.equal(typeof themes[0].wallpaper_config.backgroundColor, "string");
  await page.getByRole("button", { name: "Preview Garden" }).click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByRole("link", { name: "Create theme" }).click();
  await page.getByLabel("Theme name").fill("Dawn");
  await page.getByLabel("Background type").selectOption("gradient");
  await page.getByRole("button", { name: "Create theme", exact: true }).click();
  await page.waitForURL("**/themes");
  assert.deepEqual(
    themes[1].wallpaper_config.backgroundColor.map((s) => s.amount),
    [0, 1],
  );
  await page.getByRole("link", { name: "Create theme" }).click();
  await page.getByLabel("Theme name").fill("Photo");
  await page.getByLabel("Background type").selectOption("image");
  await page.getByLabel("Wallpaper image URL").fill("ftp://example.com/a.jpg");
  await page.getByRole("button", { name: "Create theme", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "HTTP or HTTPS" }).waitFor();
  await page
    .getByLabel("Wallpaper image URL")
    .fill("https://example.com/a.jpg");
  await page.getByRole("button", { name: "Create theme", exact: true }).click();
  await page.waitForURL("**/themes");
  assert.equal(themes[2].wallpaper_config.image, "https://example.com/a.jpg");
  await page.getByLabel("Search themes").fill("absent");
  await page.getByText("No matching themes.").waitFor();
  await page.getByLabel("Search themes").fill("Garden");
  assert.equal(
    await page.getByRole("button", { name: "Preview Garden" }).count(),
    1,
  );
  await page.getByRole("button", { name: "Preview Garden" }).click();
  await page.getByRole("link", { name: "Edit theme", exact: true }).click();
  await page.getByLabel("Theme name").fill("Garden updated");
  assert.equal(await page.getByLabel("Button opacity").inputValue(), "45");
  await page.getByRole("button", { name: "Save theme", exact: true }).click();
  await page.waitForURL("**/themes");
  assert.equal(themes[0].name, "Garden updated");
  await page.getByLabel("Search themes").fill("Garden");
  await page.getByRole("button", { name: "Preview Garden updated" }).click();
  await page.getByRole("button", { name: "Delete theme", exact: true }).click();
  fail = true;
  await page.getByRole("button", { name: "Confirm delete" }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: "used by profiles" })
    .waitFor();
  assert.equal(themes.length, 3);
  fail = false;
  await page.getByRole("button", { name: "Confirm delete" }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.equal(themes.length, 2);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("link", { name: "Create theme" }).click();
  await page.getByLabel("Theme name").fill("Mobile draft");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  if (process.env.SCREENSHOT_DIR)
    await page.screenshot({
      path: process.env.SCREENSHOT_DIR + "/theme-builder-mobile.png",
      fullPage: true,
    });
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(
    "PASS: theme empty/search/gallery, moderator creation, solid/gradient/image contracts, opacity conversion, conflict preserves draft, URL safety, preview modal, edit hydration/save, delete confirmation/in-use conflict, mobile layout.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
