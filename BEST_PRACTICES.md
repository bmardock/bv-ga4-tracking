# Google tag (gtag.js) – how this plugin loads it

This plugin follows [Google’s official install](https://developers.google.com/tag-platform/gtagjs/install):

- **Snippet:** `<script async src="https://www.googletagmanager.com/gtag/js?id=TAG_ID"></script>` plus inline `dataLayer`, `gtag` stub, `gtag('js', new Date())`, `gtag('config', 'TAG_ID', { send_page_view: true })`.
- **Placement:** Output in `wp_head` at priority 1 (early in `<head>`).
- **Async:** The gtag.js script is loaded with `async` (non-blocking).

No delay-load and no consent mode; the tag loads as soon as the page loads so measurement matches Google’s docs.

## Alternative: Google Tag Manager

Google recommends **Google Tag Manager** over direct gtag.js for many sites (codeless changes, one container for multiple tags). If you switch to GTM, you’d remove this plugin’s snippet and install the GTM container in the theme or another plugin.
