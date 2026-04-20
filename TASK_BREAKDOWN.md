# Recall Implementation Task Breakdown

This document breaks down the implementation tasks from fix_v2.md into actionable items.

## Phase 1: Ship-Next (1-2 weeks) - COMPLETED

### 1.1 Fix `recall init` Quick Commands ✅
**Status**: Completed
**File**: `src/cli/init.ts`
**Changes**:
- Modified init to check `RECALL_EXPERIMENTAL` environment variable
- Experimental commands (`ask`, `fix`) now only show when enabled
- Added "Experimental commands:" section with clear labeling
**Testing**: Run `recall init` with and without `RECALL_EXPERIMENTAL=1`

### 1.2 Fix `recall doctor` PATH Check ✅
**Status**: Completed
**File**: `src/cli/doctor.ts`
**Changes**:
- Removed meaningless `binaryFound` check (was always true)
- Added actual PATH detection using `which recall` (macOS/Linux) or `where recall` (Windows)
- Shows actual PATH location if found
- Increments issue count if not in PATH
**Testing**: Run `recall doctor` to verify PATH detection works

### 1.3 Wire `show_icons` Config ✅
**Status**: Completed
**Files**: `src/index.ts`, `src/config/index.ts`
**Changes**:
- Load config on startup in `src/index.ts`
- Check `show_icons` config value
- Call `setIconsEnabled(false)` if config is false
- CLI flag `--no-icons` overrides config (flag takes precedence)
**Testing**: Set `show_icons: false` in config and verify icons are disabled

### 1.4 Add Export Command ✅
**Status**: Completed
**Files**: `src/cli/export.ts` (new), `src/db/commands.ts`, `src/db/repos.ts`
**Changes**:
- Created `src/cli/export.ts` with `handleExport` function
- Added `getAllCommands()` to `src/db/commands.ts`
- Added `getAllRepos()` to `src/db/repos.ts`
- Export format: JSON with version, exported_at, commands, repos, tools
- Supports `--format json` (default) and `--output <path>`
- Registered command in `src/index.ts`
**Testing**: Run `recall export` and verify JSON output

### 1.5 Add Import Command ✅
**Status**: Completed
**File**: `src/cli/import.ts` (new)
**Changes**:
- Created `src/cli/import.ts` with `handleImport` function
- Supports Recall JSON export format
- Supports shell history files (zsh, bash)
- Auto-detects format based on file extension/content
- Deduplicates against existing commands (last 1000)
- Shows import summary statistics
- Registered command in `src/index.ts`
**Testing**: Export and re-import to verify data integrity

### 1.6 Add Interactive Picker ✅
**Status**: Completed
**File**: `src/cli/pick.ts` (new)
**Changes**:
- Created `src/cli/pick.ts` with `handlePick` function
- Simple in-terminal picker with arrow-key navigation (no external dependencies)
- Shows command, relative timestamp
- Execute on Enter, cancel with Ctrl+C or q
- Supports `--repo <hash>`, `--failed-only`, `--query <query>` filters
- Shows scrollbar indicator for large lists
- Registered command in `src/index.ts`
**Testing**: Run `recall pick` and verify navigation works

### 1.7 Add Ctrl-R Binding ✅
**Status**: Completed
**Files**: `src/cli/hook.ts`
**Changes**:
- Added `handleBindCtrlR()` function to install widget
- Added `handleUnbindCtrlR()` function to remove widget
- Created `generateZshCtrlRWidget()` for zsh
- Created `generateBashCtrlRWidget()` for bash
- Uses marker comments for idempotent detection
- Registered as `recall hook bind-ctrl-r` and `recall hook unbind-ctrl-r`
**Testing**: Run `recall hook bind-ctrl-r` and verify Ctrl-R invokes picker

## Phase 2: Enhancement (2-4 weeks) - COMPLETED

### 2.1 Trust Features: Pause/Resume ✅
**Status**: Completed
**Files**: `src/cli/pause.ts` (new), `src/cli/resume.ts` (new)
**Changes**:
- Created `src/cli/pause.ts` with `handlePause` function
- Created `src/cli/resume.ts` with `handleResume` function
- Both commands check current state before acting
- Use `updateConfig({ capture_enabled: false/true })`
- Registered both commands in `src/index.ts`
**Testing**: Run `recall pause` and `recall resume` to verify config changes

