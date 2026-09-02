import { renderSectionPreview } from "../src/section-preview/document";
import type { PreviewViewport } from "../src/section-preview/types";

export function sectionPreviewPage(input:{sectionType:string;variantId:string;fixtureId:string;viewport:PreviewViewport}):string {
  return renderSectionPreview({...input,context:false});
}
