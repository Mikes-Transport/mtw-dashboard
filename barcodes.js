'use strict';

console.log("MOMMMMMAAAA");

(function () {

  // Webflow structure (per template):
  //   .barcode-label-panels
  //     .standard-barcode            <- whole template panel, hidden in Webflow
  //       .barcode-page-wrapper
  //         .barcode-page
  //           .barcode-standard-grid
  //             .barcode-text-input-wrapper   <- ONE label
  //           Image
  const LABEL = '.barcode-text-input-wrapper';

  const TEMPLATES = {
    standard: {
      name: 'x2 Label Template',
      panel: '.standard-barcode',
      grid: '.barcode-standard-grid',
      header: '.barcode-header-wrapper',
      capacity: 2
    },

    small: {
      name: 'x4 Label Template',
      panel: '.small-barcode',
      grid: '.barcode-small-grid',
      header: '.barcode-header-wrapper',
      capacity: 4
    },

    medium: {
      name: 'x8 Label Template',
      panel: '.medium-barcode',
      grid: '.barcode-medium-grid',
      header: '.barcode-header-wrapper',
      capacity: 8
    },

    large: {
      name: 'x10 Label Template',
      panel: '.large-barcode',
      grid: '.barcode-large-grid',
      header: '.barcode-header-wrapper',
      capacity: 10
    },

    xlarge: {
      name: 'x30 Label Template',
      panel: '.xlarge-barcode',
      grid: '.barcode-xlarge-grid',
      header: '.barcode-header-wrapper',
      capacity: 30
    }
  };

  const FONT_URL =
    'https://raw.githubusercontent.com/Mikes-Transport/mtw-dashboard/main/IDAutomationHC39M%20Free%20Version.ttf';

  const DROPDOWN_OPEN_CLASS = 'barcode-dropdown-open';

  const DEFAULTS = {
    template: 'standard',
    partNumber: '',
    subtext: '',
    partNumberSize: 32,
    subtextSize: 18,
    barcodeSize: 54
  };

  const state = {
    cards: []
  };

  let counter = 0;
  let editing = null;
  let ready = false;

  const $ = s => document.querySelector(s);

  const els = {};

  // Pristine copies of each template's page + label, taken ONCE at init,
  // before render() starts emptying the .barcode-page-wrapper elements.
  const sources = {};

  function getSource(templateId) {

    const config =
      TEMPLATES[templateId] ||
      TEMPLATES.standard;

    if (sources[config.panel]) {
      return sources[config.panel];
    }

    const panel =
      document.querySelector(config.panel);

    if (!panel) {
      return null;
    }

    const page =
      panel.querySelector(
        '.barcode-page:not([data-generated])'
      );

    if (!page) {
      return null;
    }

    const label =
      page.querySelector(
        LABEL + ':not(.barcode-card)'
      );

    if (!label) {
      return null;
    }

    const pageCopy =
      page.cloneNode(true);

    const labelCopy =
      label.cloneNode(true);

    // avoid duplicate ids once these get cloned repeatedly
    pageCopy.removeAttribute('id');
    labelCopy.removeAttribute('id');

    pageCopy
      .querySelectorAll('[id]')
      .forEach(e => e.removeAttribute('id'));

    labelCopy
      .querySelectorAll('[id]')
      .forEach(e => e.removeAttribute('id'));

    sources[config.panel] = {
      page: pageCopy,
      label: labelCopy
    };

    return sources[config.panel];

  }

  function cacheSources() {

    Object.keys(TEMPLATES).forEach(
      id => getSource(id)
    );

  }

  function describe(el) {

    const cs =
      getComputedStyle(el);

    const cls =
      typeof el.className === 'string' &&
      el.className.trim()
        ? '.' + el.className.trim().split(/\s+/).join('.')
        : '';

    return (
      el.tagName.toLowerCase() + cls +
      '  [display:' + cs.display +
      ' visibility:' + cs.visibility +
      ' opacity:' + cs.opacity +
      ' height:' +
      Math.round(el.getBoundingClientRect().height) +
      'px]'
    );

  }

  // Prints one console group showing what the page looks like.
  // Runs automatically after a template is picked; also: MTWBarcodeTool.diagnose()
  function diagnose() {

    console.group('[barcode] diagnose');

    console.log('elements found:', {
      panel: !!els.panel,
      pages: !!els.pages,
      left: !!els.left,
      menu: !!els.menu,
      dropdown: !!els.dropdown
    });

    Object.entries(TEMPLATES).forEach(
      ([id, t]) => {

        const panel =
          document.querySelector(t.panel);

        console.log(
          id + '  ' + t.panel,
          '| panel elements:',
          document.querySelectorAll(t.panel).length,
          '| page+label cached:',
          !!sources[t.panel],
          '| cards:',
          state.cards.filter(c => c.template === id).length,
          '| generated pages:',
          panel
            ? panel.querySelectorAll('.barcode-page[data-generated]').length
            : 0,
          '| panel display:',
          panel
            ? getComputedStyle(panel).display
            : 'n/a'
        );

      }
    );

    const labels =
      els.panel
        ? els.panel.querySelectorAll('.barcode-card')
        : [];

    console.log(
      'labels rendered (.barcode-card):',
      labels.length
    );

    const probe =
      labels[0] || els.panel;

    if (probe) {

      console.log(
        'chain from ' +
        (labels[0] ? 'first label' : '.barcode-label-panels') +
        ' up to <html> (look for display:none or height:0):'
      );

      for (
        let n = probe;
        n && n !== document.documentElement;
        n = n.parentElement
      ) {
        console.log('   ' + describe(n));
      }

    }

    console.groupEnd();

  }

  // If an element computes to display:none (e.g. a Webflow class it shares),
  // force it visible. Only looks at the element itself, never its ancestors.
  function unhide(el, display) {

    if (!el) return;

    if (getComputedStyle(el).display === 'none') {

      console.log(
        '[barcode] forcing visible:',
        el.className || el.tagName
      );

      el.style.setProperty('display', display, 'important');

    }

  }

  // Find the dropdown wrapper that belongs to #barcode-drop
  // (not just the first .db-list-dropdown-wrapper on the page)
  function findDropdown() {

    const drop = $('#barcode-drop');

    if (!drop) {
      return $('.db-list-dropdown-wrapper');
    }

    return (
      drop.querySelector('.db-list-dropdown-wrapper') ||
      drop.closest('.db-list-dropdown-wrapper') ||
      (
        drop.nextElementSibling &&
        drop.nextElementSibling.matches('.db-list-dropdown-wrapper')
          ? drop.nextElementSibling
          : null
      ) ||
      $('.db-list-dropdown-wrapper')
    );

  }

  function cache() {

    els.panel = $('.barcode-label-panels');
    els.header = $('.barcode-header-wrapper');

    els.add = $('.barcode-add-card-button');
    els.print = $('.barcode-print-card-button');

    els.dropdown = findDropdown();

    els.pages = $('.barcode-page-wrapper');

    // Sidebar container + menu list. The edit panel mounts here,
    // exactly like the promo tool's edit panel does.
    els.left = $('.db-left-content');
    els.menu = $('.db-menu-list');

  }

  // .barcode-label-panels is hidden in Webflow (display:none), so showing it
  // has to be done explicitly.
  function openBarcodePanel() {

    if (!els.panel) return;

    els.panel.classList.add('open');

    els.panel.style.removeProperty('display');

    if (getComputedStyle(els.panel).display === 'none') {
      els.panel.style.setProperty('display', 'block', 'important');
    }

  }

  function closeBarcodePanel() {

    if (!els.panel) return;

    els.panel.classList.remove('open');

    els.panel.style.removeProperty('display');

  }

  function injectStyles() {

    if ($('#barcode-tool-styles')) {
      return;
    }

    const style =
      document.createElement('style');

    style.id = 'barcode-tool-styles';

    style.textContent = `

      @font-face {
        font-family: 'IDAutomationHC39M';
        src: url('${FONT_URL}') format('truetype');
        font-display: block;
      }

      /* Template dropdown: closed by default, opened by adding the class */
      .db-list-dropdown-wrapper:not(.${DROPDOWN_OPEN_CLASS})
      .db-list-dropdown-card[data-barcode-template] {
        display: none !important;
      }

      .db-list-dropdown-card[data-barcode-template] {
        cursor: pointer;
      }

      .barcode-card {
        position: relative;
      }

      .barcode-card-overlay {
        position: absolute;
        inset: 0;
        z-index: 20;
        cursor: pointer;
      }

      .barcode-populate {
        font-family: 'IDAutomationHC39M', monospace;
      }

      .barcode-populate-auto {
        display: block;
        text-align: center;
        line-height: 1.1;
        white-space: nowrap;
      }

      /* ---- edit panel (mirrors the promo tool's panel) ---- */

      .db-left-content.editing {
        width: 100% !important;
        height: calc(100vh - 120px) !important;
        min-height: 0 !important;
        max-height: calc(100vh - 120px) !important;
        overflow: hidden !important;
        display: flex !important;
        flex-direction: column !important;
        overscroll-behavior: contain !important;
      }

      .db-left-content.editing .barcode-edit-panel {
        flex: 1 1 auto !important;
        width: 100% !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        box-sizing: border-box !important;
        padding-right: 10px !important;
        overscroll-behavior: contain !important;
        -webkit-overflow-scrolling: touch !important;
        scrollbar-width: thin;
        touch-action: pan-y;
      }

      .barcode-edit-panel::-webkit-scrollbar {
        width: 6px;
      }

      .barcode-edit-panel::-webkit-scrollbar-track {
        background: transparent;
      }

      .barcode-edit-panel::-webkit-scrollbar-thumb {
        background: #ccc;
        border-radius: 10px;
      }

      .barcode-edit-panel::-webkit-scrollbar-thumb:hover {
        background: #aaa;
      }

      .barcode-edit-panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex: 0 0 auto;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid #eee;
      }

      .barcode-edit-panel-title {
        font-weight: 700;
        font-size: 18px;
      }

      .barcode-edit-panel-close {
        border: 0;
        background: none;
        font-size: 24px;
        cursor: pointer;
        line-height: 1;
      }

      .barcode-edit-section {
        border-top: 1px solid #eee;
        padding-top: 16px;
        margin-top: 16px;
      }

      .barcode-edit-section-title {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        margin-bottom: 12px;
      }

      .barcode-field-group {
        margin-bottom: 12px;
      }

      .barcode-field-label,
      .barcode-control-label {
        display: block;
        font-size: 11px;
        font-weight: 600;
        color: #444;
        margin-bottom: 5px;
      }

      .barcode-field-input {
        width: 100%;
        box-sizing: border-box;
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 5px;
        font: inherit;
        font-size: 12px;
      }

      .barcode-control-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 8px;
      }

      .barcode-control {
        min-width: 120px;
        padding: 6px;
        border: 1px solid #ccc;
        border-radius: 5px;
        background: #fff;
        font: inherit;
        font-size: 11px;
      }

      .barcode-number {
        width: 80px;
        min-width: 80px;
      }

      .barcode-edit-panel-footer {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 8px;
        margin-top: 18px;
        padding-top: 14px;
        border-top: 1px solid #eee;
      }

      .barcode-edit-button {
        border: 1px solid #ccc;
        background: #fff;
        border-radius: 5px;
        padding: 8px 12px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 600;
      }

      .barcode-edit-button.primary {
        background: #111;
        color: #fff;
        border-color: #111;
      }

      @media print {

        /* Hide the panel header, but NOT a header that lives inside a label */
        .barcode-header-wrapper:not(.barcode-card .barcode-header-wrapper) {
          display: none !important;
        }

        .barcode-add-card-wrapper,
        .barcode-print-card-wrapper,
        .barcode-card-overlay,
        .barcode-edit-panel,
        .db-list-dropdown-wrapper {
          display: none !important;
        }

        .barcode-page-wrapper {
          display: block !important;
          width: 210mm !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .barcode-page {
          width: 210mm !important;
          height: 297mm !important;
          margin: 0 !important;
          padding: 0 !important;
          break-after: page;
          page-break-after: always;
          overflow: hidden !important;
        }

        .barcode-page:last-child {
          break-after: auto;
          page-break-after: auto;
        }

      }

    `;

    document.head.appendChild(style);

  }

  function cardData(data = {}) {

    counter++;

    return {
      id:
        data.id ||
        'barcode-' + counter,

      template:
        data.template ||
        DEFAULTS.template,

      partNumber:
        data.partNumber ??
        DEFAULTS.partNumber,

      subtext:
        data.subtext ??
        DEFAULTS.subtext,

      partNumberSize:
        Number(data.partNumberSize) ||
        DEFAULTS.partNumberSize,

      subtextSize:
        Number(data.subtextSize) ||
        DEFAULTS.subtextSize,

      barcodeSize:
        Number(data.barcodeSize) ||
        DEFAULTS.barcodeSize
    };

  }

  function get(id) {

    return state.cards.find(
      card => card.id === id
    );

  }

  function add(data = {}) {

    const card =
      cardData(data);

    state.cards.push(card);

    render();

    return card;

  }

  function remove(id) {

    state.cards =
      state.cards.filter(
        card => card.id !== id
      );

    if (editing === id) {
      hideEdit();
    }

    render();

  }

  function cleanPartNumber(value) {

    return String(value || '')
      .trim()
      .replace(/^#/, '')
      .trim();

  }

  function barcodeValue(value) {

    const clean =
      cleanPartNumber(value);

    if (!clean) {
      return '';
    }

    return `*${clean}*`;

  }

  function populateCard(card, data) {

    const config =
      TEMPLATES[data.template] ||
      TEMPLATES.standard;

    const header =
      card.querySelector(
        config.header
      ) ||
      card.querySelector(
        '.text-input-header > *'
      );

    const subtext =
      card.querySelector(
        '.text-input-subtext > *'
      ) ||
      card.querySelector(
        '.text-input-subtext'
      );

    let barcode =
      card.querySelector(
        '.barcode-populate'
      );

    // The Webflow label only has a header + subtext. If there's no
    // .barcode-populate element, add one so the barcode can render.
    // (Add a Text Block with class "barcode-populate" inside
    // .barcode-text-input-wrapper in Webflow to control its placement.)
    if (!barcode) {

      barcode =
        document.createElement('div');

      barcode.className =
        'barcode-populate barcode-populate-auto';

      card.appendChild(
        barcode
      );

    }

    if (header) {

      header.textContent =
        data.partNumber || '';

      header.style.fontSize =
        data.partNumberSize + 'px';

    }

    if (subtext) {

      subtext.textContent =
        data.subtext || '';

      subtext.style.fontSize =
        data.subtextSize + 'px';

    }

    if (barcode) {

      barcode.textContent =
        barcodeValue(
          data.partNumber
        );

      barcode.style.fontSize =
        data.barcodeSize + 'px';

    }

  }

  function createCard(data) {

    const src =
      getSource(data.template);

    if (!src) {

      console.warn(
        '[barcode] template not found for:',
        data.template
      );

      return null;

    }

    const card =
      src.label.cloneNode(true);

    card.classList.add(
      'barcode-card'
    );

    card.dataset.cardId =
      data.id;

    card.dataset.barcodeTemplate =
      data.template;

    populateCard(
      card,
      data
    );

    const overlay =
      document.createElement('div');

    overlay.className =
      'barcode-card-overlay';

    overlay.addEventListener(
      'click',
      function (e) {

        e.preventDefault();
        e.stopPropagation();

        openEdit(data);

      }
    );

    card.appendChild(
      overlay
    );

    return card;

  }

  function chunk(cards, size) {

    const pages = [];

    for (
      let i = 0;
      i < cards.length;
      i += size
    ) {

      pages.push(
        cards.slice(i, i + size)
      );

    }

    return pages;

  }

  // Builds the pages for ONE template inside that template's own panel
  // (e.g. .standard-barcode) and then un-hides that panel.
  function renderTemplate(id) {

    const config =
      TEMPLATES[id];

    const panel =
      document.querySelector(config.panel);

    if (!panel) {
      return;
    }

    const cards =
      state.cards.filter(
        c => c.template === id
      );

    const wrapper =
      panel.querySelector('.barcode-page-wrapper') ||
      panel;

    // No labels for this template: drop generated pages and let the
    // panel go back to its hidden Webflow state
    if (!cards.length) {

      wrapper
        .querySelectorAll('.barcode-page[data-generated]')
        .forEach(p => p.remove());

      panel.style.removeProperty('display');

      return;

    }

    const src =
      getSource(id);

    if (!src) {

      console.warn(
        '[barcode] cannot render — template panel/page/label not found:',
        config.panel,
        '(needs ' + config.panel +
        ' > .barcode-page > ' + config.grid +
        ' > ' + LABEL + ')'
      );

      return;

    }

    wrapper.innerHTML = '';

    chunk(
      cards,
      config.capacity
    ).forEach(group => {

      const page =
        src.page.cloneNode(true);

      page.dataset.generated =
        'true';

      const grid =
        page.querySelector(config.grid) ||
        page.querySelector('[class*="-grid"]');

      if (!grid) {

        console.warn(
          '[barcode] grid not found in page:',
          config.grid
        );

        return;

      }

      grid.innerHTML = '';

      group.forEach(data => {

        const card =
          createCard(data);

        if (card) {
          grid.appendChild(card);
        }

      });

      wrapper.appendChild(page);

      // Now connected: make sure nothing is still display:none
      unhide(wrapper, 'block');
      unhide(page, 'block');
      unhide(grid, 'grid');

      grid
        .querySelectorAll('.barcode-card')
        .forEach(c => unhide(c, 'block'));

    });

    // THE template switch: show this template's panel
    panel.style.setProperty('display', 'block', 'important');

  }

  function render() {

    // If the dashboard replaced/moved the tool's DOM, re-grab fresh references
    if (!els.panel || !els.panel.isConnected) {
      cache();
    }

    if (!els.panel) {
      return;
    }

    Object.keys(TEMPLATES).forEach(renderTemplate);

    if (!state.cards.length) {
      closeBarcodePanel();
    }

  }

  function live(data) {

    if (!els.panel) {
      return;
    }

    els.panel
      .querySelectorAll(
        `[data-card-id="${data.id}"]`
      )
      .forEach(card => {

        populateCard(
          card,
          data
        );

      });

  }

  function textField(label, value, callback) {

    const wrap =
      document.createElement('div');

    wrap.className =
      'barcode-field-group';

    const l =
      document.createElement('label');

    l.className =
      'barcode-field-label';

    l.textContent =
      label;

    const input =
      document.createElement('input');

    input.className =
      'barcode-field-input';

    input.type =
      'text';

    input.value =
      value ?? '';

    input.addEventListener(
      'input',
      () => callback(input.value)
    );

    wrap.append(l, input);

    return wrap;

  }

  function numberField(label, value, callback) {

    const wrap =
      document.createElement('div');

    wrap.className =
      'barcode-control-row';

    const l =
      document.createElement('label');

    l.className =
      'barcode-control-label';

    l.textContent =
      label;

    const input =
      document.createElement('input');

    input.className =
      'barcode-control barcode-number';

    input.type =
      'number';

    input.min =
      '1';

    input.value =
      value ?? '';

    input.addEventListener(
      'input',
      () => callback(input.value)
    );

    wrap.append(l, input);

    return wrap;

  }

  function section(title, children) {

    const s =
      document.createElement('div');

    s.className =
      'barcode-edit-section';

    const h =
      document.createElement('div');

    h.className =
      'barcode-edit-section-title';

    h.textContent =
      title;

    s.appendChild(h);

    children.forEach(x => s.appendChild(x));

    return s;

  }

  function button(label, className, onClick) {

    const b =
      document.createElement('button');

    b.type =
      'button';

    b.className =
      className;

    b.textContent =
      label;

    b.onclick =
      onClick;

    return b;

  }

  function buildEditPanel(card) {

    const panel =
      document.createElement('div');

    panel.className =
      'barcode-edit-panel';

    panel.dataset.cardId =
      card.id;

    // ---- header (title + close) ----
    const header =
      document.createElement('div');

    header.className =
      'barcode-edit-panel-header';

    const title =
      document.createElement('div');

    title.className =
      'barcode-edit-panel-title';

    title.textContent =
      'Edit Barcode';

    header.append(
      title,
      button(
        '×',
        'barcode-edit-panel-close',
        hideEdit
      )
    );

    panel.appendChild(header);

    // ---- content ----
    panel.appendChild(
      section(
        'Content',
        [
          textField(
            'Part Number',
            card.partNumber,
            value => {

              card.partNumber =
                value;

              live(card);

            }
          ),

          textField(
            'Description',
            card.subtext,
            value => {

              card.subtext =
                value;

              live(card);

            }
          )
        ]
      )
    );

    // ---- sizes ----
    panel.appendChild(
      section(
        'Size',
        [
          numberField(
            'Part Number Font Size',
            card.partNumberSize,
            value => {

              card.partNumberSize =
                Number(value) ||
                DEFAULTS.partNumberSize;

              live(card);

            }
          ),

          numberField(
            'Description Font Size',
            card.subtextSize,
            value => {

              card.subtextSize =
                Number(value) ||
                DEFAULTS.subtextSize;

              live(card);

            }
          ),

          numberField(
            'Barcode Size',
            card.barcodeSize,
            value => {

              card.barcodeSize =
                Number(value) ||
                DEFAULTS.barcodeSize;

              live(card);

            }
          )
        ]
      )
    );

    // ---- footer ----
    const footer =
      document.createElement('div');

    footer.className =
      'barcode-edit-panel-footer';

    footer.append(

      button(
        'Reset',
        'barcode-edit-button',
        () => {

          card.partNumber =
            DEFAULTS.partNumber;

          card.subtext =
            DEFAULTS.subtext;

          card.partNumberSize =
            DEFAULTS.partNumberSize;

          card.subtextSize =
            DEFAULTS.subtextSize;

          card.barcodeSize =
            DEFAULTS.barcodeSize;

          render();

          openEdit(card);

        }
      ),

      button(
        'Copy',
        'barcode-edit-button',
        () => {

          const duplicate =
            add({
              template:
                card.template,

              partNumber:
                card.partNumber,

              subtext:
                card.subtext,

              partNumberSize:
                card.partNumberSize,

              subtextSize:
                card.subtextSize,

              barcodeSize:
                card.barcodeSize
            });

          openEdit(duplicate);

        }
      ),

      button(
        'Delete',
        'barcode-edit-button',
        () => remove(card.id)
      ),

      button(
        'Save',
        'barcode-edit-button primary',
        () => {

          render();

          hideEdit();

        }
      )
    );

    panel.appendChild(footer);

    return panel;

  }

  function openEdit(card) {

    if (!card) {
      return;
    }

    // Same mount point as the promo tool: the left sidebar.
    // Falls back to the label panel if the sidebar isn't found.
    const host =
      els.left ||
      els.panel;

    if (!host) {
      return;
    }

    // Make sure the label preview area is visible
    openBarcodePanel();

    const old =
      host.querySelector(
        '.barcode-edit-panel'
      );

    if (old) {
      old.remove();
    }

    editing =
      card.id;

    if (els.left) {

      if (els.menu) {
        els.menu.style.display =
          'none';
      }

      els.left.classList.add(
        'editing'
      );

    }

    const panel =
      buildEditPanel(card);

    host.appendChild(panel);

    requestAnimationFrame(
      () => {
        panel.scrollTop = 0;
      }
    );

  }

  function hideEdit() {

    editing = null;

    [els.left, els.panel].forEach(
      host => {

        if (!host) return;

        const panel =
          host.querySelector(
            '.barcode-edit-panel'
          );

        if (panel) {
          panel.remove();
        }

      }
    );

    if (els.left) {
      els.left.classList.remove(
        'editing'
      );
    }

    if (els.menu) {
      els.menu.style.display =
        '';
    }

  }

  function createDropdown(wrapper) {

    if (!wrapper) {
      return;
    }

    if (
      wrapper.dataset.loaded === 'true'
    ) {
      return;
    }

    Object.entries(
      TEMPLATES
    ).forEach(
      ([id, template]) => {

        const item =
          document.createElement('div');

        item.className =
          'db-list-dropdown-card';

        item.dataset.barcodeTemplate =
          id;

        const heading =
          document.createElement('div');

        heading.className =
          'db-headingd-list';

        heading.textContent =
          template.name;

        item.appendChild(
          heading
        );

        wrapper.appendChild(
          item
        );

      }
    );

    // One delegated listener in the CAPTURE phase, so nothing above it
    // (the toolcard toggle, dashboard click handlers) can swallow the click.
    wrapper.addEventListener(
      'click',
      function (e) {

        const item =
          e.target.closest(
            '.db-list-dropdown-card[data-barcode-template]'
          );

        if (!item) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        const selectedTemplate =
          item.dataset.barcodeTemplate;

        console.log(
          '[barcode] template picked:',
          selectedTemplate
        );

        const card =
          add({
            template:
              selectedTemplate
          });

        setTimeout(diagnose, 50);

        closeDropdown();

        // openEdit() also opens the barcode panel
        openEdit(card);

      },
      true
    );

    wrapper.dataset.loaded =
      'true';

  }

  function closeDropdown() {

    if (!els.dropdown) {
      return;
    }

    els.dropdown.classList.remove(
      DROPDOWN_OPEN_CLASS
    );

  }

  function toggleDropdown() {

    if (!els.dropdown) {
      return;
    }

    els.dropdown.classList.toggle(
      DROPDOWN_OPEN_CLASS
    );

  }

  function preparePrint() {

    if (!els.panel) {
      return;
    }

    els.panel
      .querySelectorAll('.barcode-page-wrapper')
      .forEach(wrapper => {

        let node =
          wrapper;

        while (node) {

          node.style.overflow =
            'visible';

          node.style.height =
            'auto';

          node.style.maxHeight =
            'none';

          node.style.transform =
            'none';

          node =
            node.parentElement;

        }

      });

  }

  function init() {

    cache();

    if (
      !els.panel ||
      !els.pages
    ) {

      setTimeout(
        init,
        100
      );

      return;

    }

    if (!ready) {

      ready = true;

      cacheSources();

      injectStyles();

      if (els.add) {

        els.add.addEventListener(
          'click',
          function (e) {

            e.preventDefault();
            e.stopPropagation();

            openBarcodePanel();

            const card =
              add({
                template:
                  DEFAULTS.template
              });

            openEdit(card);

          }
        );

      }

      if (els.print) {

        els.print.addEventListener(
          'click',
          function (e) {

            e.preventDefault();
            e.stopPropagation();

            preparePrint();

            window.print();

          }
        );

      }

      const drop =
        $('#barcode-drop');

      if (drop) {

        drop.style.cursor =
          'pointer';

        drop.addEventListener(
          'click',
          function (e) {

            // Clicks on a template card are handled by createDropdown(),
            // so don't toggle here. (Don't test els.dropdown.contains() —
            // the wrapper can be an ancestor of #barcode-drop itself.)
            if (
              e.target.closest(
                '.db-list-dropdown-card[data-barcode-template]'
              )
            ) {
              return;
            }

            e.preventDefault();
            e.stopPropagation();

            toggleDropdown();

          }
        );

      }

      window.addEventListener(
        'beforeprint',
        preparePrint
      );

    }

    createDropdown(
      els.dropdown
    );

    render();

  }

  document.addEventListener(
    'db-tool-open',
    function (e) {

      if (
        e.detail?.id !== 'barcodes'
      ) {
        return;
      }

      init();

    }
  );

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

  window.MTWBarcodeTool = {
    state,
    addCard: add,
    getCard: get,
    deleteCard: remove,
    render,
    openEdit,
    hideEdit,
    diagnose
  };

})();
