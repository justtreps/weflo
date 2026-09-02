export type CustomCodeInput = { html: string; css: string; js: string; allowedDomains: string[]; namespace: string };
export type CustomCodeValidation = { ok: boolean; errors: string[] };

export function scopeCustomCss(css: string, namespace: string): string {
  const root = `[data-wf-custom-id="${namespace.replace(/[^a-z0-9_-]/gi, "")}"]`;
  return css.replace(/(^|})(\s*)([^@}{][^{]*){/g, (_match, close, space, selectors: string) => {
    const scoped = selectors.split(",").map((selector) => `${root} ${selector.trim()}`).join(",");
    return `${close}${space}${scoped}{`;
  });
}

export function validateCustomCode(input: CustomCodeInput): CustomCodeValidation {
  const errors: string[] = [];
  if (/<\/?(?:script|iframe|object|embed|base)\b|\son[a-z]+\s*=/i.test(input.html)) errors.push("HTML interdit : scripts, cadres et gestionnaires inline ne sont pas autorisés.");
  if (/{%\s*(?:render|include|section|liquid)\b/i.test(input.html)) errors.push("Balise Liquid non autorisée.");
  if (/(?:document\.cookie|localStorage|sessionStorage|indexedDB|window\.top|window\.parent|parent\.|opener\.|fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|eval\s*\(|new\s+Function)/i.test(input.js)) errors.push("JavaScript non autorisé : accès réseau, identifiants ou contexte parent.");
  if (/@import|url\s*\(\s*["']?https?:\/\//i.test(input.css)) errors.push("Les imports CSS distants sont interdits.");
  const root = `[data-wf-custom-id="${input.namespace.replace(/[^a-z0-9_-]/gi, "")}"]`;
  const selectors = [...input.css.matchAll(/(^|})(\s*)([^@}{][^{]*){/g)].map((match) => match[3].trim());
  if (selectors.some((group) => group.split(",").some((selector) => !selector.trim().startsWith(root)))) errors.push("Chaque sélecteur CSS doit être limité à la section.");
  return { ok: errors.length === 0, errors };
}
