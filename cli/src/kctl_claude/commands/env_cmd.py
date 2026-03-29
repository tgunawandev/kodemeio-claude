"""kctl-claude env — environment management."""

from __future__ import annotations

import subprocess

import typer

from kctl_claude.core.callbacks import AppContext

app = typer.Typer(help="Environment file management.")


@app.command()
def generate(ctx: typer.Context) -> None:
    """Interactive .env generator."""
    actx: AppContext = ctx.obj
    script = _get_script(actx, "generate-env.sh")
    subprocess.run(["bash", str(script)], check=False)


@app.command()
def check(ctx: typer.Context) -> None:
    """Validate .env file."""
    actx: AppContext = ctx.obj
    script = _get_script(actx, "generate-env.sh")
    result = subprocess.run(["bash", str(script), "--check"], check=False)
    raise typer.Exit(code=result.returncode)


@app.command()
def deploy(ctx: typer.Context) -> None:
    """Deploy .env to Hetzner server."""
    actx: AppContext = ctx.obj
    repo = actx.repo_dir
    if not repo:
        actx.output.fail("Repo not found.")
        raise typer.Exit(code=1)
    import os

    host = os.environ.get("HETZNER_SSH", "root@dokploy.kodeme.io")
    env_file = repo / ".env"
    if not env_file.is_file():
        # Try .env.prod
        env_file = repo / ".env.prod"
    if not env_file.is_file():
        actx.output.fail("No .env or .env.prod found")
        raise typer.Exit(code=1)
    actx.output.print(f"Deploying {env_file.name} → {host}:/opt/kodemeio-claude/.env")
    subprocess.run(["scp", str(env_file), f"{host}:/opt/kodemeio-claude/.env"], check=False)


def _get_script(actx: AppContext, name: str):
    repo = actx.repo_dir
    if not repo:
        actx.output.fail("Repo not found.")
        raise typer.Exit(code=1)
    script = repo / "scripts" / name
    if not script.is_file():
        actx.output.fail(f"Script not found: {script}")
        raise typer.Exit(code=1)
    return script
