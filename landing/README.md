# Recall Landing Page

Terminal-native landing page for Recall CLI - your terminal remembers what you forget.

## Tech Stack

- **Framework**: Astro 6.x
- **Styling**: Tailwind CSS 3.x
- **Deployment**: Cloudflare Pages
- **Analytics**: Umami (privacy-focused)

## Development

```bash
# Install dependencies
bun install

# Start dev server
bun dev

# Build for production
bun build

# Preview production build
bun preview
```

## Environment Variables

Create a `.env` file in the `landing/` directory:

```bash
# Umami Analytics
UMAMI_WEBSITE_ID=your-umami-website-id
UMAMI_URL=https://your-umami-instance.com

# Formspree (for email form)
FORMSPREE_ENDPOINT=https://formspree.io/f/your-form-id
```

See `.env.example` for reference.

## Deployment to Cloudflare Pages

### Option 1: Direct Upload

```bash
# Build the project
bun build

# Upload dist/ directory to Cloudflare Pages
# via Cloudflare Dashboard or Wrangler CLI
```

### Option 2: Git Integration

1. Connect your GitHub repository to Cloudflare Pages
2. Set build command: `bun run build`
3. Set build output directory: `dist`
4. Add environment variables in Cloudflare Pages settings

## Project Structure

```
landing/
├── src/
│   ├── components/       # Astro components (Navbar, Hero, etc.)
│   ├── layouts/         # Page layouts
│   ├── pages/           # Route pages
│   ├── content/         # Blog content collections (future)
│   └── styles/          # Global CSS
├── public/              # Static assets (favicon, robots.txt)
├── astro.config.mjs     # Astro configuration
├── tailwind.config.mjs  # Tailwind configuration
└── package.json         # Dependencies
```

## Blog Architecture

Blog is configured with Astro content collections for future use:

- Content schema defined in `src/content.config.ts`
- Blog posts go in `src/content/blog/`
- Markdown frontmatter: title, description, publishDate, tags, author

## Performance Targets

- Lighthouse Performance: 95+
- First Contentful Paint: <1.5s
- Largest Contentful Paint: <2.5s
- Total blocking time: <200ms

## Design System

Colors (from BRANDING.md):
- Ink: `#1a1a2e` (primary background)
- Slate: `#16213e` (secondary background)
- Cyan: `#00d9ff` (primary accent)
- Mint: `#00ff9f` (success)
- Ember: `#ff6b6b` (error)
- Dust: `#8892b0` (secondary text)
- Cloud: `#e6e6e6` (primary text)

Typography:
- Headings: JetBrains Mono
- Body: Inter
- Code: JetBrains Mono
