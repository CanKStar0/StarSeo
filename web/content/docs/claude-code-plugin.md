---
title: "Install the StarSeo plugin for Claude Code and Claude Cowork"
description: "Add StarSeo MCP and Agent Skills to Claude Code or Claude Cowork with one plugin install."
---

The StarSeo plugin bundles StarSeo MCP and all twelve SEO Agent Skills into one install. This is the preferred way to set up StarSeo in Claude Code and in Claude Cowork.

## Install in Claude Code

Run these two commands in Claude Code:

```bash
/plugin marketplace add CanKStar0/StarSeo
/plugin install openseo@openseo
```

If the install summary says `Run /reload-plugins to activate.`, run that command.

Claude Code connects StarSeo MCP at `https://starseo.canpolatkaya.com/mcp` and enables twelve skills:

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

## Finish the login

Claude Code should prompt you to log in to StarSeo right after install. If it doesn't, run `/mcp` and approve the StarSeo connection from there.

## Run a skill

In Claude Code, plugin skills are namespaced by the plugin name:

```
/openseo:seo-project-setup
/openseo:seo-coach
/openseo:seo-audit
/openseo:ai-visibility-audit
/openseo:ai-prompt-research
/openseo:keyword-research
/openseo:keyword-clustering
/openseo:competitive-landscape
/openseo:competitor-analysis
/openseo:local-seo
/openseo:link-prospecting
/openseo:seo-report
```

## Install in Claude Cowork

Claude Cowork and the Claude desktop app install plugins through the Customize menu, not slash commands. An agent can't click these steps for you.

1. Open **Customize** in the left sidebar. In Cowork, open the **Cowork** tab first.
2. Open **Plugins**, click **+** or **Add**, and choose **Add marketplace**.
3. Choose **Add from a repository** and enter `https://github.com/CanKStar0/StarSeo`.
4. Find **StarSeo** in the new marketplace and click **Install** or **Add**.
5. Sign in to StarSeo and approve the connection when Claude asks.
6. Start a new task, type `/`, and check that the StarSeo skills appear. Then try "Use StarSeo to check my connection and list my projects." This check uses no StarSeo credits.

If Claude can list your projects but no StarSeo skills appear under `/`, you have a connector, not the plugin. Install the plugin, then remove the old custom StarSeo connector under **Customize → Connectors** so you keep one connection.

Plugins need a paid Claude plan (Pro, Max, Team, or Enterprise). Your organization can limit which marketplaces you can add. On the Free plan or with a self-hosted instance, [add StarSeo as a custom connector](/docs/mcp#claude-desktop) and upload skills under **Customize → Skills**. The plugin connects only to hosted StarSeo. See [Anthropic's plugin guide](https://support.claude.com/en/articles/13837440-use-plugins-in-claude).

## Update

Run inside Claude Code:

```text
/plugin marketplace update openseo
/plugin update openseo@openseo
/reload-plugins
```

Updates land in the cache immediately, but the running session keeps the old version until you run `/reload-plugins` or restart Claude Code.

For other installation methods, see [Agent setup and skill updates](/docs/agent-setup#update-your-skills).

## Remove

```text
/plugin uninstall openseo@openseo
```

## Troubleshooting

To check what's actually installed, run `/plugin list` rather than bare `/plugin` — `/plugin` alone opens an interactive panel that doesn't show plain text.

If `/reload-plugins` reports `0 skills`, that's normal, not a failure — its summary only counts a plugin's `commands/` directory, not `skills/`. Confirm the skills loaded by running one directly, for example `/openseo:seo-audit`.

If `/plugin uninstall openseo@openseo` reports "not installed in this project," you likely installed to a different scope than the one being checked (User, Project, or Local). Run `/plugin list` to see the actual scope, or sidestep the picker entirely with the shell form: `claude plugin uninstall openseo@openseo --scope user`.

If plugin skills don't appear, clear the plugin cache with `rm -rf ~/.claude/plugins/cache` — this clears every installed plugin's cache, not just StarSeo's, so reinstall anything else you have after — then restart Claude Code and reinstall the plugin.

If the StarSeo connection doesn't show as authenticated, run `/mcp`, select StarSeo, and complete the login.

## Other clients

This plugin is for Claude Code and Claude Cowork. For Codex CLI, use the [StarSeo plugin for Codex](/docs/codex-plugin) instead. For Cursor, Codex Desktop, or an API key setup, see [Set up StarSeo MCP](/docs/mcp) and [Set up StarSeo Agent Skills](/docs/skills/setup).
