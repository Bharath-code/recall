/**
 * Bash Shell Hook Snippet Generator
 */

export function generateBashSnippet(): string {
  return `
# ─── Recall Shell Hook ───────────────────────────────────
# Captures commands for recall. Remove this block to uninstall.
_recall_prompt_command() {
  local exit_code=\$?
  local cmd=\$(HISTTIMEFORMAT= history 1 | sed 's/^[ ]*[0-9]*[ ]*//')

  if [[ -n "\$cmd" && "\$cmd" != "\$_RECALL_LAST_CMD" ]]; then
    _RECALL_LAST_CMD="\$cmd"
    recall hook capture \\
      --raw-command "\$cmd" \\
      --cwd "\$(pwd)" \\
      --shell bash \\
      --exit-code "\$exit_code" \\
      --session-id "\$\$" 2>/dev/null &
    disown 2>/dev/null
  fi
}

if [[ -z "\$_RECALL_INSTALLED" ]]; then
  export _RECALL_INSTALLED=1
  PROMPT_COMMAND="_recall_prompt_command;\${PROMPT_COMMAND:-}"
fi
# ─── End Recall Hook ─────────────────────────────────────
`.trim();
}

export const BASH_EVAL_LINE = 'eval "$(recall hook bash)"';
export const BASH_HOOK_MARKER = '# ─── Recall Shell Hook';
