import type { CompiledThemeFile } from "./compiler";

export type ThemeValidationResult = {
  ok: boolean;
  errors: string[];
};

type ShopifyTemplate = {
  sections?: Record<string, { type?: unknown }>;
  order?: unknown;
};

const SECTION_KEY = /^sections\/weflo-[a-z0-9-]+\.liquid$/;
const ASSET_KEY = /^assets\/weflo(?:-[a-z0-9-]+)?\.(?:css|js)$/;
const TEMPLATE_KEY = /^templates\/[a-z0-9-]+\.weflo-[a-z0-9-]+\.json$/;

function parseSchema(value: string): unknown {
  const match = value.match(/{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/i);
  if (!match) throw new Error("schema absent");
  return JSON.parse(match[1]);
}

export function validateThemeOutput(files: CompiledThemeFile[]): ThemeValidationResult {
  const errors: string[] = [];
  const keys = new Set<string>();
  const templates: Array<{ key: string; value: ShopifyTemplate }> = [];

  if (files.length === 0) errors.push("L’export Shopify ne contient aucun fichier.");

  for (const file of files) {
    if (keys.has(file.key)) errors.push(`Le fichier ${file.key} apparaît en doublon.`);
    keys.add(file.key);

    if (file.key.startsWith("sections/") && !SECTION_KEY.test(file.key)) {
      errors.push(`La section ${file.key} n’est pas dans l’espace de noms Weflo.`);
    }
    if (file.key.startsWith("assets/") && !ASSET_KEY.test(file.key)) {
      errors.push(`La ressource ${file.key} n’est pas dans l’espace de noms Weflo.`);
    }
    if (file.key.startsWith("templates/") && !TEMPLATE_KEY.test(file.key)) {
      errors.push(`Le modèle ${file.key} n’est pas un modèle Weflo isolé.`);
    }

    if (file.key.endsWith(".liquid")) {
      try {
        const schema = parseSchema(file.value) as { presets?: unknown };
        if (!Array.isArray(schema?.presets) || schema.presets.length === 0) {
          errors.push(`La section ${file.key} doit déclarer au moins un preset Shopify.`);
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : "schema invalide";
        errors.push(`Le schema JSON de ${file.key} est invalide (${detail}).`);
      }
    }

    if (file.key.endsWith(".json")) {
      try {
        const value = JSON.parse(file.value) as ShopifyTemplate;
        templates.push({ key: file.key, value });
        const sectionIds = Object.keys(value.sections ?? {});
        if (sectionIds.length === 0) errors.push(`Le modèle ${file.key} ne contient aucune section.`);
        if (!Array.isArray(value.order) || value.order.length === 0) errors.push(`L’ordre du modèle ${file.key} est vide.`);
        else for (const entry of value.order) if (typeof entry !== "string" || !sectionIds.includes(entry)) errors.push(`L’entrée ${String(entry)} de l’ordre du modèle ${file.key} est introuvable.`);
      } catch {
        errors.push(`Le JSON du modèle ${file.key} est invalide.`);
      }
    }
  }

  for (const template of templates) {
    for (const section of Object.values(template.value.sections ?? {})) {
      if (typeof section?.type !== "string" || !section.type.startsWith("weflo-")) continue;
      const expectedKey = `sections/${section.type}.liquid`;
      if (!keys.has(expectedKey)) errors.push(`La section ${expectedKey}, référencée par ${template.key}, est introuvable.`);
    }
  }

  return { ok: errors.length === 0, errors };
}
