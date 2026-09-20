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

  function createDropdown(card) {

    let dropdown =
      card.parentElement.querySelector(
        '.db-list-dropdown'
      );

    if (dropdown) {
      dropdown.classList.toggle('open');
      return;
    }

    dropdown =
      document.createElement('div');

    dropdown.className =
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
        dropdown.appendChild(item);

      });

    card.parentElement.appendChild(dropdown);

    requestAnimationFrame(() => {
      dropdown.classList.add('open');
    });

  }

  function init() {

    const card =
      document.querySelector('#barcode-drop');

    if (!card) return;

    card.style.cursor = 'pointer';

    card.onclick = function (e) {

      e.preventDefault();
      e.stopPropagation();

      createDropdown(card);

    };

  }

  document.addEventListener(
    'db-tool-open',
    e => {

      if (e.detail?.id !== 'barcodes') {
        return;
      }

      init();

    }
  );

  init();

})();
