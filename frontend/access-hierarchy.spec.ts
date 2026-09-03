import { expect, test, type Page } from "@playwright/test";

async function openDemo(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "V1 Demo'yu Aç" }).click();
  await page.waitForURL(/\/dashboard/);
  await expect(page.getByTestId("app-shell")).toBeVisible();
}

test.describe("company access hierarchy", () => {
  test("CEO can configure manager data and document scope and persist the policy", async ({ page }) => {
    await openDemo(page);
    await page.goto("/ayarlar/yetki-mimarisi");

    await expect(page.getByRole("heading", { level: 1, name: "Gelişmiş Yetki Ayarları" })).toBeVisible();
    await expect(page.getByText("Belge erişimi", { exact: true })).toBeVisible();
    await expect(page.getByText("Veri kapsamı ve işlem yetkileri", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: /Müdür \/ Yönetici/ }).click();

    const salaryScope = page.getByLabel("Maaş & ücret veri kapsamı");
    await expect(salaryScope).toHaveValue("NONE");
    await salaryScope.selectOption("DIRECT_REPORTS");

    const salaryRow = salaryScope.locator("xpath=ancestor::div[contains(@class,'grid')][1]");
    const viewSalary = salaryRow.getByRole("button", { name: "Görüntüle" });
    await viewSalary.click();
    await expect(viewSalary).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: "Şirket politikasını kaydet" }).click();
    await expect(page.getByText("Şirket yetki politikası kaydedildi", { exact: true })).toBeVisible();

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("hr_access_policy_v3") || "null"));
    expect(stored?.version).toBe(3);
    expect(stored?.resourceOverrides?.manager?.salary?.scope).toBe("DIRECT_REPORTS");
    expect(stored?.resourceOverrides?.manager?.salary?.actions).toContain("view");

    await page.reload();
    await page.getByRole("button", { name: /Müdür \/ Yönetici/ }).click();
    await expect(page.getByLabel("Maaş & ücret veri kapsamı")).toHaveValue("DIRECT_REPORTS");
  });

  test("employee defaults remain self-service and special documents stay constrained", async ({ page }) => {
    await openDemo(page);
    await page.goto("/ayarlar/yetki-mimarisi");
    await page.getByRole("button", { name: /Personel/ }).click();

    await expect(page.getByLabel("Temel özlük profili veri kapsamı")).toHaveValue("SELF");
    await expect(page.getByLabel("Maaş & ücret veri kapsamı")).toHaveValue("SELF");
    await expect(page.getByLabel("Potansiyel & 9-Box veri kapsamı")).toHaveValue("NONE");
    await expect(page.getByLabel("Sağlık belgesi veri kapsamı")).toHaveValue("SELF");
    await expect(page.getByLabel("Disiplin / savunma belgesi veri kapsamı")).toHaveValue("NONE");
  });
});
