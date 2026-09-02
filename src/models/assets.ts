import type { AssetReference } from "../editor/document";
import type { PageModel } from "../lib/catalog";

export function assetsForModel(model: PageModel): AssetReference[] {
  return [
    { id: `${model.id}-product`, type: "image", url: model.image, alt: `${model.name} — ${model.brand}` },
    { id: `${model.id}-desktop-reference`, type: "image", url: model.previewDesktop, alt: `Référence bureau ${model.brand}` },
    { id: `${model.id}-mobile-reference`, type: "image", url: model.previewMobile, alt: `Référence mobile ${model.brand}` },
  ];
}
