import { expect, test } from "@playwright/test";

async function saveName(page: import("@playwright/test").Page, name: string) {
  await page.goto("/");
  await page.getByLabel("What should your contacts call you?").fill(name);
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByRole("status")).toContainText(name);
}

test("a pending check survives refresh, cannot be read by a stranger, and cancel does not confirm it", async ({
  browser,
}) => {
  const suffix = Date.now().toString().slice(-6);
  const ownerName = `Rae ${suffix}`;
  const contactName = `Noah ${suffix}`;
  const ownerContext = await browser.newContext();
  const contactContext = await browser.newContext();
  const strangerContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  const contact = await contactContext.newPage();

  await saveName(owner, ownerName);
  await owner.getByRole("link", { name: "Add a trusted contact" }).click();
  await owner.getByRole("button", { name: "Create an invite link" }).click();
  const inviteUrl = await owner.locator("#invite-url").inputValue();

  await saveName(contact, contactName);
  await contact.goto(inviteUrl);
  await contact.getByRole("button", { name: `Accept ${ownerName}` }).click();
  await expect(contact.getByText(ownerName, { exact: true })).toBeVisible();

  await owner.goto("/");
  await expect(owner.getByRole("heading", { name: "Ask them to confirm" })).toBeVisible();
  await owner.getByLabel("What was the request?").fill("4111111111111111");
  await owner.getByRole("button", { name: "Ask them to confirm" }).click();
  await expect(owner.getByText("Leave out card numbers")).toBeVisible();

  const purpose = `A caller asked for gift cards ${suffix}`;
  await owner.getByLabel("What was the request?").fill(purpose);
  await owner.getByRole("button", { name: "Ask them to confirm" }).click();
  await expect(owner.getByRole("heading", { level: 1 })).toContainText(contactName);
  await expect(owner.locator("#check-status")).toHaveText("Pending");
  await expect(owner.locator("#check-status")).not.toHaveText("Confirmed");
  await expect(owner.getByText("Verified")).toHaveCount(0);
  const code = (await owner.locator(".font-mono").first().innerText()).trim();
  expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  await owner.setViewportSize({ width: 390, height: 844 });
  await owner.screenshot({ path: "docs/screenshots/03-pending-390.png" });

  const challengeUrl = owner.url();
  await owner.reload();
  await expect(owner.locator("#check-status")).toHaveText("Pending");
  await expect(owner.locator(".font-mono").first()).toHaveText(code);

  await contact.goto("/requests");
  await expect(contact.getByText(purpose)).toBeVisible();
  await contact.getByText(purpose).click();
  await expect(contact.locator("#check-status")).toHaveText("Pending");
  await expect(contact.getByText(code)).toBeVisible();
  await expect(contact.getByRole("button", { name: "Confirm" })).toHaveCount(0);
  await contact.setViewportSize({ width: 1440, height: 1000 });
  await contact.screenshot({ path: "docs/screenshots/03-requests-1440.png" });

  await owner.route("**/api/challenges/*/status", (route) => route.abort());
  await expect(owner.getByText("Could not refresh. The saved result is unchanged.")).toBeVisible({ timeout: 10_000 });
  await owner.unroute("**/api/challenges/*/status");

  const challengeId = new URL(challengeUrl).pathname.split("/").pop();
  const stranger = await strangerContext.request.get(`/api/challenges/${challengeId}/status`);
  expect(stranger.status()).toBe(404);

  await owner.getByRole("button", { name: "Cancel check" }).click();
  await owner.getByRole("button", { name: "Cancel this check" }).click();
  await expect(owner.locator("#check-status")).toHaveText("Could not verify");
  await expect(owner.getByText("Verified")).toHaveCount(0);

  await ownerContext.close();
  await contactContext.close();
  await strangerContext.close();
});

test("a failed refresh leaves the pending result in place", async ({ page }) => {
  await page.goto("/sample");
  await expect(page.getByRole("heading", { name: "A sample check, not yours" })).toBeVisible();
  await expect(page.locator("#check-status")).toHaveText("Pending");
  await expect(page.getByText("SAMP-LE00")).toBeVisible();
  await expect(page.getByText("Verified")).toHaveCount(0);
});
