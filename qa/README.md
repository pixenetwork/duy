# Development-only live QA helper

`multi-owner-client-snippet.lua` is not an active Pixel resource. Copy it into a temporary client-only development resource when testing ownership stacking and resource-stop cleanup, then remove that temporary resource before production.

The owner IDs intentionally begin with the temporary resource name so `pixel_ui` can remove them automatically when that resource stops.
