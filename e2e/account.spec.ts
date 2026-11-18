import { expect, test } from "@playwright/test";

test("download contains the saved name and delete removes the session", async ({ page }) => {
  const name = `Ida ${Date.now().toString().slice(-6)}`;
  await page.goto("/");
  await page.getByLabel("What should your contacts call you?").fill(name);
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByRole("status")).toContainText(name);

  const download = await page.request.get("/api/account/export");
  expect(download.ok()).toBeTruthy();
  const body = (await download.json()) as { person?: { displayName?: string }; omitted?: string[] };
  expect(body.person?.displayName).toBe(name);
  expect(JSON.stringify(body)).not.toMatch(/"nonceHash"|"publicKey"|"tokenHash"|"signature"/);

  await page.goto("/safety");
  await page.getByLabel("Type delete my halo data").fill("delete my halo data");
  await page.getByRole("button", { name: "Delete my data" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Ask the real person to confirm it." })).toBeVisible();
  await expect(page.getByRole("banner").getByText("Not named yet")).toBeVisible();

  const after = await page.request.get("/api/account/export");
  expect(after.status()).toBe(401);
});
