---
description: how to create and manage agent skills for AlloFlow development
---

# Creating Agent Skills

Skills extend the agent's capabilities for specialized tasks. Each skill is a self-contained directory with instructions and assets.

## Skill Structure

```
.gemini/skills/
  my-skill/
    SKILL.md          # Required - main instructions with YAML frontmatter
    scripts/          # Optional - helper scripts
    examples/         # Optional - reference implementations
    resources/        # Optional - templates, assets
```

## SKILL.md Format

```yaml
---
name: my-skill-name
description: Short description used for skill discovery and matching
---

# Skill Title

Detailed markdown instructions for the skill.
Step-by-step procedures, constraints, and examples.
```

## Key Rules

1. The `description` field is critical — the agent uses it to match user requests to skills
2. Use specific keywords like "review", "deploy", "migrate", "audit" in descriptions
3. Skills are discovered at session start from `~/.gemini/skills/` and `.gemini/skills/`
4. Skills can be managed via `gemini skills list|install|enable|disable|reload`

## Creating a New Skill

1. Create a directory under `.gemini/skills/` with a descriptive name
2. Add a `SKILL.md` with YAML frontmatter (`name` and `description`)
3. Add markdown content with step-by-step instructions
4. Optionally add `scripts/`, `examples/`, or `resources/` subdirectories
5. The skill will be auto-discovered on next session start
