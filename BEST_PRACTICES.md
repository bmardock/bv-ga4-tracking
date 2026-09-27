# Google tag (gtag.js) – how this plugin loads it

This plugin follows [Google’s official install](https://developers.google.com/tag-platform/gtagjs/install):

- **Snippet:** `<script async src="https://www.googletagmanager.com/gtag/js?id=TAG_ID"></script>` plus inline `dataLayer`, `gtag` stub, `gtag('js', new Date())`, `gtag('config', 'TAG_ID', { send_page_view: true })`.
- **Placement:** Output in `wp_head` at priority 1 (early in `<head>`).
- **Async:** The gtag.js script is loaded async (non-blocking); see below for when.

**One change from Google's snippet (Sep 2026): gtag.js is fetched after the page loads.** The inline `dataLayer` stub and `config` still run first thing in `<head>`. Only the ~190KB gtag.js download waits, and it starts on the window `load` event or the first tap/keypress, whichever comes first. Events fired before then (page_view, view_item, add_to_cart…) queue in `dataLayer` and are sent when gtag.js arrives.

- **Why:** on a phone connection gtag.js competed with the product photo (LCP). Local Lighthouse mobile (throttled), product page: 83 → 98, LCP 4.3s → 1.8s.
- **Checked:** on the live product page, the same hits go out either way (page_view, view_item, web_vitals).
- **Trade-off:** a visitor who leaves before the page finishes loading isn't counted. That's a very short bounce, and such visits usually weren't counted before either.
- **Not on checkout or order-received**, where begin_checkout / purchase fire: those load the tag immediately.
- **To turn it off:** `add_filter( 'bv_ga4_load_after_page', '__return_false' );`

No consent mode.

## Alternative: Google Tag Manager

Google recommends **Google Tag Manager** over direct gtag.js for many sites (codeless changes, one container for multiple tags). If you switch to GTM, you’d remove this plugin’s snippet and install the GTM container in the theme or another plugin.
