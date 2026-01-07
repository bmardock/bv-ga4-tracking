<?php
/**
 * Plugin Name: Boardwalk Vintage GA4 Ecommerce Tracking
 * Plugin URI: https://shopboardwalkvintage.com
 * Description: Comprehensive GA4 ecommerce tracking for WooCommerce. Replaces WooCommerce Google Analytics plugin.
 * Version: 1.0.0
 * Author: Boardwalk Vintage
 * Author URI: https://shopboardwalkvintage.com
 * Requires at least: 5.0
 * Requires PHP: 7.4
 * WC requires at least: 5.0
 * WC tested up to: 8.0
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: bv-ga4-tracking
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('BV_GA4_VERSION', '1.0.0');
define('BV_GA4_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('BV_GA4_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Main plugin class
 */
class BV_GA4_Tracking {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        $this->init();
    }
    
    private function init() {
        // Load gtag script
        add_action('wp_head', array($this, 'load_google_analytics'), 1);
        
        // Enqueue tracking script
        add_action('wp_enqueue_scripts', array($this, 'enqueue_tracking_script'), 20);
        
        // Admin settings
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        
        // Add settings link to plugin page
        add_filter('plugin_action_links_' . plugin_basename(__FILE__), array($this, 'add_settings_link'));
    }
    
    /**
     * Load Google Analytics gtag script
     * Only loads if GA ID is configured
     */
    public function load_google_analytics() {
        if (!$this->is_tracking_enabled()) {
            return; // Don't load anything if GA ID not set
        }
        
        $ga_id = $this->get_ga_id();
        
        ?>
        <!-- Google tag (gtag.js) -->
        <script async src="https://www.googletagmanager.com/gtag/js?id=<?php echo esc_js($ga_id); ?>"></script>
        <script>
            window.dataLayer = window.dataLayer || [];
            window.gtag = window.gtag || function(){dataLayer.push(arguments);};
            gtag('js', new Date());
            gtag('config', '<?php echo esc_js($ga_id); ?>', {
                'send_page_view': true
            });
        </script>
        <?php
    }
    
    /**
     * Get GA4 Measurement ID from plugin setting only
     */
    private function get_ga_id() {
        // Get from plugin setting
        $ga_id = get_option('bv_ga4_measurement_id', '');
        
        // One-time migration from old plugin (if exists)
        if (empty($ga_id)) {
            $old_plugin_id = get_option('woocommerce_google_analytics_4_id', '');
            if (!empty($old_plugin_id)) {
                // Migrate to our option
                update_option('bv_ga4_measurement_id', $old_plugin_id);
                $ga_id = $old_plugin_id;
            }
        }
        
        return trim($ga_id); // Return empty string if not set
    }
    
    /**
     * Check if tracking is enabled (GA ID is set)
     */
    private function is_tracking_enabled() {
        $ga_id = $this->get_ga_id();
        return !empty($ga_id);
    }
    
    /**
     * Enqueue tracking script and pass data
     * Only loads if GA ID is configured
     */
    public function enqueue_tracking_script() {
        // Don't load tracking if GA ID not set
        if (!$this->is_tracking_enabled()) {
            return;
        }
        
        // Register and enqueue track.js
        wp_register_script(
            'bv-ga4-tracker',
            BV_GA4_PLUGIN_URL . 'assets/track.js',
            array('jquery'),
            BV_GA4_VERSION,
            true
        );
        wp_enqueue_script('bv-ga4-tracker');
        
        // Prepare tracking data
        $tracking_data = array(
            'page_type' => 'other',
            'product_data' => null,
            'product_list' => array(),
            'cart_data' => null,
            'order_data' => null
        );
        
        // Determine page type and gather data
        // Check for product search (WordPress search or custom product search)
        if ($this->is_search_page() || $this->is_product_search()) {
            $tracking_data['page_type'] = 'search';
            $tracking_data['search_term'] = $this->get_search_term();
            $tracking_data['list_name'] = 'Search Results';
            $tracking_data['list_id'] = 'search_results';
            $tracking_data['product_list'] = $this->get_product_list_data();
        } elseif (function_exists('is_product') && is_product()) {
            $tracking_data['page_type'] = 'product';
            $product_id = get_queried_object_id();
            if ($product_id) {
                $product = wc_get_product($product_id);
                if ($product && is_a($product, 'WC_Product')) {
                    $tracking_data['product_data'] = $this->get_product_tracking_data($product);
                }
            }
        } elseif (function_exists('is_shop') && is_shop()) {
            $tracking_data['page_type'] = 'shop';
            $tracking_data['list_name'] = 'Shop';
            $tracking_data['list_id'] = 'shop';
            $tracking_data['product_list'] = $this->get_product_list_data();
        } elseif (function_exists('is_product_category') && is_product_category()) {
            $tracking_data['page_type'] = 'category';
            $category = get_queried_object();
            if ($category) {
                $tracking_data['list_name'] = $category->name;
                $tracking_data['list_id'] = 'category_' . $category->term_id;
            }
            $tracking_data['product_list'] = $this->get_product_list_data();
        } elseif (function_exists('is_checkout') && is_checkout() && !is_wc_endpoint_url('order-received')) {
            $tracking_data['page_type'] = 'checkout';
            $tracking_data['cart_data'] = $this->get_cart_data();
        } elseif (function_exists('is_wc_endpoint_url') && is_wc_endpoint_url('order-received')) {
            $tracking_data['page_type'] = 'purchase';
            $tracking_data['order_data'] = $this->get_order_data();
        }
        
        // Pass tracking data to JavaScript
        wp_localize_script('bv-ga4-tracker', 'trackingData', $tracking_data);
    }
    
    /**
     * Check if current page is search page
     * Uses standard WordPress is_search() as primary check
     */
    private function is_search_page() {
        // Primary: Use standard WordPress search
        return is_search();
    }
    
    /**
     * Check if current page is a product search (custom or WooCommerce filtered)
     * Detects product searches that may not trigger is_search()
     * This handles custom search pages that search products but don't use ?s= parameter
     */
    private function is_product_search() {
        global $wp_query;
        
        // Custom search page template (backward compatibility for /find route)
        if (is_page_template('page-search.php') || 
            (isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/find') !== false)) {
            return !empty($this->get_search_term());
        }
        
        // Check if we have a search term and product post type in query
        $has_search_term = !empty($this->get_search_term());
        
        if ($has_search_term && $wp_query && isset($wp_query->query_vars)) {
            // Check if query is searching products specifically
            $is_product_query = (
                (isset($wp_query->query_vars['post_type']) && $wp_query->query_vars['post_type'] === 'product') ||
                (isset($wp_query->query_vars['s']) && !empty($wp_query->query_vars['s']) && 
                 (!isset($wp_query->query_vars['post_type']) || $wp_query->query_vars['post_type'] === 'product'))
            );
            return $is_product_query;
        }
        
        return false;
    }
    
    /**
     * Get search term
     * Uses standard WordPress get_search_query() as primary method
     */
    private function get_search_term() {
        // Primary: Use standard WordPress search query
        $search_query = get_search_query();
        if (!empty($search_query)) {
            return $search_query;
        }
        
        // Fallback: Custom search parameters (for backward compatibility)
        if (isset($_GET['keyword'])) {
            return sanitize_text_field($_GET['keyword']);
        }
        if (isset($_GET['q'])) {
            return sanitize_text_field($_GET['q']);
        }
        
        return '';
    }
    
    /**
     * Get product tracking data
     */
    private function get_product_tracking_data($product) {
        if (!$product || !is_a($product, 'WC_Product')) {
            return null;
        }
        
        $product_id = $product->get_id();
        $data = array(
            'id' => $product_id,
            'name' => $product->get_name(),
            'price' => floatval($product->get_price()),
            'sku' => $product->get_sku(),
            'in_stock' => $product->is_in_stock(),
            'category' => '',
            'category2' => '',
            'brand' => ''
        );
        
        // Get categories
        $categories = get_the_terms($product_id, 'product_cat');
        if ($categories && !is_wp_error($categories)) {
            $data['category'] = $categories[0]->name;
            if (isset($categories[1])) {
                $data['category2'] = $categories[1]->name;
            }
        }
        
        // Get brand from attributes
        $attributes = $product->get_attributes();
        if (!empty($attributes)) {
            foreach ($attributes as $key => $attribute) {
                if (strpos($key, 'brand') !== false || $key === 'pa_brand') {
                    if (is_object($attribute) && method_exists($attribute, 'get_options')) {
                        $options = $attribute->get_options();
                        if (!empty($options[0])) {
                            $data['brand'] = $options[0];
                        }
                    } elseif (is_array($attribute) && !empty($attribute['value'])) {
                        $data['brand'] = $attribute['value'];
                    }
                    break;
                }
            }
        }
        
        return $data;
    }
    
    /**
     * Get product list data for shop/category/search pages
     */
    private function get_product_list_data() {
        global $wp_query;
        
        $products = array();
        
        if ($wp_query && $wp_query->have_posts()) {
            while ($wp_query->have_posts()) {
                $wp_query->the_post();
                
                $product = wc_get_product(get_the_ID());
                if ($product) {
                    $product_data = $this->get_product_tracking_data($product);
                    if ($product_data) {
                        $products[] = $product_data;
                    }
                }
            }
            wp_reset_postdata();
        }
        
        return $products;
    }
    
    /**
     * Get cart data for checkout
     */
    private function get_cart_data() {
        if (!function_exists('WC') || !WC()->cart) {
            return null;
        }
        
        $cart = WC()->cart->get_cart();
        $items = array();
        $total_value = 0;
        
        foreach ($cart as $cart_item_key => $cart_item) {
            $product = $cart_item['data'];
            if (!$product) continue;
            
            $product_data = $this->get_product_tracking_data($product);
            if (!$product_data) continue;
            
            $quantity = $cart_item['quantity'];
            $line_total = floatval($cart_item['line_total']);
            $total_value += $line_total;
            
            $items[] = array(
                'id' => $product_data['id'],
                'name' => $product_data['name'],
                'category' => $product_data['category'],
                'brand' => $product_data['brand'],
                'price' => floatval($product_data['price']),
                'quantity' => $quantity,
                'sku' => $product_data['sku'] ?? '',
                'in_stock' => $product_data['in_stock'] ?? true
            );
        }
        
        return array(
            'items' => $items,
            'total_value' => $total_value
        );
    }
    
    /**
     * Get order data for purchase
     */
    private function get_order_data() {
        $order_id = isset($_GET['order']) ? intval($_GET['order']) : 0;
        if (!$order_id) {
            return null;
        }
        
        $order = wc_get_order($order_id);
        if (!$order) {
            return null;
        }
        
        $items = array();
        $total_value = floatval($order->get_total());
        
        foreach ($order->get_items() as $item) {
            $product = $item->get_product();
            if (!$product) continue;
            
            $product_data = $this->get_product_tracking_data($product);
            if (!$product_data) continue;
            
            $quantity = $item->get_quantity();
            
            $items[] = array(
                'id' => $product_data['id'],
                'name' => $product_data['name'],
                'category' => $product_data['category'],
                'brand' => $product_data['brand'],
                'price' => floatval($product_data['price']),
                'quantity' => $quantity,
                'sku' => $product_data['sku'] ?? '',
                'in_stock' => $product_data['in_stock'] ?? true
            );
        }
        
        return array(
            'transaction_id' => $order_id,
            'items' => $items,
            'value' => $total_value
        );
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_options_page(
            'GA4 Tracking Settings',
            'GA4 Tracking',
            'manage_options',
            'bv-ga4-tracking',
            array($this, 'render_settings_page')
        );
    }
    
    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('bv_ga4_settings', 'bv_ga4_measurement_id', array(
            'type' => 'string',
            'sanitize_callback' => array($this, 'sanitize_ga_id'),
            'default' => ''
        ));
    }
    
    /**
     * Sanitize GA ID input
     */
    public function sanitize_ga_id($value) {
        $value = sanitize_text_field($value);
        // Remove any whitespace
        $value = trim($value);
        // Basic validation: should start with G- or GT-
        if (!empty($value) && !preg_match('/^G[AT]?-[A-Z0-9]+$/', $value)) {
            add_settings_error(
                'bv_ga4_measurement_id',
                'invalid_ga_id',
                'Invalid GA4 Measurement ID format. Should be like G-XXXXXXXXXX or GT-XXXXXXXXXX.'
            );
            // Return current value if invalid
            return get_option('bv_ga4_measurement_id', '');
        }
        return $value;
    }
    
    /**
     * Render settings page
     */
    public function render_settings_page() {
        if (!current_user_can('manage_options')) {
            return;
        }
        
        // Show settings errors
        settings_errors('bv_ga4_measurement_id');
        
        $ga_id = get_option('bv_ga4_measurement_id', '');
        $current_ga_id = $this->get_ga_id();
        $is_enabled = $this->is_tracking_enabled();
        
        // Check if settings were just saved
        if (isset($_GET['settings-updated'])) {
            add_settings_error(
                'bv_ga4_measurement_id',
                'settings_saved',
                'Settings saved successfully!',
                'success'
            );
        }
        
        ?>
        <div class="wrap">
            <h1>GA4 Ecommerce Tracking Settings</h1>
            
            <?php if (!$is_enabled): ?>
                <div class="notice notice-warning">
                    <p>
                        <strong>⚠️ Tracking is disabled:</strong> Please enter a GA4 Measurement ID below to enable tracking.
                    </p>
                </div>
            <?php else: ?>
                <div class="notice notice-success">
                    <p>
                        <strong>✓ Tracking is enabled</strong> with ID: <code><?php echo esc_html($current_ga_id); ?></code>
                    </p>
                </div>
            <?php endif; ?>
            
            <form method="post" action="options.php">
                <?php settings_fields('bv_ga4_settings'); ?>
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="bv_ga4_measurement_id">GA4 Measurement ID</label>
                        </th>
                        <td>
                            <input 
                                type="text" 
                                id="bv_ga4_measurement_id" 
                                name="bv_ga4_measurement_id" 
                                value="<?php echo esc_attr($ga_id); ?>" 
                                class="regular-text"
                                placeholder="G-XXXXXXXXXX or GT-XXXXXXXXXX"
                                required
                            />
                            <p class="description">
                                Enter your Google Analytics 4 Measurement ID (e.g., <code>G-XXXXXXXXXX</code> or <code>GT-XXXXXXXXXX</code>).
                                <br>
                                <strong>Status:</strong> 
                                <?php if ($is_enabled): ?>
                                    <span style="color: #00a32a;">✓ Active</span> - Tracking is enabled with ID: <code><?php echo esc_html($current_ga_id); ?></code>
                                <?php else: ?>
                                    <span style="color: #d63638;">✗ Disabled</span> - No GA ID configured. Tracking will not load until an ID is set.
                                <?php endif; ?>
                            </p>
                        </td>
                    </tr>
                </table>
                <?php submit_button('Save Changes'); ?>
            </form>
            
            <hr>
            
            <h2>Event Tracking</h2>
            <p>The following GA4 ecommerce events are automatically tracked:</p>
            <ul style="list-style: disc; margin-left: 20px;">
                <li><strong>view_item</strong> - Product page views</li>
                <li><strong>view_item_list</strong> - Shop, category, and search pages</li>
                <li><strong>search</strong> - Search queries</li>
                <li><strong>add_to_cart</strong> - When products are added to cart</li>
                <li><strong>remove_from_cart</strong> - When products are removed from cart</li>
                <li><strong>begin_checkout</strong> - Checkout page views</li>
                <li><strong>add_shipping_info</strong> - Shipping method selection</li>
                <li><strong>purchase</strong> - Completed orders</li>
            </ul>
            
            <h2>Verification</h2>
            <p>To verify tracking is working:</p>
            <ol style="list-style: decimal; margin-left: 20px;">
                <li>Open your site in a browser</li>
                <li>Open Developer Tools (F12) → Network tab</li>
                <li>Filter by "gtag"</li>
                <li>Reload the page - you should see requests to <code>googletagmanager.com/gtag/js</code></li>
                <li>Check the Console for any errors</li>
            </ol>
        </div>
        <?php
    }
    
    /**
     * Add settings link to plugin page
     */
    public function add_settings_link($links) {
        $settings_link = '<a href="' . admin_url('options-general.php?page=bv-ga4-tracking') . '">Settings</a>';
        array_unshift($links, $settings_link);
        return $links;
    }
}

// Initialize plugin
function bv_ga4_tracking_init() {
    // Check if WooCommerce is active
    if (!class_exists('WooCommerce')) {
        add_action('admin_notices', function() {
            ?>
            <div class="notice notice-error">
                <p><strong>BV GA4 Tracking:</strong> WooCommerce is required for this plugin to work.</p>
            </div>
            <?php
        });
        return;
    }
    
    BV_GA4_Tracking::get_instance();
}
add_action('plugins_loaded', 'bv_ga4_tracking_init');
