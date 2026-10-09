# Boardwalk Vintage GA4 Ecommerce Tracking Plugin

A custom WordPress plugin for comprehensive GA4 ecommerce tracking in WooCommerce.

## Installation

1. Copy the `bv-ga4-tracking` folder to your `wp-content/plugins/` directory
2. Activate the plugin in WordPress admin → Plugins
3. Go to Settings → GA4 Tracking to configure your Measurement ID

## Configuration

**Important:** Tracking will not load until a GA4 Measurement ID is configured.

### WordPress Admin (Recommended)
1. Go to **Settings → GA4 Tracking**
2. Enter your GA4 Measurement ID (e.g., `G-XXXXXXXXXX` or `GT-XXXXXXXXXX`)
3. Click **Save Changes**

The plugin will automatically enable tracking once an ID is set. If no ID is configured, no tracking scripts will load.

## Tracked Events

- **view_item** - Product page views
- **view_item_list** - Shop, category, and search pages (including load more pagination)
- **search** - Search queries
- **add_to_cart** - When products are added to cart (including express checkout buttons)
- **remove_from_cart** - When products are removed from cart
- **begin_checkout** - Checkout page views (also fires on express checkout)
- **add_shipping_info** - Shipping method selection
- **view_cart** - Cart page views
- **add_payment_info** - Place order pressed, with `payment_type`
- **checkout_step** - Checkout progress, once each per visit: `step` = contact, address, shipping_shown, payment_selected (shopper's own pick), place_order, express_pay
- **checkout_error** - Error shown after Place order (WooCommerce notices or Square's card message), `error_message` with digits masked
- **checkout_exit** - Left checkout without ordering: `last_step`, `value`, `shipping`

add_to_cart also covers adds that reload the page (the product page form, `?add-to-cart=` links): the add is queued in the WooCommerce session, a `bv_ga4_pending` cookie is set, and track.js fetches the queued event from `admin-ajax.php?action=bv_ga4_pending` on the next page. Nothing is printed into cacheable HTML. No names, emails or addresses are sent with the checkout events.
- **purchase** - Completed orders

### Express Checkout

Express checkout buttons (e.g., "Buy with G Pay", "Buy Now") automatically fire both `add_to_cart` and `begin_checkout` events when clicked, allowing you to track the express checkout funnel separately from standard checkout flows.

## Requirements

- WordPress 5.0+
- PHP 7.4+
- WooCommerce 5.0+

## Migration from Theme

If you're migrating from theme-based tracking:

1. Activate this plugin
2. The plugin will automatically migrate settings from the old WooCommerce GA plugin
3. Remove the tracking code from `functions.php` (lines 2027-2273)
4. Remove or update the reference to `track.js` in `functions.php` (line 2119)
