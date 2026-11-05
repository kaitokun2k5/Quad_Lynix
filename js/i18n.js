// Language + theme switching, table of contents, scroll spy, code highlighting, math.
(function () {
  var root = document.documentElement;
  var TITLES = {
    vi: 'Vector & Quaternion cho quadcopter',
    en: 'Vectors & Quaternions for quadcopters'
  };

  function store(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }

  // ----- Language -----
  function setLang(lang, save) {
    root.setAttribute('data-lang', lang);
    root.setAttribute('lang', lang);
    document.title = TITLES[lang];
    document.querySelectorAll('[data-set-lang]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-set-lang') === lang));
    });
    if (save) {
      store('qg-lang', lang);
      try {
        var url = new URL(location.href);
        url.searchParams.set('lang', lang);
        history.replaceState(null, '', url);
      } catch (e) {}
    }
    document.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
  }
  document.querySelectorAll('[data-set-lang]').forEach(function (b) {
    b.addEventListener('click', function () { setLang(b.getAttribute('data-set-lang'), true); });
  });
  setLang(root.getAttribute('data-lang') || 'vi', false);

  // ----- Theme -----
  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  function effectiveTheme() {
    return root.getAttribute('data-theme') || (darkQuery.matches ? 'dark' : 'light');
  }
  function syncTheme() {
    root.setAttribute('data-theme-effective', effectiveTheme());
    document.dispatchEvent(new CustomEvent('themechange'));
  }
  document.getElementById('themeBtn').addEventListener('click', function () {
    var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    store('qg-theme', next);
    syncTheme();
  });
  darkQuery.addEventListener('change', syncTheme);
  syncTheme();

  // ----- Heading anchors + table of contents -----
  var toc = document.getElementById('toc');
  var headings = Array.prototype.slice.call(document.querySelectorAll('main h2[id], main h3[id]'));
  var currentGroup = null;
  headings.forEach(function (h) {
    var a = document.createElement('a');
    a.href = '#' + h.id;
    a.innerHTML = h.innerHTML;
    var li = document.createElement('li');
    li.appendChild(a);
    if (h.tagName === 'H2') {
      toc.appendChild(li);
      currentGroup = document.createElement('ol');
      li.appendChild(currentGroup);
    } else if (currentGroup) {
      currentGroup.appendChild(li);
    }
  });
  document.querySelectorAll('main h2[id], main h3[id], main h4[id]').forEach(function (h) {
    var anchor = document.createElement('a');
    anchor.className = 'anchor';
    anchor.href = '#' + h.id;
    anchor.textContent = '#';
    anchor.setAttribute('aria-hidden', 'true');
    h.appendChild(anchor);
  });

  // ----- Mobile drawer -----
  var menuBtn = document.getElementById('menuBtn');
  function closeNav() { document.body.classList.remove('nav-open'); menuBtn.setAttribute('aria-expanded', 'false'); }
  menuBtn.addEventListener('click', function () {
    var open = document.body.classList.toggle('nav-open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  document.getElementById('scrim').addEventListener('click', closeNav);
  toc.addEventListener('click', function (e) { if (e.target.closest('a')) closeNav(); });

  // ----- Scroll spy, progress bar, back-to-top -----
  var tocLinks = toc.querySelectorAll('a');
  var progress = document.getElementById('progress');
  var fab = document.getElementById('fabTop');
  fab.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
    fab.classList.toggle('show', y > 900);
    var current = headings[0];
    for (var i = 0; i < headings.length; i++) {
      if (headings[i].getBoundingClientRect().top < 120) current = headings[i];
      else break;
    }
    tocLinks.forEach(function (a) { a.classList.toggle('active', current && a.getAttribute('href') === '#' + current.id); });
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  // ----- Code: highlight + copy button -----
  document.querySelectorAll('pre > code').forEach(function (code) {
    if (window.hljs) window.hljs.highlightElement(code);
    var btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.type = 'button';
    btn.textContent = 'Copy';
    btn.addEventListener('click', function () {
      var done = function () {
        btn.textContent = root.getAttribute('data-lang') === 'vi' ? 'Đã chép' : 'Copied';
        setTimeout(function () { btn.textContent = 'Copy'; }, 1400);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(code.innerText).then(done, function () {});
    });
    code.parentNode.appendChild(btn);
  });

  // ----- Math (KaTeX → native MathML, so no extra stylesheet is needed) -----
  document.querySelectorAll('[data-tex]').forEach(function (el) {
    var tex = el.getAttribute('data-tex');
    if (!window.katex) { el.textContent = tex; return; }
    try {
      window.katex.render(tex, el, {
        displayMode: el.classList.contains('math-block'),
        output: 'mathml',
        throwOnError: false
      });
    } catch (e) { el.textContent = tex; }
  });
})();
