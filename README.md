# `experimental.buildCache` truncates file paths longer than 100 characters

When Nuxt restores the client build from `experimental.buildCache`, every file whose path inside the
cache archive is longer than 100 characters comes back with a truncated name. The emitted JS still
references the full name, so the asset returns 404 in the restored build.

## Reproduction

The repo has one asset with a long file name (`app/assets/this-asset-file-name-is-deliberately-long-…-100-chars.svg`),
referenced from `app/app.vue`. `assetsInlineLimit: 0` makes Vite emit it as a file instead of inlining it.

```bash
bun install
bun run build   # 1st build: builds the client and writes the cache
ls .output/public/_nuxt | grep asset
bun run build   # 2nd build: "Restored Vue client and server builds from cache"
ls .output/public/_nuxt | grep asset
```

### Expected

Both builds emit:

```
this-asset-file-name-is-deliberately-long-so-that-its-path-in-the-build-cache-tar-exceeds-100-chars.DVts3eCG.svg
```

### Actual

The 1st build emits the full name. The 2nd build (restored from cache) emits:

```
this-asset-file-name-is-deliberately-long-so-that-its-path-in-the-build-cache-tar-
```

`.output/public/_nuxt/*.js` still references `…-100-chars.DVts3eCG.svg`, so the image is broken.

## Cause

`writeCache()` in `nuxt/dist/index.mjs` packs the build with `createTar()` from `nanotar` (0.3.0).
`createTar()` writes the entry name into the 100-byte ustar `name` field and drops everything after
it. It writes neither the ustar `prefix` field nor a GNU/PAX long-name header, even though `parseTar()`
can read GNU long names. The entry path is relative to the build dir, here
`dist/client/_nuxt/<file>`, and is cut at exactly 100 characters.

## Real-world trigger

`@nuxt/fonts` (via `fontless`) names downloaded fonts `<43-char hash>-<43-char hash>.woff2`. So
`_nuxt/fonts/<file>` is about 105 characters, and so is `cache/fonts/<file>` in the build dir. With
`buildCache` on, every restored build ships fonts without their files.
On Windows the truncated names can end in a dot (`….woff2` becomes `….`). Windows can't delete such
files with normal APIs, so `git clean` fails afterwards on persistent CI runners.

## Environment

- nuxt 4.6.4, vite 8.3.8, nanotar 0.3.0
- Node 26.13.1, Bun 1.4.4
- Windows 11 (the truncation itself is platform-independent; it happens in the tar writer)
