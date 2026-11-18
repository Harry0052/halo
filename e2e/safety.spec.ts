import { expect, test } from "@playwright/test";

test("safety explains the limits, a report is saved, and a block removes the contact", async ({ browser }) => {
  const suffix = Date.now().toString().slice(-6);
  const ownerName = `Lia ${suffix}`;
  const contactName = `Chris ${suffix}`;
  const ownerContext = await browser.newContext();
  const contactContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  const contact = await contactContext.newPage();

  await owner.goto("/");
  await owner.getByLabel("What should your contacts call you?").fill(ownerName);
  await owner.getByRole("button", { name: "Save name" }).click();
  await owner.getByRole("link", { name: "Add a trusted contact" }).click();
  await owner.getByRole("button", { name: "Create an invite link" }).click();
  const inviteUrl = await owner.locator("#invite-url").inputValue();

  await contact.goto("/");
  await contact.getByLabel("What should your contacts call you?").fill(contactName);
  await contact.getByRole("button", { name: "Save name" }).click();
  await contact.goto(inviteUrl);
  await contact.getByRole("button", { name: `Accept ${ownerName}` }).click();

  await owner.goto("/circle");
  await owner.getByRole("button", { name: "Block" }).click();
  await owner.getByRole("button", { name: `Block ${contactName}` }).click();
  await expect(owner.getByRole("heading", { name: "Blocked" })).toBeVisible();
  await owner.goto("/");
  await expect(owner.getByRole("heading", { name: "Ask them to confirm" })).toHaveCount(0);

  await owner.goto("/safety");
  await expect(owner.getByRole("heading", { level: 1, name: "What Halo can and cannot do" })).toBeVisible();
  await expect(owner.getByText("It does not mean they are physically safe.")).toBeVisible();
  await expect(owner.getByText("Email, texts, and push are disabled.")).toBeVisible();
  await owner.setViewportSize({ width: 390, height: 844 });
  await owner.screenshot({ path: "docs/screenshots/05-safety-390.png" });
  await owner.setViewportSize({ width: 1440, height: 1200 });
  await owner.screenshot({ path: "docs/screenshots/05-safety-1440.png" });

  await owner.getByLabel("What happened?").fill("They kept asking me to buy gift cards.");
  await owner.getByRole("button", { name: "Save report" }).click();
  await expect(owner.getByRole("status")).toContainText("Saved on this server. Nobody is emailed.");

  await owner.getByLabel("Show in-app prompts").uncheck();
  await owner.reload();
  await expect(owner.getByLabel("Show in-app prompts")).not.toBeChecked();

  await ownerContext.close();
  await contactContext.close();
});
