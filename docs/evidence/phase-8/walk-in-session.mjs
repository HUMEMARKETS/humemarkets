// Phase 8 walk: the review step on the three money paths, in sample mode, at 1440 and 375 px.
import { chromium } from "/home/bennyworkstation/.npm/_npx/6bcb61ec6d5aea22/node_modules/playwright/index.mjs";

const BASE = "http://localhost:3000";
const OUT = process.argv[2];
const log = (...a) => console.log(...a);

async function run(width) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height: width < 500 ? 812 : 900 } });
  const shot = (name) => page.screenshot({ path: `${OUT}/${name}-${width}.png` });
  const mobile = width < 1024;

  // Perp open, Guided.
  await page.goto(`${BASE}/perpetuals`);
  if (mobile) await page.getByRole("button", { name: "Long", exact: true }).click({ timeout: 60_000 });
  const collateral = page.locator("#field-collateral");
  await collateral.waitFor({ timeout: 60_000 });
  await collateral.fill("100");
  const reviewBtn = page.getByRole("button", { name: "Review order" });
  await reviewBtn.waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent === "Review order" && !b.disabled), null, { timeout: 60_000 });
  // Enter in the field must not reach a review or a signature.
  await collateral.press("Enter");
  log(width, "enter-in-field shows confirm:", await page.getByRole("button", { name: /^Confirm/ }).count());
  await shot("01-perp-guided-form");
  await reviewBtn.click();
  await page.getByRole("button", { name: /^Confirm/ }).waitFor();
  const review = await page.locator("section[aria-label^='Open']").innerText();
  log(width, "perp review has liquidation:", /Liquidation price/.test(review), "| worst:", review.split("\n").find((l) => l.startsWith("If ")));
  log(width, "focused:", await page.evaluate(() => document.activeElement?.tagName + " " + document.activeElement?.textContent));
  await shot("02-perp-guided-review");
  await page.getByRole("button", { name: "Back", exact: true }).click();

  // Pro: the one-shot button, the review collapsed above it.
  await page.getByRole("radio", { name: "Pro" }).first().click();
  await page.getByRole("button", { name: "Open long" }).waitFor();
  log(width, "pro one-shot button present; review button:", await page.getByRole("button", { name: "Review order" }).count());
  await page.locator("summary", { hasText: "Review: every figure" }).click();
  await shot("03-perp-pro-review-row");
  await page.getByRole("radio", { name: "Guided" }).first().click();

  // Confirm in sample opens a position; then the close review on the positions table.
  await reviewBtn.click();
  await page.getByRole("button", { name: /^Confirm/ }).click();
  await page.waitForTimeout(4_000);
  await page.goto(`${BASE}/portfolio`);
  const close = page.getByRole("button", { name: "Close", exact: true }).first();
  await close.waitFor({ timeout: 60_000 });
  await close.click();
  await page.getByRole("button", { name: "Confirm close" }).waitFor({ timeout: 60_000 });
  const closeText = await page.locator("section[aria-label^='Close']").innerText();
  log(width, "close review:", closeText.split("\n").filter((l) => /Liquidation|You get back|If the price/.test(l)).join(" | "));
  await page.locator("section[aria-label^='Close']").scrollIntoViewIfNeeded();
  await shot("04-perp-close-review");
  await page.getByRole("button", { name: "Confirm close" }).click();
  await page.waitForTimeout(3_000);

  // Option buy, Guided, in sample: the review shows, Confirm says why it cannot sign.
  await page.goto(`${BASE}/options`);
  await page.getByRole("button", { name: "Buy call" }).first().click({ timeout: 90_000 });
  const optReview = page.getByRole("button", { name: "Review order" });
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent === "Review order" && !b.disabled), null, { timeout: 90_000 });
  await optReview.click();
  await page.getByRole("button", { name: /^Confirm/ }).waitFor();
  const optText = await page.locator("section[aria-label^='Buy']").innerText();
  log(width, "option review:", optText.split("\n").filter((l) => /Liquidation|Max loss|If |connected wallet/.test(l)).join(" | "));
  log(width, "option confirm disabled:", await page.getByRole("button", { name: /^Confirm/ }).isDisabled());
  await shot("05-option-guided-review");

  // Credit supply, Guided, in sample.
  await page.goto(`${BASE}/lending`);
  const amount = page.locator("[id^='field-amount']");
  await amount.waitFor({ timeout: 60_000 });
  await amount.fill("0.5");
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await page.getByRole("button", { name: /^Confirm/ }).waitFor();
  const credText = await page.locator("section[aria-label^='Supply']").innerText();
  log(width, "credit review:", credText.split("\n").filter((l) => /Liquidation|While|Sample mode/.test(l)).join(" | "));
  await page.locator("section[aria-label^='Supply']").scrollIntoViewIfNeeded();
  await shot("06-credit-guided-review");
  // Borrow with nothing supplied is refused in words, before any review.
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("radio", { name: "Borrow" }).click();
  await amount.fill("10");
  await page.waitForTimeout(500);
  log(width, "borrow refusal:", await page.getByText(/Supply .* first/).innerText().catch(() => "none"));

  // Deep link: a fresh load of the terminal never lands on a review.
  await page.goto(`${BASE}/perpetuals?review=1#confirm`);
  await page.waitForTimeout(3_000);
  log(width, "deep link confirm buttons:", await page.getByRole("button", { name: /^Confirm/ }).count());

  await browser.close();
}

for (const width of [1440, 375]) await run(width);
