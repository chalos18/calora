/**
 * Drive the running app in a real browser and screenshot it.
 *
 * Not a test suite - a way to actually look at the thing. Assumes both servers
 * are already up:  pnpm dev:api  and  cd apps/mobile && pnpm web
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const APP = process.env.APP_URL ?? "http://localhost:8081";
const OUT = process.env.SHOT_DIR ?? "/tmp/calora-shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 }, // iPhone 14-ish
  deviceScaleFactor: 2,
  locale: process.env.LOCALE ?? "en-NZ",
});

const problems: string[] = [];
page.on("console", (message) => {
  if (message.type() === "error") problems.push(`console: ${message.text()}`);
});
page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
page.on("requestfailed", (request) =>
  problems.push(`request failed: ${request.url()} ${request.failure()?.errorText}`),
);

const shot = async (name: string) => {
  // React Native Web renders ScrollView as its own scroll container, so
  // fullPage captures the viewport rather than the content. Scroll the inner
  // container to the top first so screenshots show the same thing a user sees
  // when the screen opens.
  await page.evaluate(() => {
    for (const node of document.querySelectorAll("*")) {
      if (node.scrollHeight > node.clientHeight + 40) node.scrollTop = 0;
    }
  });
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`  saved ${name}.png`);
};

console.log("1. the landing screen is sign-in, not onboarding");
await page.goto(APP, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await shot("01-login");
console.log("   sign-in visible:", await page.getByText("Sign in").isVisible());

console.log("\n2. an unknown email is explained against the field");
await page.getByLabel("Email").fill("nobody@calora.local");
await page.getByText("Sign in").click();
await page.waitForTimeout(1500);
console.log(
  "   message:",
  (await page.locator('[role="alert"]').allTextContents()).join(" | "),
);
await shot("02-login-unknown-email");

console.log("\n3. the test account signs straight in");
await page.getByText("Use the test account").click();
await page.waitForTimeout(3000);
console.log("   url now:", page.url());
await shot("03-test-account-diary");

console.log("\n4. onboarding: submit empty -> per-field errors");
await page.goto(`${APP}/onboarding`, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
console.log(
  "   date placeholder:",
  await page.getByLabel("Date of birth").getAttribute("placeholder"),
);
await page.getByText("Work out my goals").click();
await page.waitForTimeout(600);
await shot("04-validation-errors");
for (const field of ["Email", "Date of birth", "Height (cm)", "Weight (kg)"]) {
  const invalid = await page.getByLabel(field).getAttribute("aria-invalid");
  console.log(`   ${field.padEnd(14)} aria-invalid=${invalid}`);
}
const alerts = await page.locator('[role="alert"]').allTextContents();
console.log("   messages:", alerts);

console.log("\n5. a malformed date");
await page.getByLabel("Date of birth").fill("1996-01-15");
await page.getByText("Work out my goals").click();
await page.waitForTimeout(500);
console.log(
  "   message:",
  (await page.locator('[role="alert"]').allTextContents()).join(" | "),
);
await shot("05-bad-date");

console.log("\n6. fill it in properly and submit");
const email = `ana+${Date.now()}@calora.local`;
await page.getByLabel("Email").fill(email);
await page.getByLabel("Date of birth").fill("15-01-1996");
await page.getByLabel("Height (cm)").fill("165");
await page.getByLabel("Weight (kg)").fill("60");
await page.getByText("Lose weight").click();
await shot("06-filled");
await page.getByText("Work out my goals").click();
await page.waitForTimeout(3500);
await shot("07-diary");
console.log("   url now:", page.url());

console.log("\n7. sign out, then sign back in as the same person");
await page.getByText("Sign out").click();
await page.waitForTimeout(1200);
console.log("   back at sign-in:", page.url());
await page.getByLabel("Email").fill(email);
await page.getByText("Sign in").click();
await page.waitForTimeout(3000);
// The goal is the one derived at onboarding, so it came back from the server
// rather than being re-entered.
console.log("   url now:", page.url());
console.log("   goal shown:", await page.getByText("Goal").isVisible());
await shot("08-signed-back-in");

console.log("\n8. a duplicate email is explained against the field");
await page.goto(`${APP}/onboarding`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.getByLabel("Email").fill(email);
await page.getByLabel("Date of birth").fill("15-01-1996");
await page.getByLabel("Height (cm)").fill("165");
await page.getByLabel("Weight (kg)").fill("60");
await page.getByText("Work out my goals").click();
await page.waitForTimeout(2500);
console.log(
  "   email field invalid:",
  await page.getByLabel("Email").getAttribute("aria-invalid"),
);
console.log("   message:", (await page.locator('[role="alert"]').allTextContents()).join(" | "));
await shot("09-duplicate-email");

console.log("\n9. search and log a food");
await page.goto(`${APP}/search`, { waitUntil: "networkidle" });
await page.getByPlaceholder("Search foods and recipes").fill("black beans");
await page.waitForTimeout(2500);
await shot("10-search");
const rows = await page.locator("text=/Beans/i").count();
console.log("   result rows:", rows);
if (rows > 0) {
  await page.locator("text=/Beans/i").first().click();
  await page.waitForTimeout(2500);
  await shot("11-food-detail");
  console.log("   opened food detail:", page.url());
}

await browser.close();

console.log(`\nscreenshots in ${OUT}`);
if (problems.length > 0) {
  console.log("\nbrowser problems:");
  for (const problem of [...new Set(problems)].slice(0, 12)) {
    console.log("  -", problem);
  }
} else {
  console.log("\nno console errors, no failed requests");
}
