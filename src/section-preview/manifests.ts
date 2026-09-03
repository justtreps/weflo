import { fixtureById, SECTION_PREVIEW_FIXTURES } from "./fixtures";
import type { PreviewArchetype, SectionCapabilityState, SectionCatalogFamily, SectionCatalogQuery } from "./types";
import { listSectionDefinitions } from "../sections/index";

export type SectionPreviewCategory = "hero" | "product" | "benefits" | "proof" | "offer" | "faq";
export type SectionPreviewManifest = {
  sectionType: string; variantId: string; title: string; conversionGoal: string; category: SectionPreviewCategory;
  family?: SectionCatalogFamily; capabilities?: string[]; capabilityStates?: Record<string, SectionCapabilityState>;
  requiredData?: string[]; tags?: string[]; recommended?: number; newest?: number; popular?: number;
  supportedPages?: string[]; supportedMarkets?: string[];
  supportedArchetypes: PreviewArchetype[]; defaultFixtureId: string; compatibleFixtureIds: string[];
  preview: { desktop: string; mobile: string }; previewVersion: number;
};
export type SectionCatalogItem = SectionPreviewManifest & { capabilityBadges: Array<{ capability: string; label: string; state: SectionCapabilityState }> };

const item = (sectionType:string, variantId:string, title:string, conversionGoal:string, category:SectionPreviewCategory, supportedArchetypes:PreviewArchetype[], defaultFixtureId:string, compatibleFixtureIds:string[], extra:Partial<SectionPreviewManifest> = {}):SectionPreviewManifest => {
  const base = `/assets/section-previews/${sectionType}/${variantId}-${defaultFixtureId}`;
  return { sectionType, variantId, title, conversionGoal, category, supportedArchetypes, defaultFixtureId, compatibleFixtureIds, preview:{desktop:`${base}-desktop.webp`,mobile:`${base}-mobile.webp`}, previewVersion:1, ...extra };
};
const ALL_ARCHETYPES: PreviewArchetype[] = ["beauty", "home", "gadget", "fashion", "sport", "wellness", "food", "design"];

export const SECTION_PREVIEW_MANIFESTS: SectionPreviewManifest[] = [
  item("productHero","beauty-editorial","Éditorial beauté","Créer le désir dès le premier écran","hero",["beauty","wellness"],"aurea-serum",["aurea-serum","pulse-recovery"],{family:"heroes",capabilities:["product-form"],requiredData:["Produit Shopify"],recommended:100,popular:95}),
  item("productHero","object-editorial","Objet signature","Présenter le produit comme une pièce désirable","hero",["home","design","fashion"],"halo-lamp",["halo-lamp","noma-bag","forma-table"],{family:"heroes",capabilities:["product-form"],requiredData:["Produit Shopify"],recommended:96,popular:86}),
  item("productMain","conversion-split","Buy box conversion","Réduire les hésitations au moment d’acheter","product",ALL_ARCHETYPES,"halo-lamp",["aurea-serum","halo-lamp","noma-bag","pulse-recovery","brume-coffee","forma-table"],{family:"product-purchase",capabilities:["product-form","variant-selection"],requiredData:["Produit Shopify", "Variantes"],recommended:98,popular:100}),
  item("productMain","bundle-led","Produit + offre groupée","Faire choisir une offre avant l’ajout au panier","product",["beauty","wellness","food"],"aurea-serum",["aurea-serum","pulse-recovery","brume-coffee"],{family:"product-purchase",capabilities:["product-form","fixed-bundle"],capabilityStates:{"fixed-bundle":"app-required"},requiredData:["Produit Shopify", "Bundle fixe"],recommended:94,popular:91}),
  item("benefits","ritual-cards","Cartes rituel","Projeter le produit dans une routine","benefits",["beauty","wellness","food"],"aurea-serum",["aurea-serum","pulse-recovery","brume-coffee"],{family:"benefits",recommended:83,popular:82}),
  item("benefits","technical-grid","Grille technique","Expliquer clairement les bénéfices fonctionnels","benefits",["home","gadget","sport","design"],"halo-lamp",["halo-lamp","pulse-recovery","forma-table"],{family:"benefits",recommended:79,popular:76}),
  item("testimonials","editorial-stories","Histoires éditoriales","Donner une preuve humaine et premium","proof",["beauty","fashion","food","design"],"noma-bag",["aurea-serum","noma-bag","brume-coffee","forma-table"],{family:"reviews-ugc",requiredData:["Avis clients"],recommended:90,popular:88}),
  item("testimonials","ugc-grid","Galerie clients","Accumuler des preuves visuelles crédibles","proof",["beauty","home","gadget","sport"],"halo-lamp",["aurea-serum","halo-lamp","pulse-recovery"],{family:"reviews-ugc",requiredData:["Avis clients", "Photos UGC"],recommended:89,popular:93}),
  item("bundle","routine-set","Routine complète","Augmenter le panier par complémentarité","offer",["beauty","wellness","food"],"aurea-serum",["aurea-serum","pulse-recovery","brume-coffee"],{family:"bundles-offers",capabilities:["fixed-bundle"],capabilityStates:{"fixed-bundle":"app-required"},requiredData:["Produit Shopify", "Bundle fixe"],recommended:97,popular:89}),
  item("bundle","quantity-break","Prix par quantité","Augmenter le volume avec une économie claire","offer",["beauty","home","gadget","sport","wellness","food"],"pulse-recovery",["aurea-serum","halo-lamp","pulse-recovery","brume-coffee"],{family:"bundles-offers",capabilities:["quantity-breaks"],requiredData:["Produit Shopify", "Paliers de quantité"],recommended:95,popular:96}),
  item("faq","editorial-accordion","FAQ éditoriale","Lever les objections sans alourdir la page","faq",["beauty","fashion","food","design"],"brume-coffee",["aurea-serum","noma-bag","brume-coffee","forma-table"],{family:"faq-trust",requiredData:["Questions fréquentes"],recommended:81,popular:85}),
  item("faq","support-columns","Centre d’aide","Rendre les réponses immédiatement scannables","faq",["home","gadget","sport","wellness"],"halo-lamp",["halo-lamp","pulse-recovery"],{family:"faq-trust",requiredData:["Questions fréquentes"],recommended:77,popular:72}),
];

