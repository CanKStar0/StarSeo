---
title: "Install the StarSeo plugin for Codex"
description: "Add StarSeo MCP and Agent Skills to Codex with one marketplace and one install command."
---

The StarSeo plugin bundles StarSeo MCP and all twelve SEO Agent Skills into one install. This is the preferred way to set up StarSeo in Codex CLI.

## Desktop app

In the ChatGPT desktop app, open **Codex** and start a new chat. Paste the [agent setup prompt](/docs/agent-setup#set-up-your-agent) so Codex can configure StarSeo and guide you through sign-in.

If StarSeo appears in your **Plugins** directory, install it, approve the StarSeo sign-in, and start a new Codex chat. If the listing is missing, use the setup prompt or the CLI steps below.

Ask: “Use StarSeo to check my connection and list my projects.” The check uses no StarSeo credits. A tool call followed by your projects, or an empty list, confirms that this chat is connected.

Check [OpenAI's plan support](https://learn.chatgpt.com/docs/pricing) for access to your Codex client. Installing in Codex does not connect a regular chat on chatgpt.com. For that, use the [ChatGPT guide](/docs/chatgpt).

## Install in the CLI

Run these commands in your terminal:

```bash
codex plugin marketplace add CanKStar0/StarSeo
codex plugin add openseo@openseo
codex mcp login openseo
```

`codex mcp login` opens a browser to approve the StarSeo connection. If it reports that `openseo` isn't found, restart Codex first — bundled MCP servers only register after a restart, not immediately after install — then run `codex mcp login openseo` again.

Codex connects StarSeo MCP at `https://starseo.canpolatkaya.com/mcp` and enables twelve skills:

- SEO Project Setup
- SEO Coach
- SEO Audit
- AI Visibility Audit
- AI Prompt Research
- Keyword Research
- Keyword Clustering
- Competitive Landscape
- Competitor Analysis
- Local SEO
- Link Prospecting
- SEO Report

## Run a skill

Type `$` in Codex to see available skills, or ask Codex to run one by name, for example "run seo-project-setup" or "run seo-audit on example.com".

## Update

```bash
codex plugin marketplace upgrade openseo
```

Reload or restart Codex if the updated skills are not available. For other installation methods, see [Agent setup and skill updates](/docs/agent-setup#update-your-skills).

## Remove

```bash
codex plugin remove openseo@openseo
```

## Troubleshooting

If the StarSeo MCP server doesn't appear after restart, run `/mcp` in the Codex TUI to check its status, then run `codex mcp login openseo` again.

If it still doesn't authenticate, log out first and retry:

```bash
codex mcp logout openseo
codex mcp login openseo
```

If a `codex plugin` command reports "unrecognized subcommand," run `codex plugin --help` to see the subcommands your installed version actually supports — they've changed across versions (for example, `add`/`remove`, not `install`/`uninstall`).

## Other clients

For ChatGPT web, use the [ChatGPT setup guide](/docs/chatgpt). For Claude Code or Claude Cowork, use the [StarSeo plugin for Claude](/docs/claude-code-plugin) instead. For Cursor or an API key setup, see [Set up StarSeo MCP](/docs/mcp) and [Set up StarSeo Agent Skills](/docs/skills/setup).
