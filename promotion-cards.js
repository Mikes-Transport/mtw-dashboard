'use strict';

const { $, $$ } = window.MTW;

(function () {

  const T = {
    ep: {
      card: 'et-everyday-card',
      cut: 'everyday-card-cut',
      inner: 'everyday-card',
      title: 'everyday-card-title-wrapper',
      h2: 'H2-text-card-white',
      bodyWrap: 'everyday-card-body-wrapper',
      body: 'everyday-card-body'
    },
    cp: {
      card: 'et-clearance-card',
      cut: 'clearance-card-cut',
      inner: 'clearance-card',
      title: 'clearance-card-title-wrapper',
      h2: 'H2-text-card-black',
      price: 'black',
      bodyWrap: 'clearance-card-body-wrapper',
      body: 'clearance-card-body'
    },
    pp: {
      card: 'et-promo-card',
      cut: 'promo-card-cut',
      inner: 'promo-card',
      title: 'promo-card-title-wrapper',
      h2: 'H2-text-card-white',
      price: 'red',
      bodyWrap: 'promo-card-body-wrapper',
      body: 'promo-card-body'
    }
  };

  const HEAD = {
    ep: 'EVERYDAY LOW PRICES!',
    cp: 'MASSIVE CLEARANCE!',
    pp: 'HOT PROMO PRICES!'
  };

  const CAPS = {
    nineup: 9,
    sixup: 6,
    fourup: 4,
    twoup: 2,
    oneup: 1
  };

  const GRID = {
    nineup: [3, 3],
    sixup: [3, 2],
    fourup: [2, 2],
    twoup: [1, 2],
    oneup: [1, 1]
  };

  const TEXT_CLASS = {
    oneup: 'one',
    twoup: 'two',
    fourup: 'four',
    sixup: 'six'
  };

  const FIELD_NAMES = {
    title: 'Product Title',
    description: 'Description',
    price: 'Price',
    oldPrice: 'Old Price',
    partNumber: 'Part Number',
    extraNote: 'Extra Note'
  };

  const DEFAULT_FIELDS = {
    title: {
      v: 1,
      a: 'left',
      fit: 1,
      size: null,
      line: null
    },
    description: {
      v: 1,
      a: 'left',
      fit: 1,
      size: null,
      line: null
    },
    price: {
      v: 1,
      a: 'left',
      fit: 1,
      size: null,
      line: null
    },
    oldPrice: {
      v: 1,
      a: 'right',
      fit: 1,
      size: null,
      line: null
    },
    partNumber: {
      v: 1,
      a: 'left',
      fit: 1,
      size: null,
      line: null
    },
    extraNote: {
      v: 1,
      a: 'left',
      fit: 1,
      size: null,
      line: null
    }
  };

  const state = {
    type: 'ep',
    layout: 'nineup',
    cards: []
  };

  const els = {};

  let id = 0;
  let editing = null;

  function clone(x) {
    return JSON.parse(JSON.stringify(x));
  }

  function defaultText(text = '') {
    return {
      text,
      fields: {
        v: 1,
        a: 'left',
        fit: 1,
        size: null,
        line: null
      }
    };
  }

  function defaultContent(text = '') {
    return {
      display: 'block',
      direction: 'column',
      justify: 'start',
      align: 'stretch',
      wrap: 'nowrap',
      columns: 1,
      rows: 1,
      gap: 0,
      rowGap: 0,
      columnGap: 0,
      items: [
        {
          text,
          fields: {
            v: 1,
            a: 'left',
            fit: 1,
            size: null,
            line: null
          },
          texts: [
            defaultText(text)
          ]
        }
      ]
    };
  }

  function normalizeContent(x, text = '') {

    const d = defaultContent(text);

    if (!x) return d;

    let items = [];

    if (Array.isArray(x.items) && x.items.length) {

      items = x.items.map(item => {

        const fallback =
          defaultText(item.text ?? '');

        let texts;

        if (
          Array.isArray(item.texts) &&
          item.texts.length
        ) {

          texts = item.texts.map(t => ({
            text: t.text ?? '',
            fields: Object.assign(
              clone(fallback.fields),
              t.fields || {}
            )
          }));

        } else {

          texts = [{
            text: item.text ?? text,
            fields: Object.assign(
              clone(fallback.fields),
              item.fields || {}
            )
          }];
        }

        return {
          text: texts[0]?.text ?? '',
          fields: Object.assign(
            clone(fallback.fields),
            item.fields || {}
          ),
          texts
        };
      });

    } else {

      items = d.items;
    }

    return {
      display: x.display || d.display,
      direction: x.direction || d.direction,
      justify: x.justify || d.justify,
      align: x.align || d.align,
      wrap: x.wrap || d.wrap,
      columns: Number(x.columns) || 1,
      rows: Number(x.rows) || 1,
      gap: Number(x.gap) || 0,
      rowGap: Number(x.rowGap) || 0,
      columnGap: Number(x.columnGap) || 0,
      items
    };
  }

  function cardData(x = {}) {

    const c = Object.assign({

      id: 'card-' + (++id),

      title: 'PRODUCT TITLE',

      description:
        'Product description goes here. Maximum of 2 lines.',

      price: '999.99',

      oldPrice: '999.99',

      partNumber: '#00000',

      extraNote: 'EXCLUSIVE OF GST'

    }, x);

    c.style = c.style || {};

    c.style.fields = Object.assign(
      clone(DEFAULT_FIELDS),
      c.style.fields || {}
    );

    c.style.description =
      normalizeContent(
        c.style.description,
        c.description
      );

    c.style.partNumber =
      normalizeContent(
        c.style.partNumber,
        c.partNumber
      );

    c.style.extraNote =
      normalizeContent(
        c.style.extraNote,
        c.extraNote
      );

    c.style.oldPrice =
      normalizeContent(
        c.style.oldPrice,
        c.oldPrice
      );

    return c;
  }

  function get(i) {
    return state.cards.find(
      c => c.id === i
    );
  }

  function add(x) {

    const c = cardData(x);

    state.cards.push(c);

    render();

    return c;
  }

  function del(i) {

    state.cards =
      state.cards.filter(
        c => c.id !== i
      );

    if (editing === i) {
      hideEdit();
    }

    render();
  }

  function cache() {

    els.header =
      $('.et-header-wrapper');

    els.type =
      $('.et-tool-type-selector');

    els.layout =
      $('.et-card-type-selector');

    els.list =
      $('.et-current-card-wrapper');

    els.cardView =
      $('.card-view-container');

    els.scrollBtnLeft =
      $('.card-click-scroll-left');

    els.scrollBtnRight =
      $('.card-click-scroll-right');

    els.left =
      $('.db-left-content');

    els.menu =
      $('.db-menu-list');

    els.add =
      $('.et-add-card-wrapper [btn="add"]');

    els.print =
      $('.et-print-card-wrapper [btn="print"]');

    els.pages =
      $('.et-card-body-wrapper');
  }

  function flexJ(v) {

    return {
      start: 'flex-start',
      center: 'center',
      end: 'flex-end',
      between: 'space-between',
      around: 'space-around',
      even: 'space-evenly'
    }[v] || v;
  }

  function flexA(v) {

    return {
      start: 'flex-start',
      center: 'center',
      end: 'flex-end',
      stretch: 'stretch'
    }[v] || v;
  }

  function fieldStyle(el, c, key) {

    const f =
      ((c.style || {}).fields ||
        DEFAULT_FIELDS)[key] ||
      DEFAULT_FIELDS[key];

    el.style.display =
      f.v ? '' : 'none';

    el.style.textAlign =
      f.a || '';

    el.style.fontSize =
      f.size
        ? f.size + 'px'
        : '';

    el.style.lineHeight =
      f.line || '';
  }

  function applyContentStyle(
    el,
    c,
    key
  ) {

    const s = c.style[key];

    if (!el || !s) return;

    el.style.display =
      s.display || 'block';

    if (s.display === 'flex') {

      el.style.flexDirection =
        s.direction || 'column';

      el.style.justifyContent =
        flexJ(s.justify || 'start');

      el.style.alignItems =
        flexA(s.align || 'stretch');

      el.style.flexWrap =
        s.wrap || 'nowrap';
    }

    if (s.display === 'grid') {

      el.style.gridTemplateColumns =
        'repeat(' +
        (s.columns || 1) +
        ',minmax(0,1fr))';

      el.style.gridTemplateRows =
        'repeat(' +
        (s.rows || 1) +
        ',minmax(0,auto))';
    }

    el.style.gap =
      (s.gap ?? 0) + 'px';

    el.style.rowGap =
      (s.rowGap ?? 0) + 'px';

    el.style.columnGap =
      (s.columnGap ?? 0) + 'px';
  }

  function getItemTexts(item) {

    if (
      Array.isArray(item.texts) &&
      item.texts.length
    ) {
      return item.texts;
    }

    return [{
      text: item.text ?? '',
      fields: Object.assign(
        {
          v: 1,
          a: 'left',
          fit: 1,
          size: null,
          line: null
        },
        item.fields || {}
      )
    }];
  }

  function buildContent(
    c,
    key,
    className
  ) {

    const s = c.style[key];

    const wrap =
      document.createElement('div');

    wrap.className =
      className;

    wrap.dataset.content =
      key;

    applyContentStyle(
      wrap,
      c,
      key
    );

    s.items.forEach(
      (item, index) => {

        const cell =
          document.createElement('div');

        cell.className =
          'card-config-item';

        cell.dataset.contentItem =
          index;

        if (
          s.display === 'grid' ||
          s.display === 'flex'
        ) {

          cell.style.display =
            'flex';

          cell.style.flexDirection =
            'column';

          cell.style.minWidth =
            '0';
        }

        getItemTexts(item)
          .forEach(
            (txt, textIndex) => {

              const text =
                document.createElement(
                  'div'
                );

              text.className =
                'card-config-text';

              text.dataset.contentText =
                textIndex;

              text.textContent =
                txt.text || '';

              text.style.whiteSpace =
                'pre-line';

              const f =
                txt.fields || {
                  v: 1,
                  a: 'left',
                  fit: 1,
                  size: null,
                  line: null
                };

              text.style.display =
                f.v ? '' : 'none';

              text.style.textAlign =
                f.a || 'left';

              text.style.fontSize =
                f.size
                  ? f.size + 'px'
                  : '';

              text.style.lineHeight =
                f.line || '';

              cell.appendChild(
                text
              );
            }
          );

        wrap.appendChild(
          cell
        );
      }
    );

    return wrap;
  }

  function build(c) {

    const t = T[state.type];

    const size =
      TEXT_CLASS[state.layout];

    const wrap =
      document.createElement('div');

    wrap.className =
      t.card;

    wrap.dataset.cardId =
      c.id;

    const cut =
      document.createElement('div');

    cut.className =
      t.cut;

    const inner =
      document.createElement('div');

    inner.className =
      t.inner;

    const titleWrap =
      document.createElement('div');

    titleWrap.className =
      t.title;

    const h2 =
      document.createElement('h2');

    h2.className =
      t.h2;

    h2.textContent =
      HEAD[state.type];

    titleWrap.appendChild(
      h2
    );

    const bw =
      document.createElement('div');

    bw.className =
      t.bodyWrap;

    const body =
      document.createElement('div');

    body.className =
      t.body;

    const top =
      document.createElement('div');

    top.className =
      'card-top-wrapper';

    const title =
      document.createElement('div');

    title.className =
      'card-grid-title';

    title.dataset.field =
      'title';

    const titleText =
      document.createElement('div');

    titleText.className =
      'card-text-title';

    titleText.textContent =
      c.title;

    if (size) {
      titleText.classList.add(size);
    }

    title.appendChild(
      titleText
    );

    const desc =
      buildContent(
        c,
        'description',
        'card-grid-description'
      );

    desc.dataset.field =
      'description';

    top.append(
      title,
      desc
    );

    const bottom =
      document.createElement('div');

    bottom.className =
      'card-bottom-wrapper';

    const price =
      document.createElement('div');

    price.className =
      'card-text-price';

    price.dataset.field =
      'price';

    if (size) {
      price.classList.add(size);
    }

    if (t.price) {
      price.classList.add(t.price);
    }

    price.textContent =
      '$' + c.price;

    const extraGrid =
      document.createElement('div');

    extraGrid.className =
      'card-extra-info-grid';

    const leftGroup =
      document.createElement('div');

    leftGroup.className =
      'card-extra-info';

    const part =
      buildContent(
        c,
        'partNumber',
        'card-grid-part-number'
      );

    part.dataset.field =
      'partNumber';

    const note =
      buildContent(
        c,
        'extraNote',
        'card-grid-extra-note'
      );

    note.dataset.field =
      'extraNote';

    leftGroup.append(
      part,
      note
    );

    const oldWrap =
      document.createElement('div');

    oldWrap.className =
      'card-old-price-wrapper';

    const old =
      buildContent(
        c,
        'oldPrice',
        'card-grid-old-price'
      );

    old.dataset.field =
      'oldPrice';

    oldWrap.appendChild(
      old
    );

    extraGrid.append(
      leftGroup,
      oldWrap
    );

    bottom.append(
      price,
      extraGrid
    );

    body.append(
      top,
      bottom
    );

    bw.appendChild(
      body
    );

    inner.append(
      titleWrap,
      bw
    );

    wrap.append(
      cut,
      inner
    );

    const overlay =
      document.createElement('div');

    overlay.className =
      'et-card-overlay';

    overlay.innerHTML = `
      <div class="et-card-overlay-icon">
        <svg viewBox="0 0 24 24" fill="none">
          <path
            d="M20 16v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="m12.5 15.8 9.5-9.6L17.8 2l-9.5 9.5L8 16l4.5-.2Z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    `;

    overlay.onclick =
      e => {

        e.stopPropagation();

        openEdit(c);
      };

    wrap.appendChild(
      overlay
    );

    applyElementSettings(
      wrap,
      c
    );

    return wrap;
  }

  function applyElementSettings(
    el,
    c
  ) {

    const title =
      el.querySelector(
        '.card-grid-title'
      );

    const titleText =
      title?.querySelector(
        '.card-text-title'
      );

    if (titleText) {

      fieldStyle(
        titleText,
        c,
        'title'
      );
    }

    [
      'description',
      'partNumber',
      'extraNote',
      'oldPrice'
    ].forEach(
      key => {

        const target =
          el.querySelector(
            '[data-field="' +
            key +
            '"]'
          );

        if (!target) return;

        applyContentStyle(
          target,
          c,
          key
        );

        target
          .querySelectorAll(
            '.card-config-item'
          )
          .forEach(
            (cell, index) => {

              const item =
                c.style[key]
                  .items[index];

              if (!item) return;

              getItemTexts(item)
                .forEach(
                  (txt, textIndex) => {

                    const x =
                      cell.querySelectorAll(
                        '.card-config-text'
                      )[textIndex];

                    if (!x) return;

                    const f =
                      txt.fields || {};

                    x.style.display =
                      f.v
                        ? ''
                        : 'none';

                    x.style.textAlign =
                      f.a || 'left';

                    x.style.fontSize =
                      f.size
                        ? f.size + 'px'
                        : '';

                    x.style.lineHeight =
                      f.line || '';
                  }
                );
            }
          );
      }
    );

    const price =
      el.querySelector(
        '[data-field="price"]'
      );

    if (price) {

      fieldStyle(
        price,
        c,
        'price'
      );
    }
  }

  function resetFonts(el) {

    el
      .querySelectorAll(
        '.card-text-title,' +
        '.card-config-text,' +
        '.card-text-price,' +
        '.card-text-price-old,' +
        '.card-text-extra'
      )
      .forEach(
        x => {
          x.style.fontSize = '';
        }
      );
  }

  function fitAll() {

    document
      .querySelectorAll(
        '.et-everyday-card[data-card-id],' +
        '.et-clearance-card[data-card-id],' +
        '.et-promo-card[data-card-id]'
      )
      .forEach(
        el => {

          const top =
            el.querySelector(
              '.card-top-wrapper'
            );

          if (!top) return;

          const keys = [
            ['price', .55, .97],
            ['oldPrice', .75, .99],
            ['partNumber', .75, .99],
            ['extraNote', .75, .99],
            ['title', .85, .995],
            ['description', .85, .995]
          ];

          const base = {};

          keys.forEach(
            x => {

              const e =
                el.querySelector(
                  '[data-field="' +
                  x[0] +
                  '"]'
                );

              base[x[0]] =
                e
                  ? parseFloat(
                      getComputedStyle(e)
                        .fontSize
                    ) || 0
                  : 0;
            }
          );

          let n = 0;

          while (
            n < 80 &&
            top.scrollHeight >
              top.clientHeight + 1
          ) {

            let changed =
              false;

            keys.forEach(
              ([k, min, ratio]) => {

                const e =
                  el.querySelector(
                    '[data-field="' +
                    k +
                    '"]'
                  );

                if (!e) return;

                const cur =
                  parseFloat(
                    getComputedStyle(e)
                      .fontSize
                  ) || 0;

                const floor =
                  base[k] * min;

                if (cur > floor) {

                  const next =
                    Math.max(
                      cur * ratio,
                      floor
                    );

                  e
                    .querySelectorAll(
                      '.card-config-text'
                    )
                    .forEach(
                      x => {
                        x.style.fontSize =
                          next + 'px';
                      }
                    );

                  if (
                    k === 'title' ||
                    k === 'price'
                  ) {
                    e.style.fontSize =
                      next + 'px';
                  }

                  if (next < cur) {
                    changed = true;
                  }
                }
              }
            );

            if (!changed) break;

            n++;
          }
        }
      );
  }

  function live(c, key) {

    const el =
      document.querySelector(
        '[data-card-id="' +
        c.id +
        '"].et-everyday-card,' +
        '[data-card-id="' +
        c.id +
        '"].et-clearance-card,' +
        '[data-card-id="' +
        c.id +
        '"].et-promo-card'
      );

    if (el) {

      const target =
        el.querySelector(
          '[data-field="' +
          key +
          '"]'
        );

      if (target) {

        if (
          key === 'title' ||
          key === 'price'
        ) {

          const x =
            target.querySelector(
              '.card-text-title'
            ) ||
            target;

          x.textContent =
            key === 'price'
              ? '$' + c[key]
              : c[key];

        } else {

          const s =
            c.style[key];

          target.innerHTML = '';

          s.items.forEach(
            item => {

              const cell =
                document.createElement(
                  'div'
                );

              cell.className =
                'card-config-item';

              if (
                s.display === 'grid' ||
                s.display === 'flex'
              ) {

                cell.style.display =
                  'flex';

                cell.style.flexDirection =
                  'column';

                cell.style.minWidth =
                  '0';
              }

              getItemTexts(item)
                .forEach(
                  txt => {

                    const text =
                      document.createElement(
                        'div'
                      );

                    text.className =
                      'card-config-text';

                    text.textContent =
                      txt.text || '';

                    text.style.whiteSpace =
                      'pre-line';

                    const f =
                      txt.fields || {};

                    text.style.display =
                      f.v
                        ? ''
                        : 'none';

                    text.style.textAlign =
                      f.a || 'left';

                    text.style.fontSize =
                      f.size
                        ? f.size + 'px'
                        : '';

                    text.style.lineHeight =
                      f.line || '';

                    cell.appendChild(
                      text
                    );
                  }
                );

              target.appendChild(
                cell
              );
            }
          );

          applyContentStyle(
            target,
            c,
            key
          );
        }

        resetFonts(el);

        requestAnimationFrame(
          fitAll
        );
      }
    }
  }

  function refreshCard(i) {

    const c = get(i);

    if (!c) return;

    const old =
      document.querySelector(
        '[data-card-id="' +
        i +
        '"].et-everyday-card,' +
        '[data-card-id="' +
        i +
        '"].et-clearance-card,' +
        '[data-card-id="' +
        i +
        '"].et-promo-card'
      );

    if (old) {

      const fresh =
        build(c);

      old.replaceWith(
        fresh
      );

      requestAnimationFrame(
        fitAll
      );
    }
  }

  function row(c) {

    const r =
      document.createElement('div');

    r.className =
      'et-current-card';

    r.dataset.cardId =
      c.id;

    const title =
      document.createElement('div');

    title.className =
      'et-small-txt';

    title.textContent =
      c.title;

    const part =
      document.createElement('div');

    part.className =
      'et-small-txt';

    part.textContent =
      c.partNumber;

    const actions =
      document.createElement('div');

    actions.className =
      'et-current-card-action-wrapper';

    const edit =
      document.createElement('div');

    edit.className =
      'et-action-button';

    edit.setAttribute(
      'btn',
      'edit'
    );

    const et =
      document.createElement('div');

    et.className =
      'et-xsmall-txt';

    et.textContent =
      'Edit';

    edit.appendChild(
      et
    );

    const remove =
      document.createElement('div');

    remove.className =
      'et-action-button';

    remove.setAttribute(
      'btn',
      'delete'
    );

    const rt =
      document.createElement('div');

    rt.className =
      'et-xsmall-txt';

    rt.textContent =
      'X';

    remove.appendChild(
      rt
    );

    actions.append(
      edit,
      remove
    );

    r.append(
      title,
      part,
      actions
    );

    return r;
  }

  function scrollCurrentCards(
    container,
    direction
  ) {

    if (!container) return;

    const amount =
      Math.max(
        1,
        container.clientWidth - 40
      );

    container.scrollBy({
      left:
        amount * direction,
      behavior:
        'smooth'
    });
  }

  function renderList() {

    if (!els.cardView) return;

    els.cardView.innerHTML = '';

    state.cards.forEach(
      c => {

        els.cardView.appendChild(
          row(c)
        );
      }
    );
  }

  function chunk(a, n) {

    const out = [];

    for (
      let i = 0;
      i < a.length;
      i += n
    ) {
      out.push(
        a.slice(i, i + n)
      );
    }

    return out;
  }

  function render() {

    if (!els.pages) return;

    els.pages.innerHTML = '';

    els.pages.style.display =
      'flex';

    els.pages.style.flexDirection =
      'column';

    els.pages.style.justifyContent =
      'flex-start';

    els.pages.style.alignItems =
      'center';

    const pages =
      state.cards.length
        ? chunk(
            state.cards,
            CAPS[state.layout]
          )
        : [[]];

    pages.forEach(
      cards => {

        const page =
          document.createElement('div');

        page.className =
          'et-page';

        page.style.width =
          '210mm';

        page.style.height =
          '297mm';

        page.style.boxSizing =
          'border-box';

        page.style.overflow =
          'hidden';

        const grid =
          document.createElement('div');

        grid.className =
          'et-grid-cards ' +
          state.layout;

        const g =
          GRID[state.layout];

        grid.style.display =
          'grid';

        grid.style.gridTemplateColumns =
          'repeat(' +
          g[0] +
          ',1fr)';

        grid.style.gridTemplateRows =
          'repeat(' +
          g[1] +
          ',1fr)';

        grid.style.gridAutoFlow =
          'row';

        grid.style.width =
          '100%';

        grid.style.height =
          '100%';

        grid.style.boxSizing =
          'border-box';

        cards.forEach(
          c => {
            grid.appendChild(
              build(c)
            );
          }
        );

        page.appendChild(
          grid
        );

        els.pages.appendChild(
          page
        );
      }
    );

    renderList();

    requestAnimationFrame(
      fitAll
    );
  }

  function openEdit(c) {

    if (!c) return;

    const left =
      document.querySelector(
        '.db-left-content'
      );

    if (!left) {

      console.warn(
        '[ET Pricing] .db-left-content not found'
      );

      return;
    }

    const old =
      left.querySelector(
        '.et-edit-panel'
      );

    if (old) {
      old.remove();
    }

    editing =
      c.id;

    if (els.menu) {
      els.menu.style.display =
        'none';
    }

    left.classList.add(
      'editing'
    );

    const panel =
      buildPanel(c);

    left.appendChild(
      panel
    );

    panel.style.display =
      'flex';

    panel.style.flexDirection =
      'column';

    panel.style.width =
      '100%';

    panel.style.minWidth =
      '0';

    panel.style.minHeight =
      '0';

    panel.style.flex =
      '1 1 auto';

    panel.style.overflowY =
      'auto';

    panel.style.overflowX =
      'hidden';

    panel.style.boxSizing =
      'border-box';

    requestAnimationFrame(
      () => {
        panel.scrollTop = 0;
      }
    );
  }

  function hideEdit() {

    editing = null;

    const left =
      document.querySelector(
        '.db-left-content'
      );

    if (left) {

      const panel =
        left.querySelector(
          '.et-edit-panel'
        );

      if (panel) {
        panel.remove();
      }

      left.classList.remove(
        'editing'
      );
    }

    if (els.menu) {
      els.menu.style.display =
        '';
    }
  }

  function select(
    label,
    value,
    options,
    fn
  ) {

    const wrap =
      document.createElement('div');

    wrap.className =
      'et-control-row';

    const l =
      document.createElement('label');

    l.className =
      'et-control-label';

    l.textContent =
      label;

    const s =
      document.createElement('select');

    s.className =
      'et-control';

    options.forEach(
      ([v, t]) => {

        const o =
          document.createElement(
            'option'
          );

        o.value =
          v;

        o.textContent =
          t;

        o.selected =
          String(v) ===
          String(value);

        s.appendChild(o);
      }
    );

    s.onchange =
      () => fn(s.value);

    wrap.append(
      l,
      s
    );

    return wrap;
  }

  function num(
    label,
    value,
    fn
  ) {

    const wrap =
      document.createElement('div');

    wrap.className =
      'et-control-row';

    const l =
      document.createElement('label');

    l.className =
      'et-control-label';

    l.textContent =
      label;

    const input =
      document.createElement('input');

    input.className =
      'et-control et-number';

    input.type =
      'number';

    input.value =
      value ?? '';

    input.oninput =
      () => fn(
        input.value
      );

    wrap.append(
      l,
      input
    );

    return wrap;
  }

  function control(
    label,
    value,
    fn
  ) {

    const wrap =
      document.createElement('div');

    wrap.className =
      'et-control-row';

    const l =
      document.createElement('label');

    l.className =
      'et-control-label';

    l.textContent =
      label;

    const input =
      document.createElement('input');

    input.className =
      'et-checkbox';

    input.type =
      'checkbox';

    input.checked =
      !!value;

    input.onchange =
      () => fn(
        input.checked
      );

    wrap.append(
      l,
      input
    );

    return wrap;
  }

  function contentField(
    c,
    key,
    type
  ) {

    const wrap =
      document.createElement('div');

    wrap.className =
      'et-field-group';

    const label =
      document.createElement('label');

    label.className =
      'et-field-label';

    label.textContent =
      FIELD_NAMES[key];

    const input =
      document.createElement(
        type === 'textarea'
          ? 'textarea'
          : 'input'
      );

    input.className =
      'et-field-input';

    if (type !== 'textarea') {
      input.type = type || 'text';
    }

    input.value =
      c[key] ?? '';

    input.oninput =
      () => {

        c[key] =
          input.value;

        if (
          key === 'description' ||
          key === 'partNumber' ||
          key === 'extraNote' ||
          key === 'oldPrice'
        ) {

          if (
            c.style[key] &&
            c.style[key].items?.[0]
          ) {

            c.style[key]
              .items[0]
              .text =
              input.value;

            if (
              c.style[key]
                .items[0]
                .texts?.[0]
            ) {

              c.style[key]
                .items[0]
                .texts[0]
                .text =
                input.value;
            }
          }
        }

        live(
          c,
          key
        );
      };

    wrap.append(
      label,
      input
    );

    return wrap;
  }

  function fieldSettings(
    c,
    key
  ) {

    const wrap =
      document.createElement('div');

    wrap.className =
      'et-field-settings';

    const f =
      c.style.fields[key] ||
      clone(DEFAULT_FIELDS[key]);

    wrap.append(
      control(
        'Visible',
        f.v,
        v => {

          f.v =
            v ? 1 : 0;

          c.style.fields[key] =
            f;

          live(
            c,
            key
          );
        }
      ),

      select(
        'Alignment',
        f.a,
        [
          ['left', 'Left'],
          ['center', 'Center'],
          ['right', 'Right']
        ],
        v => {

          f.a =
            v;

          c.style.fields[key] =
            f;

          live(
            c,
            key
          );
        }
      ),

      num(
        'Font Size',
        f.size,
        v => {

          f.size =
            v === ''
              ? null
              : Number(v);

          c.style.fields[key] =
            f;

          live(
            c,
            key
          );
        }
      ),

      num(
        'Line Height',
        f.line,
        v => {

          f.line =
            v === ''
              ? null
              : Number(v);

          c.style.fields[key] =
            f;

          live(
            c,
            key
          );
        }
      ),

      control(
        'Auto Fit',
        f.fit,
        v => {

          f.fit =
            v ? 1 : 0;

          c.style.fields[key] =
            f;

          live(
            c,
            key
          );
        }
      )
    );

    return wrap;
  }

  function contentEditor(
    c,
    key
  ) {

    const s =
      c.style[key];

    const wrap =
      document.createElement('div');

    wrap.className =
      'et-content-editor';

    wrap.append(

      select(
        'Display',
        s.display,
        [
          ['block', 'Block'],
          ['flex', 'Flex'],
          ['grid', 'Grid']
        ],
        v => {

          s.display =
            v;

          live(
            c,
            key
          );
        }
      ),

      select(
        'Direction',
        s.direction,
        [
          ['column', 'Column'],
          ['row', 'Row']
        ],
        v => {

          s.direction =
            v;

          live(
            c,
            key
          );
        }
      ),

      select(
        'Justify',
        s.justify,
        [
          ['start', 'Start'],
          ['center', 'Center'],
          ['end', 'End'],
          ['between', 'Space Between'],
          ['around', 'Space Around'],
          ['even', 'Space Evenly']
        ],
        v => {

          s.justify =
            v;

          live(
            c,
            key
          );
        }
      ),

      select(
        'Align',
        s.align,
        [
          ['stretch', 'Stretch'],
          ['start', 'Start'],
          ['center', 'Center'],
          ['end', 'End']
        ],
        v => {

          s.align =
            v;

          live(
            c,
            key
          );
        }
      ),

      select(
        'Wrap',
        s.wrap,
        [
          ['nowrap', 'No Wrap'],
          ['wrap', 'Wrap']
        ],
        v => {

          s.wrap =
            v;

          live(
            c,
            key
          );
        }
      ),

      num(
        'Columns',
        s.columns,
        v => {

          s.columns =
            Math.max(
              1,
              Number(v) || 1
            );

          live(
            c,
            key
          );
        }
      ),

      num(
        'Rows',
        s.rows,
        v => {

          s.rows =
            Math.max(
              1,
              Number(v) || 1
            );

          live(
            c,
            key
          );
        }
      ),

      num(
        'Gap',
        s.gap,
        v => {

          s.gap =
            Number(v) || 0;

          live(
            c,
            key
          );
        }
      ),

      num(
        'Row Gap',
        s.rowGap,
        v => {

          s.rowGap =
            Number(v) || 0;

          live(
            c,
            key
          );
        }
      ),

      num(
        'Column Gap',
        s.columnGap,
        v => {

          s.columnGap =
            Number(v) || 0;

          live(
            c,
            key
          );
        }
      )
    );

    return wrap;
  }

  function simpleFieldEditor(
    c,
    key
  ) {

    const wrap =
      document.createElement('div');

    wrap.className =
      'et-simple-field-editor';

    wrap.append(
      fieldSettings(
        c,
        key
      )
    );

    return wrap;
  }

  function section(
    title,
    content
  ) {

    const wrap =
      document.createElement('div');

    wrap.className =
      'et-editor-section';

    const head =
      document.createElement('div');

    head.className =
      'et-editor-section-title';

    head.textContent =
      title;

    const body =
      document.createElement('div');

    body.className =
      'et-editor-section-body';

    body.appendChild(
      content
    );

    wrap.append(
      head,
      body
    );

    return wrap;
  }

  function buildPanel(c) {

    const panel =
      document.createElement('div');

    panel.className =
      'et-edit-panel';

    const header =
      document.createElement('div');

    header.className =
      'et-edit-panel-header';

    const title =
      document.createElement('div');

    title.className =
      'et-edit-panel-title';

    title.textContent =
      'Edit Pricing Card';

    const close =
      document.createElement('button');

    close.type =
      'button';

    close.className =
      'et-edit-close';

    close.textContent =
      '×';

    close.onclick =
      hideEdit;

    header.append(
      title,
      close
    );

    const body =
      document.createElement('div');

    body.className =
      'et-edit-panel-body';

    const contentSection =
      document.createElement('div');

    contentSection.className =
      'et-edit-content-section';

    contentSection.append(

      contentField(
        c,
        'title',
        'text'
      ),

      simpleFieldEditor(
        c,
        'title'
      ),

      contentField(
        c,
        'description',
        'textarea'
      ),

      contentEditor(
        c,
        'description'
      ),

      contentField(
        c,
        'price',
        'text'
      ),

      simpleFieldEditor(
        c,
        'price'
      ),

      contentField(
        c,
        'oldPrice',
        'text'
      ),

      contentEditor(
        c,
        'oldPrice'
      ),

      contentField(
        c,
        'partNumber',
        'text'
      ),

      contentEditor(
        c,
        'partNumber'
      ),

      contentField(
        c,
        'extraNote',
        'textarea'
      ),

      contentEditor(
        c,
        'extraNote'
      )
    );

    body.appendChild(
      section(
        'Content',
        contentSection
      )
    );

    const elements =
      document.createElement('div');

    elements.className =
      'et-elements-section';

    [
      'title',
      'price',
      'partNumber',
      'extraNote',
      'oldPrice'
    ].forEach(
      key => {

        elements.appendChild(
          section(
            FIELD_NAMES[key],
            simpleFieldEditor(
              c,
              key
            )
          )
        );
      }
    );

    body.appendChild(
      section(
        'Elements',
        elements
      )
    );

    const footer =
      document.createElement('div');

    footer.className =
      'et-edit-panel-footer';

    const reset =
      document.createElement('button');

    reset.type =
      'button';

    reset.className =
      'et-edit-button';

    reset.textContent =
      'Reset';

    reset.onclick =
      () => {

        c.style.fields =
          clone(DEFAULT_FIELDS);

        c.style.description =
          defaultContent(
            c.description
          );

        c.style.partNumber =
          defaultContent(
            c.partNumber
          );

        c.style.extraNote =
          defaultContent(
            c.extraNote
          );

        c.style.oldPrice =
          defaultContent(
            c.oldPrice
          );

        refreshCard(
          c.id
        );

        openEdit(c);
      };

    const copy =
      document.createElement('button');

    copy.type =
      'button';

    copy.className =
      'et-edit-button';

    copy.textContent =
      'Copy';

    copy.onclick =
      () => {

        const data =
          clone(c);

        delete data.id;

        const n =
          add(data);

        openEdit(n);
      };

    const save =
      document.createElement('button');

    save.type =
      'button';

    save.className =
      'et-edit-button et-edit-save';

    save.textContent =
      'Save';

    save.onclick =
      () => {

        render();

        hideEdit();
      };

    footer.append(
      reset,
      copy,
      save
    );

    panel.append(
      header,
      body,
      footer
    );

    return panel;
  }

  function injectStyles() {

    if (
      document.getElementById(
        'et-pricing-tool-styles'
      )
    ) return;

    const style =
      document.createElement('style');

    style.id =
      'et-pricing-tool-styles';

    style.textContent = `

.db-left-content{
  height:100%!important;
}

.db-left-content.editing{
  width:100%!important;
  height:100%!important;
  min-height:0!important;
  overflow:hidden!important;
  display:flex!important;
  flex-direction:column!important;
  overscroll-behavior:contain!important;
  overscroll-behavior-y:contain!important;
}

.db-left-content.editing .et-edit-panel{
  flex:1 1 auto!important;
  width:100%!important;
  height:auto!important;
  min-height:0!important;
  max-height:none!important;
  overflow-y:auto!important;
  overflow-x:hidden!important;
  box-sizing:border-box!important;
  padding-right:10px!important;
  overscroll-behavior:contain!important;
  overscroll-behavior-y:contain!important;
  -webkit-overflow-scrolling:touch!important;
  scrollbar-width:thin;
  touch-action:pan-y;
  color:white;
}

.et-edit-panel{
  display:flex;
  flex-direction:column;
  width:100%;
  min-width:0;
  min-height:0;
  box-sizing:border-box;
}

.et-edit-panel-header{
  display:flex;
  justify-content:space-between;
  align-items:center;
  flex:0 0 auto;
  margin-bottom:16px;
  padding-bottom:12px;
  border-bottom:1px solid #eee;
}

.et-edit-panel-title{
  font-size:20px;
  font-weight:700;
}

.et-edit-close{
  width:34px;
  height:34px;
  border:0;
  border-radius:6px;
  background:#222;
  color:#fff;
  font-size:24px;
  line-height:1;
  cursor:pointer;
}

.et-edit-panel-body{
  display:flex;
  flex-direction:column;
  gap:16px;
  min-width:0;
  padding-bottom:20px;
}

.et-editor-section{
  width:100%;
  min-width:0;
  box-sizing:border-box;
}

.et-editor-section-title{
  font-size:14px;
  font-weight:700;
  margin-bottom:10px;
}

.et-editor-section-body{
  display:flex;
  flex-direction:column;
  gap:10px;
  width:100%;
  min-width:0;
}

.et-field-group{
  display:flex;
  flex-direction:column;
  gap:5px;
  width:100%;
}

.et-field-label,
.et-control-label{
  font-size:11px;
  font-weight:600;
}

.et-field-input{
  width:100%;
  min-height:38px;
  box-sizing:border-box;
  border:1px solid #ddd;
  border-radius:5px;
  padding:8px 10px;
  font-size:12px;
  background-color:#fff;
  color:#111;
  resize:vertical;
}

.et-control-row{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  width:100%;
}

.et-control{
  min-width:90px;
  box-sizing:border-box;
  border:1px solid #ddd;
  border-radius:5px;
  padding:6px 8px;
  font-size:11px;
  color:#111;
  background:#fff;
}

.et-checkbox{
  width:16px;
  height:16px;
}

.et-simple-field-editor,
.et-content-editor,
.et-field-settings{
  display:flex;
  flex-direction:column;
  gap:7px;
  width:100%;
  box-sizing:border-box;
}

.et-edit-panel-footer{
  display:flex;
  gap:8px;
  justify-content:flex-end;
  flex:0 0 auto;
  padding-top:14px;
  margin-top:10px;
  border-top:1px solid #eee;
}

.et-edit-button{
  border:0;
  border-radius:5px;
  padding:9px 15px;
  cursor:pointer;
  font-size:12px;
  font-weight:600;
  color:#fff;
  background:#333;
}

.et-edit-button.et-edit-save{
  background:#111;
}

.et-card-overlay{
  position:absolute;
  inset:0;
  display:flex;
  align-items:center;
  justify-content:center;
  opacity:0;
  pointer-events:none;
  transition:opacity .15s ease;
  cursor:pointer;
  z-index:20;
}

.et-everyday-card,
.et-clearance-card,
.et-promo-card{
  position:relative;
}

.et-everyday-card:hover .et-card-overlay,
.et-clearance-card:hover .et-card-overlay,
.et-promo-card:hover .et-card-overlay{
  opacity:1;
  pointer-events:auto;
}

.et-card-overlay-icon{
  width:44px;
  height:44px;
  border-radius:50%;
  display:flex;
  align-items:center;
  justify-content:center;
  background:rgba(0,0,0,.75);
  color:#fff;
}

.et-card-overlay-icon svg{
  width:22px;
  height:22px;
}

`;

    document.head.appendChild(
      style
    );
  }

  function makeScrollable() {

    if (!els.cardView) return;

    els.cardView.style.overflowX =
      'auto';

    els.cardView.style.overflowY =
      'hidden';

    els.cardView.style.scrollBehavior =
      'smooth';
  }

  function onListClick(e) {

    const action =
      e.target.closest(
        '[btn]'
      );

    const item =
      e.target.closest(
        '[data-card-id]'
      );

    if (!action || !item) return;

    const card =
      get(
        item.dataset.cardId
      );

    if (!card) return;

    const btn =
      action.getAttribute(
        'btn'
      );

    if (btn === 'edit') {

      e.preventDefault();

      openEdit(card);

      return;
    }

    if (btn === 'delete') {

      e.preventDefault();

      del(card.id);
    }
  }

  function init() {

    if (!els.left) {

      console.warn(
        '[ET Pricing] .db-left-content not found'
      );
    }

    if (els.scrollBtnLeft) {

      els.scrollBtnLeft.onclick =
        () => scrollCurrentCards(
          els.cardView,
          -1
        );
    }

    if (els.scrollBtnRight) {

      els.scrollBtnRight.onclick =
        () => scrollCurrentCards(
          els.cardView,
          1
        );
    }

    if (els.list) {

      els.list.addEventListener(
        'click',
        onListClick
      );
    }

    if (els.type) {

      els.type.addEventListener(
        'change',
        () => {

          state.type =
            els.type.value || 'ep';

          render();
        }
      );
    }

    if (els.layout) {

      els.layout.addEventListener(
        'change',
        () => {

          state.layout =
            els.layout.value ||
            'nineup';

          render();
        }
      );
    }

    if (els.add) {

      els.add.onclick =
        () => {

          const c =
            add();

          openEdit(c);
        };
    }

    if (els.print) {

      els.print.onclick =
        () => {

          render();

          setTimeout(
            () => window.print(),
            50
          );
        };
    }

    window.addEventListener(
      'resize',
      () => {

        requestAnimationFrame(
          fitAll
        );
      }
    );

    window.addEventListener(
      'beforeprint',
      () => {

        fitAll();
      }
    );

    makeScrollable();

    render();
  }

  function start() {

    if (
      document.readyState ===
      'loading'
    ) {

      document.addEventListener(
        'DOMContentLoaded',
        start,
        { once: true }
      );

      return;
    }

    cache();
    injectStyles();

    const run =
      () => {

        cache();

        if (
          !els.cardView ||
          !els.pages
        ) {

          setTimeout(
            run,
            150
          );

          return;
        }

        init();
      };

    run();
  }

  window.ETPricingTool = {
    state,
    addCard: add,
    deleteCard: del,
    getCard: get,
    render,
    showEditPanel: openEdit,
    hideEditPanel: hideEdit
  };

  window.addEventListener(
    'db-tool-open',
    e => {

      if (
        e.detail?.id !==
        'promotion-label'
      ) {
        return;
      }

      setTimeout(
        () => {

          cache();

          if (
            !els.cardView ||
            !els.pages
          ) {
            return;
          }

          init();
        },
        0
      );
    }
  );

  start();

})();
