const {
  db,
  $,
  $$,
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc
} = window.MTW;

(function () {

  function toMillis(v) {
    if (v == null) return 0;
    if (typeof v === 'number') return v;
    if (typeof v.toDate === 'function') {
      try { return v.toDate().getTime(); } catch (e) { return 0; }
    }
    if (typeof v.seconds === 'number') return v.seconds * 1000;
    const t = new Date(v).getTime();
    return Number.isNaN(t) ? 0 : t;
  }

  function formatDate(v) {
    const ms = toMillis(v);
    if (!ms) return '';
    return new Date(ms).toLocaleString('en-NZ', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function normalize(entry) {
    if (!entry || typeof entry !== 'object') return null;
    return {
      title: entry.taskTitle || entry.title || entry.task || entry.name || 'Untitled',
      message: entry.message || entry.msg || entry.description || '',
      date: entry.date != null ? entry.date : (entry.createdAt != null ? entry.createdAt : (entry.timestamp != null ? entry.timestamp : 0))
    };
  }

  function collectCommits(data) {
    const out = [];
    if (Array.isArray(data.commits)) {
      data.commits.forEach(function(c) {
        const n = normalize(c);
        if (n) out.push(n);
      });
    }
    const projects = data.projects;
    if (Array.isArray(projects) && projects[5] != null) {
      const p5 = projects[5];
      if (Array.isArray(p5.commits)) {
        p5.commits.forEach(function(c) {
          const n = normalize(c);
          if (n) out.push(n);
        });
      } else if (Array.isArray(p5)) {
        p5.forEach(function(c) {
          const n = normalize(c);
          if (n) out.push(n);
        });
      } else {
        const n = normalize(p5);
        if (n && (n.title !== 'Untitled' || n.message)) out.push(n);
      }
    }
    out.sort(function(a, b) { return toMillis(b.date) - toMillis(a.date); });
    return out;
  }

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function render(entries) {
    const box = $('.change-logs');
    if (!box) return;
    if (!entries.length) {
      box.innerHTML = '<div class="change-log-empty">No change logs yet.</div>';
      return;
    }
    box.innerHTML = '';
    entries.forEach(function(e) {
      const row = document.createElement('div');
      row.className = 'change-log-row';
      const title = document.createElement('div');
      title.className = 'change-log-title';
      title.textContent = e.title;
      const msg = document.createElement('div');
      msg.className = 'change-log-message';
      msg.textContent = e.message;
      const date = document.createElement('div');
      date.className = 'change-log-date';
      date.textContent = formatDate(e.date);
      row.appendChild(title);
      row.appendChild(msg);
      row.appendChild(date);
      box.appendChild(row);
    });
  }

  async function load() {
    const box = $('.change-logs');
    try {
      if (!db) throw new Error('db unavailable');
      const snap = await getDoc(doc(db, 'workstation', 'main'));
      if (!snap || !snap.exists()) {
        render([]);
        return;
      }
      render(collectCommits(snap.data() || {}));
    } catch (err) {
      console.error('[change-logs] load failed:', err);
      if (box) box.innerHTML = '<div class="change-log-empty">Could not load change logs.</div>';
    }
  }

  function syncVisibility() {
    const tool = $('.db-tool-wrapper');
    const box = $('.change-logs');
    if (!box) return;
    const open = tool && getComputedStyle(tool).display === 'block';
    box.style.display = open ? 'none' : '';
  }

  function watchTool() {
    const tool = $('.db-tool-wrapper');
    if (tool && !tool.dataset.clWatch) {
      tool.dataset.clWatch = 'true';
      new MutationObserver(syncVisibility).observe(tool, {
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }
    document.addEventListener('db-tool-open', syncVisibility);
    document.addEventListener('db-tool-close', syncVisibility);
    syncVisibility();
  }

  function init() {
    if (!document.querySelector('.change-logs')) {
      setTimeout(init, 200);
      return;
    }
    watchTool();
    load();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

})();
