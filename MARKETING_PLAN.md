# Recall — Marketing Plan

**Philosophy:** Marketing is sales at scale. Spend time, not money. Make fans, not headlines.

---

## Target Audience

### Primary
- **Role**: Software developers, DevOps engineers, CLI power users
- **Age**: 22-40, Unix/Linux background
- **Pain**: Forgets commands, loses context between sessions, manually documents workflows
- **Where they gather**: Twitter/X, Reddit (r/programming, r/devops), Hacker News, Discord/ Slack dev communities

### Secondary
- Teams with repetitive deployment workflows
- On-call engineers who need to recall past fixes
- Developers working across many projects

---

## Prerequisites Check

| Prerequisite | Status |
|--------------|--------|
| Community you belong to | ✓ Developer communities (GitHub, Twitter, local meetups) |
| Product people are paying for | ○ MVP in progress |
| ~100 customers | ○ Not yet |
| Experience selling one-on-one | ○ First product |

**Phase**: Pre-launch. Focus on building authentic audience before shipping.

---

## Primary Platform: Twitter/X

**Why Twitter** (for Recall):
- Dev culture is strong (tweets about terminals, tooling, productivity)
- Thread format perfect for technical deep-dives
- "Build in public" culture embraced
- Fast feedback loop
- Code snippets render well

**Alternative considered**: Hacker News (top posters get traction but no engagement), Reddit (good for announcements but hard to build personal brand)

### Posting Schedule
```
Tuesday:     Educational thread (1-2x/month)
Thursday:    Build-in-public update (weekly)
Saturday:    Quick tip/one-liner (casual)
```

**Total**: 3 posts/week sustainable

---

## Content Plan

### Level 1: Educate (Share What You've Learned)

1. **"I analyzed 847 shell commands I forgot I ran"**
   - Blog post about what gets lost in shell history
   - Stats: most repeated commands, forgotten tools

2. **"How shell history actually works"**
   - Technical deep-dive: HISTFILE, zsh vs bash, deduplication
   - Useful reference + Recall context

3. **"5 commands I wish I remembered from 6 months ago"**
   - Real examples of Recall's value
   - Share actual commands from personal history

4. **"The shell hook patterns that don't break your terminal"**
   - preexec/precmd, PROMPT_COMMAND gotchas
   - Engineering learnings from building Recall

5. **"Why your dotfiles manager matters for shell history"**
   - zinit, zsh setup, HISTFILE configs
   - Cross-reference with Recall's import approach

### Level 2: Inspire (Share Your Journey)

1. **"I built Recall because I kept typing 'git diff HEAD~1' to remember what I changed"**
   - Real problem → real solution
   - Vulnerability about the pain point

2. **"Three things I learned building a CLI tool in 2026"**
   - Progress update, honest learnings
   - What's hard, what surprised

3. **"Why local-first software is having a moment"**
   - Align with the trend (Obsidian, Linear, Raycast)
   - Recall's place in the ecosystem

4. **"The feature I almost didn't build because I thought no one would care"**
   - Forgotten tools detection story
   - Turned out to be a favorite feature

5. **"Shipping v0.1: what I'd do differently"**
   - Retro, honest assessment
   - Teaches + builds trust

### Level 3: Entertain (Dev Humor)

1. **"My shell history is basically a diary of my bad decisions"**
   - Relatable humor
   - Real commands from history

2. **"git log --oneline: the closest thing to a time machine"**
   - Developer joke about git as memory
   - Hook to Recall's value prop

3. **"You know you're a senior dev when 'which grep' becomes a spiritual question"**
   - Relatable dev humor
   - Tool confusion meme

4. **"I spent 4 hours building a tool to save me 30 seconds of 'what was that command'"**
   - Self-deprecating humor
   - Everyone has done this

5. **"The real cost of 'I'll just remember that' in terminal time"**
   - Viral potential
   - Back-of-envelope calculation

---

## Build in Public Plan

