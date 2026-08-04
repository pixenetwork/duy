# ADR-0001: FiveM Enhanced Only

**Status:** Accepted  
**Date:** 2026-07-24

## Decision

The active Pixel Network framework targets FiveM Enhanced only. It will not contain legacy FiveM, Mumble, pma-voice, ESX, or QBCore compatibility layers unless a separately packaged edition is explicitly commissioned later.

## Consequences

- Cleaner APIs and fewer conditional branches.
- Existing resources are migrated feature-by-feature instead of wrapped indefinitely.
- Unsupported or undocumented Enhanced capabilities must not be fabricated.
- Experimental compatibility adapters remain archived and are not deployed in the active framework.