const legacyFamily: Record<string, SectionCatalogFamily> = {hero:"heroes",product:"product-purchase",benefits:"benefits",proof:"reviews-ugc",offer:"bundles-offers",faq:"faq-trust"};
const definitionFamily: Record<string, SectionCatalogFamily> = {navigation:"headers-navigation",announcement:"headers-navigation",footer:"footer-utilities",spacer:"footer-utilities",divider:"footer-utilities",hero:"heroes",productHero:"heroes",videoHero:"heroes",productMain:"product-purchase",productGrid:"collections-recommendations",collectionGrid:"collections-recommendations",bundle:"bundles-offers",comparison:"comparison",ingredients:"ingredients-materials",gallery:"demo-media",beforeAfter:"before-after",imageText:"benefits",benefits:"benefits",testimonials:"reviews-ugc",reviews:"reviews-ugc",faq:"faq-trust",guarantees:"faq-trust",shipping:"faq-trust",quiz:"quiz-forms",form:"quiz-forms",newsletter:"conversion-capture",cta:"conversion-capture",richText:"brand-story",customCode:"custom"};
function normalize(value:string):string { return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function labelCapability(capability:string):string { const labels:Record<string,string>={"product-form":"Formulaire produit","variant-selection":"Variantes Shopify","quantity-breaks":"Paliers de quantité","collection-binding":"Collection Shopify","recommendations":"Recommandations","fixed-bundle":"Bundle fixe","custom-bundle":"Bundle personnalisable","selling-plan":"Abonnement","preorder":"Précommande","cart-drawer":"Panier latéral","app-blocks":"Bloc d’application","markets":"Marchés Shopify","localization":"Localisation"}; return labels[capability] ?? capability.replace(/-/g," "); }
function capabilityState(capability:string, states:unknown):SectionCapabilityState { if (states && typeof states === "object" && !Array.isArray(states)) { const value=(states as Record<string,unknown>)[capability]; if (value === "native" || value === "app-required" || value === "unavailable") return value; } return ["custom-bundle","selling-plan","preorder","app-blocks"].includes(capability) ? "app-required" : "native"; }
function familyFrom(value:unknown, fallback:SectionCatalogFamily):SectionCatalogFamily { const raw=Array.isArray(value) && typeof value[0] === "string" ? value[0] : typeof value === "string" ? value : ""; const aliases:Record<string,SectionCatalogFamily>={"product-hero":"heroes","buy-box":"product-purchase","variant-selector":"variants-options","quantity-offer":"bundles-offers","fixed-bundle":"bundles-offers","benefits-results":"benefits","product-media":"demo-media","reviews-ugc-premium":"reviews-ugc",recommendations:"collections-recommendations"}; return aliases[raw] ?? (raw ? raw as SectionCatalogFamily : fallback); }

function dynamicManifests():SectionPreviewManifest[] {
  const existing=new Set(SECTION_PREVIEW_MANIFESTS.map((manifest)=>`${manifest.sectionType}:${manifest.variantId}`));
  const values:SectionPreviewManifest[]=[];
  for (const definition of listSectionDefinitions() as unknown as Array<Record<string,unknown>>) {
    const type=typeof definition.type === "string" ? definition.type : "";
    if (!type) continue;
    const variants=Array.isArray(definition.variants) && definition.variants.length ? definition.variants : Array.isArray(definition.previewVariants) && definition.previewVariants.length ? definition.previewVariants : ["default"];
    for (const rawVariant of variants) {
      const variant:Record<string,unknown>|null=typeof rawVariant === "string" ? {id:rawVariant} : rawVariant && typeof rawVariant === "object" ? rawVariant as Record<string,unknown> : null;
      const variantId=variant && typeof variant.id === "string" ? variant.id : "default";
      if (existing.has(`${type}:${variantId}`)) continue;
      const fixtureId=variant && typeof variant.previewFixtureId === "string" && SECTION_PREVIEW_FIXTURES.some((fixture)=>fixture.id===variant.previewFixtureId) ? variant.previewFixtureId : "aurea-serum";
      const fallbackPreview=fixtureById(fixtureId).product.images[0];
      const title=variant && typeof variant.name === "string" ? variant.name : typeof definition.name === "string" ? definition.name : type;
      const description=variant && typeof variant.description === "string" ? variant.description : `Ajouter ${title.toLocaleLowerCase("fr-FR")}`;
      const capabilities=Array.isArray(definition.capabilities) ? definition.capabilities.filter((value):value is string=>typeof value === "string") : [];
      values.push({sectionType:type,variantId,title,conversionGoal:description,category:"product",family:familyFrom(definition.families ?? definition.family,definitionFamily[type] ?? "custom"),capabilities,capabilityStates:definition.capabilityStates as Record<string,SectionCapabilityState>|undefined,requiredData:Array.isArray(variant?.requiredData)?variant.requiredData.filter((value):value is string=>typeof value==="string"):[],tags:Array.isArray(definition.tags)?definition.tags.filter((value):value is string=>typeof value==="string"):[],recommended:typeof variant?.recommended === "number" ? variant.recommended : 0,newest:typeof variant?.newest === "number" ? variant.newest : 0,popular:typeof variant?.popular === "number" ? variant.popular : 0,supportedPages:Array.isArray(definition.supportedPages)?definition.supportedPages.filter((value):value is string=>typeof value==="string"):undefined,supportedMarkets:Array.isArray(definition.supportedMarkets)?definition.supportedMarkets.filter((value):value is string=>typeof value==="string"):undefined,supportedArchetypes:ALL_ARCHETYPES,defaultFixtureId:fixtureId,compatibleFixtureIds:[fixtureId],preview:{desktop:fallbackPreview,mobile:fallbackPreview},previewVersion:1});
    }
  }
  return values;
}

export function querySectionCatalog(query:SectionCatalogQuery = {}):SectionCatalogItem[] {
  const family=query.family ?? (query.category ? legacyFamily[query.category] : undefined), needle=normalize(query.search ?? "");
  const results=[...SECTION_PREVIEW_MANIFESTS,...dynamicManifests()].filter((manifest)=>{
    if (family && manifest.family !== family) return false;
    if (query.pageKind && manifest.supportedPages?.length && !manifest.supportedPages.includes(query.pageKind)) return false;
    if (query.market && manifest.supportedMarkets?.length && !manifest.supportedMarkets.includes("all") && !manifest.supportedMarkets.includes(query.market)) return false;
    if (query.capability && !(manifest.capabilities ?? []).includes(query.capability)) return false;
    return !needle || normalize([manifest.title,manifest.conversionGoal,manifest.sectionType,manifest.variantId,manifest.family ?? "",...(manifest.capabilities ?? []),...(manifest.tags ?? [])].join(" ")).includes(needle);
  }).map((manifest)=>({...manifest,capabilityBadges:(manifest.capabilities ?? []).map((capability)=>({capability,label:labelCapability(capability),state:capabilityState(capability,manifest.capabilityStates)}))}));
  const sort=query.sort ?? "recommended", rank=(value:SectionCatalogItem)=>sort === "newest" ? value.newest ?? 0 : sort === "popular" ? value.popular ?? 0 : value.recommended ?? 0;
  return results.sort((a,b)=>rank(b)-rank(a)||a.title.localeCompare(b.title,"fr"));
}
export function catalogItemForVariant(sectionType:string, variantId:string):SectionCatalogItem | undefined { return querySectionCatalog().find((item)=>item.sectionType===sectionType&&item.variantId===variantId); }

const keys = new Set<string>();
for (const manifest of SECTION_PREVIEW_MANIFESTS) { const key = `${manifest.sectionType}:${manifest.variantId}`; if (keys.has(key)) throw new Error(`Duplicate section preview manifest: ${key}`); keys.add(key); fixtureById(manifest.defaultFixtureId); for (const id of manifest.compatibleFixtureIds) fixtureById(id); if (!manifest.compatibleFixtureIds.includes(manifest.defaultFixtureId)) throw new Error(`Default fixture is incompatible: ${key}`); }
export function previewManifest(sectionType:string, variantId:string):SectionPreviewManifest { const found=SECTION_PREVIEW_MANIFESTS.find((item)=>item.sectionType===sectionType&&item.variantId===variantId); if (found) return found; const catalog=catalogItemForVariant(sectionType,variantId); if (catalog) return catalog; const fixture="aurea-serum",base=`/assets/section-previews/${sectionType}/${variantId}-${fixture}`; return {sectionType,variantId,title:sectionType,conversionGoal:"Aperçu de section",category:"product",family:definitionFamily[sectionType] ?? "custom",supportedArchetypes:ALL_ARCHETYPES,defaultFixtureId:fixture,compatibleFixtureIds:[fixture],preview:{desktop:`${base}-desktop.webp`,mobile:`${base}-mobile.webp`},previewVersion:1}; }
export function previewManifestsForCategory(category?:string):SectionPreviewManifest[] { return querySectionCatalog(category ? {category} : {}).map(({capabilityBadges,...manifest})=>manifest); }
