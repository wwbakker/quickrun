# quickrun zsh integration backed by `bun run`
#
# This variant runs quickrun directly from the repository source on every invocation,
# so code changes are picked up the next time `qr` runs.
#
# Usage:
# 1. Source this file from ~/.zshrc, or copy the function into ~/.zshrc.
# 2. If you source this file directly, QUICKRUN_REPO_DIR is auto-detected.
# 3. If you copy the function instead, set QUICKRUN_REPO_DIR to the repo root.
# 4. Run `qr` to open the selector and execute the chosen command in the current shell.
#
# Note: this uses eval on the emitted command string, so only use commands you trust.

if [[ -z "${QUICKRUN_REPO_DIR:-}" ]]; then
  typeset -g QUICKRUN_REPO_DIR="${${${(%):-%N}:A}:h:h}"
fi

qr() {
  local cmd
  cmd="$(bun run "$QUICKRUN_REPO_DIR/index.ts")" || return
  [[ -z "$cmd" ]] && return
  eval "$cmd"
}
