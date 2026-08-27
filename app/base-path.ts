// Sites and the local Vinext preview both serve public assets from the origin
// root. Keeping this browser-shared module free of `process` prevents Vinext's
// client-side route loader from evaluating an unavailable Node global.
export const BASE_PATH = "";
