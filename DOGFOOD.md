# Recall Dogfood Guide

Recall is currently aimed at Mac developers using zsh. The first dogfood goal is simple: install locally, capture commands reliably, and recall them by keyword or project.

## Build

```bash
bun install
bun test
bun run lint
bun run build
```

The compiled binary is written to `bin/recall`. The dogfood scripts run the TypeScript entrypoint by default for maximum local compatibility; set `RECALL_USE_BIN=1` to force them to use `bin/recall`.

## Try Without Touching Your Shell

Run the disposable demo:

```bash
bash scripts/demo-dogfood.sh
```

It creates a temporary `HOME`, captures sample commands, runs `recent`, `search`, `project`, `ignore`, and `delete`, then removes the temp data.

## Smoke Test zsh Hook Install

```bash
bash scripts/smoke-zsh.sh
```

This uses temporary `HOME` and `ZDOTDIR` directories, so it does not edit your real `.zshrc`.

## Real Local Use

```bash
./bin/recall init
eval "$(./bin/recall hook zsh)"
```

Privacy controls:

```bash
recall config --set capture_enabled=false
recall ignore add "secret"
recall ignore list
recall delete --all --yes
```

Experimental commands are hidden by default. To inspect them:

```bash
RECALL_EXPERIMENTAL=1 recall --help
```
