# Deploying bv-ga4-tracking Plugin to Production

## Option 1: Git Clone on Production Server (Recommended)

This is the simplest and most maintainable approach. Clone the plugin directly on your production server.

### Steps:

1. **SSH into your production server:**
   ```bash
   ssh user@your-production-server.com
   ```

2. **Navigate to WordPress plugins directory:**
   ```bash
   cd /path/to/wordpress/wp-content/plugins
   ```

3. **Clone the plugin repository:**
   ```bash
   git clone https://github.com/bmardock/bv-ga4-tracking.git
   ```

4. **Set proper permissions:**
   ```bash
   chown -R www-data:www-data bv-ga4-tracking
   chmod -R 755 bv-ga4-tracking
   ```
   (Adjust `www-data` to match your web server user if different)

5. **Activate in WordPress Admin:**
   - Go to `wp-admin/plugins.php`
   - Find "Boardwalk Vintage GA4 Ecommerce Tracking"
   - Click "Activate"

6. **Configure the plugin:**
   - Go to `Settings → GA4 Tracking`
   - Enter your production GA4 Measurement ID
   - Click "Save Changes"

### Updating the Plugin:

When you push updates to the GitHub repo, update on production:

```bash
cd /path/to/wordpress/wp-content/plugins/bv-ga4-tracking
git pull origin main
```

---

## Option 2: Add to GitHub Actions Workflow (Automated)

Add a deployment step to your existing theme deployment workflow.

### Steps:

1. **Add GitHub Secret:**
   - Go to your theme repo → Settings → Secrets and variables → Actions
   - Add `PROD_PLUGINS_DIR` secret with the path to your production plugins directory
     - Example: `/var/www/html/wp-content/plugins`

2. **Update `.github/workflows/deploy-theme.yml`:**

Add this step after the theme deployment:

```yaml
      - name: Deploy plugin
        run: |
          PLUGINS_DIR="${PROD_PLUGINS_DIR:-/var/www/html/wp-content/plugins}"
          
          # Clone or update plugin
          ssh -p "${PORT}" "${PROD_SSH_USER}@${PROD_SSH_HOST}" "
            if [ -d '${PLUGINS_DIR}/bv-ga4-tracking' ]; then
              cd '${PLUGINS_DIR}/bv-ga4-tracking'
              git pull origin main
            else
              cd '${PLUGINS_DIR}'
              git clone https://github.com/bmardock/bv-ga4-tracking.git
            fi
            chown -R www-data:www-data '${PLUGINS_DIR}/bv-ga4-tracking'
            chmod -R 755 '${PLUGINS_DIR}/bv-ga4-tracking'
          "
```

**Note:** This requires the production server to have Git installed and access to GitHub (public repo, so no auth needed).

---

## Option 3: Manual Upload via WordPress Admin

1. **Create a zip file:**
   ```bash
   cd /Users/boardwalk/development/bv-ga4-tracking
   zip -r bv-ga4-tracking.zip . -x "*.git*" -x "*.md" -x "*.sh"
   ```

2. **Upload via WordPress:**
   - Go to `wp-admin/plugin-install.php?tab=upload`
   - Choose the zip file
   - Click "Install Now"
   - Activate the plugin

3. **Configure:**
   - Go to `Settings → GA4 Tracking`
   - Enter your GA4 Measurement ID

**Note:** This method requires manual updates each time you make changes.

---

## Option 4: Create a Deployment Script

Create a simple deployment script similar to your theme deployment.

### Create `deploy-plugin.sh`:

```bash
#!/bin/bash
# Deploy bv-ga4-tracking plugin to production

set -e

PROD_SSH_HOST="your-production-server.com"
PROD_SSH_USER="your-username"
PROD_PLUGINS_DIR="/path/to/wp-content/plugins"

echo "Deploying bv-ga4-tracking plugin..."

ssh "${PROD_SSH_USER}@${PROD_SSH_HOST}" "
  cd ${PROD_PLUGINS_DIR}
  if [ -d 'bv-ga4-tracking' ]; then
    cd bv-ga4-tracking
    git pull origin main
  else
    git clone https://github.com/bmardock/bv-ga4-tracking.git
  fi
  chown -R www-data:www-data bv-ga4-tracking
  chmod -R 755 bv-ga4-tracking
"

echo "✅ Plugin deployed successfully!"
```

Make it executable:
```bash
chmod +x deploy-plugin.sh
```

---

## Recommendation

**Use Option 1 (Git Clone)** because:
- ✅ Simple and straightforward
- ✅ Version controlled
- ✅ Easy to update with `git pull`
- ✅ No changes to existing workflows
- ✅ Can be automated with a simple cron job or script if needed

**Use Option 2 (GitHub Actions)** if:
- You want fully automated deployments
- You want plugin updates to happen automatically when you push to GitHub
- You're comfortable modifying your CI/CD pipeline

---

## Post-Deployment Checklist

- [ ] Plugin is activated in WordPress admin
- [ ] GA4 Measurement ID is configured in plugin settings
- [ ] Verify `gtag` script is loading on frontend (check browser DevTools)
- [ ] Test a few events (view_item, add_to_cart) in GA4 DebugView
- [ ] Verify no console errors related to tracking
- [ ] Check that old tracking code is removed from `functions.php` (if migrating)
