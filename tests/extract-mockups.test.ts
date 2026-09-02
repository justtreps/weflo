import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  extractTemplate,
  stripShopifyOauth,
  injectHydrate,
  bakeDcDefaults,
  rewriteAssetUrls,
  dropRuntimeScripts,
  hideInactiveScIf,
  extractBundleAssets,
  expandScFor,
  sanitizeConnexionTalent,
  revealEditorToolbar,
  extractEditorPreviewAssets,
} from "../scripts/extract-lib.mjs";

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

describe("sanitizeConnexionTalent", () => {
  it("clears talent placeholders and values", () => {
    const html = `<input placeholder="Amir Ben Ettaleb" value="Amir Ben Ettaleb">
<input placeholder="amir@acai.studio" value="lamir@acai.studio">`;
    const out = sanitizeConnexionTalent(html);
    expect(out).toContain('placeholder="Ton nom"');
    expect(out).toContain('placeholder="toi@email.com"');
    expect(out).not.toMatch(/Amir|acai\.studio/i);
    expect(out).toContain('value=""');
  });
});

describe("revealEditorToolbar", () => {
  it("shows the top-right publish bar", () => {
    const html =
      '<div style="position:absolute;top:16px;right:16px;z-index:40;display:none"><span>Publier</span></div>';
    const out = revealEditorToolbar(html);
    expect(out).toContain("display:flex");
    expect(out).not.toMatch(/z-index:40;display:none/);
  });
});

describe("injectHydrate", () => {
  it("appends a module script before </body>", () => {
    const out = injectHydrate("<html><body>x</body></html>", "/hydrate/connexion.js");
    expect(out).toContain('src="/hydrate/connexion.js"');
  });
});

describe("bakeDcDefaults", () => {
  const html = `<h1>{{ title }}</h1>
<p>{{ subtitle }}</p>
<div sc-camel-on-click="{{ oauth }}"><span>{{ oauthLabel }} avec Google</span></div>
<input type="{{ pwdType }}" placeholder="{{ pwdPlaceholder }}" value="{{ email }}">
<sc-if value="{{ isSignup }}" hint-placeholder-val="{{ false }}">Nom</sc-if>
<script type="text/x-dc">
class Component extends DCLogic {
  state = { mode: "login", email: "", password: "", reveal: false, busy: false };
  renderVals() {
    const signup = this.state.mode === "signup";
    return {
      isSignup: signup,
      title: signup ? "Crée ton compte" : "Content de te revoir",
      subtitle: "Reprends là où tu t'es arrêté.",
      oauthLabel: "Continuer",
      oauth: () => {},
      email: this.state.email,
      pwdType: this.state.reveal ? "text" : "password",
      pwdPlaceholder: "••••••••",
    };
  }
}
</script>`;

  it("replaces visible login copy and input types, keeps event hooks", () => {
    const out = bakeDcDefaults(html);
    expect(out).toContain("Content de te revoir");
    expect(out).not.toContain("{{ title }}");
    expect(out).toContain("Continuer avec Google");
    expect(out).toContain('type="password"');
    expect(out).toContain('placeholder="••••••••"');
    expect(out).toContain('sc-camel-on-click="{{ oauth }}"');
    expect(out).toContain('value="{{ isSignup }}"');
  });
});

describe("rewriteAssetUrls", () => {
  it("rewrites img src and font url to extracted paths", () => {
    const html = `<img src="8cd3c221-663b-4cf5-93b3-2982b23b93c8"><style>src: url("89b5043a-ab1d-4353-9adf-e1a29c6871e0")</style>`;
    const out = rewriteAssetUrls(html, {
      "8cd3c221-663b-4cf5-93b3-2982b23b93c8": "/assets/8cd3c221-663b-4cf5-93b3-2982b23b93c8.png",
      "89b5043a-ab1d-4353-9adf-e1a29c6871e0": "/assets/89b5043a-ab1d-4353-9adf-e1a29c6871e0.woff2",
    });
    expect(out).toContain('src="/assets/8cd3c221-663b-4cf5-93b3-2982b23b93c8.png"');
    expect(out).toContain('url("/assets/89b5043a-ab1d-4353-9adf-e1a29c6871e0.woff2")');
    expect(out).not.toContain('src="8cd3c221-663b-4cf5-93b3-2982b23b93c8"');
  });
});

