#!/usr/bin/env python3
"""Audit rate drift between db-bundle.js and spec production.json files.

Usage:
    python audit_bundle_vs_production.py [--out <path>]

Walks every spec under ../../specs/, compares each production rate row
against the compiled bundle, and writes a Markdown report grouping rows
where they disagree. One table per spec family, plus a summary.

Exit codes:
    0 = report generated (may still contain diffs — that's the whole point)
    2 = failed to read bundle or specs
"""

import argparse
import json
import re
import sys
from pathlib import Path

# ============================================================
# Paths
# ============================================================

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent  # Claude/
BUNDLE_PATH = REPO_ROOT / "tools" / "paintscope" / "src" / "data" / "db-bundle.js"
SPECS_DIR = REPO_ROOT / "specs"
DEFAULT_OUT = REPO_ROOT / "devos" / "reports" / "production_json_drift.md"

# Fields we compare. The bundle exporter drops rate_range_low/high to keep the
# engine bundle slim, so we can't reliably diff those across the two sources —
# compare only the fields that actually live in both.
RATE_FIELDS = ("rate_per_hour", "fixed_minutes")


# ============================================================
# Bundle loading
# ============================================================

def load_bundle(path: Path) -> dict:
    """Extract DB_BUNDLE object from the compiled JS bundle."""
    text = path.read_text(encoding="utf-8")
    # Match `export const DB_BUNDLE = { ... };` — JSON body between braces.
    m = re.search(r"export\s+const\s+DB_BUNDLE\s*=\s*(\{.*\});?\s*$", text, re.DOTALL)
    if not m:
        raise ValueError(f"Could not find DB_BUNDLE export in {path}")
    return json.loads(m.group(1))


# ============================================================
# Row identity / comparison
# ============================================================

def row_key(r: dict) -> str:
    """A stable key used to match a bundle row to a production.json row.

    Uses task_id + applies_when, because some tasks have multiple rate
    rows gated on different application_method / quality_tier sets.
    """
    aw = r.get("applies_when") or {}
    # Canonicalize applies_when: sort keys, sort array values within each key
    canonical = {k: sorted(v) if isinstance(v, list) else v for k, v in sorted(aw.items())}
    return f"{r.get('task_id')}|{json.dumps(canonical, sort_keys=True)}"


def rate_signature(r: dict) -> dict:
    """Return only the fields we care about comparing."""
    return {f: r.get(f) for f in RATE_FIELDS}


def differs(a: dict, b: dict) -> bool:
    """True if two rate signatures disagree on any tracked field."""
    for f in RATE_FIELDS:
        if a.get(f) != b.get(f):
            return True
    return False


# ============================================================
# Spec loading
# ============================================================

