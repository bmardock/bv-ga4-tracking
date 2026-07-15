# Testing GA4 Events on Live Site

## Quick Test Method

Add `?bv_debug=true` to any URL to enable console logging of events.

## Manual Verification Steps

### 1. view_item (Product Page)
- **URL**: Visit any product page
- **Expected Event**: `view_item`
- **Check**: Browser Console → Network tab → Filter "gtag" → Look for event with `event: "view_item"`

### 2. view_item_list (Shop Page)
- **URL**: Visit shop page (`/shop/`)
- **Expected Event**: `view_item_list` with `item_list_id: "shop"`
- **Check**: Network tab → gtag requests

### 3. view_item_list (Category Page)
- **URL**: Visit any product category page
- **Expected Event**: `view_item_list` with `item_list_id: "category_XXX"`
- **Check**: Network tab → gtag requests

### 4. view_item_list (Search Page)
- **URL**: Perform a product search
- **Expected Events**: 
  - `search` with `search_term`
  - `view_item_list` with `item_list_id: "search_results"`
- **Check**: Network tab → gtag requests

### 5. view_item_list (Load More)
- **URL**: Shop/category page → Click "Load More" or pagination
- **Expected Event**: `view_item_list` with `page_number: 2` (or higher)
- **Check**: Network tab → Should see new `view_item_list` event after clicking

### 6. add_to_cart
- **URL**: Any product page → Add to cart
- **Expected Event**: `add_to_cart` with product data
- **Check**: Network tab → gtag requests after clicking "Add to Cart"

### 7. remove_from_cart
- **URL**: Cart page → Remove an item
- **Expected Event**: `remove_from_cart`
- **Check**: Network tab → gtag requests after removing item

### 8. begin_checkout
- **URL**: Go to checkout page
- **Expected Event**: `begin_checkout` with cart items
- **Check**: Network tab → gtag requests on checkout page load

### 9. add_shipping_info
- **URL**: Checkout page → Select shipping method or enter address
- **Expected Event**: `add_shipping_info` with shipping details
- **Check**: Network tab → gtag requests after shipping selection

### 10. purchase
- **URL**: Complete an order → Order received page
- **Expected Event**: `purchase` with transaction_id and order items
- **Check**: Network tab → gtag requests on order received page

## Browser DevTools Method

1. Open Chrome DevTools (F12)
2. Go to **Network** tab
3. Filter by: `gtag` or `collect`
4. Navigate through your site
5. Check each request:
   - Click on a request
   - Go to **Payload** or **Preview** tab
   - Look for `en: "event_name"` to see the event name
   - Check parameters in the payload

## GA4 DebugView Method

1. Install [Google Tag Assistant](https://tagassistant.google.com/) or use GA4 DebugView
2. Enable debug mode in GA4 (Admin → DebugView)
3. Visit your site
4. Events should appear in real-time in GA4 DebugView

## Console Test Script

Run this in browser console on any page to check if tracker is loaded:

```javascript
// Check if tracker is loaded
console.log('Tracking Data:', window.trackingData);
console.log('gtag available:', typeof window.gtag === 'function');

// Monitor all gtag events
const originalGtag = window.gtag;
window.gtag = function() {
    if (arguments[0] === 'event') {
        console.log('📊 GA4 Event:', arguments[1], arguments[2] || {});
    }
    return originalGtag.apply(this, arguments);
};
console.log('✅ Event monitoring enabled - navigate the site to see events');
```

## Expected Events Summary

| Event | Trigger | Page Type |
|-------|---------|-----------|
| `view_item` | Product page load | Product |
| `view_item_list` | Shop/category/search page load | Shop/Category/Search |
| `view_item_list` | Load more products | Shop/Category/Search |
| `search` | Search page with term | Search |
| `add_to_cart` | Add product to cart | Any |
| `remove_from_cart` | Remove from cart | Cart |
| `begin_checkout` | Checkout page load | Checkout |
| `add_shipping_info` | Shipping method selected | Checkout |
| `purchase` | Order completed | Order Received |
