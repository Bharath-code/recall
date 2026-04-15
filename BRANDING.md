# Recall — Brand Design Guide

## Brand Identity

### Core Promise
**"Your terminal remembers what you forget."**

### Tagline Variants
- Primary: "Your terminal remembers what you forget."
- Short: "Terminal memory, finally."
- Technical: "Capture. Search. Recall."

### Positioning
Recall is the **memory layer** for developers — invisible infrastructure that works quietly until needed. Not a dashboard to check, not a notification to ack. Just reliable memory when you need it.

### Tone
| Attribute | Positioning |
|-----------|-------------|
| Confident | Knows it solves a real problem |
| Minimal | No fluff, no marketing speak |
| Technical | Written for developers |
| Delightful | Smooth, fast, frictionless |
| Privacy-first | Local-only by default |

**Voice examples:**
- ✓ "Your commands, searchable."
- ✗ "Supercharge your workflow!"
- ✓ "Local. Fast. Private."
- ✗ "The ultimate productivity tool!"

---

## Logo Concept

### Wordmark
```
RECALL
```
All caps, monospace font (JetBrains Mono or similar).

### Icon Concept
**Memory/Mind metaphor** — not a brain (too biological) or a database (too enterprise):

```
Option A: Brainteaser piece (jigsaw memory)
Option B: Speech bubble with code bracket <_>
Option C: Infinity loop (continuous memory)
Option D: Terminal prompt $ with memory indicator
```

**Recommended: Option D (Terminal + Memory)**
```
$_
  ↻  (small recall indicator)
```
Or simplified: `⌘` with subtle memory swirl.

### Logo Usage
- Dark background: white logo
- Light background: dark logo with cyan accent
- Icon only (small contexts): stylized `>_` prompt

---

## Color Palette

### CLI Colors (ANSI)
See `IMPLEMENTATION_PLAN.md` — CLI Design System section.

### Brand Colors (Web/Graphics)

| Name | Hex | Use |
|------|-----|-----|
| Ink | `#1a1a2e` | Primary text, dark bg |
| Slate | `#16213e` | Secondary bg |
| Terminal | `#0f3460` | Accent bg |
| Cyan | `#00d9ff` | Primary accent, CTAs |
| Mint | `#00ff9f` | Success, positive |
| Ember | `#ff6b6b` | Error, destructive |
| Dust | `#8892b0` | Secondary text |
| Cloud | `#e6e6e6` | Light text |

### Color Proportions
```
Cyan (primary accent): 10-15% of UI
Ink/Slate (backgrounds): 70-80%
Mint/Ember (status): 5%
Dust/Cloud (text): 10%
```

---

## Typography

### CLI
- **Font**: JetBrains Mono (primary), Fira Code (fallback)
- **Sizing**: 14px default, 12px compact, 16px headings

### Web/Marketing
- **Headings**: JetBrains Mono (monospace brand identity)
- **Body**: Inter (readable, modern)
- **Code snippets**: JetBrains Mono

### Scale
```
h1: 48px / 700 weight
h2: 32px / 600 weight
h3: 24px / 600 weight
body: 16px / 400 weight
small: 14px / 400 weight
code: 14px / 400 weight (JetBrains Mono)
```

---

## Icon System (CLI)

See `IMPLEMENTATION_PLAN.md` — CLI Design System section.

### Icon Principles
- Visual anchors, not decoration
- One icon per semantic meaning
- UTF-8 glyphs (Nerd Font compatible)

---

## Brand Elements

### ASCII Art (CLI Welcome)
```
╔═══════════════════════════════════════════════════════╗
║  █████╗ ██████╗  ██████╗██╗  ██╗                       ║
║ ██╔══██╗██╔══██╗██╔════╝██║  ██║                       ║
║ ███████║██████╔╝██║     ███████║                       ║
║ ██╔══██║██╔══██╗██║     ██╔══██║                       ║
║ ██║  ██║██║  ██║╚██████╗██║  ██║                       ║
║ ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝                       ║
║               remembers what you forget.              ║
╚═══════════════════════════════════════════════════════╝
```

### Animated Logo (Web/Hero)
Subtle animation concept:
- Memory swirl slowly rotating
- Command prompt `$` blinking cursor
- Fade-in on scroll

### Empty State Illustrations
ASCII art for empty states (when no commands captured):

```
┌────────────────────────────────────┐
│   $                               │
│    _                              │
│                                    │
│   (No commands yet)                │
│   Your shell history will appear   │
│   here after setup.                │
└────────────────────────────────────┘
```

---

## Voice & Tone

### Do
- Short, direct sentences
- Developer-oriented language
- Technical accuracy
- Quiet confidence (no hype)
- Action-oriented prompts

### Don't
- Marketing buzzwords ("supercharge", "revolutionize")
- Exclamation marks (except on errors)
- Corporate speak
- condescension
- Over-explanation

### Copy Examples

| Context | Good | Bad |
|---------|------|-----|
| Empty search | "No matches found." | "Oops! We couldn't find any results..." |
| Success | "Hook installed." | "Hooray! Everything is set up!" |
| Error | "Database locked. Retry?" | "Something went wrong! We're sorry!" |
| Onboarding | "Let's get started." | "Welcome to the amazing Recall!" |

---

## Brand Applications

### Favicon
- Dark background with cyan `>_` prompt
- 16x16, 32x32, 48x48 variants

### App Icon (if desktop wrapper later)
- Dark bg, cyan `>_` centered
- Rounded corners (8px radius)

### Website
- Minimal, terminal-inspired
- Dark theme default
- Code blocks with syntax highlighting
- No stock photos

### Social (if needed)
- Twitter: `>_ Recall` handle
- GitHub: `recall-cli` org
- Avatar: Same as favicon

---

## Brand Don'ts

- No gradients on large areas
- No rainbow colors
- No Comic Sans, Papyrus, or generic fonts
- No stock photography
- No busy backgrounds
- No exclamation marks (seriously)
- No emoji in brand copy (only CLI icons)

---

## Document History
- Created: 2026-04-15