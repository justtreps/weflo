import { describe, it, expect } from "vitest";
import { extractTemplate, stripShopifyOauth, injectHydrate } from "../scripts/extract-lib.mjs";

const sample = `<script type="__bundler/template">"<!DOCTYPE html>\\n<html><body><button class=\\"oauth-shopify\\">avec Shopify</button><button class=\\"oauth-google\\">Google</button></body></html>"</script>`;

describe("extractTemplate", () => {
  it("parses the bundler template JSON string", () => {
    expect(extractTemplate(sample)).toContain("oauth-google");
  });
});

describe("stripShopifyOauth", () => {
  it("removes Shopify continue button, keeps Google", () => {
    const html = `<button>Continuer avec Shopify</button><button>Continuer avec Google</button>`;
    const out = stripShopifyOauth(html);
    expect(out).not.toMatch(/Shopify/i);
    expect(out).toMatch(/Google/);
  });

  it("removes Shopify oauth div block, keeps Google oauth div", () => {
    const html = `<div sc-camel-on-click="{{ oauth }}" style="cursor: pointer;">
            <img src="shopify-icon" alt="">
            <span>{{ oauthLabel }} avec Shopify</span>
          </div>
          <div sc-camel-on-click="{{ oauth }}" style="cursor: pointer;">
            <img src="google-icon" alt="">
            <span>{{ oauthLabel }} avec Google</span>
          </div>
          <script>const PROOFS = [{ text: "Ton catalogue Shopify relié en deux clics." }];</script>`;
    const out = stripShopifyOauth(html);
    expect(out).not.toContain("{{ oauthLabel }} avec Shopify");
    expect(out).not.toMatch(/<div[^>]*sc-camel-on-click[^>]*>[\s\S]*?avec Shopify[\s\S]*?<\/div>/i);
    expect(out).toContain("{{ oauthLabel }} avec Google");
    expect(out).toContain("catalogue Shopify");
  });
});

describe("injectHydrate", () => {
  it("appends a module script before </body>", () => {
    const out = injectHydrate("<html><body>x</body></html>", "/hydrate/connexion.js");
    expect(out).toContain('src="/hydrate/connexion.js"');
  });
});
