# Recall — Pre-Launch Audience Building Plan

**Goal:** Build 500 engaged followers before v0.1 launch (Week 6)
**Time investment:** ~2 hours/week for 6 weeks
**Cost:** $0

---

## Phase 0: Immediate (Week 0 — This Week)

### Twitter Account Setup

```bash
# Account Details
Handle: @recall_cli or similar
Name: Recall
Bio: Terminal memory for developers. Your shell forgets, I don't.
Location: (your city, adds authenticity)
Website: (link to GitHub or future landing page)
Joined: Set to current date (authenticity matters)
```

### First Tweet (Post Today)

```
Something I've been thinking about:

Every developer has run 'git diff HEAD~1'
to remember what they changed yesterday.

Your shell has the answer. It's just not searchable.

Working on something that fixes this.
```

**Why this works:**
- Real problem (everyone forgets)
- Credibility (you're working on it)
- Hook for replies ("I do this all the time!")
- Not promotional (pure insight)

### Week 0 Actions

| Action | Time | Priority |
|--------|------|----------|
| Create Twitter account | 5 min | CRITICAL |
| Post first tweet | 5 min | CRITICAL |
| Follow 20 relevant devs (CLI tools, productivity) | 10 min | HIGH |
| Find 3 accounts to engage with daily | 5 min | HIGH |

### Devs to Follow (Example Accounts)
- Anyone posting about CLI tools, shell config, dotfiles
- Check: @tophtucker, @brianleroux, @kelseyhightower
- Search: "terminal", "shell", "dotfiles", "cli tool"
- Look at who they follow → find more

---

## Phase 1: Foundation (Weeks 1-2)

### Twitter Content Plan

**Schedule:**
- Tuesday: Educational thread (1x)
- Thursday: Build-in-public update (1x)
- Saturday: Quick thought/tip (1x)

**Week 1 — Educational Thread (Tuesday)**

Tweet 1 (hook):
```
Day 1 of analyzing my shell history:

847 commands in the last 30 days.

The data doesn't lie — I have a problem.
```

Tweet 2:
```
Most repeated:
- git status (47x)
- docker compose up (23x)
- bun run dev (19x)
- ls -la (14x)

I use these constantly but never remember context.
```

Tweet 3:
```
What's interesting:
- 12 'docker compose' invocations
- None exactly the same (different flags)
- I kept looking up the flags I used last time
```

Tweet 4 (insight):
```
Shell history is a goldmine.
But it's chronological, not searchable.
And it dies when you close the session.

There's no "search what I did in project X last month."
```

Tweet 5 (preview):
```
Building Recall to fix this.
Capture every command.
Search by project, time, or what you remember.

Demo coming soon.
```

**Week 1 — Build-in-Public (Thursday)**
```
Week 1 of building Recall:

✓ Shell hook working in zsh
✓ Basic SQLite storage
✓ Command normalization (trim, collapse, dedup)

The hardest part: figuring out how
to not break someone's shell.

Working with zinit's idempotent approach.
```

**Week 1 — Quick Tip (Saturday)**
```
Pro tip: Set HISTSIZE=10000 in your ~/.zshrc

Your history is more useful than you think.
It just needs better tools to search it.
```

---

### Engagement Strategy (Daily, 15 min)

**Morning (5 min):**
- Check notifications, reply to all mentions
- Find 2-3 posts about shell/terminal/CLI tools
- Reply with genuine insights (not self-promotion)

**Throughout day:**
- Quote-tweet interesting dev thoughts (add your spin)
- Like thoughtful posts (algorithm notices)
- Retweet only content you'd read twice

**Rules:**
- Reply to every comment within 2 hours
- Ask questions, don't just answer
- Be helpful, not promotional
- Don't mention Recall in first 5 replies to someone

---

### Week 2: Momentum

**Content:**
```
Week 2 of building Recall:

Command normalization is harder than I thought.

Rules that work:
1. Trim whitespace
2. Collapse multiple spaces
3. Expand ~ to $HOME
4. Case-sensitive exact match

Still iterating on deduplication.
```

**Engagement:**
- Start a conversation: "What's your HISTSIZE set to?"
- Post a screenshot of Recall working (even if ugly)
- Share an edge case you solved

---

## Phase 2: Growth (Weeks 3-4)

### Hit These Milestones

| Week | Followers | Tweet Milestone |
|------|-----------|-----------------|
| 1 | 30-50 | First tweet lands |
| 2 | 60-100 | Engagement pod working |
| 3 | 100-150 | One tweet goes viral |
| 4 | 150-250 | Consistent 10+ likes |
| 5 | 300-400 | Launch teaser gaining |
| 6 | 400-500 | Launch day |

### Content Mix (Week 3-4)

**60% Educational:**
- "How to configure HISTFILE for better history"
- "The zsh precmd/preexec hook explained"
- "Why command deduplication matters"

**25% Build-in-Public:**
- Show working UI (even ASCII)
- Share challenges and solutions
- Post stats: "100 commands stored today"

**15% Entertainment:**
- "My shell history is a diary of bad decisions"
- "You know you're a senior dev when..."

---

### Engagement Tactics

**Thread that works:**
```
Reply to this with your most-forgotten command.

I'll start:
docker compose up -d --env-file .env.production.local
```

→ Comments get engagement → Algorithm shows tweet more → Followers

**Question thread:**
```
What's the one command you wish you remembered from 6 months ago?

Mine: the exact flags for that docker deploy.

(Yes, I know about history. It's not searchable enough.)
```

---

## Phase 3: Launch Ready (Weeks 5-6)

### Week 5: Pre-Launch Hype

**Content:**
```
In 2 weeks: Recall launches.

Terminal memory that actually works.
Local. Fast. Private.

DM me for early access.
```

**Build anticipation:**
- "Something interesting is coming..."
- Demo GIF (animated terminal with Recall)
- Show the welcome screen ASCII art

**Email list:**
- Create landing page (simple, single-purpose)
- "Get early access" → collect emails
- Link in Twitter bio + every tweet

### Week 6: Launch

**Launch Sequence:**
1. **Twitter thread** — "Recall v0.1 — your terminal finally remembers" + demo
2. **Hacker News** — "Show HN: I built Recall to search shell history"
3. **Email** — Send to everyone on list
4. **Reddit** — r/programming, r/devops (participate first, then post)
5. **GitHub** — README with clear install + features

**Launch Tweet Template:**
```
Recall v0.1 is live.

Your terminal remembers what you forget.

$ recall search "docker compose"
⚡ docker compose up -d --env-file .env  ~/projects/api  3d ago

Install: brew install recall-cli
GitHub: github.com/recall-cli/recall

(AMA about shell history + what I learned building this)
```

---

## Engagement Pod (Optional but Effective)

### Find 5-10 Indie Hackers

1. Search: "building in public" OR "shipship" OR "indie hacker"
2. Follow people who post 3x/week about their projects
3. Engage with their content genuinely
4. After 2 weeks: DM "Hey, I'm building in public too. Want to support each other?"

### Pod Rules
- Engage with each other's posts (like, reply, RT)
- Don't pitch in pod (pure support)
- Celebrate wins publicly
- Critique constructively

---

## What NOT to Do

| Don't | Why |
|-------|-----|
| Buy followers | Detectable, worthless |
| Auto-DM "check my product" | Blocks, burns reputation |
| Post twice/day then disappear | Algorithm punishes inconsistency |
| Engage only when promoting | People sense it |
| Quote tweet too much | Looks spammy |
| Steal content | Credit + authenticity matter |
| Follow/unfollow | Looks like growth hacking |

---

## Quick Wins (Post This Week)

1. **Hot take:** "Hot take: your shell history is more useful than you think"
2. **Debugging story:** "I spent 3 hours debugging a shell hook. Here's what I learned."
3. **Question:** "Name one command you keep forgetting. Mine: the exact docker compose flags."
4. **Preview:** "Working on a thing that makes 'recall search' work like your brain expects."
5. **Stat:** "847 shell commands in 30 days. Most useful data I'm not using."

---

## Metrics to Track

| Metric | Week 1 | Week 3 | Week 6 |
|--------|--------|--------|--------|
| Followers | 50 | 150 | 500 |
| Tweet impressions | 500 | 2,000 | 10,000 |
| Profile visits | 50 | 200 | 500 |
| Website clicks | 5 | 30 | 100 |
| Email signups | 0 | 20 | 200 |

---

## Daily Checklist (15 min)

```
□ Check notifications, reply to all
□ Like 5 relevant posts
□ Reply to 3 shell/terminal discussions
□ Post 1 tweet (follow schedule)
□ Find 1 new account to follow
□ Engage with pod members
□ Update content tracker
```

---

## Success Metrics

**You're ready to launch when:**
- [ ] 400+ followers (organic, not purchased)
- [ ] Consistent 10+ likes on educational posts
- [ ] At least 1 tweet with 500+ impressions
- [ ] 100+ email subscribers
- [ ] 10+ people DM saying "can't wait"

---

## Document History
- Created: 2026-04-15
- Based on: Minimalist Entrepreneur principles + Recall context
- Status: Ready to execute