import { expect, test } from "@playwright/test";

test("two people form a mutual circle and an unaccepted link does not", async ({ browser }) => {
  const ownerContext = await browser.newContext();
  const contactContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  const contact = await contactContext.newPage();
  const suffix = Date.now().toString().slice(-6);
  const ownerName = `Alex ${suffix}`;
  const contactName = `Jordan ${suffix}`;

  await owner.setViewportSize({ width: 390, height: 844 });
  await owner.goto("/");
  await owner.getByLabel("What should your contacts call you?").fill(ownerName);
  await owner.getByRole("button", { name: "Save name" }).click();
  await expect(owner.getByRole("status")).toContainText(ownerName);

  await owner.getByRole("link", { name: "Add a trusted contact" }).click();
  await expect(owner.getByRole("heading", { level: 1, name: "People who can confirm a request." })).toBeVisible();
  await expect(owner.getByText("Invite links on this server are signed with the local development key.")).toBeVisible();
  await expect(owner.getByText("No one has accepted yet. An invite link is not a trusted contact.")).toBeVisible();
  await expect(owner.getByText("Alex (sample)")).toBeVisible();
  await expect(owner.getByText("Not your contact").first()).toBeVisible();
  await expect(owner.getByRole("status")).toBeHidden({ timeout: 8000 });
  await owner.screenshot({ path: "docs/screenshots/02-circle-empty-390.png" });

  await owner.getByRole("button", { name: "Create an invite link" }).click();
  await expect(owner.locator("#invite-url")).toBeVisible();
  const inviteUrl = await owner.locator("#invite-url").inputValue();
  expect(inviteUrl).toContain("/circle/invite/");
  await expect(owner.getByText("Waiting", { exact: true })).toBeVisible();

  await contact.setViewportSize({ width: 390, height: 844 });
  await contact.goto(inviteUrl);
  await expect(contact.getByRole("heading", { name: `${ownerName} invited you` })).toBeVisible();
  await contact.screenshot({ path: "docs/screenshots/02-invite-390.png" });
  await contact.getByLabel("What should your contacts call you?").fill(contactName);
  await contact.getByRole("button", { name: "Save name" }).click();
  await expect(contact.getByRole("button", { name: `Accept ${ownerName}` })).toBeVisible();
  await contact.getByRole("button", { name: `Accept ${ownerName}` }).click();
  await expect(contact.getByRole("heading", { level: 1, name: "People who can confirm a request." })).toBeVisible();
  await expect(contact.getByText(ownerName, { exact: true })).toBeVisible();
  await expect(contact.getByText("Accepted").first()).toBeVisible();

  await owner.goto("/circle");
  await expect(owner.getByText(contactName, { exact: true })).toBeVisible();
  await expect(owner.getByText("Waiting", { exact: true })).toHaveCount(0);
  await expect(owner.locator("#invite-url")).toHaveCount(0);
  await owner.setViewportSize({ width: 1440, height: 1200 });
  await owner.screenshot({ path: "docs/screenshots/02-circle-accepted-1440.png" });

  await contact.goto("/circle/invite/not-a-real-token");
  await expect(contact.getByText("This invite link is not valid.")).toBeVisible();

  await ownerContext.close();
  await contactContext.close();
});
