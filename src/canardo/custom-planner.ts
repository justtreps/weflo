import { createHash } from "node:crypto";
import type { EditorDocument } from "../editor/document";
import { buildCapabilityReport, type ShopifyCapabilityMetadata } from "../shopify/capability-report";
import type { CanardoCustomProposal } from "./protocol";
import type { CustomSectionSpecV1 } from "./custom-spec";
import { compileCustomWeb, customPreviewDocument } from "./custom-compile-web";
import { compileCustomLiquid } from "./custom-compile-liquid";
import { validateCustomSectionSpec } from "./custom-validate";

export type CustomPlannerContext = { document: EditorDocument; selectedId?: string | null; catalog?: Array<{ type: string; purpose: string; title?: string }>; shopify?: ShopifyCapabilityMetadata };
export type CustomSpecGenerator = (input: { prompt: string; context: CustomPlannerContext; schema: Record<string, unknown> }) => Promise<unknown>;

export const CUSTOM_SECTION_JSON_SCHEMA = { type: "object", additionalProperties: false, required: ["version", "id", "name", "purpose", "nodes", "settings", "blocks", "requiredCapabilities"], properties: { version: { const: 1 }, id: { type: "string" }, name: { type: "string" }, purpose: { type: "string" }, nodes: { type: "array" }, settings: { type: "array" }, blocks: { type: "array" }, requiredCapabilities: { type: "array" } } };

export function customSectionChecksum(spec: CustomSectionSpecV1): string { return createHash("sha256").update(JSON.stringify(spec)).digest("hex"); }

function idFromPrompt(prompt: string): string {
  const normalized = prompt.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `canardo-${(normalized || "section").slice(0, 45)}`.replace(/-+$/g, "");
}

export function fallbackCustomSectionSpec(prompt: string): CustomSectionSpecV1 {
  const wantsImage = /image|photo|visuel|galerie/i.test(prompt);
  const wantsProduct = /produit|panier|acheter|achat|variante|quantit[eé]/i.test(prompt);
  return { version: 1, id: idFromPrompt(prompt), name: "Section sur mesure", purpose: prompt.slice(0, 500), settings: [{ key: "title", label: "Titre", type: "text", scope: "settings" }, { key: "text", label: "Texte", type: "textarea", scope: "settings" }, { key: "cta_label", label: "Bouton", type: "text", scope: "settings" }], blocks: [], requiredCapabilities: wantsProduct ? ["product-form"] : [], nodes: [{ kind: "stack", token: "space-lg", children: [...(wantsImage ? [{ kind: "image", binding: "settings.title", token: "surface" } as const] : []), { kind: "heading", binding: "settings.title", token: "display" }, { kind: "text", binding: "settings.text", token: "body" }, ...(wantsProduct ? [{ kind: "product-form", capability: "product-form" } as const] : [{ kind: "button", binding: "settings.cta_label", token: "accent" } as const])] }] };
}

function nodeCount(nodes: CustomSectionSpecV1["nodes"]): number { return nodes.reduce((count, node) => count + 1 + ("children" in node ? nodeCount(node.children) : 0) + ("template" in node ? nodeCount(node.template) : 0), 0); }

export async function planCustomSection(prompt: string, context: CustomPlannerContext, generate?: CustomSpecGenerator): Promise<CanardoCustomProposal> {
  let raw: unknown = fallbackCustomSectionSpec(prompt);
  if (generate) try { raw = await generate({ prompt, context, schema: CUSTOM_SECTION_JSON_SCHEMA }); } catch { throw new Error("Canardo n’a pas pu préparer cette section. Réessaie dans un instant."); }
  const result = validateCustomSectionSpec(raw);
  if (!result.ok) throw new Error(`proposition non sécurisée: ${result.errors.join(" ")}`);
  const spec = result.value;
  let desktop: string;
  try { desktop = customPreviewDocument({ spec, designProfile: context.document.designProfile }); compileCustomWeb({ spec, designProfile: context.document.designProfile }); compileCustomLiquid({ spec, designProfile: context.document.designProfile }); } catch { throw new Error("proposition non sécurisée"); }
  const capabilities = buildCapabilityReport({ capabilities: spec.requiredCapabilities, shopify: context.shopify });
  return { mode: "custom-section", message: "J’ai préparé une section sur mesure, compilée à partir de primitives sûres.", summary: `Ajouter : ${spec.name}`, spec, checksum: customSectionChecksum(spec), validation: { ok: capabilities.blockers.length === 0, errors: [], nodeCount: nodeCount(spec.nodes), capabilityBlockers: capabilities.blockers }, preview: { desktop, mobile: desktop }, requiresConfirmation: true };
}

export function customSectionNeeded(prompt: string, catalog: Array<{ purpose: string; title?: string }> = []): boolean {
  const words = prompt.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? [];
  const explicit = /sur mesure|custom|spécifique|specifique|unique/i.test(prompt);
  if (explicit) return true;
  if (!/ajout|cr[ée]e|g[ée]n[èe]re|ins[èe]re|construi|nouvelle? section/i.test(prompt)) return false;
  if (!catalog.length) return false;
  return catalog.reduce((best, item) => Math.max(best, words.filter((word) => `${item.purpose} ${item.title ?? ""}`.toLowerCase().includes(word)).length), 0) < 1;
}
