import { expect, test, type Page } from "@playwright/test";

async function addVirtualAuthenticator(page: Page) {
  const client = await page.context().newCDPSession(page);
  await client.send("WebAuthn.enable");
  await client.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
}

async function saveName(page: Page, name: string) {
  await page.goto("/");
  await page.getByLabel("What should your contacts call you?").fill(name);
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByRole("status")).toContainText(name);
}

test("a passkey confirm is recorded and a denial is not called confirmed", async ({ browser }) => {
  const suffix = Date.now().toString().slice(-6);
  const ownerName = `Mina ${suffix}`;
  const contactName = `Owen ${suffix}`;
  const ownerContext = await browser.newContext();
  const contactContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  const contact = await contactContext.newPage();

  await saveName(owner, ownerName);
  await owner.getByRole("link", { name: "Add a trusted contact" }).click();
  await owner.getByRole("button", { name: "Create an invite link" }).click();
  const inviteUrl = await owner.locator("#invite-url").inputValue();

  await saveName(contact, contactName);
  await addVirtualAuthenticator(contact);
  await contact.goto("/requests");
  await contact.getByRole("button", { name: "Add a passkey" }).click();
  await expect(contact.getByText("Passkey saved on this device")).toBeVisible();

  await contact.goto(inviteUrl);
  await contact.getByRole("button", { name: `Accept ${ownerName}` }).click();
  await expect(contact.getByText(ownerName, { exact: true })).toBeVisible();

  await owner.goto("/");
  const purpose = `Please confirm the gift-card call ${suffix}`;
  await owner.getByLabel("What was the request?").fill(purpose);
  await owner.getByRole("button", { name: "Ask them to confirm" }).click();
  await expect(owner.locator("#check-status")).toHaveText("Pending");
  const checkUrl = owner.url();

  await contact.goto("/requests");
  await contact.getByText(purpose).click();
  await contact.getByRole("button", { name: "Confirm with passkey" }).click();
  await expect(contact.locator("#check-status")).toHaveText("Confirmed", { timeout: 15_000 });
  await expect(contact.getByText("does not mean they are safe")).toBeVisible();

  await owner.goto(checkUrl);
  await expect(owner.locator("#check-status")).toHaveText("Confirmed");
  await expect(owner.getByText(/Recorded .* UTC/)).toBeVisible();
  await owner.setViewportSize({ width: 1440, height: 1000 });
  await owner.screenshot({ path: "docs/screenshots/04-confirmed-1440.png" });

  await owner.setViewportSize({ width: 1280, height: 800 });
  await owner.goto("/");
  await owner.getByLabel("What was the request?").fill(`Second request ${suffix} about a wire`);
  await owner.getByRole("button", { name: "Ask them to confirm" }).click();
  await expect(owner.locator("#check-status")).toHaveText("Pending");
  const deniedUrl = owner.url();

  await contact.goto("/requests");
  await contact.getByText(`Second request ${suffix}`).click();
  await contact.getByRole("button", { name: "Deny with passkey" }).click();
  await expect(contact.locator("#check-status")).toHaveText("Could not verify", { timeout: 15_000 });

  await owner.goto(deniedUrl);
  await expect(owner.locator("#check-status")).toHaveText("Could not verify");
  await expect(owner.getByText("Verified")).toHaveCount(0);
  await owner.setViewportSize({ width: 390, height: 844 });
  await owner.screenshot({ path: "docs/screenshots/04-denied-390.png" });

  await ownerContext.close();
  await contactContext.close();
});
