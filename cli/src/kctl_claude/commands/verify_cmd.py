"""kctl-claude verify — 14-point config audit."""

from __future__ import annotations

import subprocess

import typer

from kctl_claude.core.context import AppContext

app = typer.Typer(help="Verify Claude Code config completeness.")


@app.callback(invoke_without_command=True)
def verify(ctx: typer.Context) -> None:
    """Run 14-point config verification."""
    if ctx.invoked_subcommand is not None:
        return
    actx: AppContext = ctx.obj
    repo = actx.repo_dir
    if repo:
        script = repo / "scripts" / "verify-scores.sh"
        if script.is_file():
            subprocess.run(["bash", str(script)], check=False)
            return
    # Fallback: run against local dir
    actx.output.warn("Repo not found — checking local ~/.claude/ only")
    _verify_local(actx)


def _verify_local(actx: AppContext) -> None:
    """Basic local verification without the repo script."""
    out = actx.output
    d = actx.claude_dir
    issues = 0

    out.header("LOCAL CONFIG VERIFICATION")

    # Rules
    rules = list((d / "rules").glob("*.md")) if (d / "rules").is_dir() else []
    if len(rules) >= 3:
        out.ok(f"Rules: {len(rules)} files")
    else:
        out.warn(f"Rules: {len(rules)} files (need ≥3)")
        issues += 1

    # Agents
    agents = list((d / "agents").glob("*.md")) if (d / "agents").is_dir() else []
    if len(agents) >= 2:
        out.ok(f"Agents: {len(agents)} files")
    else:
        out.warn(f"Agents: {len(agents)} files (need ≥2)")
        issues += 1

    # Skills
    skills = [p for p in (d / "skills").iterdir() if p.is_dir()] if (d / "skills").is_dir() else []
    if len(skills) >= 10:
        out.ok(f"Skills: {len(skills)} directories")
    else:
        out.warn(f"Skills: {len(skills)} directories (need ≥10)")
        issues += 1

    # Settings
    sf = d / "settings.json"
    if sf.is_file():
        text = sf.read_text()
        out.ok("settings.json: found")
        if '"PreToolUse"' in text:
            out.ok("Hooks: configured")
        else:
            out.warn("Hooks: missing PreToolUse")
            issues += 1
        if '"enabledPlugins"' in text:
            out.ok("Plugins: configured")
        else:
            out.warn("Plugins: not configured")
            issues += 1
    else:
        out.fail("settings.json: missing")
        issues += 1

    # Auth
    if (d / ".credentials.json").is_file():
        out.ok("Credentials: found")
    else:
        out.warn("Credentials: missing (run: claude login)")
        issues += 1

    out.print("")
    if issues:
        out.warn(f"{issues} issue(s) found")
        raise typer.Exit(code=1)
    out.ok("All checks passed")
