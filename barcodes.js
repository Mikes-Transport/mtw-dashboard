'use strict';

(function () {

  const TEMPLATES = {
    standard: {
      name: 'x2 Label Template'
    },

    small: {
      name: 'x4 Label Template'
    },

    medium: {
      name: 'x8 Label Template'
    },

    large: {
      name: 'x10 Label Template'
    },

    xlarge: {
      name: 'x30 Label Template'
    }
  };

  let MENU = null;

  function init() {

    const CARD =
      document.querySelector('#barcode-drop');

    if (!CARD) return;

    if (MENU) return;

    MENU =
      document.createElement('div');

    MENU.className =
      'db-list-dropdown';

    Object.entries(TEMPLATES)
      .forEach(([id, template]) => {

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

        MENU.appendChild(item);

      });

    CARD.parentElement.appendChild(MENU);

    CARD.addEventListener('click', e => {

      e.preventDefault();
      e.stopPropagation();

      MENU.classList.toggle('open');

    });

    MENU
      .querySelectorAll(
        '.db-list-dropdown-card'
      )
      .forEach(item => {

        item.addEventListener('click', e => {

          e.preventDefault();
          e.stopPropagation();

          const template =
            item.dataset.barcodeTemplate;

          MENU.classList.remove('open');

          document.dispatchEvent(
            new CustomEvent(
              'barcode-template-select',
              {
                detail: {
                  template
                }
              }
            )
          );

        });

      });

    document.addEventListener('click', e => {

      if (
        !CARD.contains(e.target) &&
        !MENU.contains(e.target)
      ) {
        MENU.classList.remove('open');
      }

    });

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

  init();

})();
