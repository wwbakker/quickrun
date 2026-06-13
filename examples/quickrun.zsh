# quickrun zsh integration
#
# Usage:
# 1. Ensure the quickrun-ts CLI is on your PATH, or adjust the command below.
# 2. Source this file from ~/.zshrc, or copy the function into ~/.zshrc.
# 3. Run `qr` to open the selector and execute the chosen command in the current shell.
#
# Note: this uses eval on the emitted command string, so only use commands you trust.

qr() {
  local cmd
  cmd="$(quickrun-ts)" || return
  [[ -z "$cmd" ]] && return
  eval "$cmd"
}
