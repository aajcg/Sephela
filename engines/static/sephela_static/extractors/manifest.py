"""Manifest + components + permissions + intent-filters (Androguard).

One Androguard parse feeds several logical extractors. They are separate classes
(independent modules per the spec) but all read the shared parsed APK object so
we parse once. Each maps a subset of dangerous permissions to MITRE/OWASP.
"""

from __future__ import annotations

from typing import Any

from sephela_static.base import Extractor, ExtractionContext, ExtractorResult
from sephela_static.envelope import (
    Finding,
    FindingType,
    Mappings,
    Provenance,
    Severity,
)

# Permissions commonly abused by banking trojans → severity + framework mapping.
DANGEROUS_PERMISSIONS: dict[str, tuple[Severity, list[str], list[str]]] = {
    "android.permission.BIND_ACCESSIBILITY_SERVICE": (
        Severity.critical, ["T1417.001"], ["M1"],  # Input Capture: Keylogging
    ),
    "android.permission.SYSTEM_ALERT_WINDOW": (
        Severity.high, ["T1417.002"], ["M1"],  # overlay attacks
    ),
    "android.permission.RECEIVE_SMS": (Severity.high, ["T1636.004"], ["M1"]),
    "android.permission.READ_SMS": (Severity.high, ["T1636.004"], ["M1"]),
    "android.permission.SEND_SMS": (Severity.high, ["T1582"], ["M1"]),
    "android.permission.REQUEST_INSTALL_PACKAGES": (Severity.high, ["T1476"], ["M1"]),
    "android.permission.BIND_DEVICE_ADMIN": (Severity.high, ["T1626"], ["M1"]),
    "android.permission.READ_CONTACTS": (Severity.medium, ["T1636.003"], ["M2"]),
    "android.permission.RECORD_AUDIO": (Severity.medium, ["T1429"], ["M2"]),
    "android.permission.ACCESS_FINE_LOCATION": (Severity.medium, ["T1430"], ["M2"]),
}


class ManifestExtractor(Extractor):
    name = "manifest"
    requires_tools = True

    def extract(self, ctx: ExtractionContext) -> ExtractorResult:
        apk: Any = ctx.androguard_apk()
        evidence = {
            "package_name": apk.get_package(),
            "version_name": apk.get_androidversion_name(),
            "version_code": apk.get_androidversion_code(),
            "min_sdk": apk.get_min_sdk_version(),
            "target_sdk": apk.get_target_sdk_version(),
            "main_activity": apk.get_main_activity(),
        }
        return ExtractorResult(evidence=evidence)


class PermissionExtractor(Extractor):
    name = "permissions"
    requires_tools = True

    def extract(self, ctx: ExtractionContext) -> ExtractorResult:
        apk: Any = ctx.androguard_apk()
        perms: list[str] = list(apk.get_permissions())
        findings: list[Finding] = []
        for perm in perms:
            if perm in DANGEROUS_PERMISSIONS:
                sev, mitre, owasp = DANGEROUS_PERMISSIONS[perm]
                findings.append(
                    Finding(
                        id=f"perm:{perm}",
                        type=FindingType.permission,
                        severity=sev,
                        confidence=0.9,
                        detail=f"Requests dangerous permission {perm}",
                        provenance=Provenance(extractor=self.name, locator="AndroidManifest.xml"),
                        mappings=Mappings(mitre=mitre, owasp_mobile=owasp),
                    )
                )
        return ExtractorResult(
            evidence={"count": len(perms), "permissions": perms}, findings=findings
        )


class ComponentExtractor(Extractor):
    """Activities, services, broadcast receivers, providers, intent-filters."""

    name = "components"
    requires_tools = True

    def extract(self, ctx: ExtractionContext) -> ExtractorResult:
        apk: Any = ctx.androguard_apk()
        activities = list(apk.get_activities())
        services = list(apk.get_services())
        receivers = list(apk.get_receivers())
        providers = list(apk.get_providers())

        # Intent filters per component (best-effort across androguard versions).
        intent_filters: dict[str, Any] = {}
        try:
            for comp in activities + services + receivers:
                for kind in ("activity", "service", "receiver"):
                    filt = apk.get_intent_filters(kind, comp)
                    if filt:
                        intent_filters[comp] = filt
                        break
        except Exception:  # noqa: BLE001 — intent-filter API varies; degrade gracefully
            intent_filters = {}

        return ExtractorResult(
            evidence={
                "activities": activities,
                "services": services,
                "receivers": receivers,
                "providers": providers,
                "intent_filters": intent_filters,
                "counts": {
                    "activities": len(activities),
                    "services": len(services),
                    "receivers": len(receivers),
                    "providers": len(providers),
                },
            }
        )


class CertificateExtractor(Extractor):
    """Signing certificate details + self-signed / debug heuristics."""

    name = "certificate"
    requires_tools = True

    def extract(self, ctx: ExtractionContext) -> ExtractorResult:
        apk: Any = ctx.androguard_apk()
        certs = []
        findings: list[Finding] = []
        try:
            for cert in apk.get_certificates():
                issuer = cert.issuer.human_friendly
                subject = cert.subject.human_friendly
                info = {
                    "subject": subject,
                    "issuer": issuer,
                    "serial": str(cert.serial_number),
                    "sha256": cert.sha256.hex() if hasattr(cert, "sha256") else None,
                    "not_before": str(getattr(cert, "not_valid_before", None)),
                    "not_after": str(getattr(cert, "not_valid_after", None)),
                    "self_signed": issuer == subject,
                }
                certs.append(info)
                if "Android Debug" in subject:
                    findings.append(
                        Finding(
                            id="cert:debug",
                            type=FindingType.cert,
                            severity=Severity.medium,
                            confidence=0.95,
                            detail="APK signed with an Android debug certificate.",
                            provenance=Provenance(extractor=self.name),
                            mappings=Mappings(owasp_mobile=["M7"]),
                        )
                    )
        except Exception:  # noqa: BLE001 — signature scheme parsing varies
            pass
        return ExtractorResult(evidence={"certificates": certs}, findings=findings)
