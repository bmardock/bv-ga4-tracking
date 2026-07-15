#!/usr/bin/env bash
# Run against http://shopboardwalkvintage.local/ to confirm gtag in delivered HTML.
# Usage: ./verify-live-url.sh [URL]
set -e
URL="${1:-http://shopboardwalkvintage.local/}"
HTML=$(curl -sS --connect-timeout 10 "$URL")

fail() { echo "FAIL: $1"; exit 1; }
ok()   { echo "PASS: $1"; }

echo "Testing $URL"
echo "---"

# Must have
grep -q '<!-- Google tag (gtag.js) -->' <<< "$HTML" || fail "missing gtag comment"
ok "gtag comment present"

grep -q 'googletagmanager.com/gtag/js?id=' <<< "$HTML" || fail "missing gtag script URL"
ok "gtag script URL present"

grep -q '<script async src="https://www.googletagmanager.com/gtag/js' <<< "$HTML" || grep -q 'script.*src=.*googletagmanager.com/gtag/js.*async' <<< "$HTML" || fail "missing async gtag script tag"
ok "async script tag present"

grep -q 'window.dataLayer = window.dataLayer || \[\];' <<< "$HTML" || fail "missing dataLayer"
ok "dataLayer present"

grep -q "gtag('js', new Date());" <<< "$HTML" || fail "missing gtag('js')"
ok "gtag('js') present"

grep -q "gtag('config'," <<< "$HTML" || fail "missing gtag config"
ok "gtag config present"

grep -q "'send_page_view': true" <<< "$HTML" || fail "missing send_page_view"
ok "send_page_view true"

# Must not have
grep -q 'data-src=' <<< "$HTML" && fail "page has data-src (delay-load)" || ok "no data-src"
grep -q 'bv-gtag-loader' <<< "$HTML" && fail "page has bv-gtag-loader" || ok "no bv-gtag-loader"
grep -q "gtag('consent'" <<< "$HTML" && fail "page has consent call" || ok "no consent call"

echo "---"
echo "All live-URL checks passed."
