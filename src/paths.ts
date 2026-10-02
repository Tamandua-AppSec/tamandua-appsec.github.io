// The site may live under a path (GitHub Pages serves it at /tamandua-landing/): every internal link goes through here.
export const withBase = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${path}`
