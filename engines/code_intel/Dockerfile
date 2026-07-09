# syntax=docker/dockerfile:1
# Code Intelligence Engine image — lightweight, no analysis tooling needed.
# This engine operates on already-decompiled text, not raw APKs.
# Runs unprivileged with no network (see docs/architecture/09-security.md).
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /engine

COPY pyproject.toml ./
RUN pip install --upgrade pip && pip install .
COPY . .
RUN pip install .

# Unprivileged — defense in depth.
RUN useradd --create-home --uid 10003 engine && chown -R engine:engine /engine
USER engine
