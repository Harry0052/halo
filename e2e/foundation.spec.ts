import { expect, test } from "@playwright/test";

test("a visitor can save a name and see it after refresh", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Ask the real person to confirm it." })).toBeVisible();
  await expect(page.getByText("These are the only results Halo shows.")).toBeVisible();
  await expect(page.getByText("This legend is not a verification of a request.")).toBeVisible();
  await expect(page.getByText("Verified")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save name" })).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/01-verify-390.png" });

  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.screenshot({ path: "docs/screenshots/01-verify-1440.png" });

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel("What should your contacts call you?").fill("a");
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.locator("#name-error")).toHaveText("Use at least 2 characters.");

  const name = `Nora ${Date.now().toString().slice(-6)}`;
  await page.getByLabel("What should your contacts call you?").fill(name);
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByRole("status")).toHaveText(new RegExp(`Saved on this server as ${name}`));

  await page.reload();
  await expect(page.getByLabel("What should your contacts call you?")).toHaveValue(name);
  await expect(page.getByRole("banner").getByText(name)).toBeVisible();
  await expect(page.getByText(`Welcome back. This browser is saved as ${name}.`)).toBeVisible();

  await page.goto("/missing-page");
  await expect(page.getByRole("heading", { name: "That page is not in Halo" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("security headers are present on the home page", async ({ request }) => {
  const response = await request.get("/");
  expect(response.ok()).toBeTruthy();
  const headers = response.headers();
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});