describe("dropRuntimeScripts", () => {
  it("removes uuid runtime script tags", () => {
    const out = dropRuntimeScripts(`<script src="863fb876-8a9c-4064-92d2-b74cbdfdd8f4"></script>\n<h1>Hi</h1>`);
    expect(out).not.toContain("863fb876-8a9c-4064-92d2-b74cbdfdd8f4");
    expect(out).toContain("<h1>Hi</h1>");
  });
});

describe("hideInactiveScIf", () => {
  it("injects CSS that hides sc-if defaults marked false", () => {
    const out = hideInactiveScIf("<helmet></helmet><sc-if hint-placeholder-val=\"{{ false }}\">x</sc-if>");
    expect(out).toMatch(/hint-placeholder-val="\{\{ false \}\}"/);
    expect(out).toMatch(/display:\s*none/);
  });
});

describe("expandScFor", () => {
  it("duplicates list templates with baked item copy", () => {
    const html = `<sc-for list="{{ navItems }}" as="item"><span>{{ item.label }}</span></sc-for>`;
    const out = expandScFor(html, { navItems: [{ label: "Pages" }, { label: "Parrainage" }] });
    expect(out).toContain("Pages");
    expect(out).toContain("Parrainage");
    expect(out).not.toContain("{{ item.label }}");
    expect(out).toContain('list="{{ navItems }}"');
  });
});

describe("extractBundleAssets", () => {
  it("writes image bytes and returns a url map", () => {
    const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const uuid = "11111111-1111-4111-8111-111111111111";
    const source = `<script type="__bundler/manifest">${JSON.stringify({
      [uuid]: { mime: "image/png", compressed: false, data: png },
      "22222222-2222-4222-8222-222222222222": {
        mime: "text/javascript",
        compressed: false,
        data: "Y29uc29sZS5sb2coMSk=",
      },
    })}</script>`;
    const dir = mkdtempSync(join(tmpdir(), "weflo-assets-"));
    try {
      const map = extractBundleAssets(source, dir);
      expect(map[uuid]).toBe(`/assets/${uuid}.png`);
      expect(map["22222222-2222-4222-8222-222222222222"]).toBeUndefined();
      expect(readFileSync(join(dir, `${uuid}.png`))[0]).toBe(0x89);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("extractEditorPreviewAssets", () => {
  it("extracts the original desktop and mobile WebP previews from compressed scripts", () => {
    const webp = "UklGRgQAAABXRUJQ";
    const desktop = `window.__BS_PREVIEWS = ${JSON.stringify({ "Protéo": `data:image/webp;base64,${webp}` })};`;
    const mobile = `window.__BS_PREVIEWS_MB = ${JSON.stringify({ "Protéo": `data:image/webp;base64,${webp}` })};`;
    const source = `<script type="__bundler/manifest">${JSON.stringify({
      "11111111-1111-4111-8111-111111111111": {
        mime: "text/javascript", compressed: false, data: Buffer.from(desktop).toString("base64"),
      },
      "22222222-2222-4222-8222-222222222222": {
        mime: "application/javascript", compressed: false, data: Buffer.from(mobile).toString("base64"),
      },
    })}</script>`;
    const dir = mkdtempSync(join(tmpdir(), "weflo-previews-"));
    try {
      const previews = extractEditorPreviewAssets(source, dir);
      expect(previews.desktop["Protéo"]).toBe("/assets/editor-preview-proteo-desktop.webp");
      expect(previews.mobile["Protéo"]).toBe("/assets/editor-preview-proteo-mobile.webp");
      expect(readFileSync(join(dir, "editor-preview-proteo-desktop.webp")).toString("base64")).toBe(webp);
      expect(readFileSync(join(dir, "editor-preview-proteo-mobile.webp")).toString("base64")).toBe(webp);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
