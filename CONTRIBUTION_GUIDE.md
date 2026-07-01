# Contribution to cli/cli — Issue #13012

**Issue:** [Can't Download Non-Zipped Artifacts](https://github.com/cli/cli/issues/13012)  
**File changed:** `pkg/cmd/run/download/http.go`  
**Location on disk:** `/Users/bharath/Desktop/on-going-projects/gh-cli/`

---

## Problem

When a GitHub Actions workflow uploads an artifact with `archive: false`, `gh run download` fails with:

```
error downloading <artifact>: error extracting zip archive: zip: not a valid zip file
```

The CLI assumes all artifacts are zip files and tries to extract them unconditionally.

## Solution

Modified `downloadArtifact` to gracefully handle non-archived artifacts:

1. **Download to temp file** (changed pattern from `gh-artifact.*.zip` to `gh-artifact.*`)
2. **Try `zip.NewReader`** — if it succeeds, extract as zip (existing behavior)
3. **If `zip.NewReader` fails** — the artifact is raw (not zipped). Copy it directly to the destination directory using the filename from the `Content-Disposition` response header.

This matches the maintainer's guidance: *"unarchived artifacts should be downloaded as if `-n` had been passed."*

## How to Submit

### Step 1: Create your fork

```bash
# Go to https://github.com/cli/cli and click "Fork" in the top-right

# Add your fork as a remote
cd /Users/bharath/Desktop/on-going-projects/gh-cli
git remote add myfork https://github.com/<YOUR_USERNAME>/cli.git
```

### Step 2: Commit the change

```bash
git add pkg/cmd/run/download/http.go
git commit -m "fix: handle non-archived artifacts (archive: false) in gh run download

When artifacts are uploaded with archive: false, they are not zip
archives. The current code unconditionally tries to extract them as
zip, which fails with 'not a valid zip file'.

Instead, try zip.NewReader first. If it fails, fall back to treating
the artifact as a raw file — save it directly to the destination
directory using the filename from the Content-Disposition header.

Fixes #13012"
```

### Step 3: Push and open a PR

```bash
git push myfork main
```

Then go to https://github.com/cli/cli/pulls and click "New Pull Request".
Use the "compare across forks" link to select your fork.

### PR Description

```markdown
## What this fixes

`gh run download` fails with `zip: not a valid zip file` when artifacts
were uploaded with `archive: false` (non-archived artifacts).

## How it's fixed

1. Download the artifact to a temp file (no longer assumes .zip extension)
2. Try `zip.NewReader` — if it succeeds, extract as zip (existing behavior)
3. If `zip.NewReader` fails, the artifact is raw — save it directly to the
   destination directory using the filename from the Content-Disposition
   header

This matches the guidance from @williammartin:
> "unarchived artifacts should be downloaded as if -n had been passed"

## Acceptance criteria covered

- **Scenario 1:** Non-archived artifact downloaded as raw file
- **Scenario 2:** Named non-archived artifact downloaded as raw file
- **Zip artifacts unaffected** — they are still extracted as before

Closes #13012
```

### Step 4: Link to Recall in your PR

Once the PR is submitted, update your GitHub profile to link to the PR.
When applying to GitHub, you can reference this PR as evidence of:
- Understanding the `gh` codebase and CLI architecture
- Go proficiency
- Ability to work with the GitHub CLI team's code review process

---

## If the PR needs changes

The maintainers may request changes during review. Common things to address:

1. **Add unit tests** — `rawArtifactFilename` should have tests for Content-Disposition parsing
2. **Keep the commented-out Accept header** — the original `// The server rejects this :(` comment was removed. If asked, you can add it back
3. **Simplify the function signature** — `rawArtifactFilename` takes `*http.Response` but only uses the header; a maintainer may ask you to pass the header value directly instead
