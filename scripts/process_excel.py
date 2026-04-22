"""
process_excel.py
Reads the latest ADF Cost Management Excel from data/
and writes public/data.json consumed by the React dashboard.
"""

import pandas as pd
import json
import glob
import os
import sys
from datetime import date

# ── locate latest Excel in data/ ─────────────────────────────────────────────
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "public", "data.json")

excel_files = sorted(glob.glob(os.path.join(DATA_DIR, "*.xlsx")))
if not excel_files:
    print("ERROR: No .xlsx files found in data/", file=sys.stderr)
    sys.exit(1)

latest = excel_files[-1]
print(f"Processing: {latest}")

# ── load ──────────────────────────────────────────────────────────────────────
df = pd.read_excel(latest, sheet_name="Data")
df["UsageDate"] = pd.to_datetime(df["UsageDate"])

# ── helpers ───────────────────────────────────────────────────────────────────
def extract_resource_name(rid):
    rid = str(rid)
    for kw in ["pipelines/", "triggers/"]:
        if kw in rid:
            return rid.split(kw)[-1], kw.replace("/", "")
    return "factory-level", "factory"

df[["ResourceName", "ResourceKind"]] = df["ResourceId"].apply(
    lambda x: pd.Series(extract_resource_name(x))
)

adf = df[df["ServiceName"] == "Azure Data Factory v2"].copy()
pipelines = adf[adf["ResourceKind"] == "pipelines"]

dates = sorted(adf["UsageDate"].dt.strftime("%Y-%m-%d").unique().tolist())

def day_label(d):
    dt = date.fromisoformat(d)
    return f"{dt.strftime('%a')} \u00b7 {dt.strftime('%b %-d')}"

labels = [day_label(d) for d in dates]

# ── ADF daily totals & meter breakdown ───────────────────────────────────────
METERS = [
    "Cloud Data Movement",
    "Cloud Orchestration Activity Run",
    "vCore",
    "Cloud Pipeline Activity",
    "Self Hosted Data Movement",
    "Self Hosted Orchestration Activity Run",
    "Cloud Read Write Operations",
    "Cloud External Pipeline Activity",
    "Cloud Monitoring Operations",
]

daily_meter = {}
daily_total = {}
for d in dates:
    day = adf[adf["UsageDate"].dt.strftime("%Y-%m-%d") == d]
    daily_meter[d] = {
        m: round(float(day[day["Meter"] == m]["CostUSD"].sum()), 2)
        for m in METERS
        if day[day["Meter"] == m]["CostUSD"].sum() > 0
    }
    daily_total[d] = round(float(day["CostUSD"].sum()), 2)

adf_total = round(float(adf["CostUSD"].sum()), 2)

# ── top 5 pipelines ───────────────────────────────────────────────────────────
top5_keys = (
    pipelines.groupby("ResourceName")["CostUSD"]
    .sum()
    .sort_values(ascending=False)
    .head(5)
    .index.tolist()
)

pipeline_data = {}
for p in top5_keys:
    pdata = pipelines[pipelines["ResourceName"] == p]
    daily_t = pdata.groupby(pdata["UsageDate"].dt.strftime("%Y-%m-%d"))["CostUSD"].sum()
    daily_c = pdata[pdata["Meter"] == "Cloud Data Movement"].groupby(
        pdata["UsageDate"].dt.strftime("%Y-%m-%d")
    )["CostUSD"].sum()
    daily_o = pdata[pdata["Meter"] == "Cloud Orchestration Activity Run"].groupby(
        pdata["UsageDate"].dt.strftime("%Y-%m-%d")
    )["CostUSD"].sum()

    # short display name: strip common suffixes
    short = p.replace("_main_orch", "").replace("_orch", "")

    pipeline_data[p] = {
        "short": short,
        "total7d": round(float(pdata["CostUSD"].sum()), 2),
        "daily": [round(float(daily_t.get(d, 0)), 2) for d in dates],
        "cdm":   [round(float(daily_c.get(d, 0)), 2) for d in dates],
        "orch":  [round(float(daily_o.get(d, 0)), 2) for d in dates],
    }

# ── all pipelines table ───────────────────────────────────────────────────────
all_pipelines = (
    pipelines.groupby("ResourceName")["CostUSD"]
    .sum()
    .sort_values(ascending=False)
    .reset_index()
)
all_pipelines.columns = ["name", "totalCost"]
all_pipelines["cdm"] = all_pipelines["name"].apply(
    lambda n: round(float(
        pipelines[(pipelines["ResourceName"] == n) & (pipelines["Meter"] == "Cloud Data Movement")]["CostUSD"].sum()
    ), 2)
)
all_pipelines["orch"] = all_pipelines["name"].apply(
    lambda n: round(float(
        pipelines[(pipelines["ResourceName"] == n) & (pipelines["Meter"] == "Cloud Orchestration Activity Run")]["CostUSD"].sum()
    ), 2)
)
all_pipelines["totalCost"] = all_pipelines["totalCost"].round(2)

# ── meter totals ──────────────────────────────────────────────────────────────
meter_totals = {
    m: round(float(adf[adf["Meter"] == m]["CostUSD"].sum()), 2)
    for m in METERS
    if adf[adf["Meter"] == m]["CostUSD"].sum() > 0
}

# ── assemble output ───────────────────────────────────────────────────────────
output = {
    "meta": {
        "source": os.path.basename(latest),
        "generated": date.today().isoformat(),
        "date_range": f"{dates[0]} to {dates[-1]}",
        "adf_total": adf_total,
    },
    "dates": dates,
    "labels": labels,
    "daily_total": daily_total,
    "daily_meter": daily_meter,
    "meter_totals": meter_totals,
    "adf_total": adf_total,
    "top5_keys": top5_keys,
    "pipelines": pipeline_data,
    "pipeline_table": all_pipelines.to_dict("records"),
}

os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
with open(OUT_PATH, "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f"✓ Written to {OUT_PATH}")
print(f"  Dates : {dates[0]} → {dates[-1]}")
print(f"  ADF   : ${adf_total:,.2f}")
print(f"  Top 5 : {', '.join(top5_keys)}")
