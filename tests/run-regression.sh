#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

usage() {
  cat <<'EOF'
Usage:
  bash tests/run-regression.sh [local|live|all] [playwright args...]

Layers:
  local  Run against a local Python static server. This is the default first layer.
  live   Run against the deployed GitHub Pages URL.
  all    Run local first, then live.

Environment:
  LIVE_BASE_URL              Override the live URL.
  REGRESSION_PORT            Override the local server port.
  PLAYWRIGHT_TEST_VERSION    Override the pinned Playwright Test version.
  PLAYWRIGHT_INSTALL_BROWSERS=skip  Skip browser installation.

Examples:
  bash tests/run-regression.sh
  bash tests/run-regression.sh local
  bash tests/run-regression.sh live
  bash tests/run-regression.sh all
  LIVE_BASE_URL="https://example.com/project/" bash tests/run-regression.sh live
EOF
}

layer="local"
if [[ $# -gt 0 ]]; then
  case "$1" in
    local|live|all)
      layer="$1"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
  esac
fi

if [[ "${layer}" == "all" ]]; then
  bash tests/run-regression.sh local "$@"
  bash tests/run-regression.sh live "$@"
  exit 0
fi

if ! command -v node >/dev/null 2>&1; then
  echo "node is required to run Playwright regression tests." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required to install the isolated pinned Playwright Test runner." >&2
  exit 1
fi

if [[ "${layer}" == "local" ]] && ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required to serve the static site for local regression tests." >&2
  exit 1
fi

if [[ "${layer}" != "local" && "${layer}" != "live" ]]; then
  echo "Unknown regression layer: ${layer}" >&2
  usage >&2
  exit 1
fi

PLAYWRIGHT_TEST_VERSION="${PLAYWRIGHT_TEST_VERSION:-1.61.1}"
export PLAYWRIGHT_HTML_OPEN="${PLAYWRIGHT_HTML_OPEN:-never}"
export REGRESSION_LAYER="${layer}"

if [[ "${layer}" == "live" ]]; then
  export REGRESSION_BASE_URL="${LIVE_BASE_URL:-https://joeywilkes12.github.io/4amj-genealogy/}"
else
  unset REGRESSION_BASE_URL
fi

RUNNER_DIR=".test-results/runner"
RUNNER_BIN="${RUNNER_DIR}/node_modules/.bin/playwright"
RUNNER_NODE_MODULES="${RUNNER_DIR}/node_modules"

cleanup() {
  if [[ -L node_modules ]] && [[ "$(readlink node_modules)" == "${RUNNER_NODE_MODULES}" ]]; then
    rm node_modules
  fi
}

trap cleanup EXIT

mkdir -p "${RUNNER_DIR}"

if [[ ! -x "${RUNNER_BIN}" ]]; then
  npm install \
    --prefix "${RUNNER_DIR}" \
    --package-lock=false \
    --no-save \
    --no-audit \
    --no-fund \
    "@playwright/test@${PLAYWRIGHT_TEST_VERSION}"
fi

if [[ -L node_modules ]]; then
  rm node_modules
elif [[ -e node_modules ]]; then
  echo "A local node_modules path already exists. Move it aside before running tests." >&2
  exit 1
fi

ln -s "${RUNNER_NODE_MODULES}" node_modules

if [[ "${PLAYWRIGHT_INSTALL_BROWSERS:-auto}" != "skip" ]]; then
  "${RUNNER_BIN}" install chromium
fi

echo "Running ${layer} regression layer"
if [[ "${layer}" == "live" ]]; then
  echo "Target: ${REGRESSION_BASE_URL}"
fi

"${RUNNER_BIN}" test --config tests/playwright.config.mjs "$@"
