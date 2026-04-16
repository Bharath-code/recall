/**
 * Zsh Shell Hook Snippet Generator
 *
 * Generates the zsh preexec/precmd hooks that pipe command data to recall.
 */

export function generateZshSnippet(): string {
  return `
# ─── Recall Shell Hook ───────────────────────────────────
# Captures commands for recall. Remove this block to uninstall.
_recall_preexec() {
  export _RECALL_CMD_START=\$(date +%s%3N 2>/dev/null || python3 -c "import time; print(int(time.time()*1000))")
  export _RECALL_RAW_CMD="\$1"
  export _RECALL_CWD="\$(pwd)"
  _RECALL_CMD_ID=\$(recall hook capture \\
    --raw-command "\$1" \\
    --cwd "\$(pwd)" \\
    --shell zsh \\
    --start-time "\$_RECALL_CMD_START" \\
    --session-id "\$\$" 2>/dev/null)
  export _RECALL_CMD_ID
}

_recall_precmd() {
  local exit_code=\$?
  if [[ -n "\$_RECALL_CMD_ID" ]]; then
    local now=\$(date +%s%3N 2>/dev/null || python3 -c "import time; print(int(time.time()*1000))")
    local duration=\$(( now - _RECALL_CMD_START ))
    recall hook update \\
      --command-id "\$_RECALL_CMD_ID" \\
      --exit-code "\$exit_code" \\
      --duration-ms "\$duration" 2>/dev/null
    unset _RECALL_CMD_ID _RECALL_CMD_START _RECALL_RAW_CMD _RECALL_CWD
  fi
}

autoload -Uz add-zsh-hook
add-zsh-hook preexec _recall_preexec
add-zsh-hook precmd _recall_precmd
# ─── End Recall Hook ─────────────────────────────────────
`.trim();
}

export const ZSH_EVAL_LINE = 'eval "$(recall hook zsh)"';
export const ZSH_HOOK_MARKER = '# ─── Recall Shell Hook';
