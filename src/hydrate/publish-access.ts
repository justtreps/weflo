export { publishAccessForBilling } from "../lib/publishing";

export function renderPublishPaywall(): string {
  return `<div class="publish-paywall" role="dialog" aria-modal="true" aria-labelledby="publish-paywall-title">
    <button type="button" class="publish-paywall__close" data-paywall-close aria-label="Fermer">×</button>
    <div class="publish-paywall__mark">P</div>
    <p class="publish-paywall__label">Weflo Pro</p>
    <h2 id="publish-paywall-title">Débloque la publication avec Weflo Pro</h2>
    <p>Ton aperçu reste disponible gratuitement. Passe Pro pour publier ta page, connecter Shopify et retirer la signature Weflo.</p>
    <ul><li>Publication en un clic</li><li>Connexion Shopify</li><li>Domaine et pages sans limite</li></ul>
    <a href="/facturation">Passer Pro</a>
  </div>`;
}