def load_spec_rates(spec_dir: Path) -> tuple[str, list[dict]] | None:
    """Return (spec_family_id, rate_rows) for a spec dir, or None if missing."""
    prod_path = spec_dir / "production.json"
    if not prod_path.exists():
        return None
    try:
        data = json.loads(prod_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        print(f"WARN: failed to parse {prod_path}: {e}", file=sys.stderr)
        return None
    spec_id = data.get("spec_family_id")
    rates = data.get("task_production_rates") or []
    return (spec_id, rates) if spec_id else None


# ============================================================
# Diff computation
# ============================================================

def diff_spec(spec_id: str, bundle_rates_by_key: dict, prod_rates: list[dict]) -> dict:
    """Classify rate rows for a single spec.

    Returns dict with keys: mismatched (both sides, values differ),
    bundle_only (in bundle but not production), production_only (vice versa).
    """
    prod_by_key = {row_key(r): r for r in prod_rates}
    bundle_by_key = bundle_rates_by_key.get(spec_id, {})

    mismatched = []
    bundle_only = []
    production_only = []

    for k, br in bundle_by_key.items():
        pr = prod_by_key.get(k)
        if pr is None:
            bundle_only.append(br)
        elif differs(rate_signature(br), rate_signature(pr)):
            mismatched.append((br, pr))

    for k, pr in prod_by_key.items():
        if k not in bundle_by_key:
            production_only.append(pr)

    return {
        "mismatched": mismatched,
        "bundle_only": bundle_only,
        "production_only": production_only,
    }


# ============================================================
# Markdown rendering
# ============================================================

def fmt_val(v) -> str:
    if v is None:
        return "—"
    return str(v)


def fmt_applies_when(aw) -> str:
    if not aw:
        return "—"
    parts = []
    for k in sorted(aw.keys()):
        v = aw[k]
        if isinstance(v, list):
            parts.append(f"{k}=[{','.join(map(str, v))}]")
        else:
            parts.append(f"{k}={v}")
    return " · ".join(parts)


def render_report(
    bundle_meta: dict,
    per_spec: dict[str, dict],
    out_path: Path,
) -> tuple[int, int, int]:
    """Write Markdown report and return (total_mismatched, total_bundle_only, total_production_only)."""
    total_m, total_bo, total_po = 0, 0, 0

    lines: list[str] = []
    lines.append("# production.json ↔ db-bundle.js Drift Report")
    lines.append("")
    lines.append("Generated by `database/scripts/audit_bundle_vs_production.py`.")
    lines.append("")
    lines.append("Columns:")
    lines.append("")
    lines.append("- **Bundle** — current engine rate (`rate_per_hour` / `fixed_minutes`)")
    lines.append("- **Production.json** — current file rate (same two fields)")
    lines.append("- Rate-range fields are not compared; the bundle exporter strips them.")
    lines.append("- **Decision** — fill in SYNC / REVERT / INVESTIGATE during Phase 2 triage")
    lines.append("")
    lines.append("Reminder from the plan: bundle wins by default. Mark REVERT only if the bundle rate is clearly wrong (typo, unit mistake).")
    lines.append("")

    summary_rows = []

    for spec_id in sorted(per_spec.keys()):
        diff = per_spec[spec_id]
        m = diff["mismatched"]
        bo = diff["bundle_only"]
        po = diff["production_only"]
        if not (m or bo or po):
            continue
        total_m += len(m)
        total_bo += len(bo)
        total_po += len(po)
        summary_rows.append((spec_id, len(m), len(bo), len(po)))

    # Summary table
    lines.append("## Summary")
    lines.append("")
    lines.append("| Spec | Mismatched | Bundle-only | Production-only |")
    lines.append("|---|---:|---:|---:|")
    for spec_id, m, bo, po in summary_rows:
        lines.append(f"| `{spec_id}` | {m} | {bo} | {po} |")
    lines.append(f"| **TOTAL** | **{total_m}** | **{total_bo}** | **{total_po}** |")
    lines.append("")

    # Per-spec details
    for spec_id, m, bo, po in summary_rows:
        diff = per_spec[spec_id]
        lines.append(f"## {spec_id}")
        lines.append("")

        if diff["mismatched"]:
            lines.append("### Mismatched rates")
            lines.append("")
            lines.append("| task_id | applies_when | Bundle | Production.json | Decision |")
            lines.append("|---|---|---|---|---|")
            for br, pr in sorted(diff["mismatched"], key=lambda x: x[0].get("task_id", "")):
                bsig = rate_signature(br)
                psig = rate_signature(pr)
                bstr = "/".join(fmt_val(bsig[f]) for f in RATE_FIELDS)
                pstr = "/".join(fmt_val(psig[f]) for f in RATE_FIELDS)
                lines.append(
                    f"| `{br.get('task_id')}` | {fmt_applies_when(br.get('applies_when'))} | {bstr} | {pstr} | |"
                )
            lines.append("")
            lines.append("_Rate column order:_ `rate_per_hour` / `fixed_minutes`")
            lines.append("")

        if diff["bundle_only"]:
            lines.append("### Bundle-only rate rows (missing from production.json)")
            lines.append("")
            lines.append("| task_id | applies_when | Bundle | Decision |")
            lines.append("|---|---|---|---|")
            for br in sorted(diff["bundle_only"], key=lambda x: x.get("task_id", "")):
                bsig = rate_signature(br)
                bstr = "/".join(fmt_val(bsig[f]) for f in RATE_FIELDS)
                lines.append(
                    f"| `{br.get('task_id')}` | {fmt_applies_when(br.get('applies_when'))} | {bstr} | |"
                )
            lines.append("")

        if diff["production_only"]:
            lines.append("### Production.json-only rate rows (missing from bundle)")
            lines.append("")
            lines.append("| task_id | applies_when | Production.json | Decision |")
            lines.append("|---|---|---|---|")
            for pr in sorted(diff["production_only"], key=lambda x: x.get("task_id", "")):
                psig = rate_signature(pr)
                pstr = "/".join(fmt_val(psig[f]) for f in RATE_FIELDS)
                lines.append(
                    f"| `{pr.get('task_id')}` | {fmt_applies_when(pr.get('applies_when'))} | {pstr} | |"
                )
            lines.append("")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return total_m, total_bo, total_po


# ============================================================
# Main
# ============================================================

def main() -> int:
    ap = argparse.ArgumentParser(description="Audit production.json vs db-bundle.js rate drift")
    ap.add_argument("--out", default=str(DEFAULT_OUT), help="Markdown report output path")
    args = ap.parse_args()

    try:
        bundle = load_bundle(BUNDLE_PATH)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 2

    # Build bundle index: spec_id -> { key -> row }
    bundle_rates_by_key: dict[str, dict[str, dict]] = {}
    for r in bundle.get("task_production_rates") or []:
        sid = r.get("spec_family_id")
        if not sid:
            continue
        bundle_rates_by_key.setdefault(sid, {})[row_key(r)] = r

    # Walk specs dir
    per_spec: dict[str, dict] = {}
    seen_specs_in_files: set[str] = set()
    for spec_dir in sorted(SPECS_DIR.iterdir()):
        if not spec_dir.is_dir():
            continue
        loaded = load_spec_rates(spec_dir)
        if loaded is None:
            continue
        spec_id, prod_rates = loaded
        seen_specs_in_files.add(spec_id)
        diff = diff_spec(spec_id, bundle_rates_by_key, prod_rates)
        per_spec[spec_id] = diff

    # Any spec in bundle that has no file → everything is bundle-only
    for bundle_spec in bundle_rates_by_key.keys():
        if bundle_spec not in seen_specs_in_files:
            per_spec[bundle_spec] = {
                "mismatched": [],
                "bundle_only": list(bundle_rates_by_key[bundle_spec].values()),
                "production_only": [],
            }

    out_path = Path(args.out)
    total_m, total_bo, total_po = render_report(
        bundle_meta={},
        per_spec=per_spec,
        out_path=out_path,
    )

    print(f"Report written to: {out_path}")
    print(f"  Mismatched rates : {total_m}")
    print(f"  Bundle-only rows : {total_bo}")
    print(f"  Production-only  : {total_po}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
