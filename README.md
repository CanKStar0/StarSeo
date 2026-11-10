# StarSeo 🚀

> **Independent, Developer-First SEO & GEO Intelligence Platform powered by Umay AI & DataForSEO.**

StarSeo is a modern, self-hosted SEO & GEO (Generative Engine Optimization) intelligence platform. It tracks real search engine rankings, crawls technical SEO health, analyzes backlink profiles, and monitors generative AI search visibility (ChatGPT, Claude, Gemini, Perplexity) using **Umay AI**.

---

## 🌟 Highlights & Core Features

- 🤖 **GEO & AI Visibility Engine:**
  - Automated prompt discovery and tracking across ChatGPT, Claude, Gemini, and Perplexity.
  - Brand citation and competitor mention analysis.
  - Direct integration with **Umay AI (`umay-akilli`)** for intelligent prompt and topic generation.
- 🔍 **Live Keyword Intelligence:**
  - Real-time search volume, CPC, competition index, and search intent classification powered by DataForSEO.
- 🌐 **Domain & Competitor Overview:**
  - Organic keyword rankings, competitor gap analysis, and SERP distribution.
- 🔗 **Backlinks & Referring Domains:**
  - Live backlink profiles, referring domain authority, and anchor text tracking.
- 🕷️ **Deep Site Crawler & Technical Audit:**
  - Core Web Vitals checks, broken link detection, meta tag validation, and indexability issues.
- 🔌 **Umay AI Adapter Sidecar (`umay-adapter`):**
  - Zero-latency translation layer providing full OpenAI/OpenRouter structured JSON schema & tool-calling compatibility for Umay AI models.

---

## 🏗️ Architecture

```
                      ┌──────────────────────────────────────┐
                      │              User Browser            │
                      └──────────────────┬───────────────────┘
                                         │ (HTTPS)
                                         ▼
                               ┌──────────────────┐
                               │  Traefik Proxy   │
                               └─────────┬────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    │                                         │
                    ▼                                         ▼
       ┌─────────────────────────┐               ┌─────────────────────────┐
       │   StarSeo Core App      │               │   Umay Adapter Sidecar  │
       │ (ghcr.io/.../open-seo)  ├──────────────►│    (Node 22 Container)   │
       │       Port: 3001        │   Port: 4000  └────────────┬────────────┘
       └────────────┬────────────┘                            │
                    │                                         │
                    ▼ (DataForSEO API)                        ▼ (HTTPS REST)
           ┌─────────────────┐                      ┌─────────────────┐
           │   DataForSEO    │                      │     Umay AI     │
           │  REST Gateway   │                      │ (umayzeka.com)  │
           └─────────────────┘                      └─────────────────┘
```

---

## 🚀 Quick Deployment (Dokploy & Docker Compose)

### 1. Clone the Repository
```bash
git clone https://github.com/CanKStar0/StarSeo.git
cd StarSeo
```

### 2. Configure Environment (`.env`)
Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```

| Variable | Description | Example |
|---|---|---|
| `PORT` | Container HTTP port | `3001` |
| `ALLOWED_HOST` | Allowed hostname | `starseo.canpolatkaya.com` |
| `BETTER_AUTH_URL` | Base public URL | `https://starseo.canpolatkaya.com` |
| `BETTER_AUTH_SECRET` | 32+ character random secret | `openssl rand -hex 32` |
| `OPENROUTER_API_KEY` | Umay AI or OpenRouter API Key | `umay_sk_live_...` |
| `OPENROUTER_BASE_URL` | Adapter endpoint | `http://umay-adapter:4000/v1` |
| `OPENROUTER_MODEL` | Default AI model slug | `umay-akilli` |
| `DATAFORSEO_API_KEY` | Base64-encoded DataForSEO auth | `login:password` in base64 |

### 3. Launch Services
```bash
docker compose up -d
```

StarSeo will be ready at `http://localhost:3001` (or your configured custom domain).

---

## 🛡️ License

MIT License. Built on open standards for developers.
