import type { EditorDocument, EditorSection } from "../editor/document";
import { renderEditorDocument } from "../editor/render/render-document";
import { getSectionDefinition } from "../sections/index";
import { fixtureById } from "./fixtures";
import { sectionFromFixture } from "./materialize";
import type { PreviewViewport } from "./types";

export type PreviewDocumentInput = { sectionType:string; variantId:string; fixtureId:string; context:boolean };

function contextSection(type:string,id:string,name:string,settings:Record<string,string|number|boolean|null>):EditorSection {
  const definition = getSectionDefinition(type);
  if (!definition) throw new Error(`Unknown context section: ${type}`);
  return {id,type,name,hidden:false,locked:false,settings:{...definition.defaults,...settings,previewOnly:true},style:{},responsive:{},blocks:[]};
}

export function previewDocument(input:PreviewDocumentInput):EditorDocument {
  const fixture=fixtureById(input.fixtureId);
  const focus=sectionFromFixture(input.sectionType,input.variantId,input.fixtureId,"preview-focus");
  const sections=input.context ? [
    contextSection("navigation","preview-nav","Navigation",{brand:fixture.brand.name,cta_label:"Panier · 0"}),
    focus,
    contextSection("cta","preview-cta","Appel à l’action",{title:"Prêt à découvrir ?",text:fixture.product.description,cta_label:"Découvrir"}),
  ] : [focus];
  return {
    version:2,name:`Aperçu ${fixture.brand.name}`,path:"/preview",kind:"product",modelId:"section-preview",theme:fixture.theme,
    pages:[{id:"preview-page",name:fixture.brand.name,slug:"preview",sections}],
    assets:fixture.product.images.map((url,index)=>({id:`preview-asset-${index+1}`,type:"image",url,alt:fixture.product.title})),
    commerce:{sourceProduct:fixture.product,personas:[],angles:[],brandKit:fixture.brand,storefrontLanguage:"fr"},
  };
}

function escapeAttribute(value:string):string { return value.replace(/[&"<>]/g,(char)=>({"&":"&amp;",'"':"&quot;","<":"&lt;",">":"&gt;"})[char]!); }

export function renderSectionPreview(input:PreviewDocumentInput & {viewport:PreviewViewport}):string {
  const html=renderEditorDocument(previewDocument(input),{mode:"preview",breakpoint:input.viewport});
  return html.replace("<body ",`<body data-section-preview="true" data-preview-fixture="${escapeAttribute(input.fixtureId)}" `);
}