### What to Share
| Week | Update |
|------|--------|
| 1 | Project kickoff, problem statement, repo made public |
| 2 | Tech stack decisions (Bun, SQLite, CAC) + why |
| 3 | First shell hook working! Demo GIF |
| 4 | Command normalization edge cases found |
| 5 | CLI design system decisions (colors, icons) |
| 6 | Beta tester feedback summary |
| 7 | Ship v0.1! Launch post |

### Content Mix
```
60% — Technical value (teach something)
25% — Journey updates (authentic, human)
15% — Occasional humor (don't be a robot)
```

### What NOT to Share
- "Just shipped!" without substance
- Feature announcements without context
- Generic motivational content
- Hot takes unrelated to dev tools

---

## Email List Strategy

### Why Email
Social media is rented land. Email is owned. Build the list from day one.

### Lead Magnet
**"The Shell History Handbook"**
- PDF: How to configure zsh/bash history for maximum utility
- Includes: HISTFILE configs, deduplication settings, privacy tips
- 10-15 pages, immediately useful

**Alternative**: "CLI Productivity Checklist" — actionable list of terminal improvements

### Collection Method
1. Landing page with one-liner + email field
2. Share link in Twitter bio + tweets
3. "Get the Shell History Handbook" in every post about shell config

### Email Cadence
```
Welcome:         Instant (deliver PDF + next step)
Week 1:          "Here's where Recall is at"
Week 2-4:        Bi-weekly updates (when there's news)
Launch:          Big announcement
Post-launch:     Monthly newsletter
```

### Email Content Framework
- Subject: Short, specific (not "Update from Recall")
- Body: 3 bullet points max, one link
- Unsubscribe: One-click, no guilt

---

## Community Engagement

### Where to Be Active
1. **Twitter**: Primary platform, as outlined above
2. **GitHub**: README quality, issue responsiveness, contributing guide
3. ** Hacker News**: Occasional "Show HN" post at launch
4. **Reddit**: r/programming, r/devops — helpful comments, not spam
5. **Dev discords**: CLI tool channels, be helpful not promotional

### Engagement Rules
- Reply to every comment/message (even late)
- Help with shell/terminal questions (not just Recall promo)
- Share others' tools without asking for reciprocation
- Genuine interest in feedback, not just traction

---

## Launch Plan

### Pre-Launch (Weeks 1-6)
- [x] Create Twitter account (@recall_cli)
- [x] Build in public (weekly updates)
- [ ] Write Shell History Handbook
- [ ] Set up email capture (static landing page)
- [ ] Reach 50 followers organically

### Launch (Week 7)
- [ ] "Show HN" on Hacker News
- [ ] "Launched Recall" on Twitter with demo
- [ ] Email to early followers
- [ ] Post in relevant subreddits (with Read-first participation)
- [ ] Ask beta users for testimonials (use real quotes)

### Post-Launch (Weeks 8-12)
- [ ] Track feedback, ship improvements
- [ ] Weekly Twitter updates
- [ ] Collect email subscribers
- [ ] At 100 users: Case study post

---

## When to Consider Paid Advertising

**Threshold**: Only after:
1. 100+ paying customers
2. Organic content getting traction (tweets with 10+ likes consistently)
3. Clear customer profile (who converts)
4. Email list of 500+

**Signs to WAIT**:
- "Just launched, let's buy ads!" — no targeting data
- Content with 2% engagement rate — money amplifies low engagement
- Not sure who your customer is — ad spend wasted

**When Ready**:
- Twitter Ads — target developers, CLI tool interest
- GitHub Sponsors — for developer audience
- Google Ads — only if there's search intent ("shell history tool")

### Spend Rules
- Rule 1: Don't spend more than you make per customer
- Rule 2: Spend on customers (loyalty) before acquisition
- Rule 3: Lookalike audiences > interest targeting

---

## Key Metrics to Track

| Metric | Target | Why |
|--------|--------|-----|
| Twitter followers | 500 by launch | Early audience + social proof |
| Email subscribers | 200 by launch | Owned audience |
| GitHub stars | 100 by week 1 | Traction signal |
| HN points | 200+ on launch day | Credibility |
| Beta signups | 50 pre-launch | Validation |

---

## Document History
- Created: 2026-04-15
- Based on: Minimalist Entrepreneur principles