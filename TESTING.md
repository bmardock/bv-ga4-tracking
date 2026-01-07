# Testing the GA4 Tracking Plugin Locally

## Quick Setup

### 1. Copy Plugin to WordPress

Since you're using Local by Flywheel with the site at `http://shopboardwalkvintage.local`, copy the plugin to your WordPress plugins directory:

```bash
# Find your Local site's plugins directory (adjust path as needed)
LOCAL_PLUGINS_DIR="/Users/boardwalk/Local Sites/shopboardwalkvintage/app/public/wp-content/plugins"

# Copy the plugin
cp -r /Users/boardwalk/development/bwalkClassicTheme/plugins/bv-ga4-tracking "$LOCAL_PLUGINS_DIR/"
```

**Or create a symlink** (so changes in the repo are immediately reflected):

```bash
# Create symlink instead of copy
ln -s /Users/boardwalk/development/bwalkClassicTheme/plugins/bv-ga4-tracking "$LOCAL_PLUGINS_DIR/bv-ga4-tracking"
```

### 2. Activate the Plugin

1. Go to WordPress Admin: `http://shopboardwalkvintage.local/wp-admin`
2. Navigate to **Plugins**
3. Find **"Boardwalk Vintage GA4 Ecommerce Tracking"**
4. Click **Activate**

### 3. Configure the GA ID

1. Go to **Settings → GA4 Tracking**
2. Enter your GA4 Measurement ID (e.g., `GT-WF77HTF`)
3. Click **Save Changes**
4. You should see: **"✓ Tracking is enabled"**

## Testing Checklist

### ✅ Test 1: Plugin Loads Correctly

**Check:**
- [ ] Plugin appears in Plugins list
- [ ] Plugin activates without errors
- [ ] Settings page loads at Settings → GA4 Tracking

### ✅ Test 2: Tracking Disabled Without GA ID

1. **Clear the GA ID:**
   - Go to Settings → GA4 Tracking
   - Clear the input field
   - Save Changes

2. **Verify no scripts load:**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Filter by "gtag"
   - Reload any page
   - **Should see:** No gtag requests

3. **Check console:**
   - Open Console tab
   - Type: `typeof window.gtag`
   - **Should return:** `"undefined"`

### ✅ Test 3: Tracking Enabled With GA ID

1. **Set the GA ID:**
   - Go to Settings → GA4 Tracking
   - Enter: `GT-WF77HTF` (or your test ID)
   - Save Changes

2. **Verify scripts load:**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Filter by "gtag"
   - Reload any page
   - **Should see:** Request to `googletagmanager.com/gtag/js?id=GT-WF77HTF`

3. **Check gtag is available:**
   - Open Console tab
   - Type: `typeof window.gtag`
   - **Should return:** `"function"`

4. **Check trackingData:**
   - Type: `window.trackingData`
   - **Should see:** Object with `page_type`, `product_data`, etc.

### ✅ Test 4: Events Fire Correctly

#### Product Page (`view_item`)

1. Navigate to any product page
2. Open Console (F12)
3. Check for `view_item` event:
   ```javascript
   // In console, check dataLayer
   window.dataLayer.filter(e => e[0] === 'event' && e[1] === 'view_item')
   ```
4. **Should see:** Event with product data

#### Shop Page (`view_item_list`)

1. Navigate to `/shop`
2. Open Console
3. Check for `view_item_list` event:
   ```javascript
   window.dataLayer.filter(e => e[0] === 'event' && e[1] === 'view_item_list')
   ```
4. **Should see:** Event with `item_list_id: "shop"`

#### Add to Cart (`add_to_cart`)

1. Go to a product page
2. Click "Add to Cart"
3. Check Console for `add_to_cart` event:
   ```javascript
   window.dataLayer.filter(e => e[0] === 'event' && e[1] === 'add_to_cart')
   ```
4. **Should see:** Event with product data

#### Search (`search`)

1. Go to `/find?keyword=test`
2. Check Console for `search` event:
   ```javascript
   window.dataLayer.filter(e => e[0] === 'event' && e[1] === 'search')
   ```
3. **Should see:** Event with `search_term: "test"`

### ✅ Test 5: Settings Page Validation

1. **Test invalid GA ID:**
   - Go to Settings → GA4 Tracking
   - Enter: `invalid-id`
   - Save Changes
   - **Should see:** Error message about invalid format

2. **Test valid GA ID:**
   - Enter: `GT-WF77HTF`
   - Save Changes
   - **Should see:** Success message

## Quick Test Script

You can also test in the browser console:

```javascript
// Check if tracking is loaded
console.log('gtag available:', typeof window.gtag === 'function');
console.log('trackingData:', window.trackingData);

// Check all events in dataLayer
console.log('All events:', window.dataLayer.filter(e => e[0] === 'event'));

// Check specific event
console.log('view_item events:', window.dataLayer.filter(e => 
  e[0] === 'event' && e[1] === 'view_item'
));
```

## Troubleshooting

### Plugin Not Appearing

- Check file permissions: `chmod -R 755 /path/to/plugins/bv-ga4-tracking`
- Verify plugin file exists: `ls -la /path/to/plugins/bv-ga4-tracking/bv-ga4-tracking.php`
- Check WordPress error log

### Tracking Not Loading

- Verify GA ID is set in Settings → GA4 Tracking
- Check browser console for JavaScript errors
- Verify jQuery is loaded (required for some events)
- Check Network tab for failed script loads

### Events Not Firing

- Verify `trackingData` exists: `console.log(window.trackingData)`
- Check for JavaScript errors in console
- Verify WooCommerce is active
- Check that you're on the correct page type (product, shop, etc.)

## Using Browser DevTools

### Network Tab
- Filter by "gtag" to see all GA requests
- Check response status (should be 200)
- Verify correct GA ID in URL

### Console Tab
- Check for errors
- Test `window.gtag` and `window.trackingData`
- Inspect `window.dataLayer` for events

### Application Tab (Chrome)
- Go to Storage → Local Storage
- Check for any GA-related data

## Next Steps

Once testing is complete locally:

1. Remove old tracking code from `functions.php` (lines 2027-2273)
2. Deploy plugin to production
3. Activate and configure on production
4. Verify tracking in production GA4 dashboard
