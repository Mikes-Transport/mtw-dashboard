'use strict';

/* Destructure inside the IIFE rather than at the top level. The other files
   in this folder declare `const { $, $$ } = window.MTW` globally, so a second
   top-level declaration of the same names is a redeclaration error when both
   load as classic scripts. Scoping it here is identical in style and safe
   either way. */
(function () {

  const { $, $$ } = window.MTW;

  /* ==========================================================================
     FLYER PROOF
     Checks a finished flyer PDF against the pricing CSV and highlights every
     price or part-number discrepancy on the page.

     Everything runs in the browser tab. Nothing is uploaded.
     ========================================================================== */

  const TOOL_ID = 'flyer-checker';
  const PANEL_CLASS = 'flyer-checker-panel';

  const PDFJS_URL =
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.min.js';

  const PDFJS_WORKER_URL =
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js';

  const JSPDF_URL =
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

  const SEV = {
    error: { label: 'MISMATCH', cls: 'fp-t-error' },
    warn: { label: 'REVIEW', cls: 'fp-t-warn' },
    info: { label: 'NOTE', cls: 'fp-t-info' },
    ok: { label: 'VERIFIED', cls: 'fp-t-ok' }
  };

  const SEV_ORDER = { error: 0, warn: 1, info: 2, ok: 3 };

  const SEV_COLOR = {
    error: '#b00020',
    warn: '#e08a00',
    info: '#4b5563',
    ok: '#377c24'
  };

  const ROW_CAP = 400;
  const RENDER_SCALE = 2.2;
  const RENDER_TIMEOUT = 30000;
  const SEP = '\u0001';

  let state = {
    pdf: null,
    csv: null,
    result: null,
    filter: 'error',
    sort: { key: 'Sev', dir: 1 },
    vlist: []
  };

  const pageCache = {};

  /* ======================================================================
     0. utilities
     ====================================================================== */

  function money(n) {
    if (n == null || !isFinite(n)) return '—';

    const neg = n < 0;
    const abs = Math.abs(n);
    const s = abs.toFixed(2);
    const p = s.split('.');
    const g = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    return (neg ? '-$' : '$') + g + '.' + p[1];
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normKey(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  function normAlnum(s) {
    return String(s == null ? '' : s)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
  }

  function prettyCode(norm) {
    return norm.length > 6
      ? norm.replace(/(.{3})(?=.)/g, '$1-')
      : norm;
  }

  function parseMoney(raw) {
    if (raw == null) return null;

    let t = String(raw).trim();

    if (!t || t === '-' || t === 'n/a') {
      return null;
    }

    let neg = false;

    if (/^\(.*\)$/.test(t)) {
      neg = true;
      t = t.slice(1, -1);
    }

    t = t.replace(/[^\d.]/g, '');

    if (t.charAt(0) === '.') {
      t = '0' + t;
    }

    t = t
      .replace(/[.]{2,}/g, '.')
      .replace(/[.]$/, '');

    if (t === '' || t === '.') {
      return null;
    }

    const n = Number(t);

    if (!isFinite(n)) {
      return null;
    }

    return neg ? -n : n;
  }

  function isTranspositionOf(a, b) {
    if (a === b || a.length !== b.length || a.length < 2) {
      return false;
    }

    const d = [];

    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) d.push(i);
    }

    if (d.length !== 2) return false;

    const i = d[0];
    const j = d[1];

    return (
      j === i + 1 &&
      a[i] === b[j] &&
      a[j] === b[i]
    );
  }

  function swapDiff(a, b) {
    const d = [];

    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        d.push(a[i] + '→' + b[i]);
      }
    }

    return d;
  }

  const CONFUSE = {
    O: '0', '0': 'O',
    I: '1', '1': 'I',
    L: '1',
    S: '5', '5': 'S',
    B: '8', '8': 'B',
    Z: '2', '2': 'Z',
    G: '6', '6': 'G'
  };

  function lookalikeVariants(norm) {
    const out = [];

    for (let i = 0; i < norm.length; i++) {
      const alt = CONFUSE[norm[i]];

      if (!alt) continue;

      out.push({
        v: norm.slice(0, i) + alt + norm.slice(i + 1)
      });

      if (norm.length <= 7) {
        for (let j = i + 1; j < norm.length; j++) {
          const a2 = CONFUSE[norm[j]];

          if (!a2) continue;

          out.push({
            v:
              norm.slice(0, i) + alt +
              norm.slice(i + 1, j) + a2 +
              norm.slice(j + 1)
          });
        }
      }
    }

    return out;
  }

  function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);

    return (
      'rgba(' +
      ((n >> 16) & 255) + ',' +
      ((n >> 8) & 255) + ',' +
      (n & 255) + ',' +
      a + ')'
    );
  }

  /* ======================================================================
     1. lazy script loading
     ====================================================================== */

  const scriptJobs = {};

  function loadScript(src) {
    if (scriptJobs[src]) {
      return scriptJobs[src];
    }

    scriptJobs[src] = new Promise((resolve, reject) => {
      const s = document.createElement('script');

      s.src = src;
      s.async = true;

      s.onload = () => resolve();
      s.onerror = () => {
        delete scriptJobs[src];
        reject(
          new Error(
            'Could not load ' +
            src.split('/').pop() +
            '. Check your internet connection.'
          )
        );
      };

      document.head.appendChild(s);
    });

    return scriptJobs[src];
  }

  function ensureLibraries() {
    return Promise
      .all([
        window.pdfjsLib
          ? Promise.resolve()
          : loadScript(PDFJS_URL),

        window.jspdf && window.jspdf.jsPDF
          ? Promise.resolve()
          : loadScript(JSPDF_URL)
      ])
      .then(() => {
        initPdf();

        return true;
      });
  }

  /* ======================================================================
     2. render scheduler
     ----------------------------------------------------------------------
     pdf.js paints through requestAnimationFrame. In a backgrounded or
     hidden tab the browser stops firing rAF entirely, so page.render()
     would sit unresolved forever and the export button would spin until
     it times out. Drive the callback with a timer whenever the tab is not
     visible, so rendering completes wherever the window is.
     ====================================================================== */

  let rafPatched = false;

  function installRenderScheduler() {
    if (rafPatched) return;

    rafPatched = true;

    const native = window.requestAnimationFrame.bind(window);

    const useTimer = () =>
      document.visibilityState === 'hidden' ||
      document.hidden;

    window.requestAnimationFrame = cb =>
      useTimer()
        ? setTimeout(() => cb(performance.now()), 16)
        : native(cb);

    window.cancelAnimationFrame = id => clearTimeout(id);
  }

  function initPdf() {
    if (!window.pdfjsLib) return false;

    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      PDFJS_WORKER_URL;

    installRenderScheduler();

    return true;
  }

  /* ======================================================================
     3. CSV parsing
     ====================================================================== */

  function sniffDelimiter(text) {
    const sample = text.slice(0, 40000);
    const cands = [',', ';', '\t', '|'];
    const counts = { ',': 0, ';': 0, '\t': 0, '|': 0 };

    let q = false;

    for (let i = 0; i < sample.length; i++) {
      const ch = sample[i];

      if (ch === '"') {
        if (q && sample[i + 1] === '"') {
          i++;
          continue;
        }

        q = !q;
      } else if (!q && counts[ch] !== undefined) {
        counts[ch]++;
      }
    }

    let best = ',';
    let n = 0;

    for (const d of cands) {
      if (counts[d] > n) {
        n = counts[d];
        best = d;
      }
    }

    return { delim: best, counts };
  }

  function parseCSV(text, delim) {
    const rows = [];

    let row = [];
    let field = '';
    let q = false;

    text = String(text).replace(/^\uFEFF/, '');

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];

      if (q) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            q = false;
          }
        } else {
          field += ch;
        }

        continue;
      }

      if (ch === '"') {
        q = true;
        continue;
      }

      if (ch === delim) {
        row.push(field);
        field = '';
        continue;
      }

      if (ch === '\r') continue;

      if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        continue;
      }

      field += ch;
    }

    if (field.length || row.length) {
      row.push(field);
      rows.push(row);
    }

    return rows;
  }

  const CODE_HINTS = [
    'partnumber', 'productcode', 'catalognumber', 'partno',
    'itemnumber', 'articlecode', 'itemno', 'article',
    'part', 'code', 'sku', 'mpn', 'refno', 'reference',
    'number', 'item', 'ean', 'upc'
  ];

  const PRICE_HINTS = [
    'retailprice', 'wholesaleprice', 'unitprice', 'listprice',
    'sellprice', 'ourprice', 'nzprice', 'price', 'retail',
    'rrp', 'cost', 'amount'
  ];

  const DESC_HINTS = [
    'description', 'productname', 'desc', 'title',
    'name', 'product'
  ];

  const STOCK_HINTS = [
    'instock', 'stock', 'quantity', 'onhand', 'qty'
  ];

  function guessColumns(header) {
    const keys = header.map(normKey);

    const pick = (hints, banned) => {
      let best = -1;
      let bs = -1;

      keys.forEach((k, i) => {
        if (!k) return;

        let sc = 0;

        hints.forEach(h => {
          if (k === h) {
            sc = Math.max(sc, 200 - h.length);
          } else if (k.indexOf(h) === 0) {
            sc = Math.max(sc, 100);
          } else if (k.indexOf(h) > 0) {
            sc = Math.max(sc, 60);
          }
        });

        if (banned && banned.some(b => k === b)) {
          sc = 0;
        }

        if (sc > bs) {
          bs = sc;
          best = i;
        }
      });

      return bs > 0 ? best : -1;
    };

    const code = pick(CODE_HINTS, PRICE_HINTS);
    let price = pick(PRICE_HINTS, CODE_HINTS);

    if (price === code) price = -1;

    return {
      code,
      price,
      desc: pick(DESC_HINTS),
      stock: pick(STOCK_HINTS)
    };
  }

  const SECTION_RE =
    /^page\s*\d+\b|^page\s*$|^\d+\s*products?\b|^cover\b/i;

  function buildProducts(cells, header, cols) {
    const st = {
      used: 0,
      headerSkips: 0,
      sectionSkips: 0,
      blankSkips: 0,
      noCode: 0,
      badPrice: 0,
      zeroPrice: 0,
      noPrice: 0,
      conflicts: 0
    };

    const out = [];

    let section = '';

    const codeKey =
      cols.code >= 0 ? normKey(header[cols.code]) : '';

    for (let r = 0; r < cells.length; r++) {
      const row = cells[r];
      const ne = row.filter(
        c => String(c).trim() !== ''
      );

      if (ne.length === 0) {
        st.blankSkips++;
        continue;
      }

      if (
        cols.code >= 0 &&
        normKey(row[cols.code]) === codeKey &&
        codeKey !== ''
      ) {
        st.headerSkips++;
        continue;
      }

      if (
        /^(code|part\s*number|part\s*no|sku)$/i.test(
          normKey(
            cols.code >= 0 ? row[cols.code] : ''
          )
        )
      ) {
        st.headerSkips++;
        continue;
      }

      // "Page 1 - TBD (14 products)" style section marker
      if (ne.length <= 2) {
        const j = ne[0].trim();

        if (SECTION_RE.test(j)) {
          st.sectionSkips++;

          const m = j.match(/page\s*(\d+)/i);

          section = m
            ? 'Page ' + m[1]
            : j
              .replace(/^page\s*\d*\s*[-–]?\s*/i, '')
              .replace(/\(\s*\d+\s*products?\s*\)/i, '')
              .trim() || j;

          continue;
        }
      }

      const code = String(
        cols.code >= 0 ? row[cols.code] || '' : ''
      ).trim();

      if (!code || normAlnum(code).length < 2) {
        st.noCode++;
        continue;
      }

      const priceRaw =
        cols.price >= 0 ? row[cols.price] : '';

      const price = parseMoney(priceRaw);
      const rawTxt = String(priceRaw).trim();

      if (price === null) {
        if (rawTxt === '') st.noPrice++;
        else st.badPrice++;
      } else if (price === 0) {
        st.zeroPrice++;
      }

      out.push({
        code,
        norm: normAlnum(code),
        price,
        priceRaw: rawTxt,
        desc:
          cols.desc >= 0
            ? String(row[cols.desc] || '').trim()
            : '',
        section
      });

      st.used++;
    }

    const byNorm = {};

    out.forEach(p => {
      (byNorm[p.norm] = byNorm[p.norm] || []).push(p);
    });

    const dupGroups = [];

    Object.keys(byNorm).forEach(n => {
      const g = byNorm[n];

      if (g.length < 2) return;

      const prices = new Set(
        g.map(p => p.price === null ? 'blank' : p.price.toFixed(2))
      );

      const conflict = prices.size > 1;

      if (conflict) st.conflicts++;

      dupGroups.push({
        norm: n,
        items: g,
        conflict,
        prices: [...prices]
      });
    });

    /* Column-mapping safety net. If the chosen code column is really
       something else — a Stock column reading "In stock", a Category
       column, a repeated page label — every product would otherwise
       look missing from the flyer and the report would be nonsense. */
    const warnings = [];

    if (out.length >= 5) {
      const n = out.length;

      const wordish = out.filter(p =>
        /^(in ?stock|out ?of ?stock|yes|no|n ?a|true|false|\d+|tbd|none|standard|premium|bestseller)$/i
          .test(p.code.trim())
      ).length;

      if (wordish / n > 0.5) {
        warnings.push({
          level: 'err',
          text:
            Math.round(wordish / n * 100) +
            '% of the values in the code column are ordinary words or ' +
            'plain numbers, not part numbers. That column is almost ' +
            'certainly the wrong one. Every product currently reads ' +
            'as missing from the flyer because of it.'
        });
      }

      const ranked = Object.keys(byNorm).sort(
        (x, y) => byNorm[y].length - byNorm[x].length
      );

      const dominant = ranked.length
        ? byNorm[ranked[0]].length
        : 0;

      if (dominant / n > 0.5) {
        warnings.push({
          level: 'err',
          text:
            'More than half the rows share the identical code "' +
            out.find(p => p.norm === ranked[0]).code +
            '". That is not a part-number column.'
        });
      }

      const noPrice = out.filter(
        p => p.price === null
      ).length;

      if (noPrice / n > 0.4) {
        warnings.push({
          level: 'err',
          text:
            Math.round(noPrice / n * 100) +
            '% of rows have no readable price. The price column is ' +
            'probably wrong, or the numbers are formatted unusually.'
        });
      }

      const allZero = out.filter(
        p => p.price === 0
      ).length;

      if (allZero === n) {
        warnings.push({
          level: 'err',
          text:
            'Every price parsed as $0.00. The price column is almost ' +
            'certainly not the one you selected.'
        });
      }
    }

    return { products: out, byNorm, dupGroups, stats: st, warnings };
  }

  /* ======================================================================
     4. PDF extraction
     ====================================================================== */

  /* "compact" is an uppercase, punctuation-stripped view of the page used
     for code matching. Runs of non-alphanumerics collapse to a single ^
     so word boundaries survive — without that, MTW-1003 and MTW-1004 fuse
     into "MTW1003MTW1004" and no code can be seen to start or end
     cleanly, which breaks the look-alike and substring checks. */
  function buildPageTexts(items) {
    let full = '';
    let tight = '';
    let compact = '';

    const mf = [];
    const mt = [];
    const mc = [];

    // returns true when a character was actually appended, so the mc
    // map can stay index-aligned with compact
    const pushC = ch => {
      if (ch === '^' && compact.charAt(compact.length - 1) === '^') {
        return false;
      }

      compact += ch;

      return true;
    };

    for (let i = 0; i < items.length; i++) {
      const s = items[i].str;

      full += s + ' ';

      for (let k = 0; k < s.length; k++) mf.push(i);
      mf.push(i);

      tight += s;

      for (let k = 0; k < s.length; k++) mt.push(i);

      for (let k = 0; k < s.length; k++) {
        const c = s[k];
        const ch = /[A-Za-z0-9]/.test(c) ? c.toUpperCase() : '^';

        if (pushC(ch)) mc.push(i);
      }

      if (pushC('^')) mc.push(i);
    }

    return { full, tight, compact, mf, mt, mc };
  }

  /* Walk norm through the compact stream, treating ^ as optional
     punctuation between any two characters. Both "consume the letter" and
     "skip a caret then consume the letter" are tried at every step, so
     MTW-1004, MTW1004 and MTW 1004 all match, and MTW1O04 does not match
     MTW1004. */
  function matchAt(C, i, norm) {
    const walk = (k, p) => {
      if (k === norm.length) return p;

      if (p < C.length && C[p] === '^') {
        const r = walk(k, p + 1);

        if (r >= 0) return r;
      }

      if (p < C.length && C[p] === norm[k]) {
        return walk(k + 1, p + 1);
      }

      return -1;
    };

    return walk(0, i);
  }

  function compactSearch(C, norm) {
    if (!norm || norm.length < 3) return [];

    const hits = [];

    let i = C.indexOf(norm[0]);

    while (i >= 0) {
      const end = matchAt(C, i, norm);

      if (end >= 0) hits.push({ start: i, end });

      i = C.indexOf(norm[0], i + 1);
    }

    return hits;
  }

  function withTimeout(promise, ms, what) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        reject(
          new Error(
            'Timed out after ' + Math.round(ms / 1000) +
            's drawing ' + what + '. Close other tabs and retry.'
          )
        );
      }, ms);

      promise.then(
        v => { clearTimeout(t); resolve(v); },
        e => { clearTimeout(t); reject(e); }
      );
    });
  }

  async function extractPdf(file, onProgress) {
    const doc = await window.pdfjsLib.getDocument({
      data: await file.arrayBuffer(),
      isEvalSupported: false
    }).promise;

    const pages = [];

    for (let p = 1; p <= doc.numPages; p++) {
      if (onProgress) onProgress(p, doc.numPages);

      const page = await doc.getPage(p);
      const vp = page.getViewport({ scale: 1 });
      const tc = await page.getTextContent();

      const items = [];

      for (const it of tc.items) {
        if (!it.str) continue;
        if (it.str.trim() === '' && it.str !== ' ') continue;

        const t = window.pdfjsLib.Util.transform(
          vp.transform,
          it.transform
        );

        const h = Math.hypot(t[2], t[3]) || it.height || 8;

        items.push({
          str: it.str,
          x: t[4],
          y: t[5] - h,
          w: Math.max(0, it.width * vp.scale),
          h,
          line: 0
        });
      }

      const centre = items.map(it => it.y + it.h / 2);
      const tol = Math.max(2.5, vp.height * 0.0035);

      let line = -1;
      let lastY = null;

      items
        .map((it, i) => ({ i }))
        .sort((a, b) => centre[a.i] - centre[b.i])
        .forEach(o => {
          if (
            lastY === null ||
            Math.abs(centre[o.i] - lastY) > tol
          ) {
            line++;
            lastY = centre[o.i];
          }

          items[o.i].line = line;
        });

      const byLine = {};

      items.forEach((it, i) => {
        (byLine[it.line] = byLine[it.line] || []).push(i);
      });

      Object.keys(byLine).forEach(l => {
        byLine[l].sort((a, b) => items[a].x - items[b].x);
      });

      const texts = buildPageTexts(items);
      const charCount = texts.full.replace(/\s/g, '').length;

      pages.push({
        pageNumber: p,
        page,
        viewport: vp,
        width: vp.width,
        height: vp.height,
        items,
        byLine,
        lineCount: Math.max(0, line),
        texts,
        charCount,
        noText: charCount < 12
      });
    }

    // one global compact stream so look-alike search runs once per
    // product, not once per page
    let compactAll = '';
    const compactStart = {};

    pages.forEach(p => {
      compactStart[p.pageNumber] = compactAll.length;
      compactAll += p.texts.compact + SEP;
    });

    return {
      doc,
      numPages: doc.numPages,
      pages,
      compactAll,
      compactStart
    };
  }

  /* ======================================================================
     5. matching
     ====================================================================== */

  function looseRe(code) {
    const chars = String(code)
      .toUpperCase()
      .split('')
      .filter(c => /[A-Z0-9]/.test(c));

    if (!chars.length) return null;

    return new RegExp(
      chars.map(escapeRe).join('[^A-Z0-9]{0,4}'),
      'gi'
    );
  }

  function idxsFromRange(map, a, b) {
    const s = new Set();

    for (let i = a; i < b && i < map.length; i++) {
      s.add(map[i]);
    }

    return [...s].sort((x, y) => x - y);
  }

  function bboxOf(items, idxs) {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;

    idxs.forEach(i => {
      const it = items[i];

      if (!it) return;

      x0 = Math.min(x0, it.x);
      y0 = Math.min(y0, it.y);
      x1 = Math.max(x1, it.x + Math.max(it.w, it.h * 0.35));
      y1 = Math.max(y1, it.y + it.h);
    });

    if (!isFinite(x0)) return null;

    return {
      x: x0,
      y: y0,
      w: Math.max(2, x1 - x0),
      h: Math.max(2, y1 - y0)
    };
  }

  function rangesOverlap(a, b) {
    return a.start < b.end && b.start < a.end;
  }

  function boundaryOk(page, norm) {
    const C = page.texts.compact;

    return compactSearch(C, norm).some(h => {
      const before =
        h.start === 0 || !/[A-Z0-9]/.test(C[h.start - 1]);

      const after =
        h.end >= C.length || !/[A-Z0-9]/.test(C[h.end]);

      return before && after;
    });
  }

  function findOccurrences(page, prod) {
    const T = page.texts;
    const out = [];

    const mk = (idxs, start, end, how, matched) => {
      if (!idxs.length) return;

      out.push({
        page: page.pageNumber,
        idxs,
        bbox: bboxOf(page.items, idxs),
        how,
        matched,
        line: page.items[idxs[0]].line,
        start,
        end
      });
    };

    const re = looseRe(prod.code);

    if (re) {
      let m;
      re.lastIndex = 0;

      while ((m = re.exec(T.full)) !== null) {
        if (!m[0].length) {
          re.lastIndex++;
          continue;
        }

        mk(
          idxsFromRange(T.mf, m.index, m.index + m[0].length),
          m.index,
          m.index + m[0].length,
          'exact',
          m[0]
        );

        if (re.lastIndex >= T.full.length) break;
      }
    }

    if (!out.length && prod.code.length >= 4) {
      const up = T.tight.toUpperCase();
      const cu = prod.code.toUpperCase();

      let i = up.indexOf(cu);

      while (i >= 0) {
        mk(
          idxsFromRange(T.mt, i, i + cu.length),
          i,
          i + cu.length,
          'tight',
          cu
        );

        i = up.indexOf(cu, i + 1);
      }
    }

    if (!out.length && prod.norm.length >= 4) {
      compactSearch(T.compact, prod.norm).forEach(h => {
        const n = normAlnum(
          T.compact.slice(h.start, h.end)
        );

        mk(
          idxsFromRange(T.mc, h.start, h.end),
          h.start,
          h.end,
          'compact',
          n
        );
      });
    }

    const seen = new Set();
    const occ = [];

    out.forEach(o => {
      const k = o.start + ':' + o.end + ':' + o.idxs[0];

      if (seen.has(k)) return;

      seen.add(k);
      occ.push(o);
    });

    return occ;
  }

  function locate(pdf, offset) {
    for (let p = 1; p <= pdf.numPages; p++) {
      const start = pdf.compactStart[p];

      if (start === undefined) continue;

      const len = pdf.pages[p - 1].texts.compact.length;

      if (offset >= start && offset < start + len) {
        return { pageNo: p, local: offset - start, len };
      }
    }

    return null;
  }

  function findFuzzy(pdf, prod, opts, kind) {
    if (prod.norm.length < 5) return null;

    const C = pdf.compactAll;

    const clean = s => String(s).replace(/\^/g, '');

    const bounded = h => {
      const before =
        h.start === 0 || !/[A-Z0-9]/.test(C[h.start - 1]);

      const after =
        h.end >= C.length || !/[A-Z0-9]/.test(C[h.end]);

      return before && after;
    };

    const build = (h, flyer, subs) => {
      const at = locate(pdf, h.start);

      if (!at) return null;

      const page = pdf.pages[at.pageNo - 1];

      const stop = Math.min(
        h.end - pdf.compactStart[at.pageNo],
        at.len
      );

      if (stop <= at.local) return null;

      const idxs = idxsFromRange(
        page.texts.mc,
        at.local,
        stop
      );

      if (!idxs.length) return null;

      return {
        page: at.pageNo,
        idxs,
        bbox: bboxOf(page.items, idxs),
        flyer,
        subs
      };
    };

    if (kind === 'char') {
      if (!opts.fuzzy) return null;

      for (const varc of lookalikeVariants(prod.norm)) {
        for (const h of compactSearch(C, varc.v)) {
          if (!bounded(h)) continue;

          const r = build(
            h,
            clean(C.slice(h.start, h.end)),
            swapDiff(prod.norm, varc.v)
          );

          if (r) return r;
        }
      }

      return null;
    }

    if (!opts.transpose) return null;

    const L = prod.norm.length;
    const head = prod.norm.substr(0, 3);

    let h = C.indexOf(head);

    while (h >= 0) {
      for (let i = h; i <= h + 3 && i + L <= C.length; i++) {
        if (i === 0 || /[A-Z0-9]/.test(C[i - 1])) continue;
        if (i + L < C.length && /[A-Z0-9]/.test(C[i + L])) continue;

        const seg = C.substr(i, L);

        if (seg === prod.norm || seg.indexOf('^') >= 0) continue;
        if (!isTranspositionOf(prod.norm, seg)) continue;

        const r = build({ start: i, end: i + L }, seg, null);

        if (r) return r;
      }

      h = C.indexOf(head, h + 1);
    }

    return null;
  }

  function findPriceTokens(page, opts) {
    const T = page.texts;
    const out = [];

    const re = opts.currency
      ? /(?<![\w.])(\$\s?\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\$\s?\d+\.\d{1,2}|\d{1,3}(?:,\d{3})+\.\d{2})(?!\d)/g
      : /(?<![\w.])(\$?\s?\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\$?\s?\d+\.\d{1,2}|\$?\s?\d{2,6})(?!\d)/g;

    let m;

    while ((m = re.exec(T.full)) !== null) {
      if (!m[0].length) {
        re.lastIndex++;
        continue;
      }

      const val = parseMoney(m[0]);

      if (val === null) continue;

      const idxs = idxsFromRange(
        T.mf,
        m.index,
        m.index + m[0].length
      );

      if (!idxs.length) continue;

      const bbox = bboxOf(page.items, idxs);

      if (!bbox) continue;

      out.push({
        page: page.pageNumber,
        value: val,
        text: m[0].trim(),
        idxs,
        bbox,
        line: page.items[idxs[0]].line,
        start: m.index,
        end: m.index + m[0].length
      });
    }

    return out;
  }

  function pickPrices(occ, tokens, page, opts) {
    const pbox = occ.bbox;

    if (!pbox) {
      return { best: null, list: [], ambiguous: false };
    }

    const pcy = pbox.y + pbox.h / 2;
    const win = opts.tight ? 1 : 3;

    // generous on purpose: being on the same line is the strong signal, and
    // the right-hand preference plus the ambiguity test stop us grabbing a
    // neighbour's price. Capping the gap tightly would silently break wide
    // tables where the price column is far from the code.
    const maxGap = page.width * 1.05;

    const rights = [];
    const lefts = [];

    tokens.forEach(t => {
      if (rangesOverlap(t, occ)) return;

      const dLine = Math.abs(t.line - occ.line);

      if (dLine > win) return;

      const dy = Math.abs(
        (t.bbox.y + t.bbox.h / 2) - pcy
      );

      const right = t.bbox.x >= pbox.x + pbox.w - 0.5;

      const gap = right
        ? t.bbox.x - (pbox.x + pbox.w)
        : (
          pbox.x >= t.bbox.x + t.bbox.w - 0.5
            ? pbox.x - (t.bbox.x + t.bbox.w)
            : 0
        );

      if (gap > maxGap) return;

      (right ? rights : lefts).push({
        token: t,
        score: dy * 4 + gap,
        dLine,
        gap,
        side: right ? 'right' : 'left'
      });
    });

    // In a multi-column grid a code's own price sits to its RIGHT, while
    // the previous column's price can be closer in raw pixels. Prefer
    // anything to the right and only fall back to the left when there is
    // nothing on the right.
    let pool = rights.length ? rights : lefts;

    if (!opts.preferRight) {
      pool = rights.concat(lefts);
    }

    const byVal = {};

    pool.forEach(c => {
      const k = c.token.value.toFixed(2);

      if (!byVal[k] || c.score < byVal[k].score) {
        byVal[k] = Object.assign({}, c, { n: 1 });
      } else {
        byVal[k].n++;
      }
    });

    const list = Object.keys(byVal)
      .map(k => byVal[k])
      .sort((a, b) => a.score - b.score);

    if (!list.length) {
      return { best: null, list: [], ambiguous: false };
    }

    let ambiguous = false;

    if (list.length > 1) {
      const lineH = Math.max(
        6,
        page.items[occ.idxs[0]].h
      );

      if (
        list[0].side === list[1].side &&
        (list[1].score - list[0].score) < lineH * 1.6
      ) {
        ambiguous = true;
      }
    }

    if (list[0].dLine > 0 && list.length > 1) {
      ambiguous = true;
    }

    return { best: list[0], list, ambiguous };
  }

  /* ======================================================================
     6. verification engine
     ====================================================================== */

  function runCheck(pdf, csv, opts) {
    const t0 = performance.now();

    const findings = [];
    const byPage = {};

    const push = f => {
      findings.push(f);

      if (f.page && f.bbox) {
        (byPage[f.page] = byPage[f.page] || []).push(f);
      }
    };

    const marksOnPage = n => (byPage[n] || []).filter(f => f.bbox);

    const tokensByPage = {};

    pdf.pages.forEach(p => {
      tokensByPage[p.pageNumber] = findPriceTokens(p, opts);
    });

    let verified = 0;
    let missing = 0;
    let zeroSkipped = 0;
    let boundaryWarn = 0;
    let totalOcc = 0;
    let blankUnverified = 0;

    const conflictedNorms = {};
    const firstOf = {};

    csv.products.forEach(p => {
      if (!firstOf[p.norm]) firstOf[p.norm] = p;
    });

    (csv.dupGroups || []).forEach(g => {
      if (g.conflict) conflictedNorms[g.norm] = true;
    });

    // Each distinct code is checked once. A code listed three times in the
    // CSV is one product with a spreadsheet problem, not three products.
    const toCheck = Object.keys(firstOf).map(k => firstOf[k]);

    toCheck.forEach(prod => {
      const occurrences = [];

      for (const page of pdf.pages) {
        const r = findOccurrences(page, prod);

        for (const o of r) occurrences.push(o);
      }

      // A code the CSV prices two different ways has no single source of
      // truth, so it cannot be verified. The conflict is reported once.
      const conflicted = !!conflictedNorms[prod.norm];

      const skipPrice =
        conflicted ||
        prod.price === null ||
        (prod.price === 0 && opts.skipZero);

      if (prod.price === 0) zeroSkipped++;

      const bOk = occurrences.length
        ? boundaryOk(
          pdf.pages[occurrences[0].page - 1],
          prod.norm
        )
        : true;

      if (!occurrences.length) {
        // A $0.00 placeholder we were told to skip is not a "missing
        // product" — a cover item legitimately has no line in the body
        // of the flyer.
        if (skipPrice && prod.price === 0) {
          push({
            sev: 'info',
            kind: 'SKIPPED_PLACEHOLDER',
            page: null,
            bbox: null,
            code: prod.code,
            csvPrice: prod.price,
            pdfPrice: null,
            desc: prod.desc,
            section: prod.section,
            msg:
              '$0.00 placeholder row — not printed in the flyer ' +
              'and not price-checked. Expected for cover/promo items.'
          });

          return;
        }

        missing++;

        if (prod.price === null) blankUnverified++;

        if (conflicted) {
          push({
            sev: 'info',
            kind: 'SKIPPED_CONFLICT',
            page: null,
            bbox: null,
            code: prod.code,
            csvPrice: prod.price,
            pdfPrice: null,
            desc: prod.desc,
            section: prod.section,
            msg:
              'The CSV gives this code more than one price, so ' +
              'nothing could be checked against it.'
          });

          return;
        }

        const fz = findFuzzy(pdf, prod, opts, 'char');
        const tp = findFuzzy(pdf, prod, opts, 'trans');

        if (fz) {
          push({
            sev: 'error',
            kind: 'PN_CHAR_SWAP',
            page: fz.page,
            bbox: fz.bbox,
            code: prod.code,
            csvPrice: prod.price,
            pdfPrice: null,
            desc: prod.desc,
            msg:
              'Flyer prints <b class="fp-strike">' +
              esc(prettyCode(fz.flyer)) +
              '</b> but the CSV code is <b>' + esc(prod.code) +
              '</b> — look-alike characters: ' +
              esc(fz.subs.join(', ')) + '.'
          });

        } else if (tp) {
          push({
            sev: 'error',
            kind: 'PN_TRANSPOSED',
            page: tp.page,
            bbox: tp.bbox,
            code: prod.code,
            csvPrice: prod.price,
            pdfPrice: null,
            desc: prod.desc,
            msg:
              'Flyer prints <b class="fp-strike">' +
              esc(prettyCode(tp.flyer)) +
              '</b> but the CSV code is <b>' + esc(prod.code) +
              '</b> — adjacent digits transposed.'
          });

        } else {
          push({
            sev: 'error',
            kind: 'PN_NOT_FOUND',
            page: null,
            bbox: null,
            code: prod.code,
            csvPrice: prod.price,
            pdfPrice: null,
            desc: prod.desc,
            section: prod.section,
            msg:
              'This code is in the CSV but nowhere in the flyer ' +
              'text. Missing line item, wrong code, or it is an ' +
              'image / outlined text.'
          });
        }

        return;
      }

      if (!bOk) {
        boundaryWarn++;

        push({
          sev: 'warn',
          kind: 'PN_SUBSTRING',
          page: occurrences[0].page,
          bbox: occurrences[0].bbox,
          code: prod.code,
          csvPrice: prod.price,
          pdfPrice: null,
          desc: prod.desc,
          msg:
            'The code only matches as part of a longer string in the ' +
            'flyer. The price shown here may belong to a different ' +
            'product — check it by hand.'
        });
      }

      const perOcc = [];

      occurrences.forEach(occ => {
        totalOcc++;

        const page = pdf.pages[occ.page - 1];

        const res = pickPrices(
          occ,
          tokensByPage[occ.page],
          page,
          opts
        );

        const cands = res.list.map(c => ({
          value: c.token.value,
          text: c.token.text,
          best: c === res.best
        }));

        const rec = { occ, res, cands };

        // A missing price in the CSV is NOT the same as "$0.00" and must
        // not be waved through. No source value means nothing to verify.
        if (prod.price === null) {
          rec.v = 'no-csv-price';
          blankUnverified++;
        } else if (skipPrice) {
          rec.v = 'skipped';
        } else if (!res.best) {
          rec.v = 'no-price';
        } else if (res.ambiguous) {
          rec.v = 'ambiguous';
        } else {
          const got = res.best.token.value;

          rec.got = got;
          rec.v = Math.abs(got - prod.price) < 0.005
            ? 'match'
            : 'mismatch';

          if (rec.v === 'mismatch') {
            const cs = String(
              Math.round(prod.price * 100)
            ).padStart(3, '0');

            const gs = String(
              Math.round(got * 100)
            ).padStart(3, '0');

            rec.trans = isTranspositionOf(cs, gs);
          }
        }

        perOcc.push(rec);
      });

      const real = perOcc.filter(p => p.v !== 'skipped');

      const distinctPrices = {};

      real.forEach(p => {
        if (p.v === 'match' || p.v === 'mismatch') {
          const k = p.got.toFixed(2);

          (distinctPrices[k] = distinctPrices[k] || []).push(p);
        }
      });

      real.forEach(p => {
        if (p.v === 'match') {
          verified++;

          if (p.occ.how !== 'exact') {
            push({
              sev: 'warn',
              kind: 'PN_LOOSE_MATCH',
              page: p.occ.page,
              bbox: p.occ.bbox,
              also: p.res.best.token.bbox,
              code: prod.code,
              csvPrice: prod.price,
              pdfPrice: p.got,
              desc: prod.desc,
              cands: p.cands,
              msg:
                'Price is correct, but the flyer prints this code as ' +
                '<b class="fp-mono">' + esc(p.occ.matched) +
                '</b> with different punctuation or spacing than the ' +
                'CSV. Confirm the code is not abbreviated.'
            });
          } else {
            push({
              sev: 'ok',
              kind: 'VERIFIED',
              page: p.occ.page,
              bbox: p.occ.bbox,
              code: prod.code,
              csvPrice: prod.price,
              pdfPrice: p.got,
              desc: prod.desc,
              cands: p.cands,
              msg: 'Price matches the CSV.'
            });
          }

          return;
        }

        if (p.v === 'mismatch') {
          // box the wrong price (the thing to fix) and outline the code
          // it belongs to
          push({
            sev: 'error',
            kind: p.trans
              ? 'PRICE_TRANSPOSED'
              : 'PRICE_MISMATCH',
            page: p.occ.page,
            bbox: p.res.best.token.bbox,
            also: p.occ.bbox,
            code: prod.code,
            csvPrice: prod.price,
            pdfPrice: p.got,
            desc: prod.desc,
            cands: p.cands,
            msg: p.trans
              ? 'Looks like a <b>transposed digits</b> slip: the ' +
                'flyer prints <b class="fp-strike">' + money(p.got) +
                '</b> where the CSV says <b>' + money(prod.price) +
                '</b>. Swap the two differing digits.'
              : 'Flyer prints <b class="fp-strike">' + money(p.got) +
                '</b>, CSV says <b>' + money(prod.price) + '</b>.'
          });

          return;
        }

        if (p.v === 'ambiguous') {
          push({
            sev: 'warn',
            kind: 'PRICE_AMBIGUOUS',
            page: p.occ.page,
            bbox: p.occ.bbox,
            code: prod.code,
            csvPrice: prod.price,
            pdfPrice: null,
            desc: prod.desc,
            cands: p.cands,
            msg:
              'Several different prices sit next to this code and ' +
              'they are too close to call automatically. Check this ' +
              'one by hand.'
          });

          return;
        }

        if (p.v === 'no-price') {
          push({
            sev: conflicted ? 'info' : 'warn',
            kind: conflicted
              ? 'SKIPPED_CONFLICT'
              : 'PRICE_MISSING',
            page: p.occ.page,
            bbox: p.occ.bbox,
            code: prod.code,
            csvPrice: prod.price,
            pdfPrice: null,
            desc: prod.desc,
            cands: [],
            msg: conflicted
              ? 'Printed in the flyer, but the CSV gives this code ' +
                'more than one price, so it could not be checked.'
              : 'Code is printed but no readable price was found ' +
                'near it. Turn on <b>Tight price window</b>, or check ' +
                'by hand.'
          });
        }

        if (p.v === 'no-csv-price') {
          push({
            sev: 'warn',
            kind: 'CSV_PRICE_BLANK',
            page: p.occ.page,
            bbox: p.res.best
              ? p.res.best.token.bbox
              : p.occ.bbox,
            also: p.res.best ? p.occ.bbox : null,
            code: prod.code,
            csvPrice: null,
            pdfPrice: p.res.best
              ? p.res.best.token.value
              : null,
            desc: prod.desc,
            cands: p.cands,
            msg:
              'The flyer prints ' +
              (p.res.best
                ? '<b>' + money(p.res.best.token.value) + '</b>'
                : 'no price') +
              ' for this code, but the CSV price is blank or ' +
              'unreadable, so it could not be checked. Fill the ' +
              'price in before this flyer goes to print.'
          });
        }
      });

      if (
        opts.dupes &&
        Object.keys(distinctPrices).length > 1
      ) {
        const keys = Object.keys(distinctPrices);

        push({
          sev: 'error',
          kind: 'FLYER_DUPE_PRICE',
          page: occurrences[0].page,
          bbox: occurrences[0].bbox,
          code: prod.code,
          csvPrice: prod.price,
          pdfPrice: null,
          desc: prod.desc,
          cands: keys.map(k => ({
            value: parseFloat(k),
            text: '$' + (+k).toFixed(2),
            best: false
          })),
          msg:
            'This code appears ' + real.length + ' time(s) in the ' +
            'flyer with different prices (' +
            keys.map(k => '$' + (+k).toFixed(2)).join(', ') +
            '). At most one can be right.'
        });
      }
    });

    if (opts.dupes) {
      csv.dupGroups.forEach(g => {
        if (!g.conflict) return;

        const first =
          g.items.find(p => p.price !== null && p.price !== 0) ||
          g.items[0];

        push({
          sev: 'error',
          kind: 'CSV_CONFLICT',
          page: null,
          bbox: null,
          code: first.code,
          csvPrice: first.price,
          pdfPrice: null,
          desc: first.desc,
          msg:
            'The CSV lists this code ' + g.items.length +
            ' times with different prices (' +
            g.prices
              .map(p => p === 'blank' ? 'blank' : money(+p))
              .join(', ') +
            '). Fix the spreadsheet before printing.'
        });
      });
    }

    if (opts.orphan) {
      // Only meaningful on pages where we actually resolved codes,
      // otherwise every price on a promo cover is "unattached".
      const matchedPages = new Set();

      pdf.pages.forEach(p => {
        if (marksOnPage(p.pageNumber).length) {
          matchedPages.add(p.pageNumber);
        }
      });

      pdf.pages.forEach(page => {
        if (!matchedPages.has(page.pageNumber)) return;

        const toks = tokensByPage[page.pageNumber] || [];

        if (!toks.length) return;

        const boxes = marksOnPage(page.pageNumber)
          .map(f => f.bbox);

        if (!boxes.length) return;

        const orphans = [];

        toks.forEach(t => {
          const near = boxes.some(b => {
            if (
              Math.abs((b.y + b.h / 2) - (t.bbox.y + t.bbox.h / 2)) >
              Math.max(16, (b.h + t.bbox.h) * 2.4)
            ) {
              return false;
            }

            const gap = t.bbox.x >= b.x + b.w
              ? t.bbox.x - (b.x + b.w)
              : (
                b.x >= t.bbox.x + t.bbox.w
                  ? b.x - (t.bbox.x + t.bbox.w)
                  : 0
              );

            return gap < page.width * 1.05;
          });

          if (!near) orphans.push(t);
        });

        if (orphans.length) {
          orphans.forEach((t, i) => {
            if (i < 12) {
              push({
                sev: 'info',
                kind: 'ORPHAN_PRICE',
                page: page.pageNumber,
                bbox: t.bbox,
                code: null,
                csvPrice: null,
                pdfPrice: t.value,
                desc: '',
                msg:
                  'A price with no CSV part number next to it. ' +
                  'Could be a promo, a bundle, a "from" price, or a ' +
                  'code we could not match.'
              });
            }
          });

          if (orphans.length > 12) {
            push({
              sev: 'info',
              kind: 'ORPHAN_PRICE_MORE',
              page: page.pageNumber,
              bbox: orphans[12].bbox,
              code: null,
              csvPrice: null,
              pdfPrice: null,
              desc: '',
              msg:
                '+' + (orphans.length - 12) +
                ' more unattached prices on this page (not drawn).'
            });
          }
        }
      });
    }

    const noTextPages = pdf.pages
      .filter(p => p.noText)
      .map(p => p.pageNumber);

    return {
      findings,
      byPage,
      noTextPages,
      ms: performance.now() - t0,
      opts,
      counts: {
        error: findings.filter(f => f.sev === 'error').length,
        warn: findings.filter(f => f.sev === 'warn').length,
        info: findings.filter(f => f.sev === 'info').length,
        ok: verified,
        csvRows: csv.products.length,
        csvDupes: csv.dupGroups.length,
        csvConflicts: csv.stats.conflicts,
        missing,
        zeroSkipped,
        boundaryWarn,
        blankPrices: blankUnverified,
        totalOcc,
        pagesChecked: pdf.pages.length - noTextPages.length
      }
    };
  }

  /* ======================================================================
     7. page rendering
     ====================================================================== */

  function marksOf(pageNo) {
    return (state.result.byPage[pageNo] || []).filter(f => f.bbox);
  }

  function drawMarks(ctx, pageNo, scale) {
    const marks = marksOf(pageNo);

    ctx.save();
    ctx.lineJoin = 'round';

    const lw = Math.max(1.6, 1.5 * Math.min(scale, 1.6));

    const ring = (b, col, dashed) => {
      const pad = Math.max(2, 2.2 * scale);

      const x = b.x * scale - pad;
      const y = b.y * scale - pad;
      const w = b.w * scale + pad * 2;
      const h = b.h * scale + pad * 2;

      ctx.fillStyle = hexA(col, 0.3);
      ctx.fillRect(x, y, w, h);

      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.setLineDash(dashed ? [6, 4] : []);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);

      return { x, y, w, h };
    };

    marks.forEach((f, i) => {
      const col = SEV_COLOR[f.sev] || SEV_COLOR.info;

      // secondary box (e.g. the code a wrong price belongs to)
      if (f.also) ring(f.also, col, true);

      const m = ring(f.bbox, col, false);
      const r = Math.max(8, 9 * Math.min(scale, 1.7));

      const bx = Math.max(r + 1, m.x);
      const by = Math.max(r + 1, m.y);

      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(0,0,0,.7)';
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold ' + Math.round(r * 1.25) + 'px helvetica,sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), bx, by + 0.5);
    });

    ctx.restore();
  }

  /* Render an annotated page exactly ONCE and keep the result. The preview
     and the exported PDF both come from this one render, which is also
     about twice as fast. */
  function renderAnnotated(p) {
    if (pageCache[p.pageNumber]) {
      return pageCache[p.pageNumber];
    }

    const job = (async () => {
      const vp = p.page.getViewport({ scale: RENDER_SCALE });

      const canvas = document.createElement('canvas');

      canvas.width = Math.floor(vp.width);
      canvas.height = Math.floor(vp.height);

      const ctx = canvas.getContext('2d');

      await withTimeout(
        p.page.render({
          canvasContext: ctx,
          viewport: vp
        }).promise,
        RENDER_TIMEOUT,
        'page ' + p.pageNumber
      );

      drawMarks(ctx, p.pageNumber, RENDER_SCALE);

      return {
        canvas,
        jpeg: canvas.toDataURL('image/jpeg', 0.93)
      };
    })();

    job.catch(() => { delete pageCache[p.pageNumber]; });

    pageCache[p.pageNumber] = job;

    return job;
  }

  function clearPageCache() {
    Object.keys(pageCache).forEach(k => delete pageCache[k]);
  }

  /* ======================================================================
     8. UI
     ====================================================================== */

  function injectStyles() {
    if (document.getElementById('flyer-checker-styles')) {
      return;
    }

    const style = document.createElement('style');

    style.id = 'flyer-checker-styles';

    style.textContent = [
      '.flyer-checker-panel{max-width:1180px;margin-left:auto;margin-right:auto}',
      '.flyer-checker-panel *{box-sizing:border-box}',
      '.fp-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:18px}',
      '@media(max-width:980px){.fp-steps{grid-template-columns:1fr}}',
      '.fp-card{background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:16px}',
      '.fp-card h2{font-size:13px;margin:0 0 3px;display:flex;align-items:center;gap:8px;font-weight:700;letter-spacing:.01em}',
      '.fp-num{width:20px;height:20px;border-radius:6px;background:#f2f2f2;border:1px solid #e5e7eb;display:grid;place-items:center;font-size:11px;color:#4d4d4d;font-weight:700;flex:0 0 auto}',
      '.fp-hint{color:#6b7280;font-size:12px;margin:0 0 12px;line-height:1.5}',
      '.fp-drop{border:1.5px dashed #d1d5db;border-radius:10px;padding:20px 14px;text-align:center;cursor:pointer;transition:.14s background,.14s border-color;background:#fafafa}',
      '.fp-drop:hover{border-color:#65b746;background:#f7faf4}',
      '.fp-drop.is-over{border-color:#65b746;background:#f2f8ee}',
      '.fp-drop.is-ok{border-style:solid;border-color:#65b746;background:#f2f8ee}',
      '.fp-drop.is-err{border-color:#b00020;background:#fdf0f1}',
      '.fp-drop-big{font-size:13px;font-weight:600;color:#111111}',
      '.fp-drop-small{font-size:11.5px;color:#6b7280;margin-top:3px;word-break:break-all}',
      '.fp-drop-icon{font-size:20px;margin-bottom:6px;opacity:.75}',
      '.fp-fmeta{margin-top:10px;font-size:12px;color:#4d4d4d;display:none;line-height:1.65}',
      '.fp-fmeta.is-on{display:block}',
      '.fp-fmeta b{color:#111111;font-weight:600}',
      '.fp-ok{color:#377c24}.fp-warn{color:#b26a00}.fp-bad{color:#b00020}',
      '.fp-optgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px 18px}',
      '.fp-opt{display:flex;gap:9px;align-items:flex-start;cursor:pointer;user-select:none}',
      '.fp-opt input{margin:2px 0 0;accent-color:#65b746;width:15px;height:15px;flex:0 0 auto;cursor:pointer}',
      '.fp-opt-t{font-size:12.5px;line-height:1.35;color:#111111}',
      '.fp-opt-d{font-size:11px;color:#9ca3af;line-height:1.35;margin-top:1px}',
      '.fp-opt:hover .fp-opt-t{text-decoration:underline}',
      '.fp-adv{margin-top:12px;border-top:1px solid #e5e7eb;padding-top:10px}',
      '.fp-adv summary{cursor:pointer;font-size:12.5px;color:#4d4d4d;user-select:none;list-style:none}',
      '.fp-adv summary::-webkit-details-marker{display:none}',
      '.fp-adv summary:before{content:"▸ ";color:#9ca3af}',
      '.fp-adv[open] summary:before{content:"▾ "}',
      '.fp-mapper{margin-top:10px;display:none}',
      '.fp-mapper.is-on{display:block}',
      '.fp-mapgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px}',
      '.fp-maprow label{display:block;font-size:11px;color:#6b7280;margin-bottom:4px}',
      '.fp-select{width:100%;font-size:12.5px;padding:6px 8px;border-radius:7px;background:#ffffff;color:#111111;border:1px solid #d1d5db}',
      '.fp-btn{font-size:13px;padding:9px 16px;border-radius:8px;border:1px solid #d1d5db;background:#ffffff;color:#111111;cursor:pointer;transition:.12s;font-family:inherit}',
      '.fp-btn:hover:not(:disabled){background:#f2f2f2}',
      '.fp-btn:disabled{opacity:.45;cursor:not-allowed}',
      '.fp-btn-primary{background:#65b746;border-color:#65b746;color:#ffffff;font-weight:600}',
      '.fp-btn-primary:hover:not(:disabled){background:#377c24;border-color:#377c24}',
      '.fp-btnrow{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:14px}',
      '.fp-banner{border-radius:10px;padding:11px 13px;font-size:12.5px;margin-bottom:14px;display:none;align-items:flex-start;gap:9px;border:1px solid;line-height:1.55}',
      '.fp-banner.is-on{display:flex}',
      '.fp-banner-err{background:#fdf0f1;border-color:#f0c4c8;color:#8c0018}',
      '.fp-banner-warn{background:#fff8e8;border-color:#f3dca4;color:#8a5200}',
      '.fp-banner-info{background:#f4f6f8;border-color:#dde3ea;color:#3f4a57}',
      '.fp-verdict{border-radius:12px;padding:16px 18px;margin-bottom:16px;border:1px solid;display:none}',
      '.fp-verdict.is-on{display:block}',
      '.fp-verdict h3{margin:0 0 4px;font-size:17px}',
      '.fp-verdict p{margin:0;font-size:12.5px;line-height:1.6}',
      '.fp-v-pass{background:#f1f8ee;border-color:#b6ddab}.fp-v-pass h3{color:#377c24}.fp-v-pass p{color:#3f6236}',
      '.fp-v-fail{background:#fdf0f1;border-color:#f0c4c8}.fp-v-fail h3{color:#b00020}.fp-v-fail p{color:#7a0d1e}',
      '.fp-v-warn{background:#fff8e8;border-color:#f3dca4}.fp-v-warn h3{color:#b26a00}.fp-v-warn p{color:#7a4a00}',
      '.fp-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:10px;margin-bottom:16px}',
      '.fp-stat{background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px;cursor:pointer;transition:.12s;position:relative;overflow:hidden}',
      '.fp-stat:hover{border-color:#c9ced6}',
      '.fp-stat.is-sel{border-color:#65b746;background:#f7faf4}',
      '.fp-stat-n{font-size:22px;font-weight:700;line-height:1.1;letter-spacing:-.5px}',
      '.fp-stat-l{font-size:11.5px;color:#6b7280;margin-top:2px}',
      '.fp-stat-bar{position:absolute;left:0;top:0;bottom:0;width:3px}',
      '.fp-s-error .fp-stat-n{color:#b00020}.fp-s-error .fp-stat-bar{background:#b00020}',
      '.fp-s-warn .fp-stat-n{color:#b26a00}.fp-s-warn .fp-stat-bar{background:#e08a00}',
      '.fp-s-info .fp-stat-n{color:#4b5563}.fp-s-info .fp-stat-bar{background:#9ca3af}',
      '.fp-s-ok .fp-stat-n{color:#377c24}.fp-s-ok .fp-stat-bar{background:#65b746}',
      '.fp-sechead{display:flex;align-items:center;gap:10px;margin:26px 0 12px;flex-wrap:wrap}',
      '.fp-sechead h2{font-size:15px;margin:0;font-weight:700}',
      '.fp-pill{font-size:11px;padding:4px 9px;border-radius:999px;border:1px solid #e5e7eb;color:#6b7280;background:#f5f5f5;white-space:nowrap}',
      '.fp-tablewrap{background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:auto;max-height:640px}',
      '.fp-table{width:100%;border-collapse:collapse;font-size:12.5px}',
      '.fp-table th{position:sticky;top:0;background:#f5f5f5;text-align:left;padding:9px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#4d4d4d;border-bottom:1px solid #e5e7eb;white-space:nowrap;z-index:2;cursor:pointer;user-select:none}',
      '.fp-table th:hover{color:#000000}',
      '.fp-table td{padding:8px 12px;border-bottom:1px solid #f0f0f0;vertical-align:top}',
      '.fp-table tr.fp-row{cursor:pointer}',
      '.fp-table tr.fp-row:hover td{background:#f7faf4}',
      '.fp-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px;white-space:nowrap}',
      '.fp-tag{display:inline-block;font-size:10px;font-weight:700;padding:2px 6px;border-radius:5px;letter-spacing:.3px;white-space:nowrap}',
      '.fp-t-error{background:#fdecee;color:#8c0018;border:1px solid #f0c4c8}',
      '.fp-t-warn{background:#fff6e3;color:#8a5200;border:1px solid #f3dca4}',
      '.fp-t-info{background:#f0f2f5;color:#3f4a57;border:1px solid #dde3ea}',
      '.fp-t-ok{background:#eef7ea;color:#377c24;border:1px solid #c6e3b7}',
      '.fp-strike{text-decoration:line-through;color:#b00020}',
      '.fp-strike2{text-decoration:line-through;color:#b26a00}',
      '.fp-dim{color:#9ca3af}',
      '.fp-msg{color:#4d4d4d;font-size:11.5px;margin-top:2px;max-width:660px;line-height:1.5}',
      '.fp-cands{margin-top:5px;display:flex;gap:5px;flex-wrap:wrap}',
      '.fp-cand{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10.5px;padding:2px 6px;border-radius:5px;background:#fafafa;border:1px solid #e5e7eb;color:#6b7280}',
      '.fp-cand.is-best{border-color:#e08a00;color:#8a5200}',
      '.fp-legend{display:flex;gap:14px;flex-wrap:wrap;font-size:11.5px;color:#6b7280;margin:12px 0 0}',
      '.fp-legend i{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:5px;vertical-align:-1px}',
      '.fp-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:18px 0 14px;padding:12px 14px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px}',
      '.fp-pages{display:flex;flex-direction:column;gap:18px}',
      '.fp-page{border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;background:#ffffff;scroll-margin-top:12px}',
      '.fp-pagehead{display:flex;align-items:center;gap:10px;padding:9px 13px;background:#f5f5f5;border-bottom:1px solid #e5e7eb;font-size:12.5px;flex-wrap:wrap}',
      '.fp-canvaswrap{background:#e9eaee;padding:10px;overflow:auto;max-height:900px}',
      '.fp-canvaswrap canvas{display:block;margin:0 auto;box-shadow:0 2px 14px rgba(0,0,0,.18);border-radius:3px;background:#fff;max-width:100%;height:auto}',
      '.fp-empty{text-align:center;padding:56px 20px;color:#9ca3af}',
      '.fp-empty-big{font-size:15px;color:#6b7280;margin-bottom:6px}',
      '.fp-log{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;color:#4d4d4d;background:#fafafa;border:1px solid #e5e7eb;border-radius:8px;padding:9px 11px;margin-top:10px;max-height:200px;overflow:auto;display:none;white-space:pre-wrap;line-height:1.6}',
      '.fp-log.is-on{display:block}',
      '.fp-progress{height:4px;background:#f2f2f2;border-radius:999px;overflow:hidden;display:none;margin-top:12px}',
      '.fp-progress.is-on{display:block}',
      '.fp-progress i{display:block;height:100%;background:#65b746;width:0;transition:width .2s;border-radius:999px}',
      '.fp-progtext{font-size:11.5px;color:#6b7280;margin-top:7px;display:none}',
      '.fp-progtext.is-on{display:block}',
      '.fp-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}'
    ].join('\n');

    document.head.appendChild(style);
  }

  function panel() {
    return document.querySelector('.' + PANEL_CLASS);
  }

  function shell() {
    return `
      <div class="fp-banner" id="fpBanner"></div>

      <div class="fp-steps">

        <div class="fp-card">
          <h2><span class="fp-num">1</span> Flyer PDF</h2>
          <p class="fp-hint">The finished flyer, exported with selectable text.</p>
          <div class="fp-drop" id="fpDropPdf" tabindex="0" role="button" aria-label="Upload flyer PDF">
            <div class="fp-drop-icon">&#128196;</div>
            <div class="fp-drop-big">Drop PDF or click to browse</div>
            <div class="fp-drop-small" id="fpPdfName">no file selected</div>
          </div>
          <input type="file" id="fpInPdf" accept="application/pdf,.pdf" class="fp-sr">
          <div class="fp-fmeta" id="fpPdfMeta"></div>
        </div>

        <div class="fp-card">
          <h2><span class="fp-num">2</span> Pricing CSV</h2>
          <p class="fp-hint">Source of truth. Needs a part-number column and a price column.</p>
          <div class="fp-drop" id="fpDropCsv" tabindex="0" role="button" aria-label="Upload pricing CSV">
            <div class="fp-drop-icon">&#128202;</div>
            <div class="fp-drop-big">Drop CSV or click to browse</div>
            <div class="fp-drop-small" id="fpCsvName">no file selected</div>
          </div>
          <input type="file" id="fpInCsv" accept=".csv,text/csv,.tsv,text/tab-separated-values,.txt" class="fp-sr">
          <div class="fp-fmeta" id="fpCsvMeta"></div>

          <details class="fp-adv">
            <summary>Column mapping &amp; parsing options</summary>
            <div class="fp-mapper" id="fpMapper">
              <div class="fp-mapgrid" id="fpMapGrid"></div>
            </div>
            <div class="fp-optgrid" style="margin-top:12px">
              <label class="fp-opt">
                <input type="checkbox" id="fpDelimAuto" checked>
                <div>
                  <div class="fp-opt-t">Auto-detect delimiter</div>
                  <div class="fp-opt-d">Sniffs , ; TAB | outside quoted fields</div>
                </div>
              </label>
              <label class="fp-opt">
                <input type="checkbox" id="fpDelimTab">
                <div>
                  <div class="fp-opt-t">Force tab-separated</div>
                  <div class="fp-opt-d">Override the sniffer</div>
                </div>
              </label>
              <label class="fp-opt">
                <input type="checkbox" id="fpSkipZero" checked>
                <div>
                  <div class="fp-opt-t">Skip $0.00 rows for price checks</div>
                  <div class="fp-opt-d">Part numbers still checked. Skips are always reported, never silent.</div>
                </div>
              </label>
            </div>
            <div class="fp-btnrow">
              <button class="fp-btn" id="fpReparse" disabled>Re-parse CSV</button>
            </div>
          </details>
        </div>

        <div class="fp-card">
          <h2><span class="fp-num">3</span> Matching rules</h2>
          <p class="fp-hint">How prices are located next to each part number.</p>
          <div class="fp-optgrid">
            <label class="fp-opt">
              <input type="checkbox" id="fpCurrency" checked>
              <div>
                <div class="fp-opt-t">Require $ or decimals</div>
                <div class="fp-opt-d">Off also treats bare 2&ndash;6 digit numbers as prices.</div>
              </div>
            </label>
            <label class="fp-opt">
              <input type="checkbox" id="fpTight">
              <div>
                <div class="fp-opt-t">Tight price window</div>
                <div class="fp-opt-d">On = same line only. Off (default) looks &plusmn;3 lines, for sub-captions and stacked layouts.</div>
              </div>
            </label>
            <label class="fp-opt">
              <input type="checkbox" id="fpPreferRight" checked>
              <div>
                <div class="fp-opt-t">Prefer prices to the right of the code</div>
                <div class="fp-opt-d">Keeps multi-column grids correct. Off only if prices sit on the left.</div>
              </div>
            </label>
            <label class="fp-opt">
              <input type="checkbox" id="fpFuzzy" checked>
              <div>
                <div class="fp-opt-t">Catch O/0, S/5, I/1 typos</div>
                <div class="fp-opt-d">Reports look-alike codes instead of calling them missing</div>
              </div>
            </label>
            <label class="fp-opt">
              <input type="checkbox" id="fpTranspose" checked>
              <div>
                <div class="fp-opt-t">Catch digit transpositions</div>
                <div class="fp-opt-d">$129.99 vs $192.99, ABC-123 vs ABC-132</div>
              </div>
            </label>
            <label class="fp-opt">
              <input type="checkbox" id="fpOrphan" checked>
              <div>
                <div class="fp-opt-t">Find orphan prices</div>
                <div class="fp-opt-d">Prices on verified pages that belong to no CSV code</div>
              </div>
            </label>
            <label class="fp-opt">
              <input type="checkbox" id="fpDupes" checked>
              <div>
                <div class="fp-opt-t">Duplicate code checks</div>
                <div class="fp-opt-d">Same code priced differently in the CSV, or listed twice in the flyer</div>
              </div>
            </label>
          </div>

          <div class="fp-progress" id="fpProgress"><i></i></div>
          <div class="fp-progtext" id="fpProgText"></div>

          <div class="fp-btnrow">
            <button class="fp-btn fp-btn-primary" id="fpRun" disabled>Verify flyer</button>
            <button class="fp-btn" id="fpReset">Reset</button>
            <button class="fp-btn" id="fpSelfTest">Run self-test</button>
          </div>

          <div class="fp-log" id="fpLog"></div>
        </div>

      </div>

      <div id="fpResults"></div>
    `;
  }

  function buildPanel() {
    if (panel()) return panel();

    const wrapper = $('.db-tool-wrapper');

    if (!wrapper) return null;

    const p = document.createElement('div');

    p.className = PANEL_CLASS;
    p.style.display = 'none';
    p.innerHTML = shell();

    wrapper.appendChild(p);

    return p;
  }

  function log(msg) {
    const el = document.getElementById('fpLog');

    if (!el) return;

    el.classList.add('is-on');
    el.textContent += (el.textContent ? '\n' : '') + msg;
    el.scrollTop = el.scrollHeight;
  }

  function progress(pct, text) {
    const p = document.getElementById('fpProgress');
    const t = document.getElementById('fpProgText');

    if (!p) return;

    p.classList.toggle('is-on', pct < 1);
    p.querySelector('i').style.width = Math.round(pct * 100) + '%';

    if (text) {
      t.classList.add('is-on');
      t.textContent = text;
    }

    if (pct >= 1) {
      setTimeout(() => {
        p.classList.remove('is-on');
        t.classList.remove('is-on');
      }, 600);
    }
  }

  function banner(kind, html) {
    const el = document.getElementById('fpBanner');

    if (!el) return;

    if (!kind) {
      el.className = 'fp-banner';
      el.innerHTML = '';
      return;
    }

    el.className = 'fp-banner fp-banner-' + kind + ' is-on';
    el.innerHTML =
      '<span>' +
      (kind === 'err' ? '&#10006;' : kind === 'warn' ? '&#9888;' : '&#9432;') +
      '</span><div>' + html + '</div>';
  }

  function bannerBox(kind, html) {
    return (
      '<div class="fp-banner fp-banner-' + kind + ' is-on">' +
      '<span>' +
      (kind === 'err' ? '&#10006;' : kind === 'warn' ? '&#9888;' : '&#9432;') +
      '</span><div>' + html + '</div></div>'
    );
  }

  function statCard(sk, label, n, key) {
    return (
      '<div class="fp-stat fp-s-' + (sk === 'ok' ? 'ok' : sk) +
      '" data-f="' + key + '">' +
      '<div class="fp-stat-bar"></div>' +
      '<div class="fp-stat-n">' + n + '</div>' +
      '<div class="fp-stat-l">' + label + '</div>' +
      '</div>'
    );
  }

  function legend() {
    return (
      '<div class="fp-legend">' +
      '<span><i style="background:rgba(176,0,32,.25);border:2px solid #b00020"></i>Price / part-number mismatch</span>' +
      '<span><i style="background:rgba(224,138,0,.25);border:2px solid #e08a00"></i>Too close to call &mdash; proof by hand</span>' +
      '<span><i style="background:rgba(75,85,99,.2);border:2px solid #4b5563"></i>Note</span>' +
      '<span><i style="background:rgba(101,183,70,.25);border:2px solid #65b746"></i>Verified correct</span>' +
      '</div>'
    );
  }

  const COLKEY = {
    'Sev': 'sev',
    'Type': 'kind',
    'Page': 'page',
    'Part number': 'code',
    'CSV price': 'csvPrice',
    'Flyer price': 'pdfPrice'
  };

  function visibleFindings() {
    if (!state.result) return [];

    let list = state.result.findings;

    if (state.filter !== 'all') {
      list = list.filter(f => f.sev === state.filter);
    }

    const k = COLKEY[state.sort.key] || 'sev';
    const dir = state.sort.dir;

    return list.slice().sort((a, b) => {
      let r;

      if (k === 'sev') {
        r = SEV_ORDER[a.sev] - SEV_ORDER[b.sev];
      } else if (k === 'page') {
        r = (a.page || 9999) - (b.page || 9999);
      } else if (k === 'csvPrice' || k === 'pdfPrice') {
        r = (a[k] == null ? -1 : a[k]) - (b[k] == null ? -1 : b[k]);
      } else {
        r = String(a[k] == null ? '' : a[k])
          .localeCompare(String(b[k] == null ? '' : b[k]));
      }

      if (r === 0) r = SEV_ORDER[a.sev] - SEV_ORDER[b.sev];

      return r * dir;
    });
  }

  function flyCell(f) {
    switch (f.kind) {
      case 'PRICE_MISMATCH':
      case 'PRICE_TRANSPOSED':
        return '<span class="fp-strike">' + money(f.pdfPrice) + '</span>';

      case 'FLYER_DUPE_PRICE':
      case 'PRICE_AMBIGUOUS':
        return '<span class="fp-strike2">' +
          (f.cands || []).map(c => money(c.value)).join(' / ') +
          '</span>';

      case 'PN_NOT_FOUND':
        return '<span class="fp-dim">not printed</span>';

      case 'PN_CHAR_SWAP':
      case 'PN_TRANSPOSED':
        return '<span class="fp-dim">wrong code</span>';

      case 'PRICE_MISSING':
        return '<span class="fp-dim">none found</span>';

      case 'CSV_PRICE_BLANK':
        return f.pdfPrice != null
          ? money(f.pdfPrice)
          : '<span class="fp-dim">none found</span>';

      case 'CSV_CONFLICT':
        return '<span class="fp-dim">n/a</span>';

      case 'ORPHAN_PRICE':
        return '<span class="fp-dim">' + money(f.pdfPrice) + '</span>';

      case 'VERIFIED':
        return '<span style="color:#377c24">' +
          money(f.pdfPrice != null ? f.pdfPrice : f.csvPrice) +
          '</span>';

      default:
        return '<span class="fp-dim">&mdash;</span>';
    }
  }

  function renderTableRows() {
    const tb = document.querySelector('#fpFindTable tbody');

    if (!tb) return;

    const list = visibleFindings();

    state.vlist = list;

    if (!list.length) {
      tb.innerHTML =
        '<tr><td colspan="7" class="fp-dim" style="padding:22px;text-align:center">' +
        'Nothing in this category.</td></tr>';

      return;
    }

    const shown = list.slice(0, ROW_CAP);

    tb.innerHTML =
      shown.map(f =>
        '<tr class="fp-row">' +
        '<td><span class="fp-tag ' + (SEV[f.sev] || SEV.info).cls + '">' +
        (SEV[f.sev] || SEV.info).label + '</span></td>' +

        '<td class="fp-mono fp-dim">' + esc(f.kind) + '</td>' +

        '<td>' + (f.page ? '<b>' + f.page + '</b>' : '<span class="fp-dim">&mdash;</span>') + '</td>' +

        '<td class="fp-mono">' +
        (f.code ? esc(f.code) : '<span class="fp-dim">&mdash;</span>') +
        (f.desc
          ? '<div class="fp-dim" style="font-family:inherit;white-space:normal;max-width:190px;margin-top:2px">' +
            esc(f.desc.slice(0, 70)) + (f.desc.length > 70 ? '…' : '') +
            '</div>'
          : '') +
        '</td>' +

        '<td class="fp-mono">' +
        (f.csvPrice != null
          ? money(f.csvPrice)
          : '<span class="fp-dim">&mdash;</span>') +
        '</td>' +

        '<td class="fp-mono">' + flyCell(f) + '</td>' +

        '<td><div class="fp-msg">' + f.msg + '</div>' +
        (f.cands && f.cands.length > 1
          ? '<div class="fp-cands">' + f.cands.map(c =>
              '<span class="fp-cand' + (c.best ? ' is-best' : '') + '">' +
              esc(c.text || money(c.value)) + '</span>'
            ).join('') + '</div>'
          : '') +
        '</td>' +
        '</tr>'
      ).join('') +
      (list.length > ROW_CAP
        ? '<tr><td colspan="7" class="fp-dim" style="padding:12px;text-align:center">' +
          'Showing first ' + ROW_CAP + ' of ' + list.length +
          ' — the CSV export has all of them.</td></tr>'
        : '');

    Array.from(tb.querySelectorAll('tr.fp-row')).forEach((tr, i) => {
      tr.onclick = () => {
        const f = shown[i];

        if (!f || !f.page) return;

        const el = document.getElementById('fp-pg-' + f.page);

        if (!el) return;

        el.scrollIntoView({ behavior: 'smooth', block: 'start' });

        el.querySelector('.fp-pagehead').animate(
          [
            { background: '#f5f5f5' },
            { background: '#dcebd3' },
            { background: '#f5f5f5' }
          ],
          { duration: 1200 }
        );
      };
    });
  }

  async function renderPages() {
    const host = document.getElementById('fpPagesHost');

    if (!host || !state.result) return;

    const targets = state.pdf.pages.filter(
      p => marksOf(p.pageNumber).length
    );

    if (!targets.length) {
      host.innerHTML =
        '<div class="fp-empty">Nothing to annotate — no page had a highlightable finding.</div>';

      return;
    }

    host.innerHTML = targets.map(p => {
      const m = marksOf(p.pageNumber);

      const e = m.filter(f => f.sev === 'error').length;

      return (
        '<div class="fp-page" id="fp-pg-' + p.pageNumber + '">' +
        '<div class="fp-pagehead"><b>Page ' + p.pageNumber + '</b>' +
        '<span class="fp-tag ' +
        (e ? 'fp-t-error' : m[0].sev === 'warn' ? 'fp-t-warn' : 'fp-t-info') +
        '">' + m.length + ' highlighted</span>' +
        (e ? '<span class="fp-tag fp-t-error">' + e + ' mismatch</span>' : '') +
        '<span style="flex:1"></span>' +
        '<span class="fp-dim">' + p.items.length + ' text runs &middot; ' +
        p.charCount + ' chars</span></div>' +
        '<div class="fp-canvaswrap"><canvas id="fp-cv-' + p.pageNumber +
        '"></canvas></div></div>'
      );
    }).join('');

    for (const p of targets) {
      const cv = document.getElementById('fp-cv-' + p.pageNumber);

      if (!cv) continue;

      try {
        const { canvas } = await renderAnnotated(p);

        cv.width = canvas.width;
        cv.height = canvas.height;
        cv.style.width = Math.min(canvas.width, 980) + 'px';
        cv.getContext('2d').drawImage(canvas, 0, 0);
      } catch (e) {
        console.error('[flyer-checker] render failed:', e);
      }
    }
  }

  function renderResults() {
    const host = document.getElementById('fpResults');

    if (!host) return;

    if (!state.result) {
      host.innerHTML =
        '<div class="fp-empty">' +
        '<div class="fp-empty-big">No run yet</div>' +
        'Upload a PDF and a CSV, then press <b>Verify flyer</b>.<br>' +
        'Or press <b>Run self-test</b> to watch it catch planted errors in a synthetic flyer.' +
        '</div>';

      return;
    }

    const R = state.result;
    const C = R.counts;

    const clean = C.error === 0 && C.warn === 0;

    let h = '';

    h +=
      '<div class="fp-verdict is-on ' +
      (clean ? 'fp-v-pass' : C.error ? 'fp-v-fail' : 'fp-v-warn') +
      '">';

    h += '<h3>' + (
      clean
        ? '&#9989; Flyer matches your pricing CSV'
        : '&#10060; ' + C.error + ' mismatch' + (C.error === 1 ? '' : 'es') +
          ' found' +
          (C.warn ? ' &middot; ' + C.warn + ' to check by hand' : '') +
          (C.missing
            ? ' &middot; ' + C.missing + ' CSV item' +
              (C.missing === 1 ? '' : 's') + ' not in the flyer'
            : '')
    ) + '</h3>';

    h += '<p>' + C.csvRows + ' CSV rows read &middot; ' + C.ok +
      ' prices verified against the flyer &middot; ' + C.pagesChecked +
      ' of ' + state.pdf.numPages + ' pages checked &middot; took ' +
      R.ms.toFixed(0) + ' ms. ' +
      (clean
        ? 'Still eyeball the annotated PDF before it goes to print.'
        : 'Every mismatch is boxed and numbered in the annotated pages below.') +
      '</p></div>';

    h += '<div class="fp-stats">';
    h += statCard('error', 'Mismatches', C.error, 'error');
    h += statCard('warn', 'Check by hand', C.warn, 'warn');
    h += statCard('info', 'Notes', C.info, 'info');
    h += statCard('ok', 'Prices verified', C.ok, 'ok');
    h += statCard('error', 'Missing from flyer', C.missing, 'error');
    h += statCard('info', 'CSV rows read', C.csvRows, 'info');
    h += '</div>';

    if (R.noTextPages.length) {
      h += bannerBox(
        'warn',
        '<b>No text layer on page' +
        (R.noTextPages.length === 1 ? '' : 's') + ' ' +
        R.noTextPages.join(', ') + '.</b> Those pages are images and ' +
        'were not checked at all. Re-export the flyer with live text, ' +
        'or proof those pages by eye.'
      );
    }

    if (C.zeroSkipped) {
      h += bannerBox(
        'info',
        '<b>' + C.zeroSkipped + ' CSV row' +
        (C.zeroSkipped === 1 ? ' has' : 's have') +
        ' a $0.00 placeholder price.</b> Their part numbers were still ' +
        'checked; their prices were not.'
      );
    }

    if (C.blankPrices) {
      h += bannerBox(
        'warn',
        '<b>' + C.blankPrices + ' CSV row' +
        (C.blankPrices === 1 ? ' has' : 's have') +
        ' a blank or unreadable price.</b> Anything printed in the flyer ' +
        'for those codes could not be verified. Fill them in, then re-run.'
      );
    }

    if (C.boundaryWarn) {
      h += bannerBox(
        'info',
        '<b>' + C.boundaryWarn + ' code(s) only matched inside a longer ' +
        'string.</b> The highlighted price may belong to a different ' +
        'product, so those are listed as “check by hand”.'
      );
    }

    if (C.csvConflicts) {
      h += bannerBox(
        'err',
        '<b>The spreadsheet contradicts itself.</b> ' + C.csvConflicts +
        ' code(s) appear more than once with different prices. Fix the ' +
        'CSV and re-run — the flyer cannot be validated against an ' +
        'ambiguous source.'
      );
    }

    (state.csv.warnings || []).forEach(w => {
      h += bannerBox(
        w.level === 'err' ? 'err' : 'warn',
        '<b>Column mapping problem.</b> ' + esc(w.text)
      );
    });

    h += legend();

    h +=
      '<div class="fp-toolbar">' +
      '<button class="fp-btn fp-btn-primary" id="fpExportPdf">Download annotated PDF</button>' +
      '<button class="fp-btn" id="fpExportCsv">Download report CSV</button>' +
      '<button class="fp-btn" id="fpPrint">Print summary</button>' +
      '<span style="flex:1"></span>' +
      '<span class="fp-pill">' + C.totalOcc + ' flyer occurrences checked</span>' +
      '</div>';

    h +=
      '<div class="fp-sechead"><h2>Findings</h2>' +
      '<span class="fp-pill">' + R.findings.length + ' total</span>' +
      '<span style="flex:1"></span>' +
      '<span class="fp-dim" style="font-size:11.5px">Click a column to sort &middot; click a row to jump to the page</span>' +
      '</div>';

    h +=
      '<div class="fp-tablewrap"><table class="fp-table" id="fpFindTable"><thead><tr>' +
      ['Sev', 'Type', 'Page', 'Part number', 'CSV price', 'Flyer price', 'Notes']
        .map(k => '<th data-k="' + k + '">' + k + '</th>')
        .join('') +
      '</tr></thead><tbody></tbody></table></div>';

    h +=
      '<div class="fp-sechead"><h2>Annotated pages</h2>' +
      '<span class="fp-pill">highlights drawn on the real flyer</span>' +
      '</div>';

    h += '<div class="fp-pages" id="fpPagesHost"></div>';

    host.innerHTML = h;

    Array.from(
      document.querySelectorAll('#fpFindTable th')
    ).forEach(th => {
      th.onclick = () => {
        const k = th.getAttribute('data-k');

        state.sort = {
          key: k,
          dir: state.sort.key === k ? -state.sort.dir : 1
        };

        renderTableRows();
      };
    });

    Array.from(document.querySelectorAll('.fp-stat')).forEach(s => {
      s.onclick = () => {
        const f = s.getAttribute('data-f');

        state.filter = state.filter === f ? 'all' : f;

        Array.from(document.querySelectorAll('.fp-stat')).forEach(x => {
          x.classList.toggle(
            'is-sel',
            x.getAttribute('data-f') === state.filter
          );
        });

        renderTableRows();
      };
    });

    const btnPdf = document.getElementById('fpExportPdf');
    const btnCsv = document.getElementById('fpExportCsv');
    const btnPrint = document.getElementById('fpPrint');

    if (btnPdf) btnPdf.onclick = exportAnnotatedPdf;
    if (btnCsv) btnCsv.onclick = exportReportCsv;
    if (btnPrint) btnPrint.onclick = () => window.print();

    renderTableRows();
    renderPages();
  }

  /* ======================================================================
     9. exports
     ====================================================================== */

  function download(blob, name) {
    const a = document.createElement('a');

    a.href = URL.createObjectURL(blob);
    a.download = name;

    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1500);
  }

  function exportReportCsv() {
    const rows = [[
      'severity', 'type', 'page', 'part_number', 'csv_price',
      'flyer_price', 'description', 'csv_section', 'notes',
      'nearby_price_candidates'
    ]];

    visibleFindings().forEach(f => {
      rows.push([
        f.sev,
        f.kind,
        f.page || '',
        f.code || '',
        f.csvPrice != null ? f.csvPrice.toFixed(2) : '',
        f.pdfPrice != null ? f.pdfPrice.toFixed(2) : '',
        f.desc || '',
        f.section || '',
        f.msg.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
        (f.cands || []).map(c => c.text || money(c.value)).join(' | ')
      ]);
    });

    const csv = rows
      .map(r => r
        .map(c => /[",\r\n]/.test(String(c))
          ? '"' + String(c).replace(/"/g, '""') + '"'
          : String(c))
        .join(','))
      .join('\r\n');

    download(
      new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }),
      'flyer-proof-report.csv'
    );
  }

  async function exportAnnotatedPdf() {
    const targets = state.pdf.pages.filter(
      p => marksOf(p.pageNumber).length
    );

    if (!targets.length) {
      alert('No annotations to export — nothing was flagged on any page.');
      return;
    }

    const setBtn = (txt, off) => {
      const b = document.getElementById('fpExportPdf');

      if (b) {
        b.textContent = txt;
        b.disabled = off;
      }
    };

    setBtn('Rendering…', true);

    try {
      const { jsPDF } = window.jspdf;

      const doc = new jsPDF({
        unit: 'pt',
        format: 'a4',
        compress: true
      });

      const PW = doc.internal.pageSize.getWidth();
      const PH = doc.internal.pageSize.getHeight();
      const M = 20;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(20);
      doc.text('Flyer Proof — issue index', M, M + 20);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(110);
      doc.text(
        'Numbers match the badges on the annotated pages that follow.',
        M,
        M + 36
      );

      let y = M + 60;
      let n = 0;

      targets.forEach(p => {
        marksOf(p.pageNumber).forEach(f => {
          n++;

          if (y > PH - 30) {
            doc.addPage('a4', 'portrait');
            y = M + 10;
          }

          const rgb = {
            error: [176, 0, 32],
            warn: [190, 115, 0],
            info: [75, 85, 99],
            ok: [55, 124, 36]
          }[f.sev] || [90, 90, 90];

          doc.setFontSize(8.5);
          doc.setTextColor.apply(doc, rgb);
          doc.text(n + '.', M, y);

          doc.setTextColor(25);

          const head = f.code || '(no code)';

          doc.text(head.slice(0, 30), M + 16, y);

          doc.setTextColor(110);

          const tail =
            (f.csvPrice != null ? money(f.csvPrice) : '') +
            (f.pdfPrice != null ? '  →  ' + money(f.pdfPrice) : '') +
            '   p.' + (f.page || '-') + '  ' + f.kind;

          doc.text(
            tail.slice(0, 70),
            M + 16 + doc.getTextWidth(head.slice(0, 30)) + 6,
            y
          );

          y += 11.5;
        });
      });

      for (const p of targets) {
        doc.addPage('a4', 'portrait');

        // the same render the on-screen preview used
        const { canvas, jpeg } = await renderAnnotated(p);

        const k = Math.min(
          (PW - M * 2) / canvas.width,
          (PH - M * 2 - 14) / canvas.height
        );

        doc.addImage(
          jpeg,
          'JPEG',
          (PW - canvas.width * k) / 2,
          M,
          canvas.width * k,
          canvas.height * k
        );

        const e = marksOf(p.pageNumber)
          .filter(f => f.sev === 'error').length;

        doc.setFontSize(7.5);
        doc.setTextColor(130);

        doc.text(
          'Flyer Proof — flyer page ' + p.pageNumber + '  ·  ' +
          marksOf(p.pageNumber).length + ' highlighted, ' +
          e + ' mismatch(es)',
          M,
          PH - 9
        );
      }

      doc.save('flyer-proof-annotated.pdf');

    } catch (e) {
      console.error('[flyer-checker] export failed:', e);
      alert('Export failed: ' + e.message);
    } finally {
      setBtn('Download annotated PDF', false);
    }
  }

  /* ======================================================================
     10. loading files
     ====================================================================== */

  function parseCsvInto(text) {
    const forcedTab = document.getElementById('fpDelimTab').checked;
    const auto = document.getElementById('fpDelimAuto').checked;

    const delim =
      auto && !forcedTab
        ? sniffDelimiter(text).delim
        : (forcedTab ? '\t' : ',');

    const cells = parseCSV(text, delim);

    if (!cells.length) return null;

    let headerRow = -1;
    let cols = null;

    const limit = Math.min(cells.length, 40);

    for (let r = 0; r < limit; r++) {
      const c = guessColumns(cells[r]);

      if (c.code >= 0 && c.price >= 0) {
        headerRow = r;
        cols = c;
        break;
      }

      if (c.code >= 0 && !cols) {
        headerRow = r;
        cols = Object.assign({}, c, { price: -1 });
      }
    }

    if (headerRow < 0) {
      for (let r = 0; r < limit; r++) {
        const ne = cells[r].filter(
          x => String(x).trim() !== ''
        ).length;

        if (ne >= 3) {
          headerRow = r;
          cols = guessColumns(cells[r]);
          break;
        }
      }
    }

    if (headerRow < 0) return null;

    if (cols.code < 0) cols.code = 0;
    if (cols.price < 0) {
      cols.price = Math.max(0, cells[headerRow].length - 1);
    }

    const width = Math.max.apply(
      null,
      cells.map(r => r.length)
    );

    const norm = cells.map(r => {
      const c = r.slice();

      while (c.length < width) c.push('');

      return c;
    });

    const built = buildProducts(norm, norm[headerRow], cols);

    return Object.assign({
      cells: norm,
      header: norm[headerRow],
      headerRow,
      cols,
      delim
    }, built);
  }

  function paintCsvMeta() {
    const r = state.csv;
    const m = document.getElementById('fpCsvMeta');

    if (!r || !m) return;

    const s = r.stats;

    m.classList.add('is-on');

    const codeCol = (r.header[r.cols.code] || '#' + (r.cols.code + 1)).trim();
    const priceCol = (r.header[r.cols.price] || '#' + (r.cols.price + 1)).trim();

    m.innerHTML =
      '<b>' + esc(r.name || 'pricing.csv') + '</b> &middot; ' +
      r.cells.length + ' rows &middot; delimiter <b>' +
      (r.delim === '\t' ? 'TAB' : r.delim) + '</b> &middot; ' +
      'code col <b>' + esc(codeCol) + '</b> &middot; price col <b>' +
      esc(priceCol) + '</b><br>' +

      '<span class="fp-ok">' + s.used + ' products</span>' +
      (s.zeroPrice ? ' &middot; <span class="fp-warn">' + s.zeroPrice + ' @ $0.00</span>' : '') +
      (s.headerSkips ? ' &middot; ' + s.headerSkips + ' repeat-header' : '') +
      (s.sectionSkips ? ' &middot; ' + s.sectionSkips + ' section' : '') +
      (s.blankSkips ? ' &middot; ' + s.blankSkips + ' blank' : '') +
      (s.noCode ? ' &middot; ' + s.noCode + ' no-code' : '') +
      (s.noPrice ? ' &middot; <span class="fp-warn">' + s.noPrice + ' blank price</span>' : '') +
      (s.badPrice ? ' &middot; <span class="fp-warn">' + s.badPrice + ' unparsed price</span>' : '') +
      (s.conflicts ? ' &middot; <span class="fp-bad">' + s.conflicts + ' conflicting duplicate</span>' : '');
  }

  function buildMapper() {
    const r = state.csv;
    const grid = document.getElementById('fpMapGrid');

    if (!r || !grid) return;

    const opt = c => r.header
      .map((h, i) =>
        '<option value="' + i + '"' + (i === c ? ' selected' : '') + '>' +
        esc((h && h.trim()) || ('column ' + (i + 1))) +
        '</option>')
      .join('');

    grid.innerHTML =
      '<div class="fp-maprow"><label>Part number column</label>' +
      '<select class="fp-select" id="fpMapCode">' + opt(r.cols.code) + '</select></div>' +

      '<div class="fp-maprow"><label>Price column</label>' +
      '<select class="fp-select" id="fpMapPrice">' + opt(r.cols.price) + '</select></div>' +

      '<div class="fp-maprow"><label>Description (optional)</label>' +
      '<select class="fp-select" id="fpMapDesc">' + opt(r.cols.desc) + '</select></div>' +

      '<div class="fp-maprow"><label>Stock (optional)</label>' +
      '<select class="fp-select" id="fpMapStock">' + opt(r.cols.stock) + '</select></div>';

    const apply = () => {
      r.cols.code = +document.getElementById('fpMapCode').value;
      r.cols.price = +document.getElementById('fpMapPrice').value;
      r.cols.desc = +document.getElementById('fpMapDesc').value;
      r.cols.stock = +document.getElementById('fpMapStock').value;

      const b = buildProducts(r.cells, r.header, r.cols);

      r.products = b.products;
      r.byNorm = b.byNorm;
      r.dupGroups = b.dupGroups;
      r.stats = b.stats;
      r.warnings = b.warnings;

      paintCsvMeta();

      const w = (b.warnings || [])[0];

      banner(
        b.stats.conflicts || w
          ? (w && w.level === 'err' ? 'err' : 'warn')
          : 'info',
        'Mapping updated: <b>' + b.products.length +
        '</b> products read.' + (w ? ' ' + esc(w.text) : '') +
        ' Press <b>Verify flyer</b> to re-run.'
      );
    };

    Array.from(grid.querySelectorAll('select')).forEach(s => {
      s.onchange = apply;
    });

    document.getElementById('fpMapper')
      .classList.add('is-on');
  }

  async function loadPdf(file) {
    if (!window.pdfjsLib && !initPdf()) {
      banner('err', 'The PDF engine is not available yet.');
      return Promise.reject(new Error('no pdfjs'));
    }

    banner('');

    const drop = document.getElementById('fpDropPdf');

    drop.classList.remove('is-err');
    drop.classList.add('is-ok');

    document.getElementById('fpPdfName').textContent = file.name;

    progress(0.02, 'Reading PDF…');

    try {
      const res = await extractPdf(
        file,
        (p, n) => progress(
          0.05 + 0.5 * p / n,
          'Extracting text — page ' + p + ' of ' + n + '…'
        )
      );

      state.pdf = res;

      const noText = res.pages.filter(p => p.noText).length;

      const chars = res.pages.reduce(
        (a, p) => a + p.charCount,
        0
      );

      const meta = document.getElementById('fpPdfMeta');

      meta.classList.add('is-on');
      meta.innerHTML =
        '<b>' + esc(file.name) + '</b> &middot; ' + res.numPages +
        ' page' + (res.numPages === 1 ? '' : 's') + ' &middot; ' +
        chars.toLocaleString() + ' characters extracted' +
        (noText
          ? ' &middot; <span class="fp-warn">' + noText +
            ' page(s) with no text layer</span>'
          : ' &middot; <span class="fp-ok">text layer OK on all pages</span>');

      banner(
        noText ? 'warn' : 'info',
        noText
          ? '<b>' + noText + ' page(s) have no text layer</b> — they are ' +
            'images and will be skipped. Everything else still gets checked.'
          : 'PDF ready: ' + res.numPages +
            ' pages, text layer found on all of them.'
      );

      updateButtons();
      progress(1);

      return res;

    } catch (e) {
      drop.classList.add('is-err');

      banner(
        'err',
        '<b>Could not read that PDF.</b> ' + esc(e.message) +
        ' — it may be encrypted or corrupt.'
      );

      progress(1);

      throw e;
    }
  }

  async function loadCsv(file) {
    const text = await file.arrayBuffer()
      .then(b => new TextDecoder('utf-8').decode(b));

    const r = parseCsvInto(text);

    if (!r) {
      throw new Error(
        'No header row found. Need a column that looks like ' +
        'Code/Part Number/SKU and one that looks like a price.'
      );
    }

    r.rawText = text;
    r.name = file.name;

    state.csv = r;

    const drop = document.getElementById('fpDropCsv');

    drop.classList.remove('is-err');
    drop.classList.add('is-ok');

    document.getElementById('fpCsvName').textContent = file.name;

    paintCsvMeta();
    buildMapper();
    updateButtons();

    banner(
      r.stats.conflicts ? 'warn' : 'info',
      'CSV ready: <b>' + r.stats.used + '</b> product rows' +
      (r.stats.sectionSkips
        ? ' across ' + r.stats.sectionSkips + ' page sections'
        : '') +
      '. Change the column mapping under “Column mapping” if it picked ' +
      'the wrong columns.'
    );

    return r;
  }

  function getOpts() {
    return {
      currency: document.getElementById('fpCurrency').checked,
      tight: document.getElementById('fpTight').checked,
      preferRight: document.getElementById('fpPreferRight').checked,
      fuzzy: document.getElementById('fpFuzzy').checked,
      transpose: document.getElementById('fpTranspose').checked,
      orphan: document.getElementById('fpOrphan').checked,
      dupes: document.getElementById('fpDupes').checked,
      skipZero: document.getElementById('fpSkipZero').checked
    };
  }

  function updateButtons() {
    const run = document.getElementById('fpRun');
    const re = document.getElementById('fpReparse');

    if (run) run.disabled = !(state.pdf && state.csv);
    if (re) re.disabled = !state.csv;
  }

  function runNow(fromSelfTest) {
    if (!state.pdf || !state.csv) return;

    const opts = getOpts();

    progress(0.15, 'Matching part numbers and prices…');

    setTimeout(() => {
      try {
        clearPageCache();

        const r = runCheck(state.pdf, state.csv, opts);

        state.result = r;
        state.filter = 'error';
        state.sort = { key: 'Sev', dir: 1 };

        progress(1, 'Done');
        renderResults();

        if (fromSelfTest) {
          reportSelfTest(r);
        }

      } catch (e) {
        console.error('[flyer-checker] check failed:', e);
        banner('err', '<b>Check failed:</b> ' + esc(e.message));
        progress(1);
      }
    }, 40);
  }

  function reset() {
    clearPageCache();

    state = {
      pdf: null,
      csv: null,
      result: null,
      filter: 'error',
      sort: { key: 'Sev', dir: 1 },
      vlist: []
    };

    ['fpDropPdf', 'fpDropCsv'].forEach(id => {
      const el = document.getElementById(id);

      if (el) el.classList.remove('is-ok', 'is-err');
    });

    const pn = document.getElementById('fpPdfName');
    const cn = document.getElementById('fpCsvName');

    if (pn) pn.textContent = 'no file selected';
    if (cn) cn.textContent = 'no file selected';

    ['fpPdfMeta', 'fpCsvMeta'].forEach(id => {
      const el = document.getElementById(id);

      if (el) el.classList.remove('is-on');
    });

    const mapper = document.getElementById('fpMapper');

    if (mapper) mapper.classList.remove('is-on');

    const inPdf = document.getElementById('fpInPdf');
    const inCsv = document.getElementById('fpInCsv');

    if (inPdf) inPdf.value = '';
    if (inCsv) inCsv.value = '';

    const l = document.getElementById('fpLog');

    if (l) {
      l.classList.remove('is-on');
      l.textContent = '';
    }

    updateButtons();
    banner('');
    progress(1);
    renderResults();
  }

  /* ======================================================================
     11. self-test
     ====================================================================== */

  const SELFTEST_EXPECT = {
    error: 5,
    warn: 0,
    ok: 3,
    csvRows: 9,
    missing: 2,
    zeroSkipped: 1,
    info: 1
  };

  const SELFTEST_PLANTED = {
    'MTW-1002': 'PRICE_TRANSPOSED',
    'MTW-1007': 'PRICE_MISMATCH',
    'MTW-1004': 'PN_CHAR_SWAP',
    'MTW-1008': 'PN_NOT_FOUND',
    'MTW-1009': 'PRICE_MISMATCH'
  };

  function reportSelfTest(r) {
    const C = r.counts;
    const E = SELFTEST_EXPECT;

    const got = {
      error: C.error,
      warn: C.warn,
      ok: C.ok,
      csvRows: C.csvRows,
      missing: C.missing,
      zeroSkipped: C.zeroSkipped,
      info: C.info
    };

    const diffs = Object.keys(E).filter(k => got[k] !== E[k]);

    log('');
    log('SELF-TEST ' + (diffs.length ? 'FAILED' : 'PASSED'));

    Object.keys(E).forEach(k => {
      log(
        '  ' + (got[k] === E[k] ? '✔' : '✘') +
        ' ' + k.padEnd(11) +
        ' got ' + String(got[k]).padStart(4) +
        '   expected ' + E[k]
      );
    });

    let all = true;

    Object.keys(SELFTEST_PLANTED).forEach(c => {
      const hit = r.findings.find(
        f => f.code === c && f.sev === 'error'
      );

      const good = hit && hit.kind === SELFTEST_PLANTED[c];

      if (!good) all = false;

      log(
        '  ' + (good ? '✔' : '✘') + ' ' + c + ' flagged as ' +
        SELFTEST_PLANTED[c] +
        (hit && !good ? '  (got ' + (hit ? hit.kind : 'nothing') + ')' : '')
      );
    });

    const cleanOk = ['MTW-1001', 'MTW-1003', 'MTW-1006'].every(c =>
      r.findings.some(f => f.code === c && f.sev === 'ok')
    );

    log(
      (cleanOk ? '  ✔' : '  ✘') +
      ' the 3 correct prices were verified, not flagged'
    );

    const noSpurious =
      r.findings.filter(f => f.sev === 'error').length === 5;

    log(
      (noSpurious ? '  ✔' : '  ✘') +
      ' no false mismatches beyond the 5 planted ones'
    );

    if (!diffs.length && all && cleanOk && noSpurious) {
      log(
        '  ✔ checker is behaving correctly on a known-answer flyer'
      );
    }
  }

  async function selfTest() {
    if (!(await ensureLibraries())) {
      alert('Could not load the PDF engine.');
      return;
    }

    const T = String.fromCharCode(9);
    const R = String.fromCharCode(13, 10);

    const rows = [
      { code: 'MTW-1001', price: 129.99, flyer: 'MTW-1001', flyerPrice: 129.99 },
      { code: 'MTW-1002', price: 249.50, flyer: 'MTW-1002', flyerPrice: 294.50 },
      { code: 'MTW-1003', price: 59.00, flyer: 'MTW-1003', flyerPrice: 59.00 },
      { code: 'MTW-1004', price: 8.75, flyer: 'MTW-1O04', flyerPrice: 8.75 },
      { code: 'MTW-1006', price: 315.00, flyer: 'MTW-1006', flyerPrice: 315.00 },
      { code: 'MTW-1007', price: 42.10, flyer: 'MTW-1007', flyerPrice: 999.99 },
      { code: 'MTW-1009', price: 15.00, flyer: 'MTW-1009', flyerPrice: 0.00 },
      { code: 'MTW-1008', price: 77.25, flyer: null, flyerPrice: null }
    ];

    const printed = rows.filter(x => x.flyer);

    const d = new window.jspdf.jsPDF({
      unit: 'pt',
      format: 'letter'
    });

    d.setFont('helvetica', 'bold');
    d.setFontSize(16);
    d.text('MTW Quarterly Flyer', 50, 54);

    d.setFontSize(8);
    d.setTextColor(140);
    d.text('Part number', 60, 74);
    d.text('Retail', 300, 74);

    d.setFont('courier', 'normal');
    d.setTextColor(0);

    printed.forEach((t, i) => {
      const y = 96 + i * 26;

      d.text(t.flyer, 60, y);
      d.text('$' + t.flyerPrice.toFixed(2), 300, y);
    });

    const pdfBytes = atobToBytes(
      d.output('datauristring').split(',')[1]
    );

    // field order must line up with the header, otherwise every row reads
    // as a different product and the whole check is meaningless
    const line = (grp, n, code, desc, price) =>
      [
        '', '', 'Group ' + grp, String(n), code, 'In stock',
        desc, '', 'Tools', grp === 'P' ? 'Power' : 'Hand',
        '', '$' + price
      ].join(T);

    const L = [
      [
        'Completed / Comments', '', 'Groups ', '#', 'Code', 'Stock',
        'Description', '#In-stock ', 'Category', 'Sub Category',
        'Pricing Group', 'Retail Price'
      ].join(T),
      '',
      ['', '', '', 'Page 0 - Cover'].join(T),
      line('Promo', 1, 'MTW-2000', 'Cover banner item', '0.00'),
      line('Cover', 2, '', 'No code here', '0.00'),
      ['', '', '', 'Page 1 - TBD (' + rows.length + ' products)'].join(T)
    ];

    rows.forEach((t, i) => {
      L.push(
        line('H', i + 1, t.code, t.code + ' widget', t.price.toFixed(2))
      );
    });

    const csvBytes = new TextEncoder().encode(L.join(R));

    reset();

    log('Self-test: built a synthetic 8-item flyer with 5 planted errors');
    log('  1. MTW-1002  printed $294.50   CSV $249.50   transposed digits');
    log('  2. MTW-1007  printed $999.99   CSV $ 42.10   wrong price');
    log('  3. MTW-1004  printed "MTW-1O04"          letter O instead of zero');
    log('  4. MTW-1008  in the CSV, never printed in the flyer');
    log('  5. MTW-1009  printed $0.00     CSV $ 15.00   price zeroed in flyer');
    log('  + MTW-2000 $0.00 cover placeholder -> note, not a failure');
    log('  + one cover row with no Code        -> dropped as a non-product');
    log('  + MTW-1001/1003/1006 correct         -> must verify clean');

    try {
      await loadCsv(
        new File([csvBytes], 'selftest-pricing.csv', { type: 'text/csv' })
      );

      await loadPdf(
        new File([pdfBytes], 'selftest-flyer.pdf', { type: 'application/pdf' })
      );

      runNow(true);

    } catch (e) {
      log('Self-test could not run: ' + e.message);
      banner('err', '<b>Self-test failed:</b> ' + esc(e.message));
    }
  }

  function atobToBytes(b64) {
    const bin = atob(b64);
    const u = new Uint8Array(bin.length);

    for (let i = 0; i < bin.length; i++) {
      u[i] = bin.charCodeAt(i);
    }

    return u;
  }

  /* ======================================================================
     12. wiring
     ====================================================================== */

  function wireDrop(dropId, inputId, onFile) {
    const drop = document.getElementById(dropId);
    const input = document.getElementById(inputId);

    if (!drop || !input) return;

    drop.onclick = () => input.click();

    drop.onkeydown = e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        input.click();
      }
    };

    ['dragenter', 'dragover'].forEach(ev => {
      drop.addEventListener(ev, e => {
        e.preventDefault();
        drop.classList.add('is-over');
      });
    });

    ['dragleave', 'drop'].forEach(ev => {
      drop.addEventListener(ev, e => {
        e.preventDefault();
        drop.classList.remove('is-over');
      });
    });

    drop.addEventListener('drop', e => {
      const f = e.dataTransfer.files && e.dataTransfer.files[0];

      if (f) onFile(f);
    });

    input.onchange = () => {
      if (input.files[0]) onFile(input.files[0]);
    };
  }

  function wire() {
    const p = panel();

    // Guard on the panel itself, not a separate marker element. If the
    // panel is ever rebuilt the new one starts unwired, so a stale flag
    // can never leave buttons dead or double-fire loadPdf.
    if (!p || p.dataset.fpWired === 'true') return;

    p.dataset.fpWired = 'true';

    wireDrop('fpDropPdf', 'fpInPdf', f => {
      loadPdf(f).catch(() => {});
    });

    wireDrop('fpDropCsv', 'fpInCsv', f => {
      state.csv = null;
      state.result = null;
      clearPageCache();
      renderResults();
      updateButtons();

      const name = document.getElementById('fpCsvName');

      if (name) name.textContent = f.name;

      loadCsv(f).catch(e => {
        const drop = document.getElementById('fpDropCsv');

        if (drop) drop.classList.add('is-err');

        banner(
          'err',
          '<b>Could not parse that CSV:</b> ' + esc(e.message)
        );

        updateButtons();
      });
    });

    const run = document.getElementById('fpRun');
    const rst = document.getElementById('fpReset');
    const st = document.getElementById('fpSelfTest');
    const re = document.getElementById('fpReparse');

    if (run) run.onclick = () => runNow(false);
    if (rst) rst.onclick = reset;
    if (st) st.onclick = () => { selfTest(); };

    if (re) {
      re.onclick = () => {
        if (!state.csv || !state.csv.rawText) return;

        const name = state.csv.name;

        const r = parseCsvInto(state.csv.rawText);

        if (r) {
          r.rawText = state.csv.rawText;
          r.name = name;

          state.csv = r;

          paintCsvMeta();
          buildMapper();
          updateButtons();

          banner(
            r.stats.conflicts ? 'warn' : 'info',
            'Re-parsed: <b>' + r.stats.used + '</b> products. Press ' +
            '<b>Verify flyer</b> to re-run.'
          );
        }
      };
    }

    ['fpDelimAuto', 'fpDelimTab'].forEach(id => {
      const el = document.getElementById(id);

      if (el && re) {
        el.onchange = () => {
          if (state.csv && state.csv.rawText) re.click();
        };
      }
    });

    updateButtons();
    renderResults();
  }

  function init() {
    if (!buildPanel()) {
      setTimeout(init, 200);
      return;
    }

    injectStyles();
    wire();
  }

  function onOpen(e) {
    if (e.detail && e.detail.id !== TOOL_ID) return;

    if (buildPanel()) {
      injectStyles();
      wire();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  document.addEventListener('db-tool-open', onOpen);

  window.MTWFlyerChecker = {
    open: onOpen,
    run: runNow,
    loadCsv,
    loadPdf,
    selfTest,
    reset,
    ensureLibraries,
    get state() { return state; }
  };

})();
