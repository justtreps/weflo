import type { CreationFormatId } from "../onboarding/creation-recipe";

export const creationFormats: Array<{ id: CreationFormatId; title: string; description: string; icon: string }> = [
  { id: "store", title: "Boutique complète", description: "Accueil, produit, offre et confiance", icon: "◆" },
  { id: "product", title: "Page produit", description: "Une fiche de vente Shopify complète", icon: "▣" },
  { id: "landing", title: "Landing page", description: "Une campagne, une promesse, une action", icon: "↗" },
  { id: "advertorial", title: "Advertorial", description: "Un récit éditorial qui mène vers l’offre", icon: "¶" },
  { id: "quiz", title: "Quiz et funnel", description: "Questions, recommandation et capture", icon: "?" },
  { id: "home", title: "Page d’accueil", description: "La vitrine complète d’une marque", icon: "⌂" },
  { id: "blog", title: "Article de blog", description: "Contenu de marque structuré et lisible", icon: "≡" },
  { id: "blank", title: "Page vierge", description: "Construire librement dans l’éditeur", icon: "＋" },
];

export function creationActionUrl(action: "generate" | "link" | "image" | "blank", prompt = ""): string {
  if (action === "link") return "/creer?source=link";
  if (action === "image") return "/creer?source=image";
  if (action === "blank") return "/creer?format=blank";
  return prompt ? `/creer?source=description&prompt=${encodeURIComponent(prompt)}` : "/creer";
}

function esc(value: string): string { return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!); }

export function renderCreateWorkspace(input: { workspaceName: string; selectedFormat: CreationFormatId | null; source: string | null; prompt: string }): string {
  const cards = creationFormats.map((format) => `<button class="format-card" data-create-format="${format.id}"><span>${format.icon}</span><strong>${format.title}</strong><small>${format.description}</small></button>`).join("");
  const selected = creationFormats.find((format) => format.id === input.selectedFormat);
  const content = !selected ? `<div class="create-heading"><p>Nouvelle création</p><h1>Qu’est-ce que tu veux construire ?</h1><span>Choisis le format. Weflo adapte ensuite la recherche, le copywriting et les sections.</span></div><div class="format-grid">${cards}</div>` : `<button class="back-format" data-back-format>← Changer de format</button><div class="create-heading"><p>${esc(selected.title)}</p><h1>Donne-nous la matière de départ.</h1><span>Importe un produit ou décris ton idée. Tu valideras l’angle avant la construction.</span></div><div class="source-grid"><button data-create-source="link"><b>↗</b><strong>Importer un lien</strong><small>Amazon, AliExpress, Shopify ou autre site</small></button><label><b>▧</b><strong>Ajouter une image</strong><small>PNG, JPG ou WebP</small><input type="file" accept="image/png,image/jpeg,image/webp" data-create-image hidden></label><button data-create-source="description"><b>Aa</b><strong>Décrire mon idée</strong><small>Canardo prépare la structure</small></button><button data-create-source="shopify"><b>S</b><strong>Depuis Shopify</strong><small>Choisir dans le catalogue connecté</small></button></div><form class="source-form" data-source-form><textarea placeholder="${input.source === "link" ? "Colle le lien de ton produit…" : "Décris le produit, l’offre ou la page…"}">${esc(input.prompt)}</textarea><button>Analyser et continuer</button></form>`;
  return `<div class="create-shell"><aside><a href="/dashboard" class="create-logo">weflo<span>.</span></a><a href="/dashboard">← Retour à l’espace</a><ol><li class="active">1 <span>Format</span></li><li>2 <span>Produit</span></li><li>3 <span>Stratégie</span></li><li>4 <span>Construction</span></li></ol><small>${esc(input.workspaceName)}</small></aside><main>${content}</main></div>`;
}
