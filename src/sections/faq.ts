import { createSectionDefinition } from "./factory";
import { escapeHtml, value } from "./shared";
const base = createSectionDefinition("faq", "Questions fréquentes", "content", "faq");
export const faqSection = { ...base, previewVariants:["editorial-accordion","support-columns"], renderWeb:(context:Parameters<typeof base.renderWeb>[0])=>{
  const requested=value(context.section,"variant","editorial-accordion");
  const variant=new Set(["editorial-accordion","support-columns"]).has(requested)?requested:"editorial-accordion";
  return base.renderWeb(context).replace('class="wf-section wf-faq"',`class="wf-section wf-faq wf-faq--${escapeHtml(variant)}"`);
}};
