---
'cyberfleet': patch
---

Require cyberlegion 1.8.0. The plugin now pins and bundles cyberlegion 1.8.0, whose `unit close` removes a unit on a main checkout without touching the checkout, so close-sessions can close finished main-checkout seats. A `cyberlegion` older than 1.8.0 found on `PATH` still keeps those seats open.
