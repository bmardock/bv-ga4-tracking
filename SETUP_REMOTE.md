# Setting Up Remote Repository

## Step 1: Create Repository on GitHub

1. Go to https://github.com/new
2. Repository name: `bv-ga4-tracking` (or `woocommerce-ga4-tracking`)
3. Description: "Comprehensive GA4 ecommerce tracking plugin for WooCommerce"
4. Visibility: **Public** ✅
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

## Step 2: Add Remote and Push

After creating the repo, GitHub will show you commands. Use these:

```bash
cd /Users/boardwalk/development/bv-ga4-tracking
git remote add origin https://github.com/YOUR_USERNAME/bv-ga4-tracking.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

## Alternative: Using SSH

If you prefer SSH:

```bash
git remote add origin git@github.com:YOUR_USERNAME/bv-ga4-tracking.git
git branch -M main
git push -u origin main
```
