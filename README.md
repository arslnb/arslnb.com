# Blog

Personal blog built with Jekyll.

## Setup

```bash
gem install bundler
bundle install
```

## Run locally

```bash
bundle exec jekyll serve
```

Then open http://localhost:4000

## New post

Create a file in `_posts/` named `YYYY-MM-DD-title.md` with front matter:

```markdown
---
layout: post
title: "Your Title"
date: 2026-02-26
---

Your content here.
```

## Deploy

Build static files:

```bash
bundle exec jekyll build
```

Output goes to `_site/`. Deploy that folder anywhere (GitHub Pages, Netlify, Cloudflare Pages, etc).
