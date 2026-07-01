# Job Application Materials — DevEx/CLI Engineer

**Date:** 2026-06-12  
**Targets:** GitHub (CLI / Client Apps team) · Warp (Terminal Infrastructure / DevEx)  
**Portfolio anchor:** Recall — open-source CLI tool (Bun, TypeScript, SQLite)

---

## Part 1: Resume Bullet Points

Use these on your resume under the Recall project. Tailor which ones you include based on the role.

### Core (use for all applications)

- Built an open-source CLI tool (Recall) from scratch — 25+ commands, shell hooks (zsh precmd/preexec, bash PROMPT_COMMAND), SQLite storage, FTS5 search — handling 100K+ commands with sub-millisecond capture latency
- Designed CLI architecture with CAC framework, shell completions (zsh + bash), interactive wizards, and a semantic color/icon design system optimized for developer UX
- Implemented AI semantic search with a provider-agnostic adapter pattern (OpenAI, Google, Cohere, Ollama) — enabling natural language querying of command history with graceful fallback to keyword search
- Achieved 202+ unit tests covering edge cases in command normalization, history parsing, secret redaction, and database operations — 100% deterministic, verified in CI
- Engineered privacy-first architecture: local-only SQLite storage, no telemetry, opt-in AI, configurable secret redaction, and path traversal security — differentiating against cloud-first competitors

### GitHub-specific

- Built git-aware functionality (repo detection via `git rev-parse`, per-repo command context, startup sequence detection) — directly relevant to gh CLI's repo-centric workflow
- Designed and shipped shell completions for zsh (`_arguments -C` state machine) and bash (`complete -F` pattern) — matches GitHub CLI's completion architecture
- Implemented command normalization with edge case handling (tilde expansion, whitespace collapsing, quoted-string preservation) — similar to how gh normalizes user input across platforms
- Open-source project with public GitHub repository, contributing guide, and community engagement model aligned with GitHub's engineering culture

### Warp-specific

- Built shell hook infrastructure that intercepts command execution at the process level (zsh preexec/precmd, bash PROMPT_COMMAND) — directly relevant to terminal emulator internals
- Engineered sub-millisecond capture latency with zero impact on shell responsiveness — systems-level performance mindset matching Warp's focus on speed
- Designed AI integration layer with provider abstraction, timeout protection, and graceful degradation — relevant to Warp's shift toward agentic development environments
- Implemented session tracking, command timing (duration_ms), and exit code capture — telemetry infrastructure similar to what a modern terminal needs

---

## Part 2: Cover Letter — GitHub (CLI / Client Apps Team)

**Target role:** Software Engineer — Developer Experience / Client Apps  
**GitHub CLI is built in Go. Note:** Recall is in TypeScript/Bun, but the architecture and design experience transfers. Highlight systems thinking, not language matching.

---

Dear GitHub CLI Team,

I've been a daily user of `gh` for three years. It's the tool that made me realize a CLI can replace an entire browser workflow — and it's what inspired me to build Recall, an open-source command memory tool that I'd love to discuss with your team.

**What I built**

Recall is a local-first CLI that captures shell commands with full context (repo, cwd, exit code, duration) and makes them searchable. It handles 100K+ commands with sub-millisecond capture latency, stores everything in local SQLite, and provides AI-powered semantic search through a provider-agnostic adapter.

The project touches the same design space as `gh`:

- **Shell completions:** I built zsh (`_arguments -C` state machine) and bash (`complete -F` pattern) completions — 22 tests verifying every command, option, and flag pairing
- **Shell hook engineering:** zsh preexec/precmd and bash PROMPT_COMMAND hooks that capture commands without breaking terminal sessions — the same problem space any CLI tool operating at the shell level must solve
- **Developer UX design:** Semantic colors, icons, spinners, error messages, and interactive wizards — treating the terminal as a UI that can be delightful, not just functional
- **API-first architecture:** 202+ unit tests, clean module boundaries, and a provider abstraction layer that lets users swap AI backends without changing their workflow

**Why I'm interested in GitHub**

GitHub CLI (`gh`) set the standard for what a modern developer CLI should be — fast, focused, and deeply integrated with the platform it serves. The recent work on making `gh` agent-friendly, improving accessibility, and extending its workflow capabilities is exactly the kind of engineering I want to contribute to.

Your team's philosophy of "dogfooding" your own tools resonates with me — I use Recall every day and have fixed countless bugs and UX issues because I feel the pain firsthand. That feedback loop is what makes great developer tools.

**What I'd bring**

- Deep understanding of CLI architecture, shell internals, and developer workflow design
- Experience shipping an open-source project with a public repository, tests, and community contributions
- A product-minded approach to engineering — every feature starts with "what does the developer actually need?"
- Fluency in TypeScript/Bun with willingness to ramp on Go (I've studied `gh`'s codebase and understand the command pattern and extension system)

I'd love to talk about what your team is working on — whether it's extending `gh`'s agent capabilities, improving the extension system, or making CLI workflows more accessible.

Best,
Bharath

---

## Part 3: Cover Letter — Warp (Terminal Infrastructure / DevEx)

**Target role:** Software Engineer — Terminal Infrastructure or Developer Experience  
**Warp's core is Rust. Recall is TypeScript/Bun.** Focus on systems thinking, terminal internals understanding, developer empathy, and AI integration experience.

---

Dear Warp Team,

I've been following Warp since your early beta. What you've done with the terminal — making it collaborative, AI-native, and genuinely faster — is the kind of rethinking that the terminal ecosystem has needed for decades. I want to help build it.

