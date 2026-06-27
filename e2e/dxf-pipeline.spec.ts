import { test, expect } from "@playwright/test"
import fs from "node:fs"
import path from "node:path"

const FIXTURES_DIR = path.resolve("test-files")
const dxfFiles = fs.readdirSync(FIXTURES_DIR).filter(f => f.endsWith(".dxf"))

if (dxfFiles.length === 0) {
  test.skip("No DXF files in test-files/", () => {})
} else {
  for (const filename of dxfFiles) {
    test(`DXF pipeline: ${filename}`, async ({ page }) => {
      const errors: string[] = []
      page.on("pageerror", (err) => errors.push(err.message))
      page.on("console", (msg) => {
        if (msg.type() === "error" && !msg.text().includes("favicon"))
          errors.push(msg.text())
      })

      await page.goto("/")

      const filePath = path.join(FIXTURES_DIR, filename)
      const fileInput = page.locator('input[type="file"]').first()
      await fileInput.setInputFiles(filePath)

      const statusBadge = page.locator("text=Ready").first()
      await statusBadge.waitFor({ state: "visible", timeout: 15000 })

      const relevantErrors = errors.filter(e =>
        !e.includes("favicon") && !e.includes("React DevTools")
      )

      const contoursEl = page.getByText(/\d+ contour/)
      await expect(contoursEl.first()).toBeVisible()

      const canvas = page.locator("canvas").first()
      await expect(canvas).toBeVisible()

      const box = await canvas.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.width).toBeGreaterThan(10)
      expect(box!.height).toBeGreaterThan(10)

      if (relevantErrors.length > 0) {
        console.warn(`${filename} errors:`, relevantErrors)
      }

console.log(`${filename}: canvas=${box!.width}x${box!.height}`)

      const hasContent = await canvas.evaluate((el: HTMLCanvasElement) => {
        try {
          const dataUrl = (el as HTMLCanvasElement).toDataURL("image/png")
          const blankPrefix = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk"
          return { isBlank: dataUrl.startsWith(blankPrefix), dataLen: dataUrl.length }
        } catch {
          return { error: "toDataURL failed" }
        }
      })

      console.log(`${filename} content:`, JSON.stringify(hasContent))
      expect(hasContent.isBlank).toBe(false)

      await canvas.screenshot({ path: `test-results/${filename}.png` })
    })
  }
}