'use strict';

const { $, $$ } = window.MTW;

(function () {

  const TOOLS = {
    'activity-logs': '.activity-logs-panel',
    'secondhand-tool': '.second-hand-panel',
    'product-info': '.product-tool-panel',
    'csv-config': '.csv-tool-panel',
    'mte-config': '.master-list-config',
    'promotion-label': '.et-body-wrapper',
    'barcodes': '.barcode-label-panels',
    'labels': '.label-panels'
  };

  const NAMES = {
    'activity-logs': 'Activity Logs',
    'secondhand-tool': 'Secondhand Stock',
    'product-info': 'Product Information',
    'csv-config': 'CSV Config',
    'mte-config': 'MTE Config',
    'promotion-label': 'Promotional Labels',
    'barcodes': 'Barcode Labels',
    'labels': 'Labels'
  };

  function hideAll() {

    Object.values(TOOLS).forEach(selector => {

      const el = $(selector);

      if (el) {
        el.style.display = 'none';
      }
    });
  }

  function openDBTool(id) {

    const selector = TOOLS[id];

    if (!selector && id !== 'barcodes') return;

    hideAll();

    const wrapper = $('.db-tool-wrapper');
    const heading = $('.tool-wrapper-h2');
    const breadcrumb =
      $('.db-heading-list[data-type="breadcrumb"]');

    const panel = $(selector);

    if (wrapper) {
      wrapper.style.display = 'block';
    }

    if (panel) {
      panel.style.display = 'block';
    }

    if (heading) {
      heading.textContent =
        NAMES[id] || '';
    }

    if (breadcrumb) {
      breadcrumb.textContent =
        NAMES[id] || '';
    }

    document.dispatchEvent(
      new CustomEvent('db-tool-open', {
        detail: {
          id
        }
      })
    );
  }

  function closeDBTool() {

    const wrapper =
      $('.db-tool-wrapper');

    if (wrapper) {
      wrapper.style.display = 'none';
    }

    hideAll();

    document.dispatchEvent(
      new CustomEvent('db-tool-close')
    );
  }

  function init() {

    hideAll();

    const wrapper =
      $('.db-tool-wrapper');

    if (wrapper) {
      wrapper.style.display = 'none';
    }

    $$('.db-list-toolcard')
      .forEach(card => {

        const id =
          card.dataset.select;

        if (
          !id ||
          !TOOLS[id]
        ) {
          return;
        }

        card.style.cursor =
          'pointer';

        card.onclick = () => {
          openDBTool(id);
        };
      });

    $$('#exit-btn')
      .forEach(button => {

        button.onclick =
          closeDBTool;
      });
  }

  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      init,
      { once: true }
    );

  } else {

    init();
  }

  window.openDBTool =
    openDBTool;

  window.closeDBTool =
    closeDBTool;

})();
