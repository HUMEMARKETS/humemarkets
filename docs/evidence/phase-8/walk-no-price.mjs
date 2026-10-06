// Phase 8 walk, the part that needs no live price: paused refusal, lending review, Guided/Pro, deep link.
import { chromium } from "/home/bennyworkstation/.npm/_npx/6bcb61ec6d5aea22/node_modules/playwright/index.mjs";

const BASE = "http://localhost:3000";
const OUT = process.argv[2];
const log = (...a) => console.log(...a);
const PAUSED = /This market is paused\. Prices keep updating; new positions are refused\./;

async function run(width) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height: width < 500 ? 812 : 900 } });
  const shot = (name) => page.screenshot({ path: `${OUT}/${name}-${width}.png` });
  const mobile = width < 1024;
  const text = () => page.locator("body").innerText();
  const wide = () => page.setViewportSize({ width: 1440, height: 900 });
  // The ticker at the top scrolls; pick from the filtered market list instead.
  const pick = async () => {
    const filter = page.getByPlaceholder(/Filter markets|Search/i).first();
    if (await filter.count()) await filter.fill("E2E");
    await page.waitForFunction(() => document.querySelector("main select option[value='E2E']") || [...document.querySelectorAll("main *")].some((el) => el.textContent?.startsWith("E2E")), null, { timeout: 60_000 });
    const select = page.locator("main select:visible").filter({ has: page.locator("option[value='E2E']") });
    if (await select.count()) await select.first().selectOption("E2E");
    else await page.locator("main").getByText(/^E2E/).locator("visible=true").first().click({ timeout: 60_000 });
  };
  const own = () => page.setViewportSize({ width, height: mobile ? 812 : 900 });

  // Terminal, Guided: the review button; Enter in the field does nothing; Pro is the one-shot layout.
  await page.goto(`${BASE}/perpetuals`);
  if (mobile) await page.getByRole("button", { name: "Long", exact: true }).click({ timeout: 60_000 });
  await page.getByRole("radio", { name: "Guided" }).first().waitFor({ timeout: 60_000 });
  await page.locator("#field-collateral").fill("100");
  await page.locator("#field-collateral").press("Enter");
  await page.waitForTimeout(1500);
  log(width, "guided button:", await page.getByRole("button", { name: "Review order" }).count(), "| confirm after Enter:", await page.getByRole("button", { name: /^Confirm/ }).count());
  await shot("01-perp-guided-form");
  await page.getByRole("radio", { name: "Pro" }).first().click();
  log(width, "pro one-shot:", await page.getByRole("button", { name: "Open long" }).count(), "| review button:", await page.getByRole("button", { name: "Review order" }).count());
  await shot("02-perp-pro-form");
  await page.reload();
  if (mobile) await page.getByRole("button", { name: "Long", exact: true }).click({ timeout: 60_000 });
  await page.getByRole("radio", { name: "Pro", checked: true }).first().waitFor({ timeout: 30_000 });
  log(width, "pro remembered after reload: yes");
  await page.getByRole("radio", { name: "Guided" }).first().click();

  // Deep link: a fresh load never lands on a review or a Confirm.
  await page.goto(`${BASE}/perpetuals?review=1#confirm`);
  await page.waitForTimeout(3000);
  log(width, "deep link confirm buttons:", await page.getByRole("button", { name: /^Confirm/ }).count());

  // Paused market E2E on the perp ticket (the existing refusal, for comparison).
  await wide();
  await pick();
  await own();
  await page.waitForTimeout(2000);
  if (mobile) log(width, "perp bar Market paused:", await page.getByRole("button", { name: "Market paused" }).count());
  else log(width, "perp ticket on E2E paused:", PAUSED.test(await text()));

  // The option ticket on E2E: refused with the sentence, no review step.
  await wide();
  await page.goto(`${BASE}/options`);
  await pick();
  await own();
  await page.waitForTimeout(3000);
  if (mobile) await page.getByRole("button", { name: "Open order ticket" }).click();
  await page.waitForTimeout(1000);
  log(width, "option ticket paused sentence:", PAUSED.test(await text()), "| Market paused button:", await page.getByRole("button", { name: "Market paused" }).count(), "| review button:", await page.getByRole("button", { name: "Review order" }).count());
  await shot("03-option-paused");

  // /strategies on E2E.
  await page.goto(`${BASE}/strategies`);
  await page.getByLabel("Underlying").selectOption("E2E", { timeout: 60_000 });
  await page.waitForTimeout(2000);
  log(width, "strategies paused sentence:", PAUSED.test(await text()));
  await shot("04-strategies-paused");

  // Lending, sample, Guided: a supply review states the liquidation price and why Confirm cannot sign.
  await page.goto(`${BASE}/lending`);
  const amount = page.locator("[id^='field-amount']");
  await amount.waitFor({ timeout: 60_000 });
  await amount.fill("0.5");
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await page.getByRole("button", { name: /^Confirm/ }).waitFor();
  const cred = await page.locator("section[aria-label^='Supply']").innerText();
  log(width, "credit review:", cred.split("\n").filter((l) => /Liquidation|While|Sample mode|cap/i.test(l)).join(" | "));
  log(width, "credit confirm disabled:", await page.getByRole("button", { name: /^Confirm/ }).isDisabled());
  log(width, "focus on:", await page.evaluate(() => `${document.activeElement?.tagName} ${document.activeElement?.textContent}`));
  await page.locator("section[aria-label^='Supply']").scrollIntoViewIfNeeded();
  await shot("05-credit-supply-review");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("radio", { name: "Borrow" }).click();
  await amount.fill("10");
  await page.waitForTimeout(500);
  log(width, "borrow refusal:", await page.getByText(/Supply .* first/).innerText().catch(() => "none"));
  await page.getByText(/Supply .* first/).scrollIntoViewIfNeeded().catch(() => {});
  await shot("06-credit-borrow-refused");

  log(width, "horizontal scroll:", await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth));
  await browser.close();
}

for (const width of [1440, 375]) await run(width);
