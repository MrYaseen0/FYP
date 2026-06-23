"""
Healtheon — FYP Evaluation Runner
===================================
Submits all synthetic cases through the live backend API and collects metrics.

Usage (with backend running on localhost:8000):
    cd "c:\\final fyp idea"
    python -m backend.evaluation.run_evaluation

Output:
    - Console table of per-case metrics
    - evaluation_results.json (for FYP appendix)
    - evaluation_summary.md  (ready to paste into Chapter 5)

Metrics collected per case:
    - latency_seconds        : Wall-clock pipeline time
    - total_rounds           : Number of agent turns used
    - investigations_count   : Number of tests suggested
    - stat_count             : STAT investigations
    - routine_count          : ROUTINE investigations
    - disclaimer_present     : Whether safety disclaimer appears in transcript
    - debate_detected        : Whether adversarial language patterns appear in transcript
    - data_exhausted_trigger : Whether DATA EXHAUSTED rule fired

FYP Defense: "I evaluated the system against 10 synthetic textbook cases, measuring
latency, agent turn count, investigation basket completeness, and safety compliance
(disclaimer presence). This provides both quantitative and qualitative evidence of
system correctness."
"""
import time
import json
import re
import sys
import logging
from datetime import datetime
from pathlib import Path

import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s — %(message)s")
logger = logging.getLogger("healtheon.evaluation")

BASE_URL = "http://localhost:8000"
POLL_INTERVAL = 5     # seconds between status checks
TIMEOUT = 180         # max seconds to wait per case

# ── Metric computation ─────────────────────────────────────────────────────

DEBATE_PATTERNS = re.compile(
    r"while @\w+|devil's advocate|alternatively|from a \w+ standpoint, this could|"
    r"challenge|however, from|I disagree|alternative differential",
    re.IGNORECASE
)
DISCLAIMER_PATTERN = re.compile(r"educational|not medical advice|proof.of.concept", re.IGNORECASE)
DATA_EXHAUSTED_PATTERN = re.compile(r"DATA EXHAUSTED", re.IGNORECASE)


def compute_metrics(case_data: dict) -> dict:
    """Extract evaluation metrics from a completed case."""
    transcript = case_data.get("transcript", [])
    investigations = case_data.get("investigations", [])
    summary = case_data.get("summary") or {}

    full_text = " ".join(m.get("content", "") for m in transcript)

    return {
        "latency_seconds": summary.get("latency_seconds"),
        "total_rounds": summary.get("total_rounds", len(transcript)),
        "investigations_count": len(investigations),
        "stat_count": sum(1 for i in investigations if i.get("urgency") == "STAT"),
        "routine_count": sum(1 for i in investigations if i.get("urgency") == "ROUTINE"),
        "disclaimer_present": bool(DISCLAIMER_PATTERN.search(full_text)),
        "debate_detected": bool(DEBATE_PATTERNS.search(full_text)),
        "data_exhausted_trigger": bool(DATA_EXHAUSTED_PATTERN.search(full_text)),
        "has_summary": bool(summary.get("summary_markdown")),
    }


# ── API helpers ────────────────────────────────────────────────────────────

def get_synthetic_cases():
    resp = requests.get(f"{BASE_URL}/api/synthetic/cases", timeout=10)
    resp.raise_for_status()
    return resp.json()["cases"]


def submit_case(case: dict) -> str:
    resp = requests.post(f"{BASE_URL}/api/cases", json=case, timeout=10)
    resp.raise_for_status()
    return resp.json()["case_id"]


def poll_case(case_id: str) -> dict:
    deadline = time.time() + TIMEOUT
    while time.time() < deadline:
        resp = requests.get(f"{BASE_URL}/api/cases/{case_id}", timeout=10)
        resp.raise_for_status()
        data = resp.json()
        if data["status"] in ("done", "failed"):
            return data
        time.sleep(POLL_INTERVAL)
    raise TimeoutError(f"Case {case_id} did not complete within {TIMEOUT}s")


# ── Main evaluation loop ───────────────────────────────────────────────────

def run_evaluation():
    logger.info("=" * 60)
    logger.info("Healtheon FYP Evaluation Runner")
    logger.info(f"Target: {BASE_URL}")
    logger.info("=" * 60)

    # 1. Load synthetic cases
    try:
        cases = get_synthetic_cases()
    except Exception as e:
        logger.error(f"Could not fetch synthetic cases: {e}")
        logger.error("Make sure the backend is running: uvicorn backend.main:app --port 8000")
        sys.exit(1)

    logger.info(f"Loaded {len(cases)} synthetic cases for evaluation.")
    results = []

    for i, case in enumerate(cases, 1):
        label = case.get("chief_complaint", f"Case {i}")[:50]
        logger.info(f"\n[{i}/{len(cases)}] Submitting: {label}…")

        try:
            case_id = submit_case(case)
            logger.info(f"  → Case ID: {case_id[:8]}… | Waiting for pipeline…")

            start = time.time()
            case_data = poll_case(case_id)
            elapsed = time.time() - start

            if case_data["status"] == "failed":
                logger.warning(f"  ✗ FAILED: {case_data.get('error_message')}")
                results.append({
                    "case_num": i,
                    "chief_complaint": label,
                    "case_id": case_id,
                    "status": "failed",
                    "error": case_data.get("error_message"),
                })
                continue

            metrics = compute_metrics(case_data)
            results.append({
                "case_num": i,
                "chief_complaint": label,
                "case_id": case_id,
                "status": "done",
                **metrics,
            })

            logger.info(
                f"  ✓ Done | {metrics['latency_seconds']}s | "
                f"{metrics['total_rounds']} rounds | "
                f"{metrics['investigations_count']} investigations "
                f"({metrics['stat_count']} STAT, {metrics['routine_count']} Routine) | "
                f"Debate={'✓' if metrics['debate_detected'] else '✗'} | "
                f"Disclaimer={'✓' if metrics['disclaimer_present'] else '✗'}"
            )

        except TimeoutError as e:
            logger.error(f"  ✗ TIMEOUT: {e}")
            results.append({"case_num": i, "chief_complaint": label, "status": "timeout"})
        except Exception as e:
            logger.error(f"  ✗ ERROR: {e}")
            results.append({"case_num": i, "chief_complaint": label, "status": "error", "error": str(e)})

    # 2. Aggregate
    done = [r for r in results if r.get("status") == "done"]
    _print_summary(results, done)
    _save_outputs(results, done)


