'use strict';

console.log("LOADED BARCODE JS");

(function () {

  const TEMPLATES = {
    standard: {
      name: 'x2 Label Template',
      selector: '.standard-barcode'
    },

    small: {
      name: 'x4 Label Template',
      selector: '.small-barcode'
    },

    medium: {
      name: 'x8 Label Template',
      selector: '.medium-barcode'
    },

    large: {
      name: 'x10 Label Template',
      selector: '.large-barcode'
    },

    xlarge: {
      name: 'x30 Label Template',
      selector: '.xlarge-barcode'
    }
  };

  const state = {
    cards: []
  };

  let editing = null;
  let uid = 0;


  /* ---------- DROPDOWN ---------- */

  function createDropdown(wrapper) {

    if (wrapper.dataset.loaded === 'true') {
      return;
    }

    Object.entries(TEMPLATES).forEach(([id, template]) => {

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

      item.appendChild(heading);
      wrapper.appendChild(item);

      item.addEventListener('click', function (e) {

        e.preventDefault();
        e.stopPropagation();

        openTemplate(id);

      });

    });

    wrapper.dataset.loaded = 'true';
  }


  function toggleDropdown() {

    const wrapper =
      document.querySelector(
        '.db-list-dropdown-wrapper'
      );

    if (!wrapper) return;

    createDropdown(wrapper);

    const cards =
      wrapper.querySelectorAll(
        '.db-list-dropdown-card'
      );

    const isOpen =
      wrapper.classList.contains('open');

    if (isOpen) {

      wrapper.classList.remove('open');

      cards.forEach(card => {
        card.style.display = 'none';
      });

    } else {

      wrapper.classList.add('open');

      cards.forEach(card => {
        card.style.display = '';
      });

    }

  }


  /* ---------- CARDS ---------- */

  function cardData(data = {}) {

    return {

      id:
        data.id ||
        `barcode-${++uid}`,

      template:
        data.template ||
        'standard',

      partNumber:
        data.partNumber ||
        '',

      subtext:
        data.subtext ||
        ''

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

    renderCard(card);
    renderList();

    openEdit(card);

    return card;

  }


  function del(id) {

    const index =
      state.cards.findIndex(
        card => card.id === id
      );

    if (index === -1) return;

    state.cards.splice(index, 1);

    const el =
      document.querySelector(
        `[data-barcode-card="${id}"]`
      );

    if (el) {
      el.remove();
    }

    if (editing === id) {
      hideEdit();
    }

    renderList();

  }


  /* ---------- TEMPLATE ---------- */

  function openTemplate(template) {

    const existing =
      state.cards.find(
        card => card.template === template
      );

    if (existing) {

      openEdit(existing);

      return;

    }

    add({
      template
    });

  }


  function renderCard(card) {

    const template =
      document.querySelector(
        TEMPLATES[card.template].selector
      );

    if (!template) {

      console.warn(
        'Barcode template not found:',
        card.template
      );

      return;

    }

    const el =
      template.cloneNode(true);

    el.removeAttribute('id');

    el.style.display = '';

    el.dataset.barcodeCard =
      card.id;

    updateCard(el, card);

    const overlay =
      document.createElement('div');

    overlay.className =
      'barcode-card-overlay';

    overlay.addEventListener(
      'click',
      function (e) {

        e.preventDefault();
        e.stopPropagation();

        openEdit(card);

      }
    );

    el.appendChild(overlay);

    const wrapper =
      document.querySelector(
        '.barcode-cards-wrapper'
      );

    if (wrapper) {
      wrapper.appendChild(el);
    }

  }


  function updateCard(el, card) {

    /*
      These selectors need to be replaced
      with the actual elements already inside
      your barcode templates.
    */

    const part =
      el.querySelector(
        '.barcode-part-number'
      );

    const sub =
      el.querySelector(
        '.barcode-subtext'
      );

    if (part) {
      part.textContent =
        card.partNumber;
    }

    if (sub) {
      sub.textContent =
        card.subtext;
    }

  }


  function refreshCard(card) {

    const el =
      document.querySelector(
        `[data-barcode-card="${card.id}"]`
      );

    if (!el) return;

    updateCard(el, card);

  }


  /* ---------- LIST ---------- */

  function renderList() {

    const list =
      document.querySelector(
        '.barcode-card-list'
      );

    if (!list) return;

    list.innerHTML = '';

    state.cards.forEach(card => {

      const row =
        document.createElement('div');

      row.className =
        'barcode-card-row';

      row.dataset.cardId =
        card.id;

      row.innerHTML = `
        <div class="barcode-card-row-info">
          <strong>${escapeHTML(card.partNumber || 'New Card')}</strong>
          <span>${escapeHTML(card.subtext || '')}</span>
        </div>

        <button type="button"
          class="barcode-card-edit">
          Edit
        </button>

        <button type="button"
          class="barcode-card-delete">
          ×
        </button>
      `;

      row.querySelector(
        '.barcode-card-edit'
      ).onclick = () =>
        openEdit(card);

      row.querySelector(
        '.barcode-card-delete'
      ).onclick = () =>
        del(card.id);

      list.appendChild(row);

    });

  }


  /* ---------- EDITOR ---------- */

  function openEdit(card) {

    hideEdit();

    editing =
      card.id;

    const panel =
      buildPanel(card);

    document.body.appendChild(panel);

    requestAnimationFrame(() => {

      panel.classList.add('open');

      const input =
        panel.querySelector(
          '.barcode-edit-part-number'
        );

      if (input) {

        input.focus();
        input.select();

      }

    });

  }


  function hideEdit() {

    const panel =
      document.querySelector(
        '.barcode-edit-panel'
      );

    if (panel) {
      panel.remove();
    }

    editing = null;

  }


  function buildPanel(card) {

    const panel =
      document.createElement('div');

    panel.className =
      'barcode-edit-panel';

    panel.innerHTML = `

      <div class="barcode-edit-inner">

        <div class="barcode-edit-header">

          <h3>Edit Barcode</h3>

          <button
            type="button"
            class="barcode-edit-close">
            ×
          </button>

        </div>

        <label>
          Part Number

          <input
            type="text"
            class="barcode-edit-part-number"
            value="${escapeHTML(card.partNumber)}"
          >

        </label>

        <label>
          Description

          <input
            type="text"
            class="barcode-edit-subtext"
            value="${escapeHTML(card.subtext)}"
          >

        </label>

        <div class="barcode-edit-actions">

          <button
            type="button"
            class="barcode-edit-delete">
            Delete
          </button>

          <button
            type="button"
            class="barcode-edit-save">
            Save
          </button>

        </div>

      </div>

    `;


    const part =
      panel.querySelector(
        '.barcode-edit-part-number'
      );

    const sub =
      panel.querySelector(
        '.barcode-edit-subtext'
      );


    part.addEventListener(
      'input',
      function () {

        card.partNumber =
          part.value;

        refreshCard(card);
        renderList();

      }
    );


    sub.addEventListener(
      'input',
      function () {

        card.subtext =
          sub.value;

        refreshCard(card);
        renderList();

      }
    );


    panel.querySelector(
      '.barcode-edit-close'
    ).onclick =
      hideEdit;


    panel.querySelector(
      '.barcode-edit-save'
    ).onclick =
      hideEdit;


    panel.querySelector(
      '.barcode-edit-delete'
    ).onclick =
      () => del(card.id);


    return panel;

  }


  function escapeHTML(value) {

    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  }


  /* ---------- INIT ---------- */

  function init() {

    const card =
      document.querySelector(
        '#barcode-drop'
      );

    if (!card) return;

    if (
      card.dataset.barcodeReady === 'true'
    ) {
      return;
    }

    card.dataset.barcodeReady =
      'true';

    card.style.cursor =
      'pointer';

    card.addEventListener(
      'click',
      function (e) {

        e.preventDefault();
        e.stopPropagation();

        toggleDropdown();

      }
    );

  }


  document.addEventListener(
    'db-tool-open',
    e => {

      if (
        e.detail?.id === 'barcodes'
      ) {
        init();
      }

    }
  );


  window.MTWBarcodeCards = {

    state,

    addCard: add,

    deleteCard: del,

    getCard: get,

    openTemplate,

    showEditPanel: openEdit,

    hideEditPanel: hideEdit,

    renderList

  };


  init();

})();
