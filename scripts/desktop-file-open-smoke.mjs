import { _electron as electron, expect } from "@playwright/test";
import electronPath from "electron";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const profile = await mkdtemp(join(tmpdir(), "baizefig-file-open-"));
let app;
try {
  const sample = JSON.parse(
    await readFile("design/BaizeFig-欢迎页.baizefig", "utf8"),
  );
  const first = join(profile, "启动 中文.baizefig");
  const second = join(profile, "运行 中文.baizefig");
  const invalid = join(profile, "损坏.baizefig");
  await writeFile(
    first,
    JSON.stringify({ ...sample, name: "Finder cold start test" }),
  );
  await writeFile(
    second,
    JSON.stringify({ ...sample, name: "Finder running test" }),
  );
  await writeFile(invalid, "{invalid");
  app = await electron.launch({
    executablePath: electronPath,
    args: [resolve("."), first],
    env: { ...process.env, BAIZEFIG_DESKTOP_TEST_DATA: profile },
  });
  const page = await app.firstWindow();
  await expect(
    page.locator('input[value="Finder cold start test"]'),
  ).toBeVisible({ timeout: 30000 });
  await app.evaluate(
    ({ app }, path) => app.emit("open-file", { preventDefault() {} }, path),
    second,
  );
  await expect(
    page.locator('input[value="Finder running test"]'),
  ).toBeVisible();
  await app.evaluate(
    ({ app }, path) => app.emit("open-file", { preventDefault() {} }, path),
    invalid,
  );
  await expect(page.getByText(/损坏.baizefig:/).first()).toBeVisible();
  await expect(
    page.locator('input[value="Finder running test"]'),
  ).toBeVisible();
  // Saved imported designs survive a renderer reload.
  await page.reload();
  await expect(
    page.locator('input[value="Finder running test"]'),
  ).toBeVisible();
  console.log(
    "PASS: startup file, running open-file event, invalid file preserves canvas, reload persistence",
  );
} finally {
  if (app) {
    await app.evaluate(({ app }) => app.quit()).catch(() => {});
    await app.close();
  }
  await rm(profile, { recursive: true, force: true });
}
