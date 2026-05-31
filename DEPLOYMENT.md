# Self-Loan Tracker — GitHub Pages Deployment Guide

## Files in this folder

```
self-loan-tracker/
├── index.html          ← Main app (PWA-ready)
├── manifest.json       ← PWA manifest
├── sw.js               ← Service worker (offline support)
├── icon-192.png        ← App icon (home screen / splash)
├── icon-512.png        ← App icon (large displays)
├── icon.svg            ← Source icon (keep as a master copy)
├── .gitignore
├── LICENSE
└── DEPLOYMENT.md       ← This file
```

---

## Step 1 — Create a free GitHub account

1. Go to **https://github.com** and click **Sign up**.
2. Enter your email, create a password, and choose a username.  
   Your username becomes part of the URL, e.g. `yourname.github.io`.
3. Complete the email verification step.

---

## Step 2 — Create a new repository

1. Once logged in, click the **+** icon in the top-right corner → **New repository**.
2. Fill in:
   - **Repository name:** `self-loan-tracker`  
     *(must be exactly this for the URL to match)*
   - **Description:** (optional) `Personal Kernel S&P 500 self-loan tracker`
   - **Visibility:** `Public`  
     *(GitHub Pages requires Public for free accounts)*
   - Leave "Add a README" **unchecked** — you'll upload your own files.
3. Click **Create repository**.

---

## Step 3 — Upload your files (no command line needed)

You'll be on an empty repository page after creation.

1. Click **uploading an existing file** (the link in the middle of the page).  
   *Or: click the **Add file** button → **Upload files**.*
2. Drag and drop **all 7 files** from the `self-loan-tracker` folder onto the upload area:
   - `index.html`
   - `manifest.json`
   - `sw.js`
   - `icon-192.png`
   - `icon-512.png`
   - `icon.svg`
   - `.gitignore`
   - `LICENSE`
3. In the **Commit changes** section at the bottom:
   - Leave the message as "Add files via upload" or type something like `Initial upload`.
   - Click **Commit changes**.

All files are now in your repository.

---

## Step 4 — Enable GitHub Pages

1. In your repository, click the **Settings** tab (top navigation bar).
2. In the left sidebar, scroll down and click **Pages**.
3. Under **Build and deployment**:
   - **Source:** Deploy from a branch
   - **Branch:** `main`
   - **Folder:** `/ (root)`
4. Click **Save**.

GitHub will now build your site. This takes about 1–2 minutes the first time.

---

## Step 5 — Find your live URL

After saving, the Pages settings page will show a banner:

> **Your site is live at https://YOUR-USERNAME.github.io/self-loan-tracker/**

The format is always:
```
https://YOUR-USERNAME.github.io/self-loan-tracker/
```

Replace `YOUR-USERNAME` with your actual GitHub username.  
Bookmark this URL — it never changes.

> **Note:** The first deployment can take up to 5 minutes. If you see a 404,
> wait a moment and refresh.

---

## Updating the app in future

Whenever you get a new `index.html` (e.g. from Claude with bug fixes):

1. Go to your repository on github.com.
2. Click on `index.html` in the file list.
3. Click the **pencil (edit) icon** in the top-right of the file view.  
   *Or: click the **Add file** → **Upload files** button, re-upload `index.html`,*  
   *and GitHub will automatically overwrite the old version.*
4. Commit the change.
5. GitHub Pages rebuilds in ~1 minute. Hard-refresh your browser (⌘+Shift+R on Mac).

Your `localStorage` data is stored in the **browser**, not in the files — so updating
`index.html` never touches your drawdowns, repayments, or API key.

---

## Installing as a PWA on iPhone

1. Open Safari (must be Safari — not Chrome) on your iPhone.
2. Navigate to `https://YOUR-USERNAME.github.io/self-loan-tracker/`.
3. Tap the **Share** button (the box with an arrow pointing up, at the bottom of Safari).
4. Scroll down in the share sheet and tap **"Add to Home Screen"**.
5. The name "SelfLoan" is pre-filled — tap **Add**.

The app icon now appears on your home screen. Tap it to open the app in standalone
mode (no browser chrome, full screen, feels native). It works offline too.

> **Tip:** localStorage is shared between Safari and the home screen app, so any
> data you entered in Safari will be there when you open from the home screen.

---

## Installing as a PWA on Android

1. Open **Chrome** on your Android device.
2. Navigate to `https://YOUR-USERNAME.github.io/self-loan-tracker/`.
3. Tap the **three-dot menu** (⋮) in the top-right corner.
4. Tap **"Add to Home screen"** or **"Install app"**.
5. Tap **Install** in the confirmation dialog.

The app icon appears in your app drawer and on the home screen.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| 404 on first visit | Wait 2–5 minutes, then refresh. Pages takes time to deploy. |
| App doesn't work offline | Make sure you visited the live URL at least once while online — the service worker needs one online visit to cache files. |
| Old version showing after update | Hard-refresh: ⌘+Shift+R (Mac) / Ctrl+Shift+R (Windows/Linux). On mobile, close and reopen. |
| Alpha Vantage API not working | API calls always go to the network (never cached), so you need an internet connection for market refreshes. |
| "Add to Home Screen" missing on iPhone | Must use Safari, not Chrome or Firefox. |
| localStorage data missing on new device | Use Settings → Export Backup on the old device, then Settings → Import Backup on the new one. |

---

## Data safety reminder

Your data lives in your **browser's localStorage** under the key `slt-loan-tracker`.
It is **not** stored in GitHub — GitHub only hosts the app code.

Regular backup habit: Settings tab → **Export Backup (JSON)** → save to iCloud Drive.