def _print_summary(results, done):
    print("\n" + "=" * 70)
    print("EVALUATION SUMMARY")
    print("=" * 70)
    print(f"{'#':<4} {'Status':<10} {'Latency':>8} {'Rounds':>7} {'Inv':>4} {'Debate':>7} {'Disc':>5}")
    print("-" * 70)
    for r in results:
        status = r.get("status", "?")
        lat = f"{r.get('latency_seconds', 0):.1f}s" if r.get("latency_seconds") else "—"
        rounds = r.get("total_rounds", "—")
        inv = r.get("investigations_count", "—")
        debate = "✓" if r.get("debate_detected") else "✗"
        disc = "✓" if r.get("disclaimer_present") else "✗"
        print(f"{r['case_num']:<4} {status:<10} {lat:>8} {str(rounds):>7} {str(inv):>4} {debate:>7} {disc:>5}")
    print("=" * 70)

    if done:
        avg_lat = sum(r["latency_seconds"] for r in done if r.get("latency_seconds")) / len(done)
        avg_rounds = sum(r.get("total_rounds", 0) for r in done) / len(done)
        avg_inv = sum(r.get("investigations_count", 0) for r in done) / len(done)
        debate_pct = sum(1 for r in done if r.get("debate_detected")) / len(done) * 100
        disclaimer_pct = sum(1 for r in done if r.get("disclaimer_present")) / len(done) * 100

        print(f"\nAGGREGATE (n={len(done)} completed cases):")
        print(f"  Mean latency:           {avg_lat:.1f}s")
        print(f"  Mean agent rounds:      {avg_rounds:.1f}")
        print(f"  Mean investigations:    {avg_inv:.1f}")
        print(f"  Debate detected:        {debate_pct:.0f}%")
        print(f"  Disclaimer present:     {disclaimer_pct:.0f}%")


def _save_outputs(results, done):
    out_dir = Path(__file__).parent
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Raw JSON
    json_path = out_dir / f"evaluation_results_{ts}.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, default=str)
    logger.info(f"\nResults saved → {json_path}")

    # Markdown summary for FYP appendix
    if done:
        avg_lat = sum(r["latency_seconds"] for r in done if r.get("latency_seconds")) / len(done)
        avg_rounds = sum(r.get("total_rounds", 0) for r in done) / len(done)
        avg_inv = sum(r.get("investigations_count", 0) for r in done) / len(done)
        debate_pct = sum(1 for r in done if r.get("debate_detected")) / len(done) * 100
        disclaimer_pct = sum(1 for r in done if r.get("disclaimer_present")) / len(done) * 100

        md_lines = [
            "# Healtheon — Evaluation Results\n",
            f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M')}  ",
            f"**Cases evaluated:** {len(results)}  ",
            f"**Completed successfully:** {len(done)}  \n",
            "## Aggregate Metrics\n",
            "| Metric | Value |",
            "|--------|-------|",
            f"| Mean pipeline latency | {avg_lat:.1f}s |",
            f"| Mean agent turns | {avg_rounds:.1f} |",
            f"| Mean investigations suggested | {avg_inv:.1f} |",
            f"| Debate language detected | {debate_pct:.0f}% of cases |",
            f"| Safety disclaimer present | {disclaimer_pct:.0f}% of cases |",
            "\n## Per-Case Results\n",
            "| # | Case | Status | Latency | Rounds | Inv | Debate | Disclaimer |",
            "|---|------|--------|---------|--------|-----|--------|------------|",
        ]
        for r in results:
            lat = f"{r.get('latency_seconds', 0):.1f}s" if r.get("latency_seconds") else "—"
            md_lines.append(
                f"| {r['case_num']} | {r['chief_complaint'][:40]} | {r.get('status','?')} | "
                f"{lat} | {r.get('total_rounds','—')} | {r.get('investigations_count','—')} | "
                f"{'✓' if r.get('debate_detected') else '✗'} | "
                f"{'✓' if r.get('disclaimer_present') else '✗'} |"
            )

        md_path = out_dir / f"evaluation_summary_{ts}.md"
        with open(md_path, "w", encoding="utf-8") as f:
            f.write("\n".join(md_lines))
        logger.info(f"Markdown summary saved → {md_path}")


if __name__ == "__main__":
    run_evaluation()
