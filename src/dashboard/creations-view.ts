import type { DashboardHomeModel, DashboardProject } from "./home-model";
import { shopifyLogo } from "./brand-icons";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

function card(project: DashboardProject): string {
  const id = escapeHtml(project.id);
  const name = escapeHtml(project.name);
  const cover = project.previewImage
    ? `<img src="${escapeHtml(project.previewImage)}" alt="Aperçu de ${name}" loading="lazy">`
    : `<div class="creation-cover--fallback"><small>${escapeHtml(project.typeLabel)}</small><strong>${name}</strong><span>weflo.</span></div>`;
  return `<article class="creation-card" data-project-id="${id}">
    <button class="creation-cover" data-command="preview" aria-label="Prévisualiser ${name}">${cover}<span class="cover-action">Voir l’aperçu</span></button>
    <div class="creation-meta"><div><span class="creation-status ${project.statusTone}">${escapeHtml(project.statusLabel)}</span><h2>${name}</h2><p>${escapeHtml(project.typeLabel)} · ${escapeHtml(project.updatedLabel)}</p></div>
      <details><summary aria-label="Actions pour ${name}">•••</summary><div class="creation-menu"><button data-command="preview">Aperçu</button><button data-command="edit">Modifier</button><button data-command="duplicate">Dupliquer</button><button data-command="rename">Renommer</button><button data-command="copy">Copier le lien</button><button class="danger" data-command="delete">Supprimer</button></div></details>
    </div></article>`;
}

export function renderCreationsView(model: DashboardHomeModel): string {
  return `<div class="workspace-shell">
    <aside class="workspace-sidebar"><a class="wordmark" href="/dashboard">weflo<span>.</span></a><nav>
      <a href="/dashboard">⌂ <span>Accueil</span></a><a class="is-active" href="/creations">▣ <span>Mes créations</span><b>${model.totalProjects}</b></a><a href="/studio">✦ <span>Studio images</span></a><a href="/boutique"><span class="nav-shopify">${shopifyLogo()}</span><span>Ma boutique</span></a><a href="/facturation">◈ <span>Abonnement</span></a>
    </nav><div class="sidebar-foot"><a href="/parrainage">♧ <span>Parrainage</span></a><a href="/facturation">⚙ <span>Réglages</span></a><p><strong>${escapeHtml(model.workspace.name)}</strong><small>Ton espace</small></p></div></aside>
    <main class="creations-main"><header><div><p class="eyebrow">BIBLIOTHÈQUE</p><h1>Mes créations</h1><p>Retrouve, prévisualise et publie toutes tes pages.</p></div><a class="primary-cta" href="/start">＋ Nouvelle création</a></header>
      <section class="library-tools"><label><span>⌕</span><input type="search" placeholder="Rechercher une création…" data-creation-search></label><div><button class="is-active" data-filter="all">Toutes</button><button data-filter="sell">Pages produit</button><button data-filter="write">Éditorial</button><button data-filter="blank">Sur mesure</button></div></section>
      <section class="creation-grid" data-creation-grid>${model.projects.length ? model.projects.map(card).join("") : `<a class="creation-empty" href="/start"><span>＋</span><strong>Crée ta première boutique</strong><small>Importe un produit ou pars d’une page vierge.</small></a>`}</section>
    </main></div>`;
}