### 2.2 Trust Features: Enhanced Doctor ✅
**Status**: Completed
**File**: `src/cli/doctor.ts`
**Changes**:
- Added Check 7: Privacy settings
- Shows `capture_enabled` status with hint to run `recall resume`
- Shows `redact_secrets` status with warning if disabled
- Shows ignored patterns list (or "No ignored patterns")
- Increments issue count if redaction is disabled
**Testing**: Run `recall doctor` and verify privacy settings display

### 2.3 Golden Path Onboarding ✅
**Status**: Completed
**File**: `src/cli/init.ts`
**Changes**:
- Added "Try it out!" section after privacy note
- Suggests 3 simple commands: `ls`, `pwd`, `echo "hello"`
- Guides user to run `recall recent` after
- Provides tight feedback loop for immediate value
**Testing**: Run `recall init` and verify onboarding message appears

### 2.4 Enhanced Project Memory ✅
**Status**: Completed
**Files**: `src/db/commands.ts`, `src/workflows/detector.ts`, `src/cli/project.ts`
**Changes**:
- Added session tracking queries to `src/db/commands.ts`:
  - `getCommandsByRepo()` - Get commands for a specific repo
  - `getSessionsByRepo()` - Get all sessions for a repo
  - `getStartupCommands()` - Get first N commands per session, sorted by frequency
  - `getSuccessfulCommandsByRepo()` - Get successful commands for a repo
  - `getFailedCommandsByRepo()` - Get failed commands for a repo
- Enhanced `src/workflows/detector.ts`:
  - Added `last_used` field to `DetectedWorkflow` interface
  - Added `detectCommonWorkflows()` function to find recurring command sequences
  - Analyzes command sequences in repo context
  - Finds top 3-5 recurring patterns with frequency and last used timestamp
- Enhanced `src/cli/project.ts`:
  - Shows startup commands (first commands per session)
  - Shows common workflows with frequency and last used time
  - Shows recent failures with exit codes
  - Shows last known good command when failures exist
  - Generates copyable runbook snippet combining startup commands and most common workflow
**Testing**: Run `recall project` in a git repo with captured commands to verify all sections display correctly

## Phase 3: AI Layer (Future) - NOT STARTED

**Note**: Per plan, AI features should only be implemented after "dumb but magical" UX is dominant. Current implementation keeps AI features gated behind `RECALL_EXPERIMENTAL=1`.

### 3.1 Optional AI Features
**Status**: Not started (gated)
**Approach**: Keep `RECALL_EXPERIMENTAL=1` for AI features
**Files**: Already exist (ask.ts, fix.ts, embed.ts)
**Note**: Ensure all CLI commands work without AI. AI features are enhancements, not requirements.

## Testing Checklist

- [ ] Run `bun test` to verify all existing tests pass
- [ ] Run `recall init` without `RECALL_EXPERIMENTAL` - verify no experimental commands shown
- [ ] Run `RECALL_EXPERIMENTAL=1 recall init` - verify experimental commands shown
- [ ] Run `recall doctor` - verify PATH detection works
- [ ] Set `show_icons: false` in config - verify icons disabled
- [ ] Run `recall export` - verify JSON output valid
- [ ] Run `recall import --file recall-export.json` - verify import works
- [ ] Run `recall pick` - verify navigation and selection
- [ ] Run `recall hook bind-ctrl-r` - verify widget installed
- [ ] Run `recall pause` - verify capture disabled
- [ ] Run `recall resume` - verify capture enabled
- [ ] Run `recall doctor` - verify privacy settings shown
- [ ] Run `recall init` - verify onboarding message shown
- [ ] Run `recall project` in git repo - verify startup commands display
- [ ] Run `recall project` in git repo - verify workflows display
- [ ] Run `recall project` in git repo - verify failures and last known good display
- [ ] Run `recall project` in git repo - verify runbook snippet generates

## Files Modified/Created

**Modified**:
- `src/cli/init.ts`
- `src/cli/doctor.ts`
- `src/index.ts`
- `src/config/index.ts`
- `src/db/commands.ts`
- `src/db/repos.ts`
- `src/cli/hook.ts`
- `src/workflows/detector.ts`
- `src/cli/project.ts`

**Created**:
- `src/cli/export.ts`
- `src/cli/import.ts`
- `src/cli/pick.ts`
- `src/cli/pause.ts`
- `src/cli/resume.ts`

## Next Steps

1. Run full test suite to ensure no regressions
2. Manually test each new feature
3. Update documentation if needed
4. Phase 3 (AI Layer) is gated behind `RECALL_EXPERIMENTAL=1` and should only be implemented after "dumb but magical" UX is dominant
