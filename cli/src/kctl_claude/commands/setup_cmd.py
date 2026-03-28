"""kctl-claude setup — deploy Claude Code to local, VPS, or Docker."""

from __future__ import annotations

import subprocess

import typer

from kctl_claude.core.context import AppContext

app = typer.Typer(help="Setup Claude Code on local, VPS, or Docker.")


@app.command()
def local(ctx: typer.Context) -> None:
    """Setup local development environment (laptop)."""
    actx: AppContext = ctx.obj
    script = _get_script(actx, "setup-local.sh")
    subprocess.run(["bash", str(script)], check=False)


@app.command()
def vps(ctx: typer.Context, check: bool = typer.Option(False, "--check", help="Dry-run")) -> None:
    """Setup VPS/bare-metal server (requires sudo)."""
    actx: AppContext = ctx.obj
    script = _get_script(actx, "setup-vps.sh")
    args = ["sudo", "bash", str(script)]
    if check:
        args.append("--check")
    subprocess.run(args, check=False)


@app.command()
def docker(ctx: typer.Context) -> None:
    """Show Docker deployment commands."""
    actx: AppContext = ctx.obj
    out = actx.output
    out.header("DOCKER DEPLOYMENT")
    out.print("")
    out.print("  [bold]Production (full dev container):[/bold]")
    out.print("    docker compose -f docker-compose.prod.yml build")
    out.print("    docker compose -f docker-compose.prod.yml up -d")
    out.print("")
    out.print("  [bold]SDK-only (lightweight API):[/bold]")
    out.print("    docker compose -f docker-compose.sdk.yml build")
    out.print("    docker compose -f docker-compose.sdk.yml up -d")
    out.print("")
    out.print("  [bold]Local dev:[/bold]")
    out.print("    docker compose up -d")
    out.print("")
    out.print("  [bold]Before deploying:[/bold]")
    out.print("    kctl-claude env check      # Validate .env")
    out.print("    kctl-claude sync push      # Sync config to repo")
    out.print("    git push                   # Dokploy auto-deploys")
    out.print("")


@app.command("init")
def init_session(ctx: typer.Context) -> None:
    """Run session initialization (git, SSH, tmux, kctl tools)."""
    actx: AppContext = ctx.obj
    script = _get_script(actx, "init-session.sh")
    subprocess.run(["bash", str(script)], check=False)


@app.command()
def compare(ctx: typer.Context) -> None:
    """Compare setup modes side-by-side."""
    actx: AppContext = ctx.obj
    out = actx.output

    if actx.json_mode:
        out.json_out(
            {
                "modes": {
                    "local": {
                        "command": "kctl-claude setup local",
                        "config_sync": "manual (kctl-claude sync push/pull)",
                        "sdk_api": "optional (ENABLE_SDK_API=true)",
                        "isolation": "none (your laptop)",
                        "bypass_permissions": False,
                    },
                    "docker": {
                        "command": "docker compose -f docker-compose.prod.yml up -d",
                        "config_sync": "baked into image at build time",
                        "sdk_api": "optional (ENABLE_SDK_API=true)",
                        "isolation": "container (non-root dev user)",
                        "bypass_permissions": True,
                    },
                    "vps": {
                        "command": "sudo kctl-claude setup vps",
                        "config_sync": "init-session.sh at login",
                        "sdk_api": "systemd service",
                        "isolation": "server (non-root dev user)",
                        "bypass_permissions": True,
                    },
                }
            }
        )
        return

    out.header("DEPLOYMENT MODES")
    out.table(
        "Comparison",
        [("", "dim"), ("Local", "green"), ("Docker", "cyan"), ("VPS", "yellow")],
        [
            ["Setup", "kctl-claude setup local", "docker compose up", "sudo kctl-claude setup vps"],
            ["Target", "Laptop / workstation", "Hetzner via Dokploy", "Any Ubuntu server"],
            ["Config sync", "manual push/pull", "Baked at build", "init-session.sh"],
            ["SDK API", "Optional", "Optional", "systemd service"],
            ["Isolation", "None", "Container", "dev user + sudo"],
            ["Permissions", "Normal", "Bypass", "Bypass"],
            ["kctl tools", "uv install", "entrypoint.sh", "setup-vps.sh"],
            ["Repos", "Your local dirs", "Bind-mounted", "Cloned to /opt/dev"],
        ],
    )


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
