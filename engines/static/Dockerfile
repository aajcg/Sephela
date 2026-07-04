# syntax=docker/dockerfile:1
# Static Analysis Engine image — includes the full toolchain (Androguard, APKID,
# JADX). Runs unprivileged with no network (see docs/architecture/09-security.md:
# static extractors only parse bytes and must never reach the network).
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /engine

# JADX needs a JRE; unzip for its distribution.
RUN apt-get update && apt-get install -y --no-install-recommends \
    default-jre-headless unzip curl \
    && rm -rf /var/lib/apt/lists/*

# Install JADX CLI.
ARG JADX_VERSION=1.5.0
RUN curl -fsSL -o /tmp/jadx.zip \
      "https://github.com/skylot/jadx/releases/download/v${JADX_VERSION}/jadx-${JADX_VERSION}.zip" \
    && unzip -q /tmp/jadx.zip -d /opt/jadx && rm /tmp/jadx.zip
ENV PATH="/opt/jadx/bin:${PATH}"

COPY pyproject.toml ./
RUN pip install --upgrade pip && pip install ".[tools]"
COPY . .
RUN pip install .

# Unprivileged, no shell-out with untrusted args elsewhere.
RUN useradd --create-home --uid 10002 engine && chown -R engine:engine /engine
USER engine
