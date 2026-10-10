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
            // Keep GA4 item_id aligned with the inventory/audit SKU key.
            // Fall back to the WooCommerce ID only for products without a SKU.
            item_id: String(product.sku || product.id || ''),
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
            items: [formatProduct(tracking.product_data)],
            // Event-scoped so GA4 can split product views into in-stock and
            // sold: most product views are sold pieces, which can't be bought.
            in_stock: tracking.product_data.in_stock ? 'yes' : 'no'
        });
    }

    // 1b. Which control added to cart (atc_source on add_to_cart). The product
    // form reloads the page, so stamp it as it submits and the server passes
    // the value back with the queued event: the theme's sticky bar sets
    // form.dataset.bvAtcSource = 'sticky' before clicking the real button;
    // forms inside Quick View are 'quick_view'.
    function formSource(form) {
        if (form.dataset && form.dataset.bvAtcSource) return form.dataset.bvAtcSource;
        return form.closest('#QuickViewProductPopup') ? 'quick_view' : 'product_page';
    }
    document.addEventListener('submit', function(e) {
        const form = e.target;
        if (!form || !form.matches || !form.matches('form.cart')) return;
        let input = form.querySelector('input[name="bv_atc_source"]');
        if (!input) {
            input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'bv_atc_source';
            form.appendChild(input);
        }
        input.value = formSource(form);
        if (form.dataset) delete form.dataset.bvAtcSource;
    }, true);

    // 1c. Apple Pay / Google Pay / PayPal taps outside checkout (the cart's
    // wallet buttons skip begin_checkout entirely). Checkout has its own
    // checkout_step 'express_pay' below.
    if (tracking.page_type !== 'checkout' && typeof jQuery !== 'undefined') {
        jQuery(document.body).on('click', '.wc-square-wallet-buttons button, #wc-square-digital-wallet button, #apple-pay-button, #wc-square-google-pay, .paypal-buttons, [id^="paypal-button"]', function() {
            fireEvent('express_pay_click', { pay_location: tracking.page_type || 'other', currency: 'USD' });
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
            
            let source = 'card';
            const fromCard = $button && $button.length && !$button.closest('form.cart').length;
            // A card on a product page (related / sold-page rows): not the
            // page's own product. No price list here, so send what the button has.
            if (tracking.page_type === 'product' && fromCard && !tracking.product_list) {
                const id = parseInt($button.data('product_id'), 10);
                if (id) {
                    product = { id: id, sku: String($button.data('product_sku') || ''), name: String($button.attr('aria-label') || '').replace(/^Add (?:to cart: )?|[\u201c\u201d"]|\s*to your cart$/g, ''), price: parseFloat(String($button.closest('.product').find('.price ins .amount, .price > .amount, .price .amount').last().text()).replace(/[^0-9.]/g, '')) || 0 };
                }
            }
            // Product page: use tracking.product_data
            else if (tracking.page_type === 'product' && tracking.product_data && !fromCard) {
                product = tracking.product_data;
                qty = parseInt(jQuery('form.cart input[name="quantity"]').val() || 1);
                const form = document.querySelector('form.cart');
                source = form ? formSource(form) : 'product_page';
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
                    checkout_type: 'standard', // Standard add to cart (not express)
                    atc_source: source
                });
            }
        });
    }
    
    // 4b. add_to_cart for adds that reloaded the page (product page form,
    // ?add-to-cart= links). The server queued them and set this cookie; fetch
    // them from admin-ajax (never cached) and send them here.
    if (/(?:^|;\s*)bv_ga4_pending=1/.test(document.cookie) && tracking.ajax_url && window.fetch) {
        document.cookie = 'bv_ga4_pending=; Max-Age=0; path=/';
        const body = new URLSearchParams({ action: 'bv_ga4_pending' });
        fetch(tracking.ajax_url, { method: 'POST', credentials: 'same-origin', body: body })
            .then(function(r) { return r.ok ? r.json() : []; })
            .then(function(events) {
                (Array.isArray(events) ? events : []).forEach(function(e) {
                    if (e && e.name && e.params) fireEvent(e.name, e.params);
                });
            })
            .catch(function() {});
    }

    // 4c. view_cart
    if (tracking.page_type === 'cart' && tracking.cart_data && (tracking.cart_data.items || []).length) {
        fireEvent('view_cart', {
            currency: 'USD',
            value: tracking.cart_data.total_value || 0,
            items: tracking.cart_data.items.map(formatProduct)
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
    
    // 7b. Where shoppers stop on the checkout page. Once each per page view:
    //   checkout_step  step = contact | address | shipping_shown | payment_selected | place_order | express_pay
    //   add_payment_info  on Place order, with payment_type (square_credit_card, paypal, ...)
    //   checkout_error    WooCommerce's error notice after Place order (digits masked)
    //   checkout_exit     leaving without placing the order: last_step, value, shipping
    // No names, emails or addresses are sent.
    if (tracking.page_type === 'checkout' && tracking.cart_data && typeof jQuery !== 'undefined') {
        const $ = jQuery;
        const value = tracking.cart_data.total_value || 0;
        const done = {};
        let lastStep = 'opened';
        let placing = false;
        let shipping = null;
        const paymentType = function() { return $('input[name="payment_method"]:checked').val() || ''; };
        const step = function(name, extra) {
            lastStep = name;
            if (done[name]) return;
            done[name] = true;
            fireEvent('checkout_step', Object.assign({ step: name, currency: 'USD', value: value }, extra || {}));
        };
        $(document.body).on('change', '#billing_email', function() {
            if (/@.+\./.test(this.value || '')) step('contact');
        });
        // The review table's shipping row (the theme's estimate row, or
        // WooCommerce's own once rates load): "Free in the US" or "$12.00".
        const readShipping = function() {
            if (!done.address) return;
            const text = $('#order_review tr.shipping td, #order_review tr.woocommerce-shipping-totals td').first().text() || '';
            if (!text.trim()) return;
            shipping = /free/i.test(text) ? 0 : (parseFloat(text.replace(/[^0-9.]/g, '')) || 0);
            step('shipping_shown', { shipping: shipping });
        };
        $(document.body).on('change', '#billing_address_1, #billing_postcode, #shipping_address_1, #shipping_postcode', function() {
            if ($('#billing_address_1').val() && $('#billing_postcode').val()) {
                step('address');
                setTimeout(readShipping, 2500);
            }
        });
        $(document.body).on('updated_checkout', readShipping);
        // WooCommerce picks a default method on load; count only a shopper's own pick.
        $(document.body).on('change', 'input[name="payment_method"]', function(e) {
            if (!e.originalEvent) return;
            step('payment_selected', { payment_type: paymentType() });
        });
        $('form.checkout').on('checkout_place_order', function() {
            placing = true;
            step('place_order', { payment_type: paymentType() });
            fireEvent('add_payment_info', {
                currency: 'USD',
                value: value,
                payment_type: paymentType(),
                items: (tracking.cart_data.items || []).map(formatProduct)
            });
            return true;
        });
        // Errors after Place order: WooCommerce's notice list ("Billing First
        // name is a required field.") or Square's card message ("Enter a valid
        // card number."). Neither reliably fires `checkout_error` here, so
        // watch for them appearing. Each distinct message is sent once.
        const sentErrors = {};
        const reportErrors = function() {
            $('.woocommerce-error:visible, .sq-card-message-error.sq-visible').each(function() {
                const $li = $(this).find('li');
                const raw = $li.length ? $li.map(function() { return $(this).text().trim(); }).get().join(' | ') : $(this).text();
                const msg = (raw || '').replace(/\s+/g, ' ').replace(/\d/g, '#').trim().slice(0, 100);
                if (!msg || sentErrors[msg]) return;
                sentErrors[msg] = true;
                placing = false;
                fireEvent('checkout_error', { error_message: msg, payment_type: paymentType(), currency: 'USD', value: value });
            });
        };
        $(document.body).on('checkout_error', function() { setTimeout(reportErrors, 50); });
        if (window.MutationObserver) {
            let timer = null;
            new MutationObserver(function() {
                if (!done.place_order) return;
                clearTimeout(timer);
                timer = setTimeout(reportErrors, 300);
            }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
        }
        // Apple Pay / Google Pay / PayPal buttons skip the form.
        $(document.body).on('click', '.wc-square-wallet-buttons button, #wc-square-digital-wallet button, .paypal-buttons, [id^="paypal-button"]', function() {
            placing = true;
            step('express_pay');
        });
        window.addEventListener('pagehide', function() {
            if (placing) return;
            fireEvent('checkout_exit', {
                last_step: lastStep,
                currency: 'USD',
                value: value,
                shipping: shipping === null ? undefined : shipping,
                transport_type: 'beacon'
            });
        });
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
