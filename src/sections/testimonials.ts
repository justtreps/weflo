import { createSectionDefinition } from "./factory";
import { escapeHtml, value } from "./shared";
const base = createSectionDefinition("testimonials", "Témoignages", "conversion", "cards");
export const testimonialsSection = { ...base, previewVariants:["editorial-stories","ugc-grid"], renderWeb:(context:Parameters<typeof base.renderWeb>[0])=>{
  const requested=value(context.section,"variant","editorial-stories");
  const variant=new Set(["editorial-stories","ugc-grid"]).has(requested)?requested:"editorial-stories";
  return base.renderWeb(context).replace('class="wf-section wf-cards"',`class="wf-section wf-cards wf-testimonials--${escapeHtml(variant)}"`);
}};
