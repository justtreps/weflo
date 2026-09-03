import type { EditorDocument, EditorSection } from "../editor/document";
import { getSectionDefinition } from "../sections/index";
import { querySectionCatalog, type SectionCatalogItem } from "../section-preview/manifests";
import { materializeSectionVariant } from "../section-preview/materialize";
import type { CanardoResponse } from "./protocol";

function uniqueId(document: EditorDocument, type: string): string {
  const ids = new Set(document.pages.flatMap((page) => page.sections.map((section) => section.id)));
  let index = 1;
  while (ids.has(`${type}-${index}`)) index += 1;
  return `${type}-${index}`;
}

type CatalogIntent = { family?: string; search?: string; quantity?: number };

function catalogIntent(prompt:string):CatalogIntent[] {
  const lower=prompt.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const intents:CatalogIntent[]=[];
  if (/bundle|pack|lot|multipack/.test(lower)) intents.push({family:"bundles-offers",search:"bundle"});
  if (/quantite|palier|duo|trio/.test(lower)) intents.push({family:"bundles-offers",search:"quantité"});
  if (/avis|temoignage|ugc|review/.test(lower)) intents.push({family:"reviews-ugc",search:"avis"});
  if (/faq|question|objection/.test(lower)) intents.push({family:"faq-trust",search:"faq"});
  if (/compar/.test(lower)) intents.push({family:"comparison",search:"comparaison"});
  if (/avant.*apres|resultat/.test(lower)) intents.push({family:"before-after"});
  if (/galerie|video|demonstration|photo/.test(lower)) intents.push({family:"demo-media"});
  if (/benefice|avantage|caracteristique/.test(lower)) intents.push({family:"benefits"});
  if (/produit|buy.?box|achat/.test(lower)) intents.push({family:"product-purchase"});
  return intents;
}

function chooseCatalogVariant(intent:CatalogIntent):SectionCatalogItem|undefined {
  const byFamily=querySectionCatalog({family:intent.family as never,search:intent.search});
  return byFamily[0] ?? querySectionCatalog({family:intent.family as never})[0];
}

/**
 * Composes only registered packs, then materializes them against the current
 * document. Preview fixtures never cross this boundary.
 */
export function proposeCatalogComposition(prompt:string, context:EditorDocument | {document:EditorDocument; selectedId?:string|null}, selectedId:string|null = null):CanardoResponse {
  const document="pages" in context ? context : context.document;
  const selection="pages" in context ? selectedId : context.selectedId ?? selectedId;
  const page=document.pages.find((item)=>item.sections.some((section)=>section.id===selection)) ?? document.pages[0];
  const intents=catalogIntent(prompt);
  const seen=new Set<string>();
  const reserved=new Set(document.pages.flatMap((candidate)=>candidate.sections.map((section)=>section.id)));
  const commands:CanardoResponse["commands"]=[];
  let index=Math.max(0,page.sections.findIndex((section)=>section.id===selection)+1);
  if (index === 0 && selection) index=page.sections.length;
  for (const intent of intents) {
    const variant=chooseCatalogVariant(intent);
    if (!variant || seen.has(`${variant.sectionType}:${variant.variantId}`)) continue;
    seen.add(`${variant.sectionType}:${variant.variantId}`);
    let ordinal=1, sectionId=`${variant.sectionType}-${ordinal}`;
    while (reserved.has(sectionId)) sectionId=`${variant.sectionType}-${++ordinal}`;
    reserved.add(sectionId);
    const section=materializeSectionVariant({document,sectionType:variant.sectionType,variantId:variant.variantId,sectionId}).section;
    commands.push({type:"insertSection",pageId:page.id,index:index++,section});
  }
  if (!commands.length) return {message:"Je n’ai pas trouvé de composition enregistrée pour cette demande.",summary:"Aucune section ajoutée",commands:[],operations:[],requiresConfirmation:true};
  const names=commands.map((command)=>command.type === "insertSection" ? command.section.name : "section");
  return {message:"J’ai préparé une composition à partir du catalogue premium. Vérifie les prérequis Shopify avant de confirmer.",summary:`Ajouter : ${names.join(" · ")}`,commands,operations:commands,requiresConfirmation:true};
}

export function planCanardoLocally(prompt: string, document: EditorDocument, selectedId: string | null): CanardoResponse {
  const page = document.pages.find((item) => item.sections.some((section) => section.id === selectedId)) ?? document.pages[0];
  const lower = prompt.toLowerCase();
  if (/ajout|cr[ée][ée]|nouvelle section|ins[èe]re/.test(lower)) {
    const composition=proposeCatalogComposition(prompt,document,selectedId);
    if (composition.commands.length) return composition;
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
