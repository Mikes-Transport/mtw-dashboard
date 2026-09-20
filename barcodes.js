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

  function createDropdown(wrapper) {

    if (wrapper.dataset.loaded === 'true') {
      return;
    }

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

    wrapper.dataset.loaded = 'true';
  }

  function toggleDropdown() {

  const wrapper =
    document.querySelector(
      '.db-list-dropdown-wrapper'
    );

  if (!wrapper) return;

  createDropdown(wrapper);

  const isOpen =
    wrapper.classList.contains('open');

  if (isOpen) {

    wrapper.style.height =
      wrapper.scrollHeight + 'px';

    requestAnimationFrame(() => {
      wrapper.style.height = '0px';
    });

    wrapper.classList.remove('open');

  } else {

    wrapper.style.height = '0px';

    wrapper.classList.add('open');

    requestAnimationFrame(() => {

      wrapper.style.height =
        wrapper.scrollHeight + 'px';

    });

  }

}

 function init() {

  const card =
    document.querySelector('#barcode-drop');

  if (!card) return;

  if (card.dataset.barcodeReady === 'true') {
    return;
  }

  card.dataset.barcodeReady = 'true';
  card.style.cursor = 'pointer';

  card.addEventListener('click', function (e) {

    e.preventDefault();
    e.stopPropagation();

    toggleDropdown();

  });

}

  document.addEventListener(
    'db-tool-open',
    e => {

      if (e.detail?.id === 'barcodes') {
        init();
      }

    }
  );

  init();

})();
