/**
 * Creates missing Whop credit pack + referral promo using local .env.
 * Prints only IDs, never API keys.
 */
import { readFileSync, appendFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv(file) {
  const out = {};
  const raw = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  for (const line of raw.split(/\n/)) {
    const t = line.replace(/\r$/, "").trim();
    if (!t || t.startsWith("#")) continue;
    const cleaned = t.replace(/^export\s+/, "");
    const i = cleaned.indexOf("=");
    if (i < 0) continue;
    let v = cleaned.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[cleaned.slice(0, i).trim()] = v;
  }
  return out;
}

const envPath = resolve(process.cwd(), ".env");
const env = loadEnv(envPath);
try {
  const dev = loadEnv(resolve(process.cwd(), ".env.development"));
  for (const [k, v] of Object.entries(dev)) {
    if (!env[k]) env[k] = v;
  }
} catch {
  /* optional */
}
console.log("env_file", envPath);
console.log("has_key", Boolean(env.WHOP_API_KEY), Boolean(env.WHOP_ACCOUNT_ID), Boolean(env.WHOP_PRODUCT_ID));
const token = env.WHOP_API_KEY;
const accountId = env.WHOP_ACCOUNT_ID;
const productId = env.WHOP_PRODUCT_ID;
if (!token || !accountId || !productId) {
  console.error("missing WHOP_API_KEY / WHOP_ACCOUNT_ID / WHOP_PRODUCT_ID");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

async function api(path, body) {
  const res = await fetch(`https://api.whop.com/api/v1${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  if (!res.ok) {
    console.error("WHOP_ERROR", res.status, path, json.error || json.message || json);
    process.exit(1);
  }
  return json;
}

const plan = await api("/plans", {
  account_id: accountId,
  product_id: productId,
  initial_price: 19,
  plan_type: "one_time",
  visibility: "hidden",
  title: "Weflo credits pack",
});

const promo = await api("/promo_codes", {
  company_id: accountId,
  code: "WEFLOREF20",
  amount_off: 20,
  promo_type: "percentage",
  base_currency: "eur",
  number_of_intervals: 3,
  promo_duration_months: 3,
  new_users_only: true,
  one_per_customer: true,
  unlimited_stock: true,
});

const extra = [
  `WHOP_PLAN_CREDITS=${plan.id}`,
  `WHOP_PROMO_REFERRAL=${promo.code || "WEFLOREF20"}`,
].join("\n");
appendFileSync(envPath, `\n${extra}\n`);

console.log("created_credit_plan", plan.id);
console.log("created_promo", promo.code || promo.id);
