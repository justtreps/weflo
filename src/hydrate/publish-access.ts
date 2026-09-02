export { publishAccessForBilling } from "../lib/publishing";

export function renderPublishPaywall(): string {
  return `<div class="publish-paywall" role="dialog" aria-modal="true" aria-labelledby="publish-paywall-title">
    <button type="button" class="publish-paywall__close" data-paywall-close aria-label="Fermer">×</button>
    <div class="publish-paywall__mark">P</div>
    <p class="publish-paywall__label">Weflo Pro</p>
    <h2 id="publish-paywall-title">Unlock publishing with Weflo Pro</h2>
    <p>Your store is ready. Upgrade to install it directly in the Shopify theme you choose.</p>
    <ul><li>Publish to Shopify themes</li><li>Active theme, duplicate, or new theme</li><li>Unlimited pages and edits</li></ul>
    <a href="/facturation">Upgrade to Weflo Pro</a>
  </div>`;
}
