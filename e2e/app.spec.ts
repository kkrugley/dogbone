import { test, expect } from "@playwright/test"

test("app renders without crashing", async ({ page }) => {
  page.on("pageerror", (err) => {
    console.error("PAGE ERROR:", err.message)
  })

  await page.goto("/")

  await page.waitForSelector("#root", { timeout: 10000 })

  const rootContent = await page.locator("#root").innerHTML()
  expect(rootContent.length).toBeGreaterThan(0)

  await expect(page.getByRole("banner").getByText("DogBone")).toBeVisible({ timeout: 5000 })
})

test("empty state shows upload prompt", async ({ page }) => {
  await page.goto("/")

  await expect(page.getByRole("heading", { name: "Import DXF File" })).toBeVisible()
  await expect(page.getByText("Upload a DXF file to start processing")).toBeVisible()
})

test("header is visible", async ({ page }) => {
  await page.goto("/")

  await expect(page.getByRole("banner").getByText("DogBone", { exact: true })).toBeVisible()
})

test("no console errors", async ({ page }) => {
  const errors: string[] = []

  page.on("console", (msg) => {
    if (msg.type() === "error" && !msg.text().includes("favicon")) {
      errors.push(msg.text())
    }
  })

  page.on("pageerror", (err) => {
    errors.push(err.message)
  })

  await page.goto("/")
  await page.waitForTimeout(2000)

  if (errors.length > 0) {
    console.error("CONSOLE ERRORS:", errors)
  }

  expect(errors.length).toBe(0)
})