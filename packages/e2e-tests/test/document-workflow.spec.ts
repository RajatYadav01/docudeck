import { expect, test } from "@playwright/test";

test("a demo user can sign in and create a document", async ({ page }) => {
	await page.goto("/login");
	await page.getByRole("button", { name: /Alice Morgan/ }).click();
	await page.getByRole("button", { name: /Continue to workspace/ }).click();
	await expect(page).toHaveURL(/\/documents$/);
	await page
		.getByRole("button", { name: /New document/ })
		.first()
		.click();
	await expect(page).toHaveURL(/\/documents\/[0-9a-f-]+$/);
	await expect(page.getByRole("textbox", { name: "Document title" })).toHaveValue("Untitled Document");
});
