EKAMBANI MAIN - GitHub Pages package
====================================
Upload the CONTENTS of this folder (not the folder itself) to the root of your GitHub Pages site:

  index.html          POS (main app)
  Finance.html        Personal Finance module   (file names are case-sensitive)
  More.html           More module (needs internet: it shows your Google Apps Script page)
  Phone.html          Phone Repair module
  manifest.json       PWA manifest (name: EKAMBANI MAIN)
  service-worker.js   offline cache
  icons/              app icons + logo
  .nojekyll           tells GitHub Pages to serve the files as they are

Open the site over https:// (GitHub Pages does this). The service worker and Google sign-in do not work on file://.

When you publish changed HTML files: open service-worker.js and change  const VERSION = 'ekambani-v2'  to a new value
(for example 'ekambani-v3'). Local data (IndexedDB) is never touched by the service worker.

System access number: set near the top of the "SYSTEM ACCESS" block in index.html (const EK_ACCESS_CODE).
It is an access gate only, not strong security.
