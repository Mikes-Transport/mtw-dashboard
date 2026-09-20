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

  function createDropdown() {

  const wrapper =
    document.querySelector(
      '.db-list-dropdown-wrapper'
    );

  if (!wrapper) return;

  wrapper.innerHTML = '';

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
      wrapper.appendChild(item);

    });

  wrapper.classList.add('open');
}

  function init() {

  const card =
    document.querySelector('#barcode-drop');

  if (!card) return;

  card.style.cursor = 'pointer';

  card.onclick = function (e) {

    e.preventDefault();
    e.stopPropagation();

    createDropdown();

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
