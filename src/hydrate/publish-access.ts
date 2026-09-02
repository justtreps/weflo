export { publishAccessForBilling } from "../lib/publishing";

export function renderPublishPaywall(): string {
  return `<div class="publish-paywall" role="dialog" aria-modal="true" aria-labelledby="publish-paywall-title">
    <button type="button" class="publish-paywall__close" data-paywall-close aria-label="Fermer">×</button>
    <div class="publish-paywall__mark">P</div>
    <p class="publish-paywall__label">Weflo Pro</p>
    <h2 id="publish-paywall-title">Débloque la publication avec Weflo Pro</h2>
    <p>Ta boutique est prête. Passe à l’offre Pro pour l’installer directement dans le thème Shopify de ton choix.</p>
    <ul><li>Publication dans tes thèmes Shopify</li><li>Thème actif, copie ou nouveau thème</li><li>Pages et modifications illimitées</li></ul>
    <a href="/facturation">Passer à Weflo Pro</a>
  </div>`;
}
