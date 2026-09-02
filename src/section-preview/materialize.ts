import type { EditorBlock, EditorDocument, EditorSection, SettingValue } from "../editor/document";
import { getSectionDefinition } from "../sections/index";
import { fixtureById, SECTION_PREVIEW_FIXTURES } from "./fixtures";
import { previewManifest } from "./manifests";
import type { MaterializeInput, MaterializeResult, SectionPreviewFixture } from "./types";

function requiredDefinition(type:string) {
  const definition = getSectionDefinition(type);
  if (!definition) throw new Error(`Unknown section definition: ${type}`);
  return definition;
}

function block(id:string, type:string, settings:Record<string,SettingValue>):EditorBlock { return {id,type,settings}; }

function fixtureBlocks(type:string, fixture:SectionPreviewFixture, id:string):EditorBlock[] {
  if (type === "testimonials") return fixture.previewOnly.reviews.map((review,index)=>block(`${id}-review-${index+1}`,"testimonial",{...review,image:fixture.product.images[index%fixture.product.images.length]}));
  if (type === "benefits") return fixture.previewOnly.benefits.map((benefit,index)=>block(`${id}-benefit-${index+1}`,"benefit",benefit));
  if (type === "faq") return fixture.previewOnly.faqs.map((faq,index)=>block(`${id}-faq-${index+1}`,"item",{title:faq.question,text:faq.answer}));
  if (type === "bundle" || type === "productMain") return fixture.previewOnly.bundles.map((offer,index)=>block(`${id}-offer-${index+1}`,"offer",offer));
  return fixture.product.images.map((image,index)=>block(`${id}-media-${index+1}`,"media",{image,title:`Vue ${index+1}`}));
}

function previewSettings(type:string, fixture:SectionPreviewFixture, variantId:string):Record<string,SettingValue> {
  const settings:Record<string,SettingValue> = {
    ...requiredDefinition(type).defaults, variant:variantId, previewFixtureId:fixture.id, previewOnly:true,
    title:fixture.product.title, heading:fixture.product.title, text:fixture.product.description, body:fixture.product.description,
    subtitle:`La sélection ${fixture.brand.name}`, price:fixture.product.price ?? 0, compare_price:fixture.product.compareAtPrice ?? 0,
    image:fixture.product.images[0], image_alt:fixture.product.title, cta_label:"Ajouter au panier", rating:fixture.product.rating ?? 5, review_count:fixture.product.reviewCount ?? 0,
  };
  return settings;
}

function makeSection(id:string,type:string,settings:Record<string,SettingValue>,blocks:EditorBlock[]):EditorSection {
  const definition = requiredDefinition(type);
  return { id, type, name:definition.name, hidden:false, locked:false, settings, style:{}, responsive:{}, blocks };
}

export function sectionFromFixture(type:string,variantId:string,fixtureId:string,sectionId:string):EditorSection {
  const manifest = previewManifest(type,variantId);
  if (!manifest.compatibleFixtureIds.includes(fixtureId)) throw new Error(`Fixture ${fixtureId} is incompatible with ${type}:${variantId}`);
  const fixture = fixtureById(fixtureId);
  return makeSection(sectionId,type,previewSettings(type,fixture,variantId),fixtureBlocks(type,fixture,sectionId));
}

function customerBlocks(type:string,document:EditorDocument,id:string,missing:string[]):EditorBlock[] {
  const product = document.commerce?.sourceProduct;
  if (type === "testimonials") {
    if (!product?.reviews.length) { missing.push("reviews"); return []; }
    return product.reviews.map((review,index)=>block(`${id}-review-${index+1}`,"testimonial",{author:review.author,title:review.title,text:review.text,rating:review.rating ?? 5,...(review.image?{image:review.image}:{})}));
  }
  return [];
}

function assertCustomerSafe(value:unknown):void {
  const serialized = JSON.stringify(value);
  const names = SECTION_PREVIEW_FIXTURES.flatMap((fixture)=>[fixture.id,fixture.brand.name]);
  if (/previewFixtureId|previewOnly/.test(serialized) || names.some((name)=>serialized.includes(name))) throw new Error("Preview-only data cannot be inserted into a customer document");
}

export function materializeSectionVariant(input:MaterializeInput):MaterializeResult {
  previewManifest(input.sectionType,input.variantId);
  const definition = requiredDefinition(input.sectionType);
  const product = input.document.commerce?.sourceProduct;
  const settings:Record<string,SettingValue> = {...definition.defaults,variant:input.variantId};
  const missingFields:string[] = [];
  if (product?.title) { settings.title=product.title; settings.heading=product.title; } else missingFields.push("product.title");
  if (product?.description) { settings.text=product.description; settings.body=product.description; } else missingFields.push("product.description");
  if (product?.images[0]) { settings.image=product.images[0]; settings.image_alt=product.title; } else missingFields.push("product.image");
  if (product?.price !== null && product?.price !== undefined) settings.price=product.price; else missingFields.push("product.price");
  const section = makeSection(input.sectionId,input.sectionType,settings,customerBlocks(input.sectionType,input.document,input.sectionId,missingFields));
  assertCustomerSafe(section);
  return {section,missingFields};
}
