import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("French UI contract", () => {
  it("renders the product onboarding entirely in French", () => {
    const source = read("src/hydrate/start.ts");
    expect(source).toContain("Quel produit veux-tu vendre ?");
    expect(source).toContain("Quelle langue parlent tes clients ?");
    expect(source).toContain("À qui s’adresse ce produit ?");
    expect(source).toContain("Créer mon compte et récupérer ma boutique");
    expect(source).not.toMatch(/What product|Paste a link|\bContinue\b|Start building|Claim my store|Welcome back/);
  });

  it("uses local image assets for every supported marketplace logo", () => {
    const source = read("src/hydrate/start.ts");
    for (const brand of ["amazon", "aliexpress", "shopify", "etsy", "temu"]) {
      expect(source).toContain(`/assets/brands/${brand}.svg`);
    }
    expect(source).not.toContain('source--amazon">a<');
    expect(source).not.toContain('source--ali">Ali<');
    expect(source).not.toContain('source--shopify">S<');
  });

  it("renders the commerce editor and publication flow in French", () => {
    const sources = [
      read("src/editor/ui/shell.ts"),
      read("src/editor/ui/panels/add-section.ts"),
      read("src/editor/ui/panels/commerce.ts"),
      read("src/editor/ui/publish-dialog.ts"),
      read("src/hydrate/publish-access.ts"),
    ].join("\n");
    expect(sources).toContain("Ajouter une section");
    expect(sources).toContain("Produit et offre");
    expect(sources).toContain("Marque et style");
    expect(sources).toContain("Publier sur ton thème Shopify");
    expect(sources).not.toMatch(/Add section|Product & offer|Brand & style|Connect Shopify|\bCancel\b|\bContinue\b/);
  });
});
