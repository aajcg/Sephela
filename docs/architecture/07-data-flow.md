# Data Flow Diagrams

## DFD-0: End-to-end analysis

```
 Analyst/SOAR
     │ 1. POST /uploads (APK)
     ▼
┌──────────────┐  2. validate, sha256, dedup check
│  API Gateway │──────────────────────────────┐
└──────┬───────┘                               ▼
       │ 3. store APK              ┌────────────────────┐
       │──────────────────────────▶│  Object Storage    │
       │ 4. INSERT sample+job      └────────────────────┘
       │──────────────┐
       │              ▼
       │        ┌───────────┐
       │        │ PostgreSQL │
       │        └───────────┘
       │ 5. enqueue job.created
       ▼
┌──────────────┐
│    Redis     │  (broker)
└──────┬───────┘
       │ 6. dispatch pipeline
       ▼
┌───────────────────────── Orchestration Workers ─────────────────────────┐
│  intake ─▶ static ─▶ code_intel ─▶ ( ai ‖ threat_intel ) ─▶ scoring ─▶   │
│                                          │           │        report      │
│   each stage: read inputs ◀── Storage/DB, write Evidence Envelope ──▶ DB  │
│   (dynamic_analysis: optional isolated parallel branch, policy-gated)     │
└──────┬───────────────────────────────────────────────────────────────────┘
       │ 7. job.completed event
       ▼
  webhook / SSE / dashboard poll ──▶ Analyst views report + risk score
```

## DFD-1: Upload & validation (Phase 4)
```
APK bytes ─▶ [size/type/magic check] ─▶ [compute sha256/sha1/md5]
        ─▶ [dedup: sample exists?]
              ├─ yes ─▶ reuse sample, new job (may reuse cached evidence)
              └─ no  ─▶ store to object storage, INSERT sample
        ─▶ INSERT job(queued) ─▶ enqueue ─▶ return {job_id}
   (failures at any step ─▶ Problem Details response, nothing half-persisted)
```

## DFD-2: Static analysis engine (Phase 5)
```
APK ref ─▶ unpack ─▶ ┌ manifest ─┐
                     │ permissions│
                     │ activities │  each extractor independent & isolated;
                     │ services   │  one failure ─▶ envelope.errors[], status=partial
                     │ receivers  │
                     │ certs      │─▶ merge ─▶ normalize findings ─▶ Evidence Envelope
                     │ strings    │            (+ MITRE/OWASP mapping, provenance)
                     │ urls/ips   │
                     │ decompile  │─▶ large artifacts ─▶ Object Storage (uri in envelope)
                     │ obfuscation│
                     └ packers ───┘
```

## DFD-3: GenAI reasoning (Phase 7 → 13)
```
Evidence (static + code_intel + TI)  ─▶ [RAG retrieve: similar malware, MITRE,
                                          banking-trojan corpus]  (Phase 12)
   ─▶ Orchestrator agent (LangGraph)
        ├─ Manifest Analyst      ┐
        ├─ Permission Analyst    │  each: evidence-scoped prompt,
        ├─ Code Analyst          │  structured output (schema-validated),
        ├─ API Analyst           │  provenance-linked findings
        ├─ Network Analyst       │
        └─ Threat-Intel Analyst  ┘
   ─▶ synthesize ─▶ validated findings + confidence  ─▶ DB (findings)
   (AI reasons ONLY over provided evidence; no fact invention)
```

## DFD-4: Risk scoring (Phase 8)
```
[static findings] [ai findings] [signatures] [TI verdicts] [permissions] [obfusc] [cert trust]
        └──────────────────────────┬───────────────────────────────────┘
                                    ▼
        deterministic weighted model  (reproducible, no LLM in the math)
                                    ▼
   { score 0-100, severity, confidence, category,
     breakdown[{factor, weight, contribution, evidence_ref}],
     mitre[], owasp_mobile[] }  ─▶ DB ─▶ Reporting
```

## DFD-5: Dynamic analysis (Phase 10, isolated)
```
job (policy=dynamic) ─▶ q.dynamic ─▶ provision ephemeral emulator (isolated node,
   egress-firewalled) ─▶ install+run APK ─▶ Frida hooks + mitmproxy capture
   ─▶ observe {file, process, network, clipboard, sms, accessibility, ssl-bypass}
   ─▶ normalize runtime events ─▶ Evidence Envelope ─▶ destroy sandbox
```
