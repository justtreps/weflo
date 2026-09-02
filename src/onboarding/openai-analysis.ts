import OpenAI from "openai";
import { validateOnboardingAnalysis, type OnboardingAiPort } from "./analyser";

export function createOpenAiOnboarding(apiKey: string): OnboardingAiPort {
  const client = new OpenAI({ apiKey });
  return {
    async analyse({ product, language }) {
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are Weflo's ecommerce strategist. Return strict JSON with exactly eight unique brandNames, four personas and four angles. Each persona has id,title,insight,icon,tags,selected. Each angle has id,title,description,icon,tags,selected. Base every proposal on supplied facts and reviews. Do not add product facts, prices, ratings, certifications or claims. Write proposals in the requested storefront language." },
          { role: "user", content: JSON.stringify({ language, product }) },
        ],
      });
      return validateOnboardingAnalysis(JSON.parse(response.choices[0]?.message?.content ?? "{}"), product);
    },
  };
}
