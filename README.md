# Tamandua · landing

The website of [Tamandua](https://github.com/BrayansStivens/appsec-agent), in English (`/`) and Spanish (`/es/`).

A field notebook: bugs are catalogued like specimens, the tamandua's tongue winds out of its snout and down the page as
you read, eating every bug it reaches, and a violet hanko stamps what has been verified. Flat colour, editorial grid,
numbered plates, handwritten notes in the margin. Phones get a lighter version of the motion.

## Run it

```bash
npm install
npm run dev        # http://127.0.0.1:4321
npm run build      # astro check + static build in dist/
```

## Publishing

Every push to `main` builds and publishes to GitHub Pages (`.github/workflows/deploy.yml`), at
<https://brayansstivens.github.io/tamandua-landing/>. The workflow sets `SITE_URL` and `BASE_PATH`; internal links go
through `withBase` (`src/paths.ts`) so the site works under that path or at the root of its own domain.

## How it's put together

- **Astro 7**, static output; fonts (Instrument Serif, Instrument Sans, Caveat, JetBrains Mono) self-hosted through the Fonts API.
- **Words** live in `src/i18n/content.ts`, one object per language, each written for its readers, not translated.
- **Motion** is `src/scripts/motion.ts`: GSAP (ScrollTrigger, SplitText) and Lenis, loaded after the first paint.
  The page is complete without it: everything starts in its final, readable state in the HTML. With
  `prefers-reduced-motion`, or the "Pause motion" button (remembered per browser), nothing moves.
- **Budget:** about 61 KB of gzipped JS, loaded lazily; about 128 KB of fonts.

## Third-party

GSAP is free to use, including commercially, under its own [Standard "no charge" license](https://gsap.com/standard-license/),
which is not an open-source licence. Lenis is MIT. Fonts are under the SIL Open Font License.
