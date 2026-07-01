# Career & Pricing Research for Recall

**Date:** 2026-06-12  
**Context:** Research covering (1) companies hiring for CLI/DevTools roles in 2026, salary data, and how Recall maps to those roles, and (2) a recommended monetization/pricing strategy for Recall.

---

## Part 1: CLI Engineer & DevTools Job Market — 2026

### The Landscape

Three macro trends driving demand:

1. **AI integration into CLI workflows** — companies need engineers who build tools that interface with LLMs
2. **Platform Engineering maturity** — DevEx is now a dedicated discipline with budget
3. **Security guardrails for AI-generated code** — new category of CLI-based security tooling

### Companies Hiring for CLI/DevTools Roles

#### Tier 1: Direct CLI & Terminal Focus

| Company | What they build | Hiring for | Why Recall fits |
|---------|---------------|------------|----------------|
| **Warp** | AI-native terminal (raised $50M) | CLI engineers, terminal infrastructure | Shell hook + capture engine directly relevant to terminal internals |
| **Fig (AWS)** | Terminal autocomplete | Platform engineers (post-acquisition) | Command completion and shell integration expertise |
| **HashiCorp** | Terraform, Vault, Consul CLI | Platform engineers | All products are CLI-first, multi-language |
| **Docker** | Docker CLI, Docker AI | CLI engineers | Container orchestration CLI, shell interaction |

#### Tier 2: Developer Platforms

| Company | What they build | Hiring for | Why Recall fits |
|---------|---------------|------------|----------------|
| **GitHub** | GitHub CLI (`gh`), Copilot | DevEx engineers | CLI architecture, shell completions, git integration |
| **GitLab** | GitLab CLI, DevSecOps | Platform engineers | CLI design, CI/CD pipeline engineering |
| **Vercel** | Vercel CLI, Next.js tooling | Platform engineers | Build tooling, deployment CLI, edge infrastructure |
| **Netlify** | Netlify CLI | DevEx engineers | Deployment CLI, composable web infrastructure |
| **Linear** | Project management (API-first) | Product engineers (CLI focus) | API-first design, developer UX |

#### Tier 3: Cloud & Infrastructure

| Company | What they build | Hiring for | Why Recall fits |
|---------|---------------|------------|----------------|
| **AWS** | AWS CLI, CDK | SDK/CLI team | Massive-scale CLI, TypeScript SDKs |
| **Google Cloud** | gcloud CLI | Developer tools team | Multi-language CLI architecture |
| **Azure** | Azure CLI | CLI engineering | Cross-platform CLI tooling |
| **Cloudflare** | Wrangler CLI, Workers | Workers platform team | CLI-first deployment, edge computing |
| **Railway** | Railway CLI | Platform engineers | Ephemeral environments, deployment UX |

#### Tier 4: AI-Native Tooling

| Company | What they build | Hiring for | Why Recall fits |
|---------|---------------|------------|----------------|
| **Cursor** | AI IDE | Infrastructure/platform | Terminal integration, process management |
| **Replit** | AI-powered development | Platform engineering | Environment management, shell/terminal systems |
| **Anthropic** | AI tooling | Developer experience | Agent infrastructure, CLI tool orchestration |
| **Daytona** | Dev environments as code | Platform engineers | Environment orchestration, CLI-first |

### Salary Ranges (2026, US-based)

| Level | Base Salary | Total Compensation (inc. equity) |
|-------|-------------|--------------------------------|
| Mid-level (3-5 yrs) | $160K - $200K | $200K - $280K |
| Senior (5-8 yrs) | $200K - $250K | $300K - $450K |
| Staff (8+ yrs) | $250K - $300K | $400K - $600K+ |

Remote roles typically pay 10-20% less than SF/NYC.

### Skills Most in Demand

1. **AI/LLM integration** — building CLI tools that use AI (`recall ask` counts here)
2. **Rust or Go** (CLI performance languages) — Bun/TypeScript increasingly accepted
3. **Shell internals** — zsh preexec/precmd, bash PROMPT_COMMAND, process management
4. **Unix/Linux systems** — signals, file descriptors, process lifecycle
5. **Developer UX** — colors, spinners, error messages, onboarding flow
6. **Database engineering** — SQLite, FTS5, migration patterns
7. **Security-conscious design** — secret redaction, path validation, local-first architecture

### How Recall Maps to These Skills

| Recall feature | Skill it demonstrates | Relevant roles |
|---------------|----------------------|----------------|
| Shell hooks (zsh precmd/precmd, bash PROMPT_COMMAND) | Shell internals, process lifecycle | Any CLI role |
| CAC CLI framework, 25+ commands, shell completions | CLI architecture, developer UX | DevEx, Platform |
| SQLite schema, FTS5 search, 100K command benchmarks | Database engineering | Infrastructure |
| AI adapter pattern (`recall ask`, embedder abstraction) | AI/LLM integration | AI tooling |
| Secret redaction, path traversal prevention | Security-conscious design | Platform, Security |
| 202+ unit tests, clean architecture | Engineering quality | All roles |

