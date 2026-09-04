import { expect, test, type Page } from "@playwright/test";

const DEFAULT_ROUTE_BY_ROLE = {
  ceo: "/dashboard",
  manager: "/dashboard",
  employee: "/kullanici",
} as const;

async function openDemo(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "V1 Demo'yu Aç" }).click();
  await page.waitForURL(/\/dashboard/);
  await expect(page.getByTestId("app-shell")).toBeVisible();
}

async function switchPersona(page: Page, role: keyof typeof DEFAULT_ROUTE_BY_ROLE) {
  const select = page.getByLabel("Demo persona seçimi");
  await expect(select).toBeVisible();
  await select.selectOption(role);
  await expect.poll(async () => page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem("hr_current_user") || "null")?.role || null; }
    catch { return null; }
  })).toBe(role === "manager" ? "MANAGER" : role === "employee" ? "PERSONEL" : "CEO");
  await page.waitForURL(new RegExp(`${DEFAULT_ROUTE_BY_ROLE[role].replace("/", "\\/")}(?:$|\\?)`));
}

async function openNotifications(page: Page) {
  const bell = page.getByRole("button", { name: "Bildirimler" });
  if ((await bell.getAttribute("aria-expanded")) !== "true") await bell.click();
  await expect(page.getByRole("dialog", { name: "Bildirimler" })).toBeVisible();
}

async function closeNotifications(page: Page) {
  const close = page.getByRole("button", { name: "Bildirimleri kapat" });
  if (await close.count()) await close.click();
}

test.describe("FutureHR notification audience isolation", () => {
  test("employee never inherits CEO or manager notifications after persona switch", async ({ page }) => {
    await openDemo(page);
    await page.evaluate(() => {
      const now = new Date().toISOString();
      localStorage.setItem("hr_notifications", JSON.stringify([
        { id: 810001, message: "CEO hedefli bildirim", type: "warning", read: false, timestamp: now, targetRole: "CEO" },
        { id: 810002, message: "Yönetici hedefli bildirim", type: "info", read: false, timestamp: now, targetRole: "MANAGER" },
        { id: 810003, message: "Pelin kişisel bildirimi", type: "success", read: false, timestamp: now, targetUser: "Pelin Yılmaz" },
        { id: 810004, message: "Eski hedefsiz CEO bildirimi", type: "info", read: false, timestamp: now },
      ]));
      window.dispatchEvent(new CustomEvent("notificationsUpdated"));
    });

    await openNotifications(page);
    await expect(page.getByText("CEO hedefli bildirim", { exact: true })).toBeVisible();
    await expect(page.getByText("Eski hedefsiz CEO bildirimi", { exact: true })).toBeVisible();
    await expect(page.getByText("Pelin kişisel bildirimi", { exact: true })).toHaveCount(0);
    await closeNotifications(page);

    await switchPersona(page, "employee");
    await openNotifications(page);
    await expect(page.getByText("Pelin kişisel bildirimi", { exact: true })).toBeVisible();
    await expect(page.getByText("CEO hedefli bildirim", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Yönetici hedefli bildirim", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Eski hedefsiz CEO bildirimi", { exact: true })).toHaveCount(0);
  });

  test("mark all read changes only the active user's stored notifications", async ({ page }) => {
    await openDemo(page);
    await page.evaluate(() => {
      const now = new Date().toISOString();
      localStorage.setItem("hr_notifications", JSON.stringify([
        { id: 820001, message: "CEO okunmamış", type: "warning", read: false, timestamp: now, targetRole: "CEO" },
        { id: 820002, message: "Pelin okunmamış", type: "info", read: false, timestamp: now, targetUser: "Pelin Yılmaz" },
      ]));
      window.dispatchEvent(new CustomEvent("notificationsUpdated"));
    });

    await switchPersona(page, "employee");
    await openNotifications(page);
    await expect(page.getByText("Pelin okunmamış", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Tümünü okundu say" }).click();

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("hr_notifications") || "[]"));
    expect(stored.find((item: { id: number; read: boolean }) => item.id === 820002)?.read).toBe(true);
    expect(stored.find((item: { id: number; read: boolean }) => item.id === 820001)?.read).toBe(false);
  });

  test("manager sees manager notifications but not CEO or employee-private notifications", async ({ page }) => {
    await openDemo(page);
    await page.evaluate(() => {
      const now = new Date().toISOString();
      localStorage.setItem("hr_notifications", JSON.stringify([
        { id: 830001, message: "CEO özel", type: "warning", read: false, timestamp: now, targetRole: "CEO" },
        { id: 830002, message: "Yönetici özel", type: "info", read: false, timestamp: now, targetRole: "MANAGER" },
        { id: 830003, message: "Pelin özel", type: "success", read: false, timestamp: now, targetUser: "Pelin Yılmaz" },
      ]));
      window.dispatchEvent(new CustomEvent("notificationsUpdated"));
    });

    await switchPersona(page, "manager");
    await openNotifications(page);
    await expect(page.getByText("Yönetici özel", { exact: true })).toBeVisible();
    await expect(page.getByText("CEO özel", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Pelin özel", { exact: true })).toHaveCount(0);
  });
});
