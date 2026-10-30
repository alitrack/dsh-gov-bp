# Full headless e2e against the real dsh runtime.
#
# Proves the skills are actually reachable by a model through the real skill
# registry — not just by our unit tests. Needs no API key: the agent talks to a
# LOCAL OpenAI-compatible endpoint (see local-model-overlay.yml).
#
# Usage: bash tests/e2e/run_e2e.sh

set -eu

PLUGIN="$(cd "$(dirname "$0")/../.." && pwd)"
PROFILE="${DSH_PROFILE_DIR:-$HOME/.dsh/profiles/headless}"
DSH_VERSION="${DSH_VERSION:-0.2.1-rc.2}"
export LOCAL_QWEN_API_KEY="${LOCAL_QWEN_API_KEY:-local}"

COMPAT="$PROFILE/compatibility.json"
PLUGIN_VERSION="$(node -p "require('$PLUGIN/package.json').version")"
KEY="dsh-gov-bp@${PLUGIN_VERSION}"

# The loader's version gate is a profile-local compatibility.json mapping an
# exact name@version to exact dsh versions (`dsh plugin allow-version` is not a
# real command, despite what the error message suggests).
if ! grep -q "\"$KEY\"" "$COMPAT" 2>/dev/null; then
  echo "granting version exemption: $KEY on dsh $DSH_VERSION"
  printf '{ "%s": ["%s"] }\n' "$KEY" "$DSH_VERSION" > "$COMPAT"
fi

echo "plugin:  $PLUGIN (v$PLUGIN_VERSION)"
echo "profile: $PROFILE"
echo "dsh:     $DSH_VERSION"

cd "$PLUGIN/tests/e2e"
npx --yes "@deepseek-ai/dsh@${DSH_VERSION}" --profile headless \
  --patch "$PLUGIN/tests/e2e/local-overlay.yml" \
  --patch "$PLUGIN/tests/e2e/local-model-overlay.yml" \
  "$(cat "$PLUGIN/tests/e2e/task.txt")"
