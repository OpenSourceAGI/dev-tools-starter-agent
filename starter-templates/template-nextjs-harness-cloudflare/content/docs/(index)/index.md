---
title: Introduction

---
# 🚀 Next.js SaaS Template

## ✨ Features

- 🎨 **Stunning UI** - Built with Tailwind CSS & Shadcn UI for a premium look.
- 🌓 **Dark Mode Ready** - Seamless light and dark mode switching with `next-themes`.
- 🔐 **Secure Authentication** - Powered by `better-auth` with Social & SIWE support.
- 💳 **Stripe Integration** - Subscription handling and payments ready to go.
- 📊 **Interactive Dashboard** - Beautiful charts and metrics visualization.
- 📱 **Fully Responsive** - Looks great on mobile, tablet, and desktop.
- 📝 **Documentation Engine** - Integrated docs with `fumadocs`.
- 🤖 **AI Ready** - Configure LLM providers easily in settings.

## 🛠️ Setup Guide

Get up and running in minutes!

1.  **Clone the repository:**
    \`\`\`bash
    git clone <your-repo-url>
    cd <your-repo-name>
    \`\`\`

2.  **Install dependencies:**
    \`\`\`bash
    npm install
    # or
    pnpm install
    # or
    bun install
    \`\`\`

3.  **Environment Variables:**
    Copy `.env.example` to `.env` (or create one) and fill in your secrets:
    \`\`\`bash
    cp .env.example .env
    \`\`\`
    *Ensure you have `BETTER_AUTH_SECRET`, `STRIPE_SECRET_KEY`, etc. configured.*

4.  **Run the development server:**
    \`\`\`bash
    npm run dev
    \`\`\`

5.  **Open your browser:**
    Navigate to [http://localhost:3000](http://localhost:3000) to see your app!

---

Built with ❤️ using Next.js 14.
