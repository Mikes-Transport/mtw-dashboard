'use strict';

console.log("YOUOK K);

(function () {

  const TEMPLATES = {
    standard: {
      name: 'x2 Label Template',
      card: '.standard-barcode',
      grid: '.barcode-standard-grid',
      header: '.standard-barcode-header',
      capacity: 2
    },

    small: {
      name: 'x4 Label Template',
      card: '.small-barcode',
      grid: '.barcode-small-grid',
      header: '.small-barcode-header',
      capacity: 4
    },

    medium: {
      name: 'x8 Label Template',
      card: '.medium-barcode',
      grid: '.barcode-medium-grid',
      header: '.medium-barcode-header',
      capacity: 8
    },

    large: {
      name: 'x10 Label Template',
      card: '.large-barcode',
      grid: '.barcode-large-grid',
      header: '.large-barcode-header',
      capacity: 10
    },

    xlarge: {
      name: 'x30 Label Template',
      card: '.xlarge-barcode',
      grid: '.barcode-xlarge-grid',
      header: '.xlarge-barcode-header',
      capacity: 30
    }
  };

  const FONT_URL =
    'https://raw.githubusercontent.com/Mikes-Transport/mtw-dashboard/main/IDAutomationHC39M%20Free%20Version.ttf';

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

  function cache() {

    els.panel = $('.barcode-label-panels');
    els.header = $('.barcode-header-wrapper');

    els.add = $('.barcode-add-card-button');
    els.print = $('.barcode-print-card-button');

    els.dropdown = $('.db-list-dropdown-wrapper');

    els.pages = $('.barcode-page-wrapper');

  }

  function openBarcodePanel() {

    if (!els.panel) return;

    els.panel.style.display = '';
    els.panel.classList.add('open');

  }

  function closeBarcodePanel() {

    if (!els.panel) return;

    els.panel.classList.remove('open');

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

      .barcode-edit-panel {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .barcode-edit-content {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .barcode-edit-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .barcode-edit-field span {
        font-size: 12px;
      }

      .barcode-edit-field input {
        width: 100%;
        box-sizing: border-box;
      }

      .barcode-edit-footer {
        display: flex;
        gap: 10px;
      }

      .barcode-edit-footer button {
        cursor: pointer;
      }

      @media print {

        .barcode-header-wrapper,
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

    const barcode =
      card.querySelector(
        '.barcode-populate'
      );

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

    const config =
      TEMPLATES[data.template] ||
      TEMPLATES.standard;

    const source =
      document.querySelector(
        config.card
      );

    if (!source) {

      console.warn(
        'Barcode template not found:',
        config.card
      );

      return null;

    }

    const card =
      source.cloneNode(true);

    card.classList.add(
      'barcode-card'
    );

    card.dataset.cardId =
      data.id;

    card.dataset.barcodeTemplate =
      data.template;

    card.style.display =
      'block';

    card.removeAttribute('id');

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

  function createGrid(template) {

    const config =
      TEMPLATES[template] ||
      TEMPLATES.standard;

    const grid =
      document.createElement('div');

    grid.className =
      config.grid.replace('.', '');

    grid.dataset.barcodeTemplate =
      template;

    return grid;

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

  function render() {

    if (!els.pages) {
      return;
    }

    els.pages.innerHTML = '';

    if (!state.cards.length) {
      return;
    }

    const byTemplate = {};

    state.cards.forEach(card => {

      if (!byTemplate[card.template]) {
        byTemplate[card.template] = [];
      }

      byTemplate[card.template].push(card);

    });

    Object.entries(
      byTemplate
    ).forEach(
      ([template, cards]) => {

        const config =
          TEMPLATES[template] ||
          TEMPLATES.standard;

        const groups =
          chunk(
            cards,
            config.capacity
          );

        groups.forEach(group => {

          const page =
            document.createElement('div');

          page.className =
            'barcode-page';

          page.dataset.barcodeTemplate =
            template;

          const grid =
            createGrid(template);

          group.forEach(cardData => {

            const card =
              createCard(cardData);

            if (card) {
              grid.appendChild(card);
            }

          });

          page.appendChild(grid);

          els.pages.appendChild(page);

        });

      }
    );

  }

  function live(data) {

    if (!els.pages) {
      return;
    }

    const matches =
      els.pages.querySelectorAll(
        `[data-card-id="${data.id}"]`
      );

    matches.forEach(card => {

      populateCard(
        card,
        data
      );

    });

  }

  function createField(
    label,
    value,
    type,
    callback
  ) {

    const wrapper =
      document.createElement('label');

    wrapper.className =
      'barcode-edit-field';

    const title =
      document.createElement('span');

    title.textContent =
      label;

    const input =
      document.createElement('input');

    input.type = type;
    input.value = value ?? '';

    if (type === 'number') {
      input.min = '1';
    }

    input.addEventListener(
      'input',
      function () {

        callback(
          input.value
        );

      }
    );

    wrapper.appendChild(title);
    wrapper.appendChild(input);

    return wrapper;

  }

  function buildEditPanel(card) {

    const panel =
      document.createElement('div');

    panel.className =
      'barcode-edit-panel';

    const heading =
      document.createElement('h3');

    heading.textContent =
      'Edit Barcode';

    panel.appendChild(
      heading
    );

    const content =
      document.createElement('div');

    content.className =
      'barcode-edit-content';

    content.appendChild(
      createField(
        'Part Number',
        card.partNumber,
        'text',
        value => {

          card.partNumber =
            value;

          live(card);

        }
      )
    );

    content.appendChild(
      createField(
        'Description',
        card.subtext,
        'text',
        value => {

          card.subtext =
            value;

          live(card);

        }
      )
    );

    content.appendChild(
      createField(
        'Part Number Font Size',
        card.partNumberSize,
        'number',
        value => {

          card.partNumberSize =
            Number(value) ||
            DEFAULTS.partNumberSize;

          live(card);

        }
      )
    );

    content.appendChild(
      createField(
        'Description Font Size',
        card.subtextSize,
        'number',
        value => {

          card.subtextSize =
            Number(value) ||
            DEFAULTS.subtextSize;

          live(card);

        }
      )
    );

    content.appendChild(
      createField(
        'Barcode Size',
        card.barcodeSize,
        'number',
        value => {

          card.barcodeSize =
            Number(value) ||
            DEFAULTS.barcodeSize;

          live(card);

        }
      )
    );

    panel.appendChild(
      content
    );

    const footer =
      document.createElement('div');

    footer.className =
      'barcode-edit-footer';

    const reset =
      document.createElement('button');

    reset.type = 'button';
    reset.textContent = 'Reset';

    reset.onclick =
      function () {

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

      };

    const copy =
      document.createElement('button');

    copy.type = 'button';
    copy.textContent = 'Copy';

    copy.onclick =
      function () {

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

      };

    const removeBtn =
      document.createElement('button');

    removeBtn.type = 'button';
    removeBtn.textContent = 'Delete';

    removeBtn.onclick =
      function () {

        remove(card.id);

      };

    const save =
      document.createElement('button');

    save.type = 'button';
    save.textContent = 'Save';

    save.onclick =
      function () {

        render();

        hideEdit();

      };

    footer.appendChild(reset);
    footer.appendChild(copy);
    footer.appendChild(removeBtn);
    footer.appendChild(save);

    panel.appendChild(
      footer
    );

    return panel;

  }

  function openEdit(card) {

    if (!els.panel) {
      return;
    }

    openBarcodePanel();

    hideEdit();

    editing =
      card.id;

    const panel =
      buildEditPanel(card);

    els.panel.appendChild(
      panel
    );

  }

  function hideEdit() {

    editing = null;

    if (!els.panel) {
      return;
    }

    const panel =
      els.panel.querySelector(
        '.barcode-edit-panel'
      );

    if (panel) {
      panel.remove();
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

        item.addEventListener(
          'click',
          function (e) {

            e.preventDefault();
            e.stopPropagation();

            const selectedTemplate =
              item.dataset.barcodeTemplate;

            openBarcodePanel();

            const card =
              add({
                template:
                  selectedTemplate
              });

            closeDropdown();

            openEdit(card);

          }
        );

      }
    );

    wrapper.dataset.loaded =
      'true';

  }

  function closeDropdown() {

    if (!els.dropdown) {
      return;
    }

    els.dropdown.classList.remove(
      'open'
    );

    els.dropdown
      .querySelectorAll(
        '.db-list-dropdown-card'
      )
      .forEach(card => {

        card.style.display =
          'none';

      });

  }

  function toggleDropdown() {

    if (!els.dropdown) {
      return;
    }

    const open =
      els.dropdown.classList.contains(
        'open'
      );

    if (open) {

      closeDropdown();

      return;

    }

    els.dropdown.classList.add(
      'open'
    );

    els.dropdown
      .querySelectorAll(
        '.db-list-dropdown-card'
      )
      .forEach(card => {

        card.style.display =
          '';

      });

  }

  function preparePrint() {

    if (!els.pages) {
      return;
    }

    let node =
      els.pages;

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
    hideEdit
  };

})();
