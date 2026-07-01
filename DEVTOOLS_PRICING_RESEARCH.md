# DevTools Pricing Research — Detailed Comparison

**Date:** 2026-06-12  
**Sources:** warp.dev/pricing, linear.app/pricing, obsidian.md/pricing, github.com/pricing, github.com/features/copilot/plans

---

## 1. Warp (AI-Native Terminal)

**Model:** Freemium with AI credits. Terminal is free, AI usage is metered.

### Pricing Tiers

| Tier | Price | Seats | Key Differentiator |
|------|-------|-------|--------------------|
| **Free** | $0/mo | Up to 10 | Modern terminal, limited Warp Agent, limited cloud agents, BYO API key, limited Warp Drive/collaboration |
| **Build** | $18-20/mo | Up to 10 | 1,500 AI credits/mo, full frontier models (OpenAI, Anthropic, Google), unlimited Drive + collab |
| **Max** | $180-200/mo | Up to 10 | 12× the credits of Build (18,000 credits), highest codebase indexing |
| **Business** | $45-50/mo | Up to 25 | Build features + team usage metrics, admin data controls, SAML SSO |
| **Enterprise** | Custom | Unlimited | Self-host agents, custom indexing, dedicated account manager, SLA |

### Key Observations

- **Terminal is free.** All monetization comes from AI features
- **Credit-based AI model** — very common in 2026. $18/mo gets 1,500 credits, $180/mo gets 18,000
- **BYO API key** available on Free tier — users who bring their own LLM key pay $0
- **Warp Drive + collaboration** is the non-AI differentiator, but still locked behind Build tier
- **Trusted by 700,000+ developers** — significant adoption
- **No "Team/Pro" for just terminal features** — the free terminal is genuinely useful without paying

### What This Means for Recall

