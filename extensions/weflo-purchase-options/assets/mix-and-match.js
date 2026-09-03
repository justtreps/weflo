(()=>{
  const validId = value => /^gid:\/\/shopify\/ProductVariant\/\d+$/.test(value || '');
  const mount = root => {
    if (root.dataset.wefloMounted === 'true') return;
    root.dataset.wefloMounted = 'true';
    const output = root.querySelector('[data-weflo-bundle-components-input]');
    const sync = () => {
      const components = [...root.querySelectorAll('[data-weflo-component]')].flatMap(input => {
        const merchandiseId = input.dataset.wefloComponent || '';
        const quantity = Number(input.value || 0);
        return validId(merchandiseId) && Number.isInteger(quantity) && quantity > 0 ? [{ merchandiseId, quantity }] : [];
      });
      if (output) output.value = JSON.stringify(components);
    };
    root.addEventListener('change', sync);
    sync();
  };
  const boot = scope => (scope || document).querySelectorAll('[data-weflo-mix-and-match]').forEach(mount);
  document.addEventListener('shopify:section:load', event => boot(event.target));
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', () => boot()) : boot();
})();
