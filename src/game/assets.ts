// Registry of sprites the renderer can draw. Only the ones actually used
// belong here — everything else stays a placeholder shape until it's wired
// up (see BUILD-PROMPT.md's art-swap steps). Keys match the asset filenames
// (minus "_Asset.png") so spawner.ts's category lists read directly off them.
//
// Paths are relative ("./assets/...", matching vite.config.ts's base: './')
// rather than root-absolute ("/assets/..."). vite.config.ts already builds
// index.html's own script/link tags this way for exactly this reason: the
// game isn't guaranteed to be served from a domain root — a root-absolute
// path 404s the moment the build is opened from anywhere else (a subpath,
// or file://, as in the Flutter webview). A relative path resolves against
// the page's own URL instead, so it keeps working wherever index.html is.
const REGISTRY = {
  Common_Stew: './assets/items/Common_Stew_Asset.png',
  Common_Yakult: './assets/items/Common_Yakult_Asset.png',
  Common_Kimchi: './assets/items/Common_Kimchi_Asset.png',
  Common_Ramyeon: './assets/items/Common_Ramyeon_Asset.png',
  Common_Tteokbokki: './assets/items/Common_Tteokbokki_Asset.png',
  Rare_Bingsu: './assets/items/Rare_Bingsu_Asset.png',
  Rare_Corndog: './assets/items/Rare_Corndog_Asset.png',
  Rare_FriedChick: './assets/items/Rare_FriedChick_Asset.png',
  Trap_Bone: './assets/items/Trap_Bone_Asset.png',
  Trap_StinkySock: './assets/items/Trap_StinkySock_Asset.png',
  Trap_Tin: './assets/items/Trap_Tin_Asset.png',
  Trap_FishBone: './assets/items/Trap_FishBone_Asset.png',
  Basket: './assets/player/Basket_Asset.png',
  Background: './assets/Background_Asset.png',
  LifeFull: './assets/ui/LifeFull_Asset.png',
  LifeLost: './assets/ui/LifeLost_Asset.png',
  Header: './assets/ui/Header_Asset.png',
} as const;

export type AssetKey = keyof typeof REGISTRY;

const images = new Map<AssetKey, HTMLImageElement>();

// Per-key, so loading one asset individually (e.g. the loading screen's own
// header image) and later loading everything don't both fetch/decode it.
const loadPromises = new Map<AssetKey, Promise<void>>();

// Loads AND decodes one registered image before resolving. decode()
// (unlike the load/onload event) only resolves once the browser has
// finished turning the compressed file into ready-to-draw pixel data — so a
// caller awaiting this is guaranteed the first drawImage() call never
// blocks. Without that, a sprite decoding mid-run causes a visible hitch,
// and on slow mobile data the first item to spawn just wouldn't draw yet.
// Idempotent: a second call for the same key returns the same
// in-flight/completed promise rather than loading it again.
export function preloadAsset(key: AssetKey): Promise<void> {
  let promise = loadPromises.get(key);
  if (!promise) {
    const image = new Image();
    image.src = REGISTRY[key];
    promise = image.decode().then(() => {
      images.set(key, image);
    });
    loadPromises.set(key, promise);
  }
  return promise;
}

// Idempotent: calling this more than once (e.g. React effect re-run) returns
// the same in-flight/completed promise rather than reloading everything.
let preloadPromise: Promise<void> | null = null;
export function preloadAssets(): Promise<void> {
  if (!preloadPromise) {
    preloadPromise = Promise.all((Object.keys(REGISTRY) as AssetKey[]).map(preloadAsset)).then(() => undefined);
  }
  return preloadPromise;
}

export function getImage(key: AssetKey): HTMLImageElement | undefined {
  return images.get(key);
}

// For DOM <img> consumers (React components) rather than canvas drawImage()
// calls — keeps the URL string in one place instead of duplicating it.
export function getAssetUrl(key: AssetKey): string {
  return REGISTRY[key];
}
