"""Shared constants for the Code Intelligence Engine.

Defines known Android framework packages, common third-party libraries,
dangerous API signatures with MITRE ATT&CK / OWASP Mobile mappings, and
generated-code patterns. These are used by multiple analyzers to classify
code and detect suspicious behavior.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Framework and library package prefixes (for class filtering)
# ---------------------------------------------------------------------------

#: Core Android SDK and Jetpack packages — always framework code.
ANDROID_FRAMEWORK_PREFIXES: tuple[str, ...] = (
    "android.",
    "androidx.",
    "com.android.",
    "dalvik.",
    "java.",
    "javax.",
    "kotlin.",
    "kotlinx.",
    "org.json.",
    "org.xml.",
    "org.w3c.",
    "org.apache.",
    "sun.",
    "com.sun.",
)

#: Common third-party libraries — not developer code.
THIRD_PARTY_PREFIXES: tuple[str, ...] = (
    "com.google.android.gms.",
    "com.google.android.material.",
    "com.google.firebase.",
    "com.google.gson.",
    "com.google.protobuf.",
    "com.google.common.",  # Guava
    "com.squareup.okhttp",
    "com.squareup.retrofit",
    "com.squareup.moshi.",
    "com.squareup.picasso.",
    "com.bumptech.glide.",
    "io.reactivex.",
    "io.realm.",
    "org.greenrobot.",  # EventBus
    "com.facebook.",
    "com.airbnb.",
    "com.jakewharton.",
    "dagger.",
    "hilt_aggregated_deps.",
    "butterknife.",
    "retrofit2.",
    "okhttp3.",
    "okio.",
    "com.fasterxml.",  # Jackson
    "org.slf4j.",
    "timber.log.",
    "com.crashlytics.",
    "io.sentry.",
    "com.appsflyer.",
    "com.adjust.",
    "com.amplitude.",
    "com.mixpanel.",
)

#: Patterns indicating generated code (class name suffixes / substrings).
GENERATED_PATTERNS: tuple[str, ...] = (
    "R$",
    "R.class",
    "BuildConfig",
    "_Factory",  # Dagger
    "_MembersInjector",  # Dagger
    "Dagger",
    "_Impl",  # Room
    "DataBinding",
    "databinding",
    "_ViewBinding",
    "$$Lambda$",
    "$Companion",
    "AutoValue_",
    "AutoParcel_",
    "GsonTypeAdapter",
)

# ---------------------------------------------------------------------------
# Dangerous Android API signatures (for API usage + control flow analysis)
# ---------------------------------------------------------------------------

#: Maps a human-readable category to (regex patterns, severity, mitre, owasp).
#: Patterns match against Java source text — method calls, class references.
DANGEROUS_API_CATEGORIES: dict[str, dict[str, object]] = {
    "sms_access": {
        "patterns": [
            r"SmsManager\s*\.\s*getDefault",
            r"SmsManager\s*\.\s*sendTextMessage",
            r"SmsManager\s*\.\s*sendMultipartTextMessage",
            r"\.sendDataMessage\s*\(",
            r"Telephony\.Sms",
            r"content://sms",
        ],
        "severity": "high",
        "mitre": ["T1636.004"],  # SMS/MMS Collection
        "owasp_mobile": ["M1"],
    },
    "accessibility_abuse": {
        "patterns": [
            r"AccessibilityService",
            r"AccessibilityEvent",
            r"performAction\s*\(",
            r"AccessibilityNodeInfo",
            r"BIND_ACCESSIBILITY_SERVICE",
        ],
        "severity": "critical",
        "mitre": ["T1417.001"],  # Input Capture: Keylogging
        "owasp_mobile": ["M1"],
    },
    "overlay_attack": {
        "patterns": [
            r"TYPE_APPLICATION_OVERLAY",
            r"TYPE_SYSTEM_ALERT",
            r"TYPE_PHONE",
            r"SYSTEM_ALERT_WINDOW",
            r"WindowManager\.LayoutParams",
        ],
        "severity": "high",
        "mitre": ["T1417.002"],  # Input Capture: GUI Input Capture
        "owasp_mobile": ["M1"],
    },
    "reflection": {
        "patterns": [
            r"Class\s*\.\s*forName\s*\(",
            r"\.getMethod\s*\(",
            r"\.getDeclaredMethod\s*\(",
            r"\.invoke\s*\(",
            r"\.getDeclaredField\s*\(",
            r"\.setAccessible\s*\(",
        ],
        "severity": "medium",
        "mitre": ["T1620"],  # Reflective Code Loading
        "owasp_mobile": ["M9"],
    },
    "dynamic_loading": {
        "patterns": [
            r"DexClassLoader",
            r"PathClassLoader",
            r"InMemoryDexClassLoader",
            r"BaseDexClassLoader",
            r"\.loadClass\s*\(",
            r"dalvik\.system\.",
        ],
        "severity": "high",
        "mitre": ["T1407"],  # Download New Code at Runtime
        "owasp_mobile": ["M9"],
    },
    "native_code": {
        "patterns": [
            r"System\s*\.\s*loadLibrary\s*\(",
            r"System\s*\.\s*load\s*\(",
            r"Runtime\s*\.\s*loadLibrary\s*\(",
            r"\bnative\s+\w+\s*\(",  # native method declarations
        ],
        "severity": "medium",
        "mitre": ["T1406"],  # Obfuscated Files or Information
        "owasp_mobile": ["M9"],
    },
    "crypto_operations": {
        "patterns": [
            r"Cipher\s*\.\s*getInstance\s*\(",
            r"SecretKeySpec\s*\(",
            r"KeyGenerator\s*\.\s*getInstance",
            r"MessageDigest\s*\.\s*getInstance",
            r"Mac\s*\.\s*getInstance",
            r"IvParameterSpec\s*\(",
        ],
        "severity": "low",
        "mitre": ["T1573"],  # Encrypted Channel
        "owasp_mobile": ["M5"],
    },
    "process_execution": {
        "patterns": [
            r"Runtime\s*\.\s*getRuntime\s*\(\s*\)\s*\.\s*exec\s*\(",
            r"ProcessBuilder\s*\(",
            r"\.exec\s*\(\s*\"su",
            r"\.exec\s*\(\s*new\s+String",
        ],
        "severity": "high",
        "mitre": ["T1623"],  # Command and Scripting Interpreter
        "owasp_mobile": ["M1"],
    },
    "device_admin": {
        "patterns": [
            r"DeviceAdminReceiver",
            r"DevicePolicyManager",
            r"BIND_DEVICE_ADMIN",
            r"lockNow\s*\(",
            r"wipeData\s*\(",
            r"resetPassword\s*\(",
        ],
        "severity": "high",
        "mitre": ["T1626"],  # Abuse Elevation Control Mechanism
        "owasp_mobile": ["M1"],
    },
    "data_exfiltration": {
        "patterns": [
            r"ContactsContract",
            r"CallLog\.Calls",
            r"CalendarContract",
            r"content://contacts",
            r"content://call_log",
            r"getAccounts\s*\(",
            r"AccountManager",
        ],
        "severity": "medium",
        "mitre": ["T1636.003"],  # Contact List
        "owasp_mobile": ["M2"],
    },
    "network_communication": {
        "patterns": [
            r"HttpURLConnection",
            r"URL\s*\(\s*\"http",
            r"Socket\s*\(",
            r"ServerSocket\s*\(",
            r"DatagramSocket\s*\(",
            r"SSLSocket",
            r"OkHttpClient",
            r"WebView\s*\.\s*loadUrl",
        ],
        "severity": "info",
        "mitre": ["T1071"],  # Application Layer Protocol
        "owasp_mobile": ["M3"],
    },
    "encoding_obfuscation": {
        "patterns": [
            r"Base64\s*\.\s*decode",
            r"Base64\s*\.\s*encode",
            r"\.getBytes\s*\(\s*\"UTF",
            r"new\s+String\s*\(\s*new\s+byte",
            r"XOR",
            r"\^\s*0x[0-9a-fA-F]",
        ],
        "severity": "medium",
        "mitre": ["T1027"],  # Obfuscated Files or Information
        "owasp_mobile": ["M9"],
    },
}

# ---------------------------------------------------------------------------
# Logical grouping categories (for the grouper analyzer)
# ---------------------------------------------------------------------------

#: Maps a group name to indicative package/class name substrings.
GROUP_INDICATORS: dict[str, tuple[str, ...]] = {
    "networking": ("http", "net", "socket", "api", "client", "request", "response", "url", "web"),
    "persistence": ("db", "database", "sql", "sqlite", "room", "dao", "store", "cache", "pref"),
    "crypto": ("crypt", "cipher", "key", "hash", "digest", "sign", "ssl", "tls", "secret"),
    "ui": ("activity", "fragment", "view", "adapter", "layout", "dialog", "widget", "screen"),
    "receivers": ("receiver", "broadcast", "alarm"),
    "services": ("service", "worker", "job", "task", "background"),
    "accessibility": ("accessibility", "a11y"),
    "device_admin": ("admin", "device_policy", "deviceadmin"),
    "sms": ("sms", "telephony", "phone"),
    "native": ("jni", "native", "ndk"),
}
