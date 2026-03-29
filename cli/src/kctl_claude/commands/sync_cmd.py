"""kctl-claude sync — config sync between local and repo."""

from __future__ import annotations

import subprocess

import typer

from kctl_claude.core.callbacks import AppContext

app = typer.Typer(help="Sync config between local ~/.claude and repo.")


@app.command()
def push(ctx: typer.Context) -> None:
    """Sync local config → repo (for Docker deployment)."""
    actx: AppContext = ctx.obj
    repo = actx.repo_dir
    if not repo:
        actx.output.fail("Repo not found. Run from inside kodemeio-claude or set up paths.")
        raise typer.Exit(code=1)
    script = repo / "scripts" / "sync-config.sh"
    if not script.is_file():
        actx.output.fail(f"Script not found: {script}")
        raise typer.Exit(code=1)
    subprocess.run(["bash", str(script)], check=False)


@app.command()
def pull(ctx: typer.Context) -> None:
    """Sync repo config → local (update local environment)."""
    actx: AppContext = ctx.obj
    repo = actx.repo_dir
    if not repo:
        actx.output.fail("Repo not found.")
        raise typer.Exit(code=1)
    script = repo / "scripts" / "setup-local.sh"
    if not script.is_file():
        actx.output.fail(f"Script not found: {script}")
        raise typer.Exit(code=1)
    subprocess.run(["bash", str(script), "--sync"], check=False)


@app.command()
def diff(ctx: typer.Context) -> None:
    """Preview what push would change (dry-run)."""
    actx: AppContext = ctx.obj
    repo = actx.repo_dir
    if not repo:
        actx.output.fail("Repo not found.")
        raise typer.Exit(code=1)
    script = repo / "scripts" / "sync-config.sh"
    if not script.is_file():
        actx.output.fail(f"Script not found: {script}")
        raise typer.Exit(code=1)
    subprocess.run(["bash", str(script), "--dry-run"], check=False)


@app.command()
def secrets(ctx: typer.Context) -> None:
    """Deploy kctl credentials to Hetzner."""
    actx: AppContext = ctx.obj
    repo = actx.repo_dir
    if not repo:
        actx.output.fail("Repo not found.")
        raise typer.Exit(code=1)
    script = repo / "scripts" / "sync-secrets.sh"
    if not script.is_file():
        actx.output.fail(f"Script not found: {script}")
        raise typer.Exit(code=1)
    subprocess.run(["bash", str(script)], check=False)
