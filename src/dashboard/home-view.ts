import type { DashboardHomeModel, DashboardProject } from "./home-model";
import { shopifyLogo } from "./brand-icons";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

function projectCard(project: DashboardProject): string {
  const name = escapeHtml(project.name);
  const preview = project.previewImage
    ? `<img src="${escapeHtml(project.previewImage)}" alt="Aperçu de ${name}" loading="lazy">`
    : `<div class="page-preview-fallback"><span>${escapeHtml(project.typeLabel)}</span><strong>${name}</strong><i>weflo.</i></div>`;
  return `<article class="project-card" data-project-id="${escapeHtml(project.id)}">
    <button class="project-preview" data-project-command="open" aria-label="Ouvrir ${name}">${preview}</button>
    <div class="project-info"><div><span class="status ${project.statusTone}">${project.statusLabel}</span><h3>${name}</h3><p>${escapeHtml(project.typeLabel)} · ${escapeHtml(project.updatedLabel)}</p></div>
      <details class="project-menu"><summary aria-label="Actions pour ${name}">•••</summary><div><button data-project-command="open">Ouvrir</button><button data-project-command="duplicate">Dupliquer</button><button data-project-command="rename">Renommer</button><button data-project-command="copy">Copier le lien</button><button class="danger" data-project-command="delete">Supprimer</button></div></details>
    </div>
  </article>`;
}

export function renderDashboardHome(model: DashboardHomeModel): string {
  const cards = model.projects.length
    ? model.projects.map(projectCard).join("")
    : `<button class="empty-project" data-dashboard-action="generate"><span>＋</span><strong>Ta première boutique commence ici</strong><small>Ajoute un produit et Weflo construit chaque section.</small></button>`;
  return `<div class="shell dashboard-shell">
    <aside class="sidebar" aria-label="Navigation principale">
      <a class="brand" href="/dashboard">weflo<span>.</span></a>
      <nav class="main-nav"><a class="nav-item is-active" href="/dashboard"><span>⌂</span>Accueil</a><a class="nav-item" href="/creations"><span>▣</span>Mes créations <b>${model.totalProjects}</b></a><a class="nav-item" href="/studio"><span>✦</span>Studio images</a><a class="nav-item" href="/boutique"><span>◆</span>Ma boutique</a><a class="nav-item" href="/facturation"><span>◈</span>Abonnement</a></nav>
      <div class="sidebar-bottom"><a class="nav-item" href="/parrainage"><span>♧</span>Parrainage</a><a class="nav-item" href="/facturation"><span>⚙</span>Réglages</a><div class="profile"><span class="avatar">${escapeHtml(model.greeting.replace("Bonjour", "").trim().charAt(0) || "W")}</span><span><strong>${escapeHtml(model.workspace.name)}</strong><small>Ton espace</small></span></div></div>
    </aside>
    <main><header class="topbar"><div><p class="hello">${escapeHtml(model.greeting)}</p><p class="subhello">Transforme ton prochain produit en boutique.</p></div><a class="pro-button" href="/facturation">Passer Pro</a></header>
      <section class="creation-desk"><div class="duck" aria-hidden="true">🐥</div><div class="desk-copy"><h1>Que veux-tu vendre ?</h1><p>Donne-moi un produit. Je m’occupe de l’offre, des mots et de la boutique.</p></div>
        <form class="prompt" data-dashboard-prompt><textarea aria-label="Décrire le produit ou coller son lien" placeholder="Colle un lien produit ou décris ce que tu veux vendre…"></textarea><div class="prompt-footer"><span>Amazon, AliExpress, Shopify ou n’importe quel site</span><button type="submit" data-dashboard-action="generate">Générer ma boutique <span>↗</span></button></div></form>
        <div class="start-modes"><button data-dashboard-action="link"><span>↗</span><strong>Importer un lien</strong><small>Produit et images</small></button><button data-dashboard-action="image"><span>▧</span><strong>Ajouter une image</strong><small>On reconnaît le produit</small></button><button data-dashboard-action="shopify"><span class="shopify-brand">${shopifyLogo()}</span><strong>Depuis Shopify</strong><small>Choisir dans le catalogue</small></button><button data-dashboard-action="blank"><span>＋</span><strong>Partir de zéro</strong><small>Une page vraiment vierge</small></button></div>
      </section>
      <section class="projects" id="creations"><div class="section-heading"><div><h2>Mes créations</h2><p>Reprends là où tu t’es arrêté.</p></div><a href="/creations">Tout afficher →</a></div><div class="project-shelf">${cards}</div></section>
      <section class="workbench"><div class="next-actions"><div class="section-heading compact"><div><h2>Le prochain geste</h2><p>Publie sans casser ton thème Shopify.</p></div></div><button class="task-row" data-dashboard-action="shopify"><span class="task-icon shopify-brand">${shopifyLogo()}</span><span><strong>Connecter Shopify</strong><small>Choisir le thème au moment de publier</small></span><b>Configurer →</b></button><button class="task-row" data-dashboard-action="generate"><span class="task-icon">Aa</span><span><strong>Créer une nouvelle offre</strong><small>Canardo adapte le message au produit</small></span><b>Commencer →</b></button></div>
        <aside class="shopify-card"><span class="shopify-brand large">${shopifyLogo()}</span><p class="mini-title">Publication Shopify</p><h2>Ta boutique, dans ton vrai thème.</h2><p>Sections modifiables, copie sécurisée et retour arrière inclus.</p><button data-dashboard-action="shopify">Connecter ma boutique</button></aside></section>
    </main></div>
    <nav class="mobile-nav"><a href="/dashboard">⌂<span>Accueil</span></a><a href="/creations">▣<span>Créations</span></a><a href="/studio">✦<span>Studio</span></a><a href="/boutique">◆<span>Boutique</span></a><a href="/facturation">⚙<span>Réglages</span></a></nav>`;
}
