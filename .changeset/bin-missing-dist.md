---
'cyberfleet': patch
---

Fail with a clear message when `bin/cyberfleet.mjs` cannot find `dist/cli.mjs`, naming the missing file and the same-version `npx -y cyberfleet@<version>` fallback, instead of a raw `ERR_MODULE_NOT_FOUND`.
