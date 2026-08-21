# Aromas Community Park Website

[//]: # ([![pages-deploy]&#40;https://github.com/alxmrs/pandoc-website-template/actions/workflows/pages.yml/badge.svg&#41;]&#40;https://github.com/alxmrs/pandoc-website-template/actions/workflows/pages.yml&#41;)

[//]: # ([![shellcheck]&#40;https://github.com/alxmrs/pandoc-website-template/actions/workflows/shellcheck.yml/badge.svg&#41;]&#40;https://github.com/alxmrs/pandoc-website-template/actions/workflows/shellcheck.yml&#41;)

A static websites built with [Pandoc](https://pandoc.org/) for the Aromas community park.

## Use

### `build`

`bin/build` walks the source directory, invokes Pandoc on each file, and copies assets to a destination folder. It also
gathers all files not named "index.md" into an RSS feed.
 
This tool is configurable by environment variables.

| Variable  | Description                                         | Default                                                                              |
|-----------|-----------------------------------------------------|--------------------------------------------------------------------------------------|
| `SRC`     | Root directory of input sources.                    | `src/`                                                                               |
| `DST`     | Root directory for generated output.                | `public/`                                                                            |
| `ASSETS`  | Directory for static assets, like CSS and images    | `assets/`                                                                            |
| `SRC_EXT` | Input sources file extension.                       | `md`                                                                                 |
| `DST_EXT` | Output generation file extension.                   | `html`                                                                               |
| `HEADER`  | path/to/header.html (`--include-before-body`).      | `template/header.html`                                                               |
| `FOOTER`  | path/to/footer.html (`--include-after-body`).       | `template/footer.html`                                                               |
| `CSS`     | path/to/style.css embedded in header of a web page. | `/assets/css/main.css`                                                               |
| `PANOPTS` | Arguments to pass to Pandoc for each input file.    | `--css $CSS --metadata-file=$ROOT/defaults.yml -B $HEADER -A $FOOTER" -V lang=en-US` |

To make it easier to edit metadata for every page, consider making changes to the `defaults.yml` at the project root.

> Note: Configuring RSS still needs to happen in the `bin/build` file today.

The defaults of this script are oriented for creating static websites. However, the configuration could be molded to 
support a wide variety of tasks; for instance, generating a CV or a slide deck. See [these examples](https://pandoc.org/demos.html) 
for more inspiration.


### `watch`

`bin/watch` will watch the source directory. On any changes, it will invoke the build script.

> Note: if you change files outside of `$SRC` (i.e. in `template/` or `assets/`), you'll need to terminate and 
> re-run this script.

### Content manager

Editors work in [Decap CMS](https://decapcms.org) at `/admin/`, configured in `src/admin/config.yml`.

The preview pane is rendered by `src/admin/preview.js`, which loads the site's own CSS and webfonts into
the preview iframe, wraps the draft in the real nav and footer, renders the page heading from the `title:`
field the way Pandoc's title block does, and translates the Pandoc markdown extensions used here (fenced
divs like `::: eyebrow`, attribute syntax like `{.tile-photo}`, and implicit figures). The nav and footer
come from `assets/partials/`, which `bin/build` writes from `template/`, so they cannot drift from the
published pages.

> Note: the preview uses a stock CommonMark parser, so straight quotes stay straight where Pandoc would
> curl them. Everything else matches the published markup.

To try the CMS against your working copy -- no GitHub login, and nothing gets published -- uncomment
`local_backend: true` in `src/admin/config.yml`, then:

```sh
bin/watch                         # rebuild public/ on every change
npx decap-server                  # the local CMS backend, on port 8081
python3 -m http.server -d public  # serve the site, then open /admin/
```

### Deployment

This template will publish the static site to [Github Pages](https://pages.github.com) via [Github Actions](http://github.com/actions).


## Thanks to 

- The [contributors of Pandoc](https://github.com/jgm/pandoc/graphs/contributors)
- Will Styler's [inspiration](http://wstyler.ucsd.edu/posts/lmimg/spcv.txt)
- [Pure sh Bible](https://github.com/dylanaraps/pure-sh-bible)
- [Drew McConville](http://bettermotherfuckingwebsite.com/)
