#!/usr/bin/env bash
# Generic start script for Railway / Render / any container host.
# Binds to the platform-provided $PORT (defaults to 8001 locally).
set -e
exec uvicorn server:app --host 0.0.0.0 --port "${PORT:-8001}"
