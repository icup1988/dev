# ADF Cost Dashboard

Live dashboard for Azure Data Factory costs, auto-deployed to GitHub Pages whenever you push a new Excel export.

## How it works

```
You push a new Excel to data/
  → GitHub Action runs scripts/process_excel.py
  → Generates public/data.json
  → Vite builds the React app
  → Deploys to GitHub Pages automatically
```

---

## First-time setup (≈ 15 minutes)

### 1. Create your GitHub repository

```bash
# On your machine
git clone https://github.com/YOUR_USERNAME/adf-dashboard.git
cd adf-dashboard
```

Or create a new repo on github.com and push this folder to it.

### 2. Enable GitHub Pages

1. Go to your repo → **Settings** → **Pages**
2. Under **Source**, select **Deploy from a branch**
3. Branch: `gh-pages` / folder: `/ (root)`
4. Click **Save**

### 3. Set your repo name in the workflow

Open `.github/workflows/deploy.yml` and update:
```yaml
VITE_BASE_PATH: /YOUR-REPO-NAME/
```

Also open `src/vite.config.js` — no changes needed, it reads the env var.

### 4. Install Node dependencies (first time only, locally)

```bash
cd src
npm install
```

This creates `src/package-lock.json` which the GitHub Action needs.

### 5. Push everything

```bash
git add .
git commit -m "initial setup"
git push
```

GitHub Actions will run automatically. Check the **Actions** tab for progress.
Your dashboard will be live at: `https://YOUR_USERNAME.github.io/adf-dashboard/`

---

## Updating the dashboard

1. Download a new Cost Management export from the Azure portal
2. Drop the `.xlsx` file into the `data/` folder (delete the old one or keep it — the script picks the last alphabetically)
3. Commit and push:

```bash
git add data/
git commit -m "update: cost export Apr 22"
git push
```

GitHub Actions runs in ~2 minutes and the dashboard updates automatically.

---

## Local development

```bash
# Generate data.json from your Excel
pip install pandas openpyxl
python scripts/process_excel.py

# Copy data.json to the public folder
cp public/data.json src/public/data.json

# Run local dev server
cd src
npm run dev
# → http://localhost:5173
```

---

## Repository structure

```
adf-dashboard/
├── .github/
│   └── workflows/
│       └── deploy.yml          ← GitHub Actions pipeline
├── data/
│   └── CostManagement_*.xlsx   ← drop your Excel exports here
├── public/
│   └── data.json               ← auto-generated, do not edit manually
├── scripts/
│   └── process_excel.py        ← Excel → data.json transformer
├── src/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       └── App.jsx             ← the full dashboard
└── README.md
```

---

## Excel format requirements

The script expects an Excel file with a **Data** sheet containing these columns:

| Column | Description |
|--------|-------------|
| `UsageDate` | Date of usage |
| `ResourceId` | Full Azure resource ID |
| `ServiceName` | e.g. `Azure Data Factory v2` |
| `Meter` | e.g. `Cloud Data Movement` |
| `CostUSD` | Cost in USD |

This matches the default export from **Azure Cost Management → Export**.
