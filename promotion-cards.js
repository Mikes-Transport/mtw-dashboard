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
  let initialized = false;

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

    if (
      Array.isArray(x.items) &&
      x.items.length
    ) {

      items = x.items.map(item => {

        const fallback =
          defaultText(
            item.text ?? ''
          );

        let texts;

        if (
          Array.isArray(item.texts) &&
          item.texts.length
        ) {

          texts =
            item.texts.map(t => ({
              text:
                t.text ?? '',
              fields:
                Object.assign(
                  clone(
                    fallback.fields
                  ),
                  t.fields || {}
                )
            }));

        } else {

          texts = [
            {
              text:
                item.text ?? text,
              fields:
                Object.assign(
                  clone(
                    fallback.fields
                  ),
                  item.fields || {}
                )
            }
          ];
        }

        return {
          text:
            texts[0]?.text ?? '',
          fields:
            Object.assign(
              clone(
                fallback.fields
              ),
              item.fields || {}
            ),
          texts
        };
      });

    } else {

      items = d.items;
    }

    return {
      display:
        x.display || d.display,
      direction:
        x.direction || d.direction,
      justify:
        x.justify || d.justify,
      align:
        x.align || d.align,
      wrap:
        x.wrap || d.wrap,
      columns:
        Number(x.columns) || 1,
      rows:
        Number(x.rows) || 1,
      gap:
        Number(x.gap) || 0,
      rowGap:
        Number(x.rowGap) || 0,
      columnGap:
        Number(x.columnGap) || 0,
      items
    };
  }

  function cardData(x = {}) {

    const c = Object.assign({

      id:
        'card-' +
        (++id),

      title:
        'PRODUCT TITLE',

      description:
        'Product description goes here. Maximum of 2 lines.',

      price:
        '999.99',

      oldPrice:
        '999.99',

      partNumber:
        '#00000',

      extraNote:
        'EXCLUSIVE OF GST'

    }, x);

    c.style =
      c.style || {};

    c.style.fields =
      Object.assign(
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

    const c =
      cardData(x);

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
      $('.');

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

  function fieldStyle(
    el,
    c,
    key
  ) {

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

    const s =
      c.style[key];

    if (!el || !s) return;

    el.style.display =
      s.display || 'block';

    if (s.display === 'flex') {

      el.style.flexDirection =
        s.direction || 'column';

      el.style.justifyContent =
        flexJ(
          s.justify || 'start'
        );

      el.style.alignItems =
        flexA(
          s.align || 'stretch'
        );

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

    return [
      {
        text:
          item.text ?? '',
        fields:
          Object.assign(
            {
              v: 1,
              a: 'left',
              fit: 1,
              size: null,
              line: null
            },
            item.fields || {}
          )
      }
    ];
  }

  function buildContent(
    c,
    key,
    className
  ) {

    const s =
      c.style[key];

    const wrap =
      document.createElement(
        'div'
      );

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
          document.createElement(
            'div'
          );

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

    const t =
      T[state.type];

    const size =
      TEXT_CLASS[state.layout];

    const wrap =
      document.createElement(
        'div'
      );

    wrap.className =
      t.card;

    wrap.dataset.cardId =
      c.id;

    const cut =
      document.createElement(
        'div'
      );

    cut.className =
      t.cut;

    const inner =
      document.createElement(
        'div'
      );

    inner.className =
      t.inner;

    const titleWrap =
      document.createElement(
        'div'
      );

    titleWrap.className =
      t.title;

    const h2 =
      document.createElement(
        'h2'
      );

    h2.className =
      t.h2;

    h2.textContent =
      HEAD[state.type];

    titleWrap.appendChild(
      h2
    );

    const bw =
      document.createElement(
        'div'
      );

    bw.className =
      t.bodyWrap;

    const body =
      document.createElement(
        'div'
      );

    body.className =
      t.body;

    const top =
      document.createElement(
        'div'
      );

    top.className =
      'card-top-wrapper';

    const title =
      document.createElement(
        'div'
      );

    title.className =
      'card-grid-title';

    title.dataset.field =
      'title';

    const titleText =
      document.createElement(
        'div'
      );

    titleText.className =
      'card-text-title';

    titleText.textContent =
      c.title;

    if (size) {
      titleText.classList.add(
        size
      );
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
      document.createElement(
        'div'
      );

    bottom.className =
      'card-bottom-wrapper';

    const price =
      document.createElement(
        'div'
      );

    price.className =
      'card-text-price';

    price.dataset.field =
      'price';

    if (size) {
      price.classList.add(
        size
      );
    }

    if (t.price) {
      price.classList.add(
        t.price
      );
    }

    price.textContent =
      '$' + c.price;

    const extraGrid =
      document.createElement(
        'div'
      );

    extraGrid.className =
      'card-extra-info-grid';

    const leftGroup =
      document.createElement(
        'div'
      );

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
      document.createElement(
        'div'
      );

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
      document.createElement(
        'div'
      );

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
                      cell
                        .querySelectorAll(
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

    const currentRow =
      els.cardView?.querySelector(
        '[data-card-id="' +
        c.id +
        '"]'
      );

    if (currentRow) {

      const txt =
        currentRow.querySelectorAll(
          '.et-small-txt'
        );

      if (
        key === 'title' &&
        txt[0]
      ) {
        txt[0].textContent =
          c.title;
      }

      if (
        key === 'partNumber' &&
        txt[1]
      ) {
        txt[1].textContent =
          c.partNumber;
      }
    }
  }

  function refreshCard(i) {

    const c =
      get(i);

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
      document.createElement(
        'div'
      );

    r.className =
      'et-current-card';

    r.dataset.cardId =
      c.id;

    const title =
      document.createElement(
        'div'
      );

    title.className =
      'et-small-txt';

    title.textContent =
      c.title;

    const part =
      document.createElement(
        'div'
      );

    part.className =
      'et-small-txt';

    part.textContent =
      c.partNumber;

    const actions =
      document.createElement(
        'div'
      );

    actions.className =
      'et-current-card-action-wrapper';

    const edit =
      document.createElement(
        'div'
      );

    edit.className =
      'et-action-button';

    edit.setAttribute(
      'btn',
      'edit'
    );

    const et =
      document.createElement(
        'div'
      );

    et.className =
      'et-xsmall-txt';

    et.textContent =
      'Edit';

    edit.appendChild(
      et
    );

    const remove =
      document.createElement(
        'div'
      );

    remove.className =
      'et-action-button';

    remove.setAttribute(
      'btn',
      'delete'
    );

    const rt =
      document.createElement(
        'div'
      );

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
          document.createElement(
            'div'
          );

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
          document.createElement(
            'div'
          );

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

    if (
      !c ||
      !els.left
    ) {
      return;
    }

    const old =
      els.left.querySelector(
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

    els.left.classList.add(
      'editing'
    );

    const panel =
      buildPanel(c);

    els.left.appendChild(
      panel
    );

    requestAnimationFrame(
      () => {
        panel.scrollTop = 0;
      }
    );
  }

  function hideEdit() {

    editing = null;

    if (els.left) {

      const panel =
        els.left.querySelector(
          '.et-edit-panel'
        );

      if (panel) {
        panel.remove();
      }

      els.left.classList.remove(
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
      document.createElement(
        'div'
      );

    wrap.className =
      'et-control-row';

    const l =
      document.createElement(
        'label'
      );

    l.className =
      'et-control-label';

    l.textContent =
      label;

    const s =
      document.createElement(
        'select'
      );

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

        s.appendChild(
          o
        );
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
      document.createElement(
        'div'
      );

    wrap.className =
      'et-control-row';

    const l =
      document.createElement(
        'label'
      );

    l.className =
      'et-control-label';

    l.textContent =
      label;

    const input =
      document.createElement(
        'input'
      );

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
      document.createElement(
        'div'
      );

    wrap.className =
      'et-control-row';

    const l =
      document.createElement(
        'label'
      );

    l.className =
      'et-control-label';

    l.textContent =
      label;

    const input =
      document.createElement(
        'input'
      );

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
      document.createElement(
        'div'
      );

    wrap.className =
      'et-field-group';

    const label =
      document.createElement(
        'label'
      );

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

    input.value =
      c[key] ?? '';

    if (
      type === 'textarea'
    ) {
      input.rows = 4;
    }

    input.oninput = () => {

      c[key] =
        input.value;

      if (
        key === 'description' ||
        key === 'partNumber' ||
        key === 'extraNote' ||
        key === 'oldPrice'
      ) {

        const content =
          c.style[key];

        if (
          content &&
          content.items &&
          content.items[0]
        ) {

          content.items[0].text =
            input.value;

          if (
            !Array.isArray(
              content.items[0].texts
            )
          ) {

            content.items[0].texts = [
              defaultText(
                input.value
              )
            ];
          }

          content.items[0]
            .texts[0]
            .text =
              input.value;
        }
      }

      live(
        c,
        key,
        input.value
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
    item,
    onChange
  ) {

    item.fields =
      item.fields || {
        v: 1,
        a: 'left',
        fit: 1,
        size: null,
        line: null
      };

    const f =
      item.fields;

    const box =
      document.createElement(
        'div'
      );

    box.className =
      'et-text-settings';

    box.append(

      control(
        'Visible',
        f.v,
        v => {
          f.v = v;
          onChange();
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
          f.a = v;
          onChange();
        }
      ),

      num(
        'Font Size',
        f.size,
        v => {
          f.size =
            v
              ? Number(v)
              : null;

          onChange();
        }
      ),

      num(
        'Line Height',
        f.line,
        v => {
          f.line =
            v || null;

          onChange();
        }
      ),

      control(
        'Auto Fit',
        f.fit,
        v => {
          f.fit = v;
          onChange();
        }
      )
    );

    return box;
  }

  function contentEditor(
    c,
    key
  ) {

    const s =
      c.style[key];

    const box =
      document.createElement(
        'div'
      );

    box.className =
      'et-content-editor';

    const head =
      document.createElement(
        'div'
      );

    head.className =
      'et-content-editor-header';

    const name =
      document.createElement(
        'div'
      );

    name.className =
      'et-field-editor-name';

    name.textContent =
      FIELD_NAMES[key];

    const toggle =
      document.createElement(
        'button'
      );

    toggle.type =
      'button';

    toggle.className =
      'et-field-editor-toggle';

    toggle.textContent =
      'Edit';

    head.append(
      name,
      toggle
    );

    const body =
      document.createElement(
        'div'
      );

    body.className =
      'et-content-editor-body';

    toggle.onclick = () => {

      box.classList.toggle(
        'open'
      );

      toggle.textContent =
        box.classList.contains(
          'open'
        )
          ? 'Close'
          : 'Edit';
    };

    const settings =
      document.createElement(
        'div'
      );

    settings.className =
      'et-content-settings';

    settings.append(

      select(
        'Display',
        s.display,
        [
          ['block', 'Normal'],
          ['flex', 'Flex'],
          ['grid', 'Grid']
        ],
        v => {
          s.display = v;
          refreshCard(c.id);
        }
      ),

      select(
        'Flex Direction',
        s.direction,
        [
          ['column', 'Column'],
          ['row', 'Row'],
          [
            'column-reverse',
            'Column Reverse'
          ],
          [
            'row-reverse',
            'Row Reverse'
          ]
        ],
        v => {
          s.direction = v;
          refreshCard(c.id);
        }
      ),

      select(
        'Justify Content',
        s.justify,
        [
          ['start', 'Start'],
          ['center', 'Center'],
          ['end', 'End'],
          [
            'between',
            'Space Between'
          ],
          [
            'around',
            'Space Around'
          ],
          [
            'even',
            'Space Evenly'
          ]
        ],
        v => {
          s.justify = v;
          refreshCard(c.id);
        }
      ),

      select(
        'Align Items',
        s.align,
        [
          ['stretch', 'Stretch'],
          ['start', 'Start'],
          ['center', 'Center'],
          ['end', 'End']
        ],
        v => {
          s.align = v;
          refreshCard(c.id);
        }
      ),

      select(
        'Wrap',
        s.wrap,
        [
          ['nowrap', 'No Wrap'],
          ['wrap', 'Wrap'],
          [
            'wrap-reverse',
            'Wrap Reverse'
          ]
        ],
        v => {
          s.wrap = v;
          refreshCard(c.id);
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

          refreshCard(c.id);
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

          refreshCard(c.id);
        }
      ),

      num(
        'Gap',
        s.gap,
        v => {
          s.gap =
            Number(v) || 0;

          refreshCard(c.id);
        }
      ),

      num(
        'Row Gap',
        s.rowGap,
        v => {
          s.rowGap =
            Number(v) || 0;

          refreshCard(c.id);
        }
      ),

      num(
        'Column Gap',
        s.columnGap,
        v => {
          s.columnGap =
            Number(v) || 0;

          refreshCard(c.id);
        }
      )
    );

    body.appendChild(
      settings
    );

    const items =
      document.createElement(
        'div'
      );

    items.className =
      'et-grid-item-list';

    function rebuildItems() {

      items.innerHTML = '';

      s.items.forEach(
        (item, index) => {

          const itemBox =
            document.createElement(
              'div'
            );

          itemBox.className =
            'et-grid-item';

          const itemHead =
            document.createElement(
              'div'
            );

          itemHead.className =
            'et-grid-item-header';

          const itemTitle =
            document.createElement(
              'div'
            );

          itemTitle.className =
            'et-grid-item-title';

          itemTitle.textContent =
            'Grid Item ' +
            (index + 1);

          const remove =
            document.createElement(
              'button'
            );

          remove.type =
            'button';

          remove.className =
            'et-remove-button';

          remove.textContent =
            '×';

          remove.onclick = () => {

            if (
              s.items.length <= 1
            ) {
              return;
            }

            s.items.splice(
              index,
              1
            );

            rebuildItems();

            refreshCard(
              c.id
            );
          };

          itemHead.append(
            itemTitle,
            remove
          );

          const texts =
            document.createElement(
              'div'
            );

          texts.className =
            'et-grid-item-texts';

          item.texts =
            Array.isArray(
              item.texts
            ) &&
            item.texts.length
              ? item.texts
              : [
                  {
                    text:
                      item.text || '',
                    fields:
                      item.fields ||
                      clone(
                        DEFAULT_FIELDS
                          .description
                      )
                  }
                ];

          item.text =
            item.texts[0]?.text ||
            '';

          item.fields =
            item.texts[0]?.fields ||
            item.fields ||
            clone(
              DEFAULT_FIELDS
                .description
            );

          item.texts.forEach(
            (txt, textIndex) => {

              const textBox =
                document.createElement(
                  'div'
                );

              textBox.className =
                'et-grid-text';

              const textHead =
                document.createElement(
                  'div'
                );

              textHead.className =
                'et-grid-text-header';

              const textName =
                document.createElement(
                  'div'
                );

              textName.className =
                'et-grid-text-title';

              textName.textContent =
                'Text ' +
                (textIndex + 1);

              const removeText =
                document.createElement(
                  'button'
                );

              removeText.type =
                'button';

              removeText.className =
                'et-remove-button';

              removeText.textContent =
                '×';

              removeText.onclick = () => {

                if (
                  item.texts.length <= 1
                ) {
                  return;
                }

                item.texts.splice(
                  textIndex,
                  1
                );

                item.text =
                  item.texts[0]?.text ||
                  '';

                item.fields =
                  item.texts[0]?.fields ||
                  item.fields;

                rebuildItems();

                refreshCard(
                  c.id
                );
              };

              textHead.append(
                textName,
                removeText
              );

              const textarea =
                document.createElement(
                  'textarea'
                );

              textarea.className =
                'et-field-input';

              textarea.rows = 2;

              textarea.value =
                txt.text ?? '';

              textarea.oninput = () => {

                txt.text =
                  textarea.value;

                if (
                  textIndex === 0
                ) {
                  item.text =
                    textarea.value;
                }

                refreshCard(
                  c.id
                );
              };

              textBox.append(
                textHead,
                textarea,
                fieldSettings(
                  c,
                  txt,
                  () => {

                    if (
                      textIndex === 0
                    ) {

                      item.text =
                        txt.text;

                      item.fields =
                        txt.fields;
                    }

                    refreshCard(
                      c.id
                    );
                  }
                )
              );

              texts.appendChild(
                textBox
              );
            }
          );

          const addText =
            document.createElement(
              'button'
            );

          addText.type =
            'button';

          addText.className =
            'et-small-add';

          addText.textContent =
            '+ Text';

          addText.onclick = () => {

            item.texts.push(
              defaultText('')
            );

            rebuildItems();

            refreshCard(
              c.id
            );
          };

          itemBox.append(
            itemHead,
            texts,
            addText
          );

          items.appendChild(
            itemBox
          );
        }
      );

      const addItem =
        document.createElement(
          'button'
        );

      addItem.type =
        'button';

      addItem.className =
        'et-small-add';

      addItem.textContent =
        '+ Grid Item';

      addItem.onclick = () => {

        s.items.push({
          text: '',
          fields:
            clone(
              DEFAULT_FIELDS
                .description
            ),
          texts: [
            defaultText('')
          ]
        });

        rebuildItems();

        refreshCard(
          c.id
        );
      };

      items.appendChild(
        addItem
      );
    }

    rebuildItems();

    body.appendChild(
      items
    );

    box.append(
      head,
      body
    );

    return box;
  }

  function simpleFieldEditor(
    c,
    key
  ) {

    const f =
      c.style.fields[key] ||
      (
        c.style.fields[key] =
          clone(
            DEFAULT_FIELDS[key]
          )
      );

    const box =
      document.createElement(
        'div'
      );

    box.className =
      'et-field-editor';

    const head =
      document.createElement(
        'div'
      );

    head.className =
      'et-field-editor-header';

    const name =
      document.createElement(
        'div'
      );

    name.className =
      'et-field-editor-name';

    name.textContent =
      FIELD_NAMES[key];

    const toggle =
      document.createElement(
        'button'
      );

    toggle.type =
      'button';

    toggle.className =
      'et-field-editor-toggle';

    toggle.textContent =
      'Edit';

    head.append(
      name,
      toggle
    );

    const body =
      document.createElement(
        'div'
      );

    body.className =
      'et-field-editor-body';

    toggle.onclick = () => {

      box.classList.toggle(
        'open'
      );

      toggle.textContent =
        box.classList.contains(
          'open'
        )
          ? 'Close'
          : 'Edit';
    };

    body.append(

      control(
        'Visible',
        f.v,
        v => {
          f.v = v;
          refreshCard(c.id);
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
          f.a = v;
          refreshCard(c.id);
        }
      ),

      num(
        'Font Size',
        f.size,
        v => {
          f.size =
            v
              ? Number(v)
              : null;

          refreshCard(c.id);
        }
      ),

      num(
        'Line Height',
        f.line,
        v => {
          f.line =
            v || null;

          refreshCard(c.id);
        }
      ),

      control(
        'Auto Fit',
        f.fit,
        v => {
          f.fit = v;
          refreshCard(c.id);
        }
      )
    );

    box.append(
      head,
      body
    );

    return box;
  }

  function section(
    title,
    children
  ) {

    const s =
      document.createElement(
        'div'
      );

    s.className =
      'et-edit-section';

    const h =
      document.createElement(
        'div'
      );

    h.className =
      'et-edit-section-title';

    h.textContent =
      title;

    s.appendChild(
      h
    );

    children.forEach(
      x => {
        s.appendChild(x);
      }
    );

    return s;
  }

  function buildPanel(c) {

    const panel =
      document.createElement(
        'div'
      );

    panel.className =
      'et-edit-panel';

    panel.dataset.cardId =
      c.id;

    const header =
      document.createElement(
        'div'
      );

    header.className =
      'et-edit-panel-header';

    const title =
      document.createElement(
        'div'
      );

    title.className =
      'et-edit-panel-title';

    title.textContent =
      'Edit Card';

    const close =
      document.createElement(
        'button'
      );

    close.type =
      'button';

    close.className =
      'et-edit-panel-close';

    close.textContent =
      '×';

    close.onclick =
      hideEdit;

    header.append(
      title,
      close
    );

    panel.appendChild(
      header
    );

    panel.appendChild(
      section(
        'Content',
        [
          contentField(
            c,
            'title',
            'input'
          ),
          contentField(
            c,
            'description',
            'textarea'
          ),
          contentField(
            c,
            'price',
            'input'
          ),
          contentField(
            c,
            'oldPrice',
            'input'
          ),
          contentField(
            c,
            'partNumber',
            'input'
          ),
          contentField(
            c,
            'extraNote',
            'input'
          )
        ]
      )
    );

    panel.appendChild(
      section(
        'Elements',
        [
          contentEditor(
            c,
            'description'
          ),
          simpleFieldEditor(
            c,
            'title'
          ),
          simpleFieldEditor(
            c,
            'price'
          ),
          simpleFieldEditor(
            c,
            'partNumber'
          ),
          simpleFieldEditor(
            c,
            'extraNote'
          ),
          simpleFieldEditor(
            c,
            'oldPrice'
          )
        ]
      )
    );

    const footer =
      document.createElement(
        'div'
      );

    footer.className =
      'et-edit-panel-footer';

    const reset =
      document.createElement(
        'button'
      );

    reset.type =
      'button';

    reset.className =
      'et-edit-button';

    reset.textContent =
      'Reset';

    reset.onclick = () => {

      c.style = {

        fields:
          clone(
            DEFAULT_FIELDS
          ),

        description:
          defaultContent(
            c.description
          ),

        partNumber:
          defaultContent(
            c.partNumber
          ),

        extraNote:
          defaultContent(
            c.extraNote
          ),

        oldPrice:
          defaultContent(
            c.oldPrice
          )
      };

      const old =
        els.left.querySelector(
          '.et-edit-panel'
        );

      if (old) {
        old.remove();
      }

      els.left.appendChild(
        buildPanel(c)
      );

      requestAnimationFrame(
        () => {

          const newPanel =
            els.left.querySelector(
              '.et-edit-panel'
            );

          if (newPanel) {
            newPanel.scrollTop =
              0;
          }
        }
      );

      refreshCard(
        c.id
      );
    };

    const copy =
      document.createElement(
        'button'
      );

    copy.type =
      'button';

    copy.className =
      'et-edit-button';

    copy.textContent =
      'Copy';

    copy.onclick = () => {

      const data =
        clone(c);

      delete data.id;

      const n =
        add(data);

      openEdit(n);
    };

    const save =
      document.createElement(
        'button'
      );

    save.type =
      'button';

    save.className =
      'et-edit-button primary';

    save.textContent =
      'Save';

    save.onclick = () => {

      renderList();

      hideEdit();
    };

    footer.append(
      reset,
      copy,
      save
    );

    panel.appendChild(
      footer
    );

    return panel;
  }

  function injectStyles() {

    if (
      document.getElementById(
        'et-pricing-styles'
      )
    ) {
      return;
    }

    const style =
      document.createElement(
        'style'
      );

    style.id =
      'et-pricing-styles';

    style.textContent = `

.et-everyday-card,
.et-clearance-card,
.et-promo-card{
display:flex!important;
flex-direction:column!important;
height:100%!important;
box-sizing:border-box!important;
overflow:hidden!important;
position:relative!important
}

.everyday-card,
.clearance-card,
.promo-card{
flex:1 1 auto!important;
min-height:0!important;
display:flex!important;
flex-direction:column!important;
box-sizing:border-box!important
}

.everyday-card-body-wrapper,
.clearance-card-body-wrapper,
.promo-card-body-wrapper{
flex:1 1 auto!important;
min-height:0!important;
display:flex!important;
flex-direction:column!important
}

.everyday-card-body,
.clearance-card-body,
.promo-card-body{
flex:1 1 auto!important;
min-height:0!important;
height:100%!important;
box-sizing:border-box!important;
display:flex!important;
flex-direction:column!important
}

.card-top-wrapper{
flex:1 1 auto!important;
min-height:0!important;
overflow:hidden!important
}

.card-bottom-wrapper{
flex:0 0 auto!important;
margin-top:auto!important
}

.card-text-title,
.card-text-description,
.card-text-price,
.card-text-price-old,
.card-text-extra,
.card-config-text{
margin:0!important
}

.card-grid-title,
.card-grid-description,
.card-grid-part-number,
.card-grid-extra-note,
.card-grid-old-price{
min-width:0;
box-sizing:border-box
}

.card-config-item{
min-width:0;
box-sizing:border-box
}

.card-extra-info-grid{
width:100%;
box-sizing:border-box;
display:grid!important;
grid-template-columns:minmax(0,1fr) auto!important;
align-items:end!important;
gap:10px!important
}

.card-extra-info{
min-width:0;
display:flex;
flex-direction:column;
align-items:stretch
}

.card-old-price-wrapper{
min-width:0;
text-align:right
}

.et-page{
background:#fff;
box-shadow:
0 0 0 1px rgba(0,0,0,.08),
0 4px 16px rgba(0,0,0,.08);
margin-bottom:24px
}

.et-card-overlay{
position:absolute;
inset:0;
display:flex;
align-items:center;
justify-content:center;
background:rgba(0,0,0,.55);
opacity:0;
transition:opacity .2s;
cursor:pointer;
z-index:999
}

.et-card-overlay:hover{
opacity:1
}

.et-card-overlay-icon svg{
width:32px;
height:32px;
color:#fff
}

.et-everyday-card:hover .everyday-card,
.et-clearance-card:hover .clearance-card,
.et-promo-card:hover .promo-card{
filter:blur(2px) grayscale(90%)
}

.card-view-container{
min-width:0!important;
overflow-x:auto!important;
overflow-y:hidden!important;
flex:1 1 auto!important;
scrollbar-width:none!important;
-ms-overflow-style:none!important;
overscroll-behavior-x:contain!important;
scroll-behavior:smooth!important
}

.card-view-container::-webkit-scrollbar{
display:none!important;
width:0!important;
height:0!important
}

.card-view-container > .et-current-card{
flex:0 0 auto!important;
min-width:0!important
}

.db-left-content {
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
color: white;
}

.et-edit-panel::-webkit-scrollbar{
width:6px;
}

.et-edit-panel::-webkit-scrollbar-track{
background:transparent;
}

.et-edit-panel::-webkit-scrollbar-thumb{
background:#ccc;
border-radius:10px;
}

.et-edit-panel::-webkit-scrollbar-thumb:hover{
background:#aaa;
}

.et-edit-panel-header{
display:flex;
justify-content:space-between;
align-items:center;
flex:0 0 auto;
margin-bottom:16px;
padding-bottom:12px;
border-bottom:1px solid #eee
}

.et-edit-panel-title{
font-weight:700;
font-size:18px
}

.et-edit-panel-close{
border:0;
background:none;
font-size:24px;
cursor:pointer;
line-height:1
}

.et-edit-section{
border-top:1px solid #eee;
padding-top:16px;
margin-top:16px
}

.et-edit-section-title{
font-size:11px;
font-weight:700;
text-transform:uppercase;
margin-bottom:12px
}

.et-field-group{
margin-bottom:12px
}

.et-field-label,
.et-control-label{
display:block;
font-size:11px;
font-weight:600;
color: white;
margin-bottom:5px
}

.et-field-input{
width:100%;
box-sizing:border-box;
padding:8px;
border:1px solid #ccc;
border-radius:5px;
font:inherit;
font-size:12px
background-color: #30353b;
outline: none;
color: black;
}

textarea.et-field-input{
resize:vertical
}

.et-control-row{
display:flex;
align-items:center;
justify-content:space-between;
gap:10px;
margin-bottom:8px
}

.et-control{
min-width:120px;
padding:6px;
border:1px solid #ccc;
border-radius:5px;
background:#fff;
font:inherit;
font-size:11px
color: black !important;
outline: none;
}

.et-number{
width:80px;
min-width:80px
}

.et-checkbox{
width:16px;
height:16px
}

.et-field-editor,
.et-content-editor{
border:1px solid #e5e5e5;
border-radius:6px;
padding:9px;
margin-bottom:7px
}

.et-field-editor-header,
.et-content-editor-header{
display:flex;
align-items:center;
justify-content:space-between
}

.et-field-editor-name,
.et-grid-item-title,
.et-grid-text-title{
font-size:12px;
font-weight:700
}

.et-field-editor-toggle{
border:0;
background:none;
cursor:pointer;
font-size:10px
}

.et-field-editor-body,
.et-content-editor-body{
display:none;
padding-top:9px
}

.et-field-editor.open .et-field-editor-body,
.et-content-editor.open .et-content-editor-body{
display:block
}

.et-content-settings{
border-bottom:1px solid #eee;
padding-bottom:8px;
margin-bottom:10px
}

.et-grid-item{
border:1px solid #ddd;
border-radius:5px;
padding:8px;
margin-bottom:8px
}

.et-grid-item-header,
.et-grid-text-header{
display:flex;
align-items:center;
justify-content:space-between;
gap:8px;
margin-bottom:7px
}

.et-grid-text{
border-top:1px solid #eee;
padding-top:8px;
margin-top:8px
}

.et-remove-button{
border:0;
background:none;
cursor:pointer;
font-size:16px;
line-height:1
}

.et-small-add{
width:100%;
border:1px dashed #bbb;
background:#fafafa;
border-radius:5px;
padding:7px;
cursor:pointer;
font-size:11px;
font-weight:600
}

.et-text-settings{
margin-top:8px;
padding-top:8px;
border-top:1px solid #eee
}

.et-edit-panel-footer{
display:flex;
justify-content:flex-end;
align-items:center;
gap:8px;
margin-top:18px;
padding-top:14px;
border-top:1px solid #eee
}

.et-edit-button{
border:1px solid #ccc;
background:#fff;
border-radius:5px;
padding:8px 12px;
cursor:pointer;
font-size:11px;
font-weight:600
color:black;
}

.et-edit-button.primary{
background:#111;
color: black;
border-color:#111
}

@media print{

@page{
size:A4;
margin:0
}

*{
-webkit-print-color-adjust:exact!important;
print-color-adjust:exact!important;
color-adjust:exact!important
}

body *{
visibility:hidden!important
}

.et-card-body-wrapper,
.et-card-body-wrapper *{
visibility:visible!important
}

.et-card-body-wrapper{
position:absolute!important;
top:0!important;
left:0!important;
width:auto!important;
height:auto!important;
padding:0!important;
overflow:visible!important;
display:block!important;
background:transparent!important
}

.et-card-overlay,
.et-edit-panel{
display:none!important
}

.et-page{
width:210mm!important;
height:297mm!important;
margin:0!important;
padding:0!important;
overflow:hidden!important;
box-shadow:none!important;
border:0!important;
outline:0!important;
page-break-after:always;
break-after:page
}

.et-page:last-child{
page-break-after:auto;
break-after:auto
}

.et-grid-cards{
width:100%!important;
height:100%!important;
margin:0!important;
border:0!important;
outline:0!important;
box-shadow:none!important
}

.et-everyday-card,
.et-clearance-card,
.et-promo-card,
.everyday-card,
.clearance-card,
.promo-card{
width:100%!important;
height:100%!important;
border:0!important;
outline:0!important
}

.w-webflow-badge,
[class*=webflow-badge],
a[href*=webflow\\\\.com?utm]{
display:none!important;
visibility:hidden!important
}

}

`;

    document.head.appendChild(
      style
    );
  }

  function makeScrollable(el) {

    if (!el) return;

    el.style.overflowY =
      'auto';

    el.style.overscrollBehavior =
      'contain';
  }

  function onListClick(e) {

    const action =
      e.target.closest(
        '[btn]'
      );

    if (!action) {
      return;
    }

    const row =
      e.target.closest(
        '[data-card-id]'
      );

    if (!row) {
      return;
    }

    const i =
      row.dataset.cardId;

    if (
      action.getAttribute(
        'btn'
      ) === 'edit'
    ) {

      openEdit(
        get(i)
      );
    }

    if (
      action.getAttribute(
        'btn'
      ) === 'delete'
    ) {

      del(i);
    }
  }

  function init() {

  cache();

  if (!els.cardView || !els.pages) {
    setTimeout(start, 100);
    return;
  }

  if (!initialized) {

    initialized = true;

    injectStyles();

    if (els.scrollBtnLeft) {
      els.scrollBtnLeft.onclick = e => {
        e.preventDefault();
        e.stopPropagation();
        scrollCurrentCards(
          els.cardView,
          -1
        );
      };
    }

    if (els.scrollBtnRight) {
      els.scrollBtnRight.onclick = e => {
        e.preventDefault();
        e.stopPropagation();
        scrollCurrentCards(
          els.cardView,
          1
        );
      };
    }

    if (els.type) {
      els.type.value = state.type;

      els.type.addEventListener(
        'change',
        e => {
          state.type = e.target.value;
          state.cards = [];
          add();
        }
      );
    }

    if (els.layout) {
      els.layout.value = state.layout;

      els.layout.addEventListener(
        'change',
        e => {
          state.layout = e.target.value;
          render();
        }
      );
    }

    if (els.list) {
      els.list.addEventListener(
        'click',
        onListClick
      );
    }

    if (els.add) {
      els.add.addEventListener(
        'click',
        () => {
          const c = add();
          openEdit(c);
        }
      );
    }

    if (els.print) {
      els.print.addEventListener(
        'click',
        () => {
          window.print();
        }
      );
    }

    window.addEventListener(
      'resize',
      () => {
        requestAnimationFrame(fitAll);
      }
    );

    window.addEventListener(
      'beforeprint',
      () => {

        if (!els.pages) return;

        let e = els.pages.parentElement;

        while (
          e &&
          e !== document.body
        ) {

          e.style.setProperty(
            'overflow',
            'visible',
            'important'
          );

          e.style.setProperty(
            'height',
            'auto',
            'important'
          );

          e.style.setProperty(
            'max-height',
            'none',
            'important'
          );

          e.style.setProperty(
            'transform',
            'none',
            'important'
          );

          e = e.parentElement;
        }
      }
    );
  }

  makeScrollable(els.pages);

  if (!state.cards.length) {
    add();
  } else {
    render();
  }
}

  function start() {

  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      start,
      { once: true }
    );

    return;
  }

  cache();

  if (
    !els.cardView ||
    !els.pages
  ) {
    setTimeout(
      start,
      100
    );

    return;
  }

  init();
}

document.addEventListener(
  'db-tool-open',
  e => {

    if (
      e.detail?.id !== 'promotion-label'
    ) {
      return;
    }

    start();
  }
);

start();

  window.ETPricingTool = {
    state,
    addCard: add,
    deleteCard: del,
    getCard: get,
    render,
    showEditPanel: openEdit,
    hideEditPanel: hideEdit
  };

})();
