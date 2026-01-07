# Extracting Plugin to Separate Repository

This plugin is ready to be extracted to its own repository. Here's how:

## Steps to Create Separate Repo

1. **Create new repository** (GitHub/GitLab/etc.)
   - Name: `bv-ga4-tracking` or `woocommerce-ga4-tracking`
   - Make it private or public as needed

2. **Initialize git in plugin directory:**
   ```bash
   cd plugins/bv-ga4-tracking
   git init
   git add .
   git commit -m "Initial commit: GA4 Ecommerce Tracking Plugin"
   ```

3. **Add remote and push:**
   ```bash
   git remote add origin <your-repo-url>
   git branch -M main
   git push -u origin main
   ```

4. **Update theme repo:**
   - Remove `plugins/bv-ga4-tracking/` from theme repo
   - Add as git submodule OR document installation instructions
   - Update `.gitignore` if needed

## Installation Options

### Option A: Git Submodule (Recommended for development)
```bash
cd wp-content/plugins
git submodule add <repo-url> bv-ga4-tracking
```

### Option B: Composer (if using Composer)
Add to `composer.json`:
```json
{
  "repositories": [
    {
      "type": "vcs",
      "url": "<repo-url>"
    }
  ],
  "require": {
    "boardwalk-vintage/bv-ga4-tracking": "dev-main"
  }
}
```

### Option C: Manual Installation
- Clone repo to `wp-content/plugins/bv-ga4-tracking`
- Or download zip and extract

## Benefits of Separate Repo

- ✅ Independent versioning
- ✅ Reusable across multiple sites
- ✅ Easier to maintain and update
- ✅ Can be shared with other developers
- ✅ Follows WordPress plugin best practices
