// The site may live under a path (BASE_PATH): every internal link goes through here.
export const withBase = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${path}`
