(function () {
  function detectLanguage(text) {
    var t = (text || '').trim();
    if (!t) return '';

    if (/^(GET|POST|PUT|PATCH|DELETE)\s+\/\S+/m.test(t)) return 'http';
    if (/^curl\s+/m.test(t) || /^#!/m.test(t)) return 'bash';

    if ((t[0] === '{' || t[0] === '[') && t.indexOf(':') !== -1) {
      try {
        JSON.parse(t);
        return 'json';
      } catch (_) {}
    }

    if (/^\s*class\s+\w+|^\s*def\s+\w+|^\s*import\s+\w+/m.test(t)) return 'python';
    if (/^\s*(const|let|var|function|export)\s+/m.test(t)) return 'javascript';
    return '';
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  function attachCopyButtons() {
    var blocks = document.querySelectorAll('.zeus-docs-page pre');
    blocks.forEach(function (pre) {
      var code = pre.querySelector('code');
      if (!code || pre.querySelector('.zeus-copy-btn')) return;

      pre.classList.add('zeus-code-block');

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'zeus-copy-btn';
      btn.textContent = 'Copy';
      btn.setAttribute('aria-label', 'Copy code block');

      btn.addEventListener('click', function () {
        copyText(code.innerText || code.textContent || '')
          .then(function () {
            btn.textContent = 'Copied';
            window.setTimeout(function () {
              btn.textContent = 'Copy';
            }, 1200);
          })
          .catch(function () {
            btn.textContent = 'Failed';
            window.setTimeout(function () {
              btn.textContent = 'Copy';
            }, 1200);
          });
      });

      pre.appendChild(btn);
    });
  }

  function highlightBlocks() {
    if (!window.hljs) return;
    var blocks = document.querySelectorAll('.zeus-docs-page pre code');
    blocks.forEach(function (code) {
      var lang = detectLanguage(code.textContent);
      if (lang) code.classList.add('language-' + lang);
      window.hljs.highlightElement(code);
    });
  }

  function init() {
    highlightBlocks();
    attachCopyButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
