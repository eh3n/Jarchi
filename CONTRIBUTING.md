# Contributing to Jarchi

Thanks for your interest! Contributions of all kinds are welcome:
bug reports, translations, documentation, radio station lists, and code.

## Reporting bugs
1. Check existing issues first.
2. Include: your OS + Liquidsoap version (`liquidsoap --version`), what you
   expected, what happened, and the output of the panel's
   **Settings → Engine diagnostics** button.

## Pull requests
1. Fork the repo and create a branch from `main`.
2. Keep changes focused - one fix/feature per PR.
3. Test on Debian 12 or Ubuntu 22.04 with a real sound card if possible.
4. Make sure `bash -n install.sh` and `node --check` pass on changed files.

## Translations
Panel strings live in `webpanel/public/js/common.js` (fa/en/ru/ar/tr).
Adding a language = adding one dictionary object. PRs welcome!

By contributing, you agree that your contributions are licensed under AGPL-3.0.