### How to Apply

Target specific teams:

| Company | Team to target | Job title keywords |
|---------|---------------|-------------------|
| GitHub | CLI team (maintains `gh`) | "CLI Engineer", "DevEx Engineer" |
| Vercel | Platform DX team | "Platform Engineer", "Developer Experience" |
| HashiCorp | CLI + SDK teams | "Software Engineer - CLI" |
| Docker | CLI team | "CLI Engineer", "Developer Tools" |
| Warp | Terminal infrastructure | "Systems Engineer", "Terminal Platform" |
| AWS | AWS CLI / CDK teams | "Software Engineer - Developer Tools" |
| Google Cloud | gcloud CLI team | "Software Engineer - Cloud SDK" |

### Best Channels for Finding These Roles

- **Levels.fyi** — compensation data and comparisons
- **LinkedIn** — search "Developer Experience Engineer" or "Platform Engineer CLI"
- **Hacker News "Who is hiring?"** threads — many DevTools startups post here
- **GitHub jobs board** — specific to the GitHub ecosystem
- **DevTools-specific job boards** — devtoolsjobs.com, platformengineeringjobs.com

---

## Part 2: Recommended Pricing & Monetization Strategy for Recall

### Guiding Principles

1. **CLI is free forever** — It's the adoption funnel, not the revenue source
2. **Privacy is the moat** — Local-first trust is Recall's strongest differentiator against Atuin, Warp, etc.
3. **Monetize team features, not individual utility** — Individual devs won't pay for a CLI; teams will pay for shared context
4. **Keep it lean** — No GUI, no desktop app, no cloud infrastructure until validated

### Recommended Pricing Tiers

#### Tier 1: Free (individual developer)

Everything Recall does today:
- Capture, search, project memory, tool detection
- AI features (bring your own API key)
- Local-only, no sync
- All privacy controls

**Goal:** Maximum adoption. Zero friction. Build the habit.

#### Tier 2: Pro — $4–6/month or $40–60/year

- **Encrypted sync across machines** — commands available on work + personal laptop
- **Bundled AI** — semantic search with included API credits (no need to bring your own key)
- **Priority support**

**Target:** Individual developers with multiple machines. The sync pain point is real (Atuin validates this).

#### Tier 3: Team — $8–12/seat/month

- **Shared workflow libraries** — detect and share the deployment sequence across the team
- **Onboarding packs** — new hires get "here's how we run this project" from day one
- **Team-wide command discovery** — "what commands does everyone run for deployment?"
- **Audit trail** — who ran what, when, with compliance exports
- **Private workspace** — team patterns stay within team

**Target:** Engineering teams at startups and mid-size companies. Dev tool budgets are $50-200/seat/year.

### Pricing Comparison Table

| Product | Free tier | Paid tier | Price |
|---------|-----------|-----------|-------|
| **Recall** (proposed) | Full CLI, local-only | Sync + AI credits | $4-6/mo individual, $8-12/seat team |
| **Atuin** | Full CLI + hosted sync | None yet (Sponsors only) | $0 |
| **Warp** | Terminal + basic AI | Warp AI Pro | ~$10-15/mo |
| **GitHub Copilot** | Limited | Individual/Team | $10-19/mo |
| **Obsidian** | Full app | Sync | $5/mo (individual sync) |
| **Linear** | N/A | Team | $8-14/seat/mo |

### What Not to Build

| Don't build | Why |
|-------------|-----|
| GUI/Desktop app | Huge engineering cost, Atuin is already doing it. Stay CLI. |
| Free hosted sync | Atuin offers this for free. Competing on free sync is a race to zero. |
| Enterprise features pre-PMF | Don't build for hypothetical enterprise customers before you have 100 paying users. |
| Self-hosted server (initially) | Atuin has this and it doesn't generate revenue. Add later as goodwill. |

### Revenue Projection (Very Rough)

| Milestone | Users | Paying % | ARR |
|-----------|-------|----------|-----|
| Launch | 100 | 0% | $0 |
| Early traction | 1,000 | 2% ($5 avg) | $1,200 |
| Growth | 10,000 | 3% ($5 avg) | $18,000 |
| Team adoption | 50 teams × 8 seats | 100% ($10/seat) | $48,000 |
| Scaling | 100K users + 200 teams | Mixed | $200K-$500K |

This is before any funding. At $200K ARR, you can go full-time on Recall.

### Key Metrics to Track

| Metric | Why | Target |
|--------|-----|--------|
| Daily active users | Real engagement, not just installs | >30% of total installs |
| Commands captured/day | Core metric — is the habit forming? | >10/user/day |
| Search queries/user | Value metric — are they actually finding things? | >3/user/week |
| Sync requests/day | Infrastructure cost + engagement | Track for Pro tier costing |
| Team workspace creation | Team adoption signal | >5/quarter initially |
