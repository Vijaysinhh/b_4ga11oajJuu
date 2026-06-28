# Data Not Showing After Login - Troubleshooting Guide

## ✅ What We've Verified

1. **Seeded data exists** in Supabase:
   - Shop: Zopolo (#3) ✓
   - Owner user: Pratapsinh ✓
   - 6 items ✓
   - 4 categories ✓
   - 3 units ✓
   - 3 sales ✓

2. **RLS policies allow reads** from anon key ✓

3. **Auth flow logic is correct** - currentShopId should be 3 ✓

## ❌ The Problem

The data exists and policies are correct, but it's **NOT showing in the app after login**. This means one of these:

1. **Browser cache/localStorage is corrupted**
2. **Login is not completing properly**
3. **Dashboard is not re-rendering after login**
4. **currentShopId is not being passed to data hooks**

## ✅ Solution

### Step 1: Clear All Browser Data

**Chrome/Edge:**

```
Ctrl + Shift + Delete
→ Select "All time"
→ Check: Cookies, Cache, Stored site data
→ Click "Clear data"
```

**Firefox:**

```
Ctrl + Shift + Delete
→ Select "Everything"
→ Check: Cookies, Cache
→ Click "Clear Now"
```

### Step 2: Force Refresh the App

```
Ctrl + F5  (hard refresh - clears cache and reloads)
```

or

```
Ctrl + Shift + R  (in some browsers)
```

### Step 3: Login Again

1. Go to login page
2. Enter phone: `8605094584`
3. Enter password: `pratap123`
4. Click login

### Step 4: Check Browser Console for Errors

1. Press **F12** to open Developer Tools
2. Click **Console** tab
3. Look for any red error messages
4. **Screenshot these errors and share them**

### Step 5: Check Network Tab

1. In Developer Tools, click **Network** tab
2. Login again
3. Look for failed requests (red status codes)
4. Click on any failed requests and check the "Response" tab
5. **Share any error responses**

---

## 🔍 If Data Still Doesn't Show

Please provide:

1. **Screenshot of Console tab** (F12 → Console)
2. **Screenshot of failed Network requests** (F12 → Network → login)
3. **Check localStorage:**

   ```javascript
   // In browser console, paste this:
   console.log(JSON.stringify(localStorage, null, 2));
   ```

   Copy the output and share it

4. **Check if auth_user is set:**
   ```javascript
   // In browser console:
   console.log(localStorage.getItem("auth_user"));
   ```

---

## 🛠️ Alternative: Reset and Re-seed

If clearing cache doesn't work, try reseeding:

```bash
node scripts/seed-demo-production.mjs
```

This will update the existing shop with fresh data.

---

## 📋 Quick Checklist

- [ ] Cleared browser cache (Ctrl+Shift+Delete)
- [ ] Hard refreshed page (Ctrl+F5)
- [ ] Logged in again
- [ ] Opened console (F12)
- [ ] Checked for errors
- [ ] Ran Network tab test
- [ ] Checked localStorage

If you've done all these steps and **still no data**, please share:

- Browser console screenshot
- Network errors screenshot
- localStorage output
