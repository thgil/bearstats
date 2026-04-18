#!/usr/bin/env bash
# Run webapp unit tests via Node's built-in test runner.
set -eu
cd "$(dirname "$0")/.."
node --test tests/test-*.js
