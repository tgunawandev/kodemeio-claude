"""kctl-claude backup — runtime volume backup/restore."""

from __future__ import annotations

import subprocess
from typing import Annotated

import typer

from kctl_claude.core.context import AppContext

app = typer.Typer(help="Backup and restore Claude Code runtime.")


@app.command("create")
def create_backup(ctx: typer.Context) -> None:
    """Backup container runtime volume."""
    actx: AppContext = ctx.obj
    repo = actx.repo_dir
    if not repo:
        actx.output.fail("Repo not found.")
        raise typer.Exit(code=1)
    script = repo / "scripts" / "backup-runtime.sh"
    if not script.is_file():
        actx.output.fail(f"Script not found: {script}")
        raise typer.Exit(code=1)
    subprocess.run(["bash", str(script)], check=False)


@app.command()
def restore(
    ctx: typer.Context,
    backup_dir: Annotated[str, typer.Argument(help="Path to backup directory")],
) -> None:
    """Restore runtime from backup."""
    actx: AppContext = ctx.obj
    out = actx.output
    out.print(f"Restoring from {backup_dir}...")
    result = subprocess.run(
        ["docker", "cp", f"{backup_dir}/.", "kodemeio-claude:/home/dev/.claude/"],
        check=False,
    )
    if result.returncode == 0:
        out.ok("Restore complete")
    else:
        out.fail("Restore failed")
        raise typer.Exit(code=1)