Warp validates the model: **give the core tool away free, monetize the value-added layer** (for Warp, it's AI credits; for Recall, it could be sync or team features). The credit-based pricing is interesting but adds billing complexity — simpler annual/monthly subscriptions would be easier to start with.

---

## 2. Linear (Project Management for Dev Teams)

**Model:** Per-seat SaaS with free tier capped at 250 issues and 2 teams.

### Pricing Tiers

| Tier | Price | Key Limitations |
|------|-------|-----------------|
| **Free** | $0 | 2 teams, 250 issues, 10MB file upload, no agent automations |
| **Basic** | $10/user/mo (yearly) | 5 teams, unlimited issues, unlimited upload, admin roles |
| **Business** | $16/user/mo (yearly) | Everything + unlimited teams, triage intelligence, Linear Agent (beta), code intelligence, insights, integrations |
| **Enterprise** | Custom | Annual billing only, SAML/SCIM, HIPAA, audit log, dedicated support |

### Key Observations

- **33,000+ companies** use Linear — significant enterprise penetration
- **Free tier is intentionally limited** (250 issues) to force upgrades once teams commit
- **$10/user/mo** is the entry point for serious teams — extremely competitive for what you get
- **Per-seat pricing scales to hundreds of users** — Linear doesn't cap seats until Enterprise
- **AI features (Agent, Code Intelligence)** are Business-tier only — premium features drive upgrades
- **No free trial for paid tiers** — but the free tier is generous enough to evaluate

### What This Means for Recall

Linear shows the power of **per-seat pricing for team features**. At $10/user/mo, a 20-person engineering team pays $2,400/year — easy budget from team tooling allocations. The "limited free tier → upgrade for scale" model works well when the free tool is genuinely useful (like Linear's 250 issues).

---

## 3. Obsidian (Notes / Knowledge Base)

**Model:** Free app, optional paid services (sync, publish). 100% user-supported, no VC.

### Pricing Tiers

| Service | Price | Details |
|---------|-------|---------|
| **Obsidian App** | **$0** | Fully free, no sign-up required, no limits, no telemetry |
| **Sync** | $4-5/user/mo | End-to-end encrypted, cross-device sync, version history, shared vaults |
| **Publish** | $8-10/site/mo | Publish notes to web, custom domain, full-text search |
| **Catalyst** | $25 one-time | Support license, early beta access, community badges |
| **Commercial** | $50/user/year | Commercial use license (optional — not required) |

### Key Observations

- **100% user-supported** — no VC funding, no investor pressure
- **App is completely free** with no feature gates — radical trust model
- **Sync is the main revenue driver** at $5/mo — simple, transparent, E2E encrypted
- **Commercial license is honor-based** — you're not required to pay for commercial use, but encouraged to
- **40% education/nonprofit discount** — good for community goodwill
- **7-day refund policy** — low friction to try paid services

### What This Means for Recall

Obsidian's model is the **closest analog to what Recall should do**: free core tool, paid sync, trust-first approach. Key takeaways:

- **$4-5/mo for sync** is the proven price point for individual developer tools
- **E2E encryption makes the paid tier trustworthy** — Obsidian can't see your notes, just like Recall shouldn't see your commands
- **No feature-gating the core product** — Obsidian's app is fully functional without paying. Radical trust builds loyalty.
- **One-time Catalyst ($25) and Commercial ($50/user/yr) tiers** provide alternative revenue streams without subscriptions
- **No telemetry, no tracking** — Obsidian doesn't collect usage data, which is increasingly a competitive advantage

---

## 4. GitHub Copilot (AI Coding Assistant)

**Model:** Subscription tiers with AI credit pools. Credit-based metering for advanced features.

### Pricing Tiers

| Tier | Price | Credits/mo | Key Features |
|------|-------|-----------|--------------|
| **Free** | $0 | Limited chat + agent | 2,000 completions/mo, Haiku 4.5, GPT-5 mini, Copilot CLI |
| **Pro** | $10/mo | $15 credits | Unlimited completions, cloud agent, code review, 3rd party agents (Claude Code, Codex) |
| **Pro+** | $39/mo | $70 credits | Premium models (Opus), audit logs, 4× Pro's usage |
| **Max** | $100/mo | $200 credits | Priority access to new models, 2.9× Pro+'s usage |
| **Business** | $19/user/mo | — | Team management, org-wide policies, content exclusions |
| **Enterprise** | $39/user/mo | — | SAML/SCIM, IP allowlist, audit log, HIPAA, Copilot in PRs |

### Key Observations

- **Copilot CLI is included in the Free plan** — GitHub is betting that CLI integration drives adoption
- **Credit-based AI pricing** is now standard across all tiers — $15, $70, $200 credits/mo at each level
- **$10/mo for Pro** is the mass-market tier — 50M+ developers are the addressable market
- **4 tiers** is complex but serves different segments: students/hobbyists ($0), professionals ($10), power users ($39-$100), teams ($19/user), enterprises ($39/user)
- **Copilot is a loss leader for GitHub** — the platform (Actions, Packages, etc.) is where GitHub makes money
- **Free plan includes agent mode** — very generous for a free tier
- **Credit pools are shareable org-wide on Max** — the only team-credit feature

### What This Means for Recall

Copilot's model shows that **$10/mo is the sweet spot for individual developer tools**. Key lessons:

- **Free tier must be genuinely useful** — Copilot Free includes agent mode and CLI, not just a demo
- **AI credit-based tiers** are becoming the 2026 standard but add billing complexity
- **Copilot CLI being free** signals that terminal tools are seen as high-adoption, low-monetization vectors
- **Pro at $10/mo, Pro+ at $39/mo** creates clear value tiers — 4× the price for ~4.7× the credits
- **Business/Enterprise ($19-39/user)** is where the real revenue lives
- **Credit pooling for teams** (Max tier only) is a differentiator they're testing

---

## 5. Side-by-Side Comparison

| Dimension | Warp | Linear | Obsidian | GitHub Copilot | **Recall (proposed)** |
|-----------|------|--------|----------|---------------|----------------------|
| **Free tier value** | Full terminal | 250 issues, 2 teams | Full app, unlimited | 2K completions + CLI | Full CLI, local-only |
| **Individual paid** | $18-200/mo (AI credits) | $10/user/mo | $4-5/mo (sync) | $10-100/mo (AI) | **$4-6/mo (sync + AI)** |
| **Team price** | $45-50/user/mo | $16/user/mo | $8-10/site/mo | $19-39/user/mo | **$8-12/seat/mo** |
| **AI included?** | Credit-based | Business tier | No | Credit-based | **Included in Pro** |
| **BYO API key?** | Yes (Free tier) | N/A | N/A | No | **Yes (Free tier)** |
| **Privacy model** | SOC 2, Zero Data Retention | Standard SaaS | E2E encrypted sync | Standard SaaS | **Local-first + E2E** |
| **Open source** | No | No | Core is closed | No | **Yes (MIT)** |
| **Funding** | $73M raised | $47M raised | 100% user-supported | Microsoft-owned | **Bootstrapped** |
| **Users** | 700K+ | 33K+ companies | Millions | 50M+ | **Pre-launch** |

---

## 6. Key Takeaways for Recall

### Pricing Strategy

1. **$4-5/mo for sync** (matching Obsidian) is the proven individual price point. Any higher and you compete with Obsidian/Copilot for wallet share; any lower and revenue per user is too low to sustain.

2. **$8-12/seat for team features** (below Linear's $10-16 and GitHub's $19-39) is aggressive but defensible — Recall targets a narrower use case (command/workflow sharing) so needs to be cheaper than full project management or AI coding tools.

3. **AI credits model is premature.** Warp and Copilot use credits because AI API costs vary per model/usage. Recall's AI costs are lower (embeddings are cheap, and users can BYO key). Simple flat pricing is better at this stage.

4. **Free CLI + paid sync** (Obsidian model) is the right starting point. Don't gate any CLI features behind a paywall.

### Positioning vs. Competitors

| Competitor | Recall's advantage | How to message it |
|------------|-------------------|-------------------|
| **Atuin** ($0) | Repo-aware recall, workflow detection | "Atuin syncs history. Recall understands your project." |
| **Warp** ($18-200/mo) | Local-first, no AI dependency | "Warp is a terminal. Recall is your project's memory." |
| **Obsidian** ($4-5/mo) | Purpose-built for dev workflow | "Obsidian for notes. Recall for commands." |
| **GitHub Copilot** ($10-100/mo) | Command memory, not code generation | "Copilot writes code. Recall remembers what you ran." |

### Recommended Launch Pricing

| Tier | Price | Features | Inspired by |
|------|-------|----------|-------------|
| **Free** | $0 | Full CLI, local-only, BYO AI key | Obsidian (full app free) |
| **Pro** | $5/mo ($50/yr) | Encrypted sync, AI credits included | Obsidian Sync at $4-5/mo |
| **Team** | $10/seat/mo | Workflow sharing, onboarding packs, team search | Linear at $10/seat/mo |
| **Enterprise** | Custom | Self-hosted, audit, SAML, SLA | GitHub Enterprise |
