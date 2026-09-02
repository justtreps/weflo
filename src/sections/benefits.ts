import { createSectionDefinition } from "./factory";
import { escapeHtml, value } from "./shared";
const base = createSectionDefinition("benefits", "Bénéfices", "conversion", "cards");
export const benefitsSection = { ...base, previewVariants:["ritual-cards","technical-grid"], renderWeb:(context:Parameters<typeof base.renderWeb>[0])=>{
  const requested=value(context.section,"variant","ritual-cards");
  const variant=new Set(["ritual-cards","technical-grid"]).has(requested)?requested:"ritual-cards";
  return base.renderWeb(context).replace('class="wf-section wf-cards"',`class="wf-section wf-cards wf-benefits--${escapeHtml(variant)}"`);
}};
