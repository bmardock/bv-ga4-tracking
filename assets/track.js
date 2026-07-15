/**
 * GA4 Ecommerce Tracking - Simplified
 * Focus on actionable insights, not data bloat
 */

(function() {
    'use strict';
    
    const tracking = window.trackingData;
    if (!tracking) return;

    // Keep event dispatch in one place so deferred loading cannot silently
    // drop a prepared ecommerce event when a page-specific branch changes.
    function fireEvent(eventName, params) {
        if (!eventName || typeof params !== 'object') return;
        gtag('event', eventName, params);
    }
    
    // Helper: Format product for GA4
    function formatProduct(product) {
        return {
            item_id: String(product.id || ''),
            item_name: product.name || '',
            item_category: product.category || '',
            item_brand: product.brand || '',
            price: parseFloat(product.price || 0),
            quantity: parseInt(product.quantity || 1),
            currency: 'USD',
            sku: product.sku || ''
        };
    }
    
    // Helper: Safe gtag call
    function gtag() {
        if (typeof window.gtag === 'function') {
            window.gtag.apply(null, arguments);
        }
    }
    
    // 1. view_item (Product Page)
    if (tracking.page_type === 'product' && tracking.product_data) {
        fireEvent('view_item', {
            currency: 'USD',
            value: tracking.product_data.price,
            items: [formatProduct(tracking.product_data)]
        });
    }
    
    // 2. view_item_list (Shop/Category/Search Pages)
    if (['shop', 'category', 'search'].includes(tracking.page_type)) {
        const params = {
            item_list_id: tracking.list_id || '',
            item_list_name: tracking.list_name || '',
            item_list_count: tracking.product_list?.length || 0
        };
        
        // Add search term if search page
        if (tracking.page_type === 'search' && tracking.search_term) {
            params.search_term = tracking.search_term;
            // Also fire search event
            gtag('event', 'search', {
                search_term: tracking.search_term,
                results_count: tracking.product_list?.length || 0
            });
        }
        
        // Add filters if any query params (sort, filter, etc.)
        if (typeof URLSearchParams !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const filters = [];
            urlParams.forEach((value, key) => {
                if (key !== 'q' && key !== 'keyword' && key !== 'paged' && key !== 'page') {
                    filters.push(`${key}:${value}`);
                }
            });
            if (filters.length > 0) {
                params.item_list_filters = filters.join('|');
            }
        }
        
        // No items array - just metadata for insights
        gtag('event', 'view_item_list', params);
    }
    
    // Load more: track page number using standard DOM event
    document.addEventListener('bv:products_loaded', function(event) {
        const pageNumber = event.detail?.page || event.detail; // Support both object and number
        if (pageNumber > 1 && tracking.list_id) {
            gtag('event', 'view_item_list', {
                item_list_id: tracking.list_id,
                item_list_name: tracking.list_name || '',
                item_list_count: tracking.product_list?.length || 0,
                page_number: pageNumber
            });
        }
    });
    
    // Flag to prevent duplicate tracking when express checkout is used
    let expressCheckoutTracked = false;
    
    // 4. add_to_cart
    if (typeof jQuery !== 'undefined') {
        jQuery(document.body).on('added_to_cart', function(event, fragments, cart_hash, $button) {
            // Skip if express checkout already tracked this
            if (expressCheckoutTracked) {
                return;
            }
            
            let product = null;
            let qty = 1;
            
            // Product page: use tracking.product_data
            if (tracking.page_type === 'product' && tracking.product_data) {
                product = tracking.product_data;
                qty = parseInt(jQuery('form.cart input[name="quantity"]').val() || 1);
            }
            // Archive pages: get product from list
            else if ($button && $button.length && tracking.product_list) {
                const productId = $button.closest('form').find('input[name="add-to-cart"]').val() || 
                                 $button.data('product_id') ||
                                 $button.closest('.product').data('product_id');
                
                if (productId) {
                    product = tracking.product_list.find(p => p.id === parseInt(productId));
                    if (product) {
                        qty = parseInt($button.closest('form').find('input[name="quantity"]').val() || 1);
                    }
                }
            }
            
            if (product) {
                gtag('event', 'add_to_cart', {
                    currency: 'USD',
                    value: product.price * qty,
                    items: [formatProduct({ ...product, quantity: qty })],
                    checkout_type: 'standard' // Standard add to cart (not express)
                });
            }
        });
    }
    
    // 5. remove_from_cart
    if (typeof jQuery !== 'undefined') {
        jQuery(document.body).on('removed_from_cart', function(event, fragments, cart_hash, $button) {
            // Try to get product info from the removed item
            let product = null;
            
            if ($button && $button.length) {
                const $item = $button.closest('.cart_item, tr.cart_item');
                const productId = $item.data('product_id') || 
                                 $item.find('[data-product_id]').data('product_id') ||
                                 $item.attr('data-product-id');
                
                if (productId && tracking.product_list) {
                    product = tracking.product_list.find(p => p.id === parseInt(productId));
                }
            }
            
            // If we can't find product, still track the event (minimal data)
            if (product) {
                gtag('event', 'remove_from_cart', {
                    currency: 'USD',
                    value: product.price,
                    items: [formatProduct(product)]
                });
            } else {
                gtag('event', 'remove_from_cart', {
                    currency: 'USD'
                });
            }
        });
    }
    
    // 6. begin_checkout
    if (tracking.page_type === 'checkout' && tracking.cart_data) {
        gtag('event', 'begin_checkout', {
            currency: 'USD',
            value: tracking.cart_data.total_value || 0,
            item_total: tracking.cart_data.total_value || 0,
            items: (tracking.cart_data.items || []).map(formatProduct)
        });
        
        // 7. add_shipping_info
        if (typeof jQuery !== 'undefined') {
            let shippingTracked = false;
            jQuery(document.body).on('updated_checkout', function() {
                if (shippingTracked) return;
                
                const shippingMethod = jQuery('input[name="shipping_method[0]"]:checked').val();
                const country = jQuery('#shipping_country, #billing_country').val();
                const postcode = jQuery('#shipping_postcode, #billing_postcode').val();
                
                if (shippingMethod || (country && postcode)) {
                    shippingTracked = true;
                    const shippingText = jQuery('.order-total').prev('.shipping').find('td').text() || '';
                    const shippingCost = shippingText.includes('Free') ? 0 : parseFloat(shippingText.replace(/[^0-9.]/g, '')) || 0;
                    const orderTotal = parseFloat(jQuery('.order-total .amount').text().replace(/[^0-9.]/g, '')) || tracking.cart_data.total_value;
                    
                    gtag('event', 'add_shipping_info', {
                        currency: 'USD',
                        value: orderTotal,
                        shipping: shippingCost,
                        shipping_tier: shippingMethod,
                        shipping_country: country,
                        shipping_postcode: postcode
                    });
                }
            });
        }
    }
    
    // 8. purchase
    if (tracking.page_type === 'purchase' && tracking.order_data) {
        fireEvent('purchase', {
            transaction_id: String(tracking.order_data.transaction_id || ''),
            currency: 'USD',
            value: tracking.order_data.value || 0,
            items: (tracking.order_data.items || []).map(formatProduct)
        });
    }
    
    // Express Checkout (add_to_cart + begin_checkout)
    // Track express checkout separately with checkout_type parameter
    if (typeof jQuery !== 'undefined' && tracking.page_type === 'product' && tracking.product_data) {
        jQuery(document.body).on('click', 'button, a.button', function(e) {
            const $btn = jQuery(this);
            const text = $btn.text().toLowerCase();
            const isExpress = (text.includes('buy with') || text.includes('buy now')) &&
                             $btn.closest('form.cart, .product').length > 0;
            
            if (isExpress) {
                expressCheckoutTracked = true; // Flag to prevent duplicate tracking
                const qty = parseInt(jQuery('form.cart input[name="quantity"]').val() || 1);
                const product = { ...tracking.product_data, quantity: qty };
                const total = product.price * qty;
                
                gtag('event', 'add_to_cart', {
                    currency: 'USD',
                    value: total,
                    items: [formatProduct(product)],
                    checkout_type: 'express' // Flag for express checkout
                });
                
                gtag('event', 'begin_checkout', {
                    currency: 'USD',
                    value: total,
                    items: [formatProduct(product)],
                    checkout_type: 'express' // Flag for express checkout
                });
                
                // Reset flag after a short delay to allow for normal flow
                setTimeout(() => { expressCheckoutTracked = false; }, 1000);
            }
        });
    }
})();
