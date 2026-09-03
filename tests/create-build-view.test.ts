import { describe, expect, it } from "vitest";
import { renderBuildExperience } from "../src/create/build-view";
import { initialCreationState, transitionCreationFlow } from "../src/create/flow-state";
import { renderCreateWorkspace } from "../src/create/workspace";
import type { BuildStage } from "../src/onboarding/types";

const stages: BuildStage[] = [
  "Analyse des avis", "Angle marketing", "Identité de marque", "Hero de conversion", "Construction de la buy box", "Preuves sociales", "Optimisation mobile",
].map((label, index) => ({ id: `stage-${index}`, label, state: "waiting" }));

describe("premium creation build view", () => {
  it("shows a live storefront preview assembling section by section", () => {
    const html = renderBuildExperience({ brandName: "Vanity Studio", formatTitle: "Page produit", stages, activeIndex: 4, productImage: "https://cdn.example/product.webp" });

    expect(html).toContain('data-build-preview');
    expect(html).toContain('data-build-progress="71"');
    expect(html).toContain('aria-label="Construction de la page : 71 %"');
    expect(html).toContain('src="https://cdn.example/product.webp"');
    expect(html.match(/data-preview-section/g)?.length).toBeGreaterThanOrEqual(4);
    expect(html).toContain('data-stage-state="active"');
    expect(html).toContain("Construction de la buy box");
    expect(html).not.toContain("<ul>");
  });

  it("renders the template and intake views from the persistent flow state", () => {
    const galleryState = initialCreationState(new URL("https://weflo.test/creer?format=landing&source=description&prompt=une%20lampe"));
    const intakeState = transitionCreationFlow(galleryState, { type: "SELECT_TEMPLATE", templateId: "landing-direct-response" });

    const gallery = renderCreateWorkspace({ workspaceName: "Studio", state: galleryState });
    const intake = renderCreateWorkspace({ workspaceName: "Studio", state: intakeState });

    expect(gallery).toContain('data-template-preview="landing-direct-response"');
    expect(gallery).not.toContain('data-create-source="description"');
    expect(intake).toContain('data-create-source="description"');
    expect(intake).toContain('name="answers[campaign]"');
  });
});
