/*
 * Live preview for the Decap CMS editor.
 *
 * Decap renders the preview pane with its own markdown parser and its own
 * styles, so out of the box an editor sees unstyled text plus the literal
 * source of every Pandoc extension this site uses. This script makes the
 * preview match what `bin/build` publishes:
 *
 *   1. loads the real site CSS and webfonts into the preview iframe,
 *   2. wraps the content in the real nav and footer (fetched from the same
 *      partials the build uses, so they can never drift),
 *   3. renders the page heading from the `title:` field the way Pandoc's
 *      title block does, and
 *   4. translates the Pandoc markdown extensions used in src/*.md.
 */
(function () {
  'use strict';

  var SITE_CSS = '/assets/css/main.css';
  // Keep in sync with header-includes in defaults.yml.
  var FONT_CSS =
    'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,300..700,0..100,0..1;1,9..144,400..700,0..100,1&family=Work+Sans:ital,wght@0,400;0,500;0,600;0,700;1,500&display=swap';
  // Written by bin/build from template/header.html and template/footer.html.
  var HEADER_PARTIAL = '/assets/partials/header.html';
  var FOOTER_PARTIAL = '/assets/partials/footer.html';

  /* Preview-only tweaks: the chrome is there to look at, not to click. */
  var PREVIEW_CSS = [
    'nav a, footer a { pointer-events: none; }',
    'body { padding-bottom: 1.25rem; }'
  ].join('\n');

  CMS.registerPreviewStyle(FONT_CSS);
  CMS.registerPreviewStyle(SITE_CSS);
  CMS.registerPreviewStyle(PREVIEW_CSS, { raw: true });

  /* ---------- Pandoc markdown -> HTML ---------- */

  /*
   * Fenced divs: `::: eyebrow` ... `:::` becomes <div class="eyebrow">.
   * The blank lines matter -- they let the markdown parser keep treating the
   * contents as markdown instead of as one opaque HTML block.
   */
  function fencedDivs(markdown) {
    var open = 0;
    var inCode = false;
    return markdown.split('\n').map(function (line) {
      if (/^\s*```/.test(line)) {
        inCode = !inCode;
        return line;
      }
      if (inCode) return line;

      var opener = /^:::+\s*\{?\s*\.?([A-Za-z][\w-]*)\s*\}?\s*$/.exec(line);
      if (opener) {
        open++;
        return '\n<div class="' + opener[1] + '">\n';
      }
      if (/^:::+\s*$/.test(line) && open > 0) {
        open--;
        return '\n</div>\n';
      }
      return line;
    }).join('\n');
  }

  function classAttr(braces) {
    var classes = braces.match(/\.[\w-]+/g) || [];
    return classes.map(function (c) { return c.slice(1); }).join(' ');
  }

  /*
   * Attribute syntax: ![alt](src){.tile-photo} and [text](url){.donate-button}.
   * Easier to fix up after parsing, where the trailing {...} is just text
   * sitting next to a finished tag.
   */
  function inlineAttributes(html) {
    html = html.replace(
      /(<img\b[^>]*?)\s*\/?>(\s*)(\{(?:\s*\.[\w-]+)+\s*\})/g,
      function (all, tag, gap, braces) {
        return tag + ' class="' + classAttr(braces) + '" />';
      }
    );
    return html.replace(
      /<a\b([^>]*)>([\s\S]*?)<\/a>(\s*)(\{(?:\s*\.[\w-]+)+\s*\})/g,
      function (all, attrs, text, gap, braces) {
        return '<a class="' + classAttr(braces) + '"' + attrs + '>' + text + '</a>';
      }
    );
  }

  /*
   * Pandoc's implicit_figures: a paragraph holding nothing but an image with
   * alt text is published as a <figure> with the alt text as the caption.
   */
  function implicitFigures(html) {
    return html.replace(/<p>(<img\b[^>]*>)<\/p>/g, function (all, img) {
      var alt = /alt="([^"]*)"/.exec(img);
      if (!alt || !alt[1]) return all;
      return '<figure>' + img +
        '<figcaption aria-hidden="true">' + alt[1] + '</figcaption></figure>';
    });
  }

  /*
   * An image the editor just uploaded has not been committed yet, so its
   * published path 404s. Decap hands us a blob: URL for those; anything
   * already in the repo keeps its normal /assets/ path.
   */
  function resolveUploads(html, getAsset) {
    if (!getAsset) return html;
    return html.replace(/(<img\b[^>]*?\bsrc=")([^"]+)(")/g, function (all, pre, src, post) {
      if (/^(https?:)?\/\/|^blob:|^data:/.test(src)) return all;
      try {
        var asset = getAsset(src);
        var url = asset && String(asset);
        if (url && url.indexOf('blob:') === 0) return pre + url + post;
      } catch (err) {
        /* Fall back to the published path. */
      }
      return all;
    });
  }

  function escapeHtml(text) {
    return text.replace(/[&<>]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
    });
  }

  function renderBody(markdown, getAsset) {
    /* If the markdown library failed to load, show the source rather than
       leaving the editor staring at an empty pane. */
    if (typeof marked === 'undefined') {
      return '<pre>' + escapeHtml(markdown || '') + '</pre>';
    }
    var html = marked.parse(fencedDivs(markdown || ''));
    html = inlineAttributes(html);
    html = implicitFigures(html);
    return resolveUploads(html, getAsset);
  }

  /* ---------- Page chrome ---------- */

  var chromeRequest = null;

  function loadChrome() {
    if (!chromeRequest) {
      chromeRequest = Promise.all([
        fetch(HEADER_PARTIAL).then(function (r) { return r.ok ? r.text() : ''; }),
        fetch(FOOTER_PARTIAL).then(function (r) { return r.ok ? r.text() : ''; })
      ]).then(function (parts) {
        return { header: parts[0], footer: parts[1] };
      }).catch(function () {
        return { header: '', footer: '' };
      });
    }
    return chromeRequest;
  }

  /* ---------- Preview template ---------- */

  var PagePreview = createClass({
    getInitialState: function () {
      return { header: '', footer: '' };
    },

    componentDidMount: function () {
      var self = this;
      this.mounted = true;
      loadChrome().then(function (chrome) {
        if (self.mounted) self.setState(chrome);
      });
    },

    componentWillUnmount: function () {
      this.mounted = false;
    },

    render: function () {
      var entry = this.props.entry;
      var title = entry.getIn(['data', 'title']);
      var body = entry.getIn(['data', 'body']);

      return h('div', { className: 'page-preview' },
        h('div', { dangerouslySetInnerHTML: { __html: this.state.header } }),
        title ? h('header', { id: 'title-block-header' },
          h('h1', { className: 'title' }, title)
        ) : null,
        h('div', {
          dangerouslySetInnerHTML: { __html: renderBody(body, this.props.getAsset) }
        }),
        h('div', { dangerouslySetInnerHTML: { __html: this.state.footer } })
      );
    }
  });

  CMS.registerPreviewTemplate('page', PagePreview);
})();
