import type { EditorDocument, EditorSection } from "../editor/document";
import { getSectionDefinition } from "../sections/index";
import type { CanardoResponse } from "./protocol";

function uniqueId(document: EditorDocument, type: string): string {
  const ids = new Set(document.pages.flatMap((page) => page.sections.map((section) => section.id)));
  let index = 1;
  while (ids.has(`${type}-${index}`)) index += 1;
  return `${type}-${index}`;
}

function customSection(document: EditorDocument, kind: "accordion" | "calculator"): EditorSection {
  const id = uniqueId(document, "customCode");
  const html = kind === "accordion"
    ? '<div class="accordion"><button type="button" aria-expanded="false">Afficher les détails</button><div hidden>Ajoute ici ton contenu.</div></div>'
    : '<div class="calculator"><label>Quantité <input type="number" min="1" value="1"></label><output>29 €</output></div>';
  const css = `[data-wf-custom-id="${id}"] .${kind === "accordion" ? "accordion" : "calculator"}{padding:24px;border:1px solid #ddd;border-radius:16px}`;
  const js = kind === "accordion"
    ? 'const button=document.querySelector("button");const panel=document.querySelector("[hidden]");button.addEventListener("click",()=>{const open=button.getAttribute("aria-expanded")==="true";button.setAttribute("aria-expanded",String(!open));panel.hidden=open})'
    : 'const input=document.querySelector("input");const output=document.querySelector("output");input.addEventListener("input",()=>{output.textContent=(Math.max(1,Number(input.value))*29)+" €"})';
  return { id, type: "customCode", name: kind === "accordion" ? "Accordéon sur mesure" : "Calculateur sur mesure", hidden: false, locked: false, settings: { html, css, js }, style: {}, responsive: {}, blocks: [] };
}

export function planCanardoLocally(prompt: string, document: EditorDocument, selectedId: string | null): CanardoResponse {
  const page = document.pages.find((item) => item.sections.some((section) => section.id === selectedId)) ?? document.pages[0];
  const lower = prompt.toLowerCase();
  if (/accord[ée]on/.test(lower) || /calculat(?:eur|rice)/.test(lower)) {
    const kind = /accord[ée]on/.test(lower) ? "accordion" : "calculator";
    const section = customSection(document, kind);
    return { message: "J’ai préparé une section interactive isolée.", summary: `Ajouter : ${section.name}`, commands: [{ type: "insertSection", pageId: page.id, index: page.sections.length, section }] };
  }
  const typeAliases: Array<[RegExp, string]> = [[/t[ée]moignage|avis/, "testimonials"], [/faq|question/, "faq"], [/bundle|pack/, "bundle"], [/compar/, "comparison"], [/galerie|photos?/, "gallery"], [/quiz/, "quiz"], [/newsletter|email/, "newsletter"], [/b[ée]n[ée]fice|avantage/, "benefits"], [/produit/, "productMain"], [/appel .? l.action|cta/, "cta"]];
  if (/ajout|cr[ée][ée]|nouvelle section|ins[èe]re/.test(lower)) {
    const type = typeAliases.find(([pattern]) => pattern.test(lower))?.[1] ?? "imageText";
    const definition = getSectionDefinition(type)!;
    const id = uniqueId(document, type);
    const section: EditorSection = { id, type, name: definition.name, hidden: false, locked: false, settings: { ...definition.defaults, title: definition.name }, style: {}, responsive: {}, blocks: [] };
    return { message: `La section ${definition.name} est prête.`, summary: `Ajouter : ${definition.name}`, commands: [{ type: "insertSection", pageId: page.id, index: page.sections.length, section }] };
  }
  if (!selectedId) return { message: "Sélectionne une section ou demande-moi d’en ajouter une.", summary: "Aucune modification", commands: [] };
  const key = /titre|headline/.test(lower) ? "title" : "text";
  const cleaned = prompt.replace(/^(modifie|change|réécris|reecris|remplace)\s+(le\s+)?(titre|texte|headline)?\s*:?-?\s*/i, "").trim();
  return { message: "Modification prête.", summary: `Modifier ${key === "title" ? "le titre" : "le texte"}`, commands: [{ type: "updateSetting", sectionId: selectedId, key, value: cleaned || prompt }] };
}
