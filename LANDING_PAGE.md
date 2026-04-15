# Recall — Landing Page Design

## Design Direction

**Reference:** [Cursor](https://cursor.com/features), [Starship](https://starship.rs), [eza](https://eza.rocks)

**Not this:** Generic SaaS landing page with "hero → features → pricing → testimonials" template. No purple gradients, no fake "10x productivity" claims, no stock photos of people smiling at laptops.

**This:** Terminal-native aesthetic. Dark, dense, information-rich. The page should feel like the product — minimal but powerful, opinionated, developer-respecting.

---

## Design Principles

1. **Density over whitespace** — Devs scan, don't read. Pack info efficiently.
2. **Code is the hero** — Terminal output, not illustrations or mockups
3. **Zero marketing fluff** — "Blazing fast" stays in 2015. Use specific claims.
4. **Dark theme mandatory** — Developers live in terminals. Match the environment.
5. **Single conversion goal** — Email signup. Nothing else competes.

---

## Page Sections

### Navbar

```
[>_ Recall]                    [GitHub] [Twitter]
```

No nav links. No dropdowns. Single CTA in hero. GitHub + Twitter as secondary actions.

---

### Hero

**Layout:** Full-width, terminal output as centerpiece

```
>_ Your terminal remembers what you forget.

$ recall search "docker compose"
⚡ docker compose up -d --env-file .env     ~/projects/api   3d ago
⚡ docker compose -f docker.prod.yml up     ~/projects/web   2w ago

[─────────────────────────] [Get Early Access →]
         your@email.com
```

**Left:** Headline + subtext (2 lines max)
**Right:** Terminal output showing Recall working
**Below:** Email input + CTA

**Alternative (if no demo yet):** Show actual shell history
```
$ history | grep docker
  847  docker compose up -d
  923  docker compose logs -f
 1021  docker compose exec app sh

Recall: search that.
```

---

### Problem Statement

**One-liner, no fluff:**

```
Tried a command three weeks ago. Can't reproduce it. Won't happen again.
```

**Below it (small text):**
```
Your shell recorded it. You just can't find it.
```

---

### Features (3 max, dense)

**NOT grid of 6 icons with hover effects.**

**Stacked, terminal-style:**

```
CAPTURE
  Install hook → every command stored
  zsh precmd + bash PROMPT_COMMAND
  Normalized, deduplicated, local

SEARCH
  recall search "postgres"
  recall recent --project api
  recall project  (context from git root)

RECALL
  Exactly what you ran, where, when
  Exit code, duration, repo context
```

---

### Code Example (Install steps)

**Copy-paste friendly:**

```bash
# One line to start
curl -fsSL https://recall.sh/install | bash

# Or with Homebrew
brew install recall-cli

# Then
recall init
```

---

### Social Proof (Minimal)

**No testimonials until you have them.**

**Instead:**
```
256 developers on early access
v0.1 launches April 2026
github.com/recall-cli/recall
```

---

### Footer

```
Recall · Local-first · No cloud · No tracking
GitHub · Twitter
```

---

## Colors (Strict)

```css
--bg:        #0a0a0f     /* Near-black, not pure black */
--surface:   #161622     /* Cards, code blocks */
--border:    #2a2a3a     /* Subtle dividers */
--text:      #e4e4e7     /* Primary text */
--muted:     #71717a     /* Secondary text */
--accent:    #22d3ee     /* Cyan-400, links, highlights */
--success:   #10b981     /* Green-500 */
--error:     #ef4444     /* Red-500 */
```

**NO gradients on large areas.**
**NO purple/blue hero backgrounds.**
**NO brand colors outside of accents.**

---

## Typography

**Font:** JetBrains Mono for everything (brand consistency)

```css
body {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
}

h1 { font-size: 28px; font-weight: 700; }
h2 { font-size: 20px; font-weight: 600; }
p  { font-size: 14px; color: var(--muted); }
```

---

## Spacing & Layout

```css
container { max-width: 720px; margin: 0 auto; }
section   { padding: 48px 0; }
element   { margin-bottom: 16px; }
```

**Dense.** Not 80px between sections. Not 24px padding on cards.

---

## Components

### Terminal Output Block

```html
<pre class="terminal">
<span class="prompt">$</span> recall search "docker"
<span class="cmd">⚡ docker compose up -d --env-file .env</span>
<span class="meta">~/projects/api · 3d ago · ✓ · 2.3s</span>
</pre>
```

Style: Black bg (`#0a0a0f`), green prompt (`#22d3ee`), white command, muted meta.

### Email Form

Single input + button. No labels. Placeholder is CTA.

```html
<input type="email" placeholder="your@email.com">
<button type="submit">Get Early Access →</button>
```

---

## Implementation

**Single HTML file.** No Next.js, no Tailwind, no build step.

- Embedded CSS
- Formspree for email (free tier)
- No JavaScript except form submission
- Loads in <1 second

**Why:** Ship fast. Iterate faster. No framework overhead.

---

## Section Order (Final)

1. **Nav** — Logo + GitHub/Twitter
2. **Hero** — Headline + terminal demo + email form
3. **Problem** — One-liner
4. **Features** — Stacked text (no icons)
5. **Install** — Code block
6. **Social proof** — Stats only
7. **Footer** — Minimal

---

## Anti-Patterns to Avoid

| Avoid | Instead |
|-------|---------|
| "Ship faster with Recall" | Show the terminal output |
| Grid of 6 feature icons | Stack 3 dense feature blocks |
| "Join 10,000 developers" | "256 on early access" |
| Testimonial carousel | None until real feedback |
| Hero with gradient bg | Solid dark + terminal |
| Illustrations/3D renders | Code blocks only |
| "Free forever" pricing tiers | Pre-launch: email only |

---

## Sources
- [Cursor landing page](https://cursor.com/features)
- [Starship terminal](https://starship.rs)
- [eza tool](https://eza.rocks)

## Document History
- Created: 2026-04-15
- Direction: Pro-max UI/UX, no AI slop, terminal-native