"""Code Intelligence engine pipeline tests.

Runs the full pipeline over synthetic static evidence and decompiled Java
source. Verifies isolation contract: individual analyzer failures degrade
to ``partial``, never crash the engine.
"""

from __future__ import annotations

from pathlib import Path

from sephela_code_intel import analyze
from sephela_code_intel.base import Analyzer, AnalysisContext, AnalyzerResult
from sephela_code_intel.envelope import Status


def _make_source_tree(tmp: Path) -> Path:
    """Create a synthetic JADX output directory with developer + framework code."""
    sources = tmp / "jadx_out" / "sources"
    sources.mkdir(parents=True)

    # Developer code — a banking trojan-like class.
    dev_dir = sources / "com" / "malware" / "app"
    dev_dir.mkdir(parents=True)
    (dev_dir / "MainActivity.java").write_text(
        'package com.malware.app;\n'
        'import android.app.Activity;\n'
        'import android.telephony.SmsManager;\n\n'
        'public class MainActivity extends Activity {\n'
        '    public void onResume() {\n'
        '        SmsManager.getDefault().sendTextMessage("1234", null, "test", null, null);\n'
        '    }\n'
        '}\n',
        encoding="utf-8",
    )
    (dev_dir / "Loader.java").write_text(
        'package com.malware.app;\n'
        'import dalvik.system.DexClassLoader;\n\n'
        'public class Loader {\n'
        '    public void load(String path) {\n'
        '        DexClassLoader loader = new DexClassLoader(path, null, null, getClass().getClassLoader());\n'
        '        loader.loadClass("com.payload.Main");\n'
        '    }\n'
        '}\n',
        encoding="utf-8",
    )

    # Framework code (should be filtered out).
    fw_dir = sources / "android" / "widget"
    fw_dir.mkdir(parents=True)
    (fw_dir / "TextView.java").write_text(
        'package android.widget;\npublic class TextView {}\n',
        encoding="utf-8",
    )

    return tmp / "jadx_out"


def _make_static_evidence() -> dict[str, object]:
    """Simulate the static engine's evidence dict."""
    return {
        "hashes": {"sha256": "ab" * 32, "sha1": "cd" * 20, "md5": "ef" * 16},
        "smali": {
            "class_count": 5,
            "classes": [
                "Lcom/malware/app/MainActivity;",
                "Lcom/malware/app/Loader;",
                "Landroid/widget/TextView;",
                "Lcom/google/gson/Gson;",
                "Lcom/malware/app/BuildConfig;",
            ],
        },
        "permissions": {
            "count": 3,
            "permissions": [
                "android.permission.SEND_SMS",
                "android.permission.INTERNET",
                "android.permission.READ_CONTACTS",
            ],
        },
        "obfuscation": {
            "obfuscated_ratio": 0.1,
            "likely_obfuscated": False,
        },
    }


def test_full_pipeline(tmp_path: Path) -> None:
    """Full pipeline over synthetic data produces valid envelope."""
    artifact_dir = _make_source_tree(tmp_path)
    static_ev = _make_static_evidence()

    env = analyze(static_ev, job_id="job-ci-1", apk_sha256="ab" * 32, artifact_dir=artifact_dir)

    assert env.job_id == "job-ci-1"
    assert env.engine.name == "code_intel"
    assert env.engine.version == "1.0.0"
    assert env.apk_sha256 == "ab" * 32
    assert env.status in (Status.ok, Status.partial)

    # All analyzers should produce evidence.
    assert "class_filter" in env.evidence
    assert "api_usage" in env.evidence
    assert "call_graph" in env.evidence
    assert "control_flow" in env.evidence
    assert "grouper" in env.evidence
    assert "summarizer" in env.evidence

    # Summarizer should produce a code_summary.
    summarizer_ev = env.evidence["summarizer"]
    assert isinstance(summarizer_ev, dict)
    assert "code_summary" in summarizer_ev
    assert len(summarizer_ev["code_summary"]) > 0


def test_pipeline_without_artifacts(tmp_path: Path) -> None:
    """Pipeline works even without JADX artifacts (smali-only analysis)."""
    static_ev = _make_static_evidence()
    env = analyze(static_ev, job_id="job-ci-2")

    assert env.status in (Status.ok, Status.partial)
    assert "class_filter" in env.evidence
    # Without source files, api_usage/call_graph/control_flow produce empty results.
    assert "summarizer" in env.evidence


def test_pipeline_with_empty_evidence() -> None:
    """Pipeline handles completely empty static evidence gracefully."""
    env = analyze({})
    assert env.status in (Status.ok, Status.partial)
    assert "class_filter" in env.evidence


def test_pipeline_isolates_analyzer_failure(tmp_path: Path) -> None:
    """A failing analyzer degrades to partial; others still run."""

    class BrokenAnalyzer(Analyzer):
        name = "broken"

        def analyze(self, ctx: AnalysisContext) -> AnalyzerResult:
            raise RuntimeError("I am broken on purpose.")

    from sephela_code_intel.analyzers.class_filter import ClassFilterAnalyzer
    from sephela_code_intel.analyzers.summarizer import SummarizerAnalyzer

    env = analyze(
        _make_static_evidence(),
        analyzers=[ClassFilterAnalyzer(), BrokenAnalyzer(), SummarizerAnalyzer()],
    )

    assert env.status == Status.partial
    assert len(env.errors) == 1
    assert env.errors[0].analyzer == "broken"
    assert "class_filter" in env.evidence
    assert "summarizer" in env.evidence
    assert "broken" not in env.evidence


def test_findings_have_provenance(tmp_path: Path) -> None:
    """All findings carry provenance and framework mappings."""
    artifact_dir = _make_source_tree(tmp_path)
    env = analyze(
        _make_static_evidence(),
        artifact_dir=artifact_dir,
    )

    for finding in env.findings:
        assert finding.provenance is not None
        assert finding.provenance.extractor != ""
        assert finding.id != ""
        assert finding.detail != ""
