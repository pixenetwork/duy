# Pixel Network Foundation v0.2.1 — Known Limitations

- No live FiveM Enhanced server/client test was performed.
- Focus/cursor ownership and callback transport are covered by state-machine tests, Lua syntax validation, static review, and browser behavior—not in-game execution.
- Escape interaction with the FiveM pause menu remains unverified.
- Controller navigation has not been tested; keyboard navigation is the validated baseline.
- The accessibility review is internal and does not claim WCAG certification.
- Visual contrast was reviewed against the token palette but not independently measured at every resolution, display, or FiveM UI scale.
- Browser mock mode intentionally cannot reproduce FiveM callback timing, resource restart timing, or native focus behavior.
- The developer showcase is a component/bridge surface only and contains no production authority actions.
- React 18.2.0 remains intentionally vendored from documented JupyterLab module chunks for offline NUI. Updating it requires replacing licensed files, updating the checksummed runtime manifest, running runtime tests, and rebuilding.
- Lua validation requires `luac` 5.4 or Python with a Lua 5.4 library; `PIXEL_PYTHON` can select an explicit Python executable.
- Existing Character, Clothing, Tattoos/Barber, and Admin systems are preserved for later migration and are not part of this ZIP.