**What I built**

I created Recall, an open-source CLI tool that captures shell commands with rich context and makes them searchable. It's a local-first developer memory layer that handles 100K+ commands with sub-millisecond latency.

The project forced me to deeply understand the systems Recall interacts with:

- **Shell internals:** I engineered zsh preexec/precmd and bash PROMPT_COMMAND hooks that intercept command execution at the process level — capturing raw command, working directory, exit code, and duration without breaking terminal sessions or introducing perceptible latency
- **Performance engineering:** Sub-millisecond hook latency, FTS5 search in 4-15ms at 100K rows, import throughput of 20K commands/second — every operation benchmarked and optimized
- **AI integration:** Built a provider-agnostic semantic search layer (OpenAI, Google, Cohere, Ollama) with timeout protection, graceful degradation, and bring-your-own-key model — designed for the same kind of AI-native experience Warp champions
- **Developer UX as product:** Designed a CLI with 25+ commands, interactive wizards, shell completions, and a semantic design system — treating the terminal as a first-class UI

**Why I'm interested in Warp**

Warp is redefining what a terminal can be. The shift toward agentic workflows, the focus on collaboration, and the obsession with performance — these are the same principles I've applied to Recall, but at a fundamentally deeper level of the stack.

Your remote-first culture, product-minded engineering approach, and investment in AI-native developer tooling make Warp the place where I can have the most impact. I'm specifically drawn to the terminal infrastructure work — the low-level systems engineering that makes everything else possible.

**What I'd bring**

- Deep knowledge of shell internals (zsh, bash, process lifecycle, TTYs) and CLI architecture
- Experience building AI-integrated developer tools with pragmatic design (provider abstraction, graceful degradation, user choice)
- A systems-level performance mindset — measuring before optimizing, understanding the full stack from hardware to user
- Strong opinions on developer UX backed by 200+ tests and real user feedback from an open-source project

I'd love to talk about what your team is working on — whether it's terminal infrastructure, the AI layer, or the developer experience that makes Warp feel different.

Best,
Bharath

---

## Part 4: Interview Prep Notes

### For GitHub

| What to study | Why |
|---------------|-----|
| [`cli/cli` repo](https://github.com/cli/cli) — read the command pattern, extension system, how they handle flags | Your interview will reference this codebase |
| [GitHub CLI manual](https://cli.github.com/manual/) — know every command and flag | Shows genuine interest and usage |
| Go syntax and patterns (if you don't already know it) | gh is written in Go; expect to read/discuss it |
| Their take-home interview format | GitHub uses real coding tasks, not LeetCode |
| [Engineering blog posts on DevEx](https://github.blog/category/engineering/) | Shows you've done your research |

**Sample talking points:**
- "I noticed `gh` recently added [feature X]. I think this pattern could be applied to..."
- "In Recall, I solved [similar problem] by [approach]. I'm curious how you handle it in `gh`."
- "One thing I'd love to work on is making `gh` more extensible for team workflows..."

### For Warp

| What to study | Why |
|---------------|-----|
| [Warp docs](https://docs.warp.dev/) — understand the product deeply | Shows genuine interest |
| Rust basics (even if you don't know it well) | Warp's core is Rust; show willingness to learn |
| Terminal emulator internals (pty, terminfo, escape sequences) | The deeper your systems knowledge, the better |
| AI features in Warp (Warp AI, agent mode) | Relevant to your `recall ask` experience |
| [levels.fyi comp data](https://levels.fyi/companies/warp) | Know your market value |

**Sample talking points:**
- "I've been thinking about how shell history could be a foundation for agentic workflows..."
- "In Recall, I built a provider-agnostic AI layer. I see parallels with how Warp handles..."
- "One challenge I'd love to tackle is making the terminal collaborative without sacrificing performance..."

---

## Part 5: Application Strategy

### Where to Apply

| Company | Portal | Keywords to search |
|---------|--------|-------------------|
| GitHub | [github.careers](https://github.careers/) | "Client Apps", "Developer Experience", "Platform Engineer" |
| Warp | [warp.dev/careers](https://warp.dev/careers) | "Software Engineer", "Infrastructure" |

### Timeline

1. **Week 1:** Polish Recall's README, add screenshots/GIFs, ensure all tests pass visibly
2. **Week 2:** Apply to both companies. If no specific role is listed, apply to general engineering and note CLI/DevEx focus in cover letter
3. **Week 3:** Follow up via LinkedIn (find engineering managers on the CLI or DevEx teams)
4. **Week 4:** If no response, contribute to `cli/cli` (GitHub) or engage with Warp community (Discord, GitHub issues) to build visibility

### Networking Strategy

- **GitHub:** Find and follow engineers who commit to `cli/cli`. Engage thoughtfully with their issues and PRs before applying
- **Warp:** Join their [Discord community](https://discord.gg/warp). Participate in discussions about terminal workflows, AI features, and developer experience
- **Both:** Share Recall on Twitter/X with a demo. Tag @github and @warpdotdev. Building in public creates organic visibility

### Salary Expectations

| Company | Mid-Level | Senior | Staff |
|---------|-----------|--------|-------|
| GitHub | $180-220K base, ~$280-350K TC | $220-260K base, ~$350-450K TC | $260-300K base, ~$450-600K TC |
| Warp | $170-210K base, ~$250-320K TC | $200-250K base, ~$300-400K TC | $250-290K base, ~$400-550K TC |

*Remote roles typically 10-20% lower. Always negotiate.*
