import { registerSection } from "./registry";
import { benefitsSection } from "./benefits";
import { stepsSection } from "./steps";
import { statsSection } from "./stats";
import { testimonialsSection } from "./testimonials";
import { reviewsSection } from "./reviews";
import { pressSection } from "./press";
import { guaranteesSection } from "./guarantees";
import { shippingSection } from "./shipping";
import { faqSection } from "./faq";
import { newsletterSection } from "./newsletter";
import { formSection } from "./form";
import { quizSection } from "./quiz";
import { ctaSection } from "./cta";
import { richTextSection } from "./rich-text";
import { footerSection } from "./footer";

export const conversionSections = [benefitsSection, stepsSection, statsSection, testimonialsSection, reviewsSection, pressSection, guaranteesSection, shippingSection, faqSection, newsletterSection, formSection, quizSection, ctaSection, richTextSection, footerSection];
for (const definition of conversionSections) registerSection(definition);
