"""Main CLI entry point for kctl-claude."""

from __future__ import annotations

import sys
from typing import Annotated

import typer

from kctl_claude import __version__
from kctl_claude.commands.api_cmd import app as api_app
from kctl_claude.commands.backup_cmd import app as backup_app
from kctl_claude.commands.config_cmd import app as config_app
from kctl_claude.commands.env_cmd import app as env_app
from kctl_claude.commands.setup_cmd import app as setup_app
from kctl_claude.commands.status_cmd import app as status_app
from kctl_claude.commands.sync_cmd import app as sync_app
from kctl_claude.commands.verify_cmd import app as verify_app
from kctl_claude.core.callbacks import AppContext

app = typer.Typer(
    name="kctl-claude",
    help="Kodemeio Claude Code CLI — manage local and remote Claude Code environments.",
    invoke_without_command=True,
    rich_markup_mode="rich",
    pretty_exceptions_enable=False,
)

# Register command groups
app.add_typer(config_app, name="config")
app.add_typer(status_app, name="status")
app.add_typer(sync_app, name="sync")
app.add_typer(verify_app, name="verify")
app.add_typer(api_app, name="api")
app.add_typer(env_app, name="env")
app.add_typer(backup_app, name="backup")
app.add_typer(setup_app, name="setup")


@app.callback()
def main(
    ctx: typer.Context,
    json_output: Annotated[bool, typer.Option("--json", help="JSON output")] = False,
    quiet: Annotated[bool, typer.Option("--quiet", "-q", help="Suppress info messages")] = False,
    version: Annotated[bool, typer.Option("--version", "-V", help="Show version")] = False,
) -> None:
    """Global options applied to all commands."""
    if version:
        typer.echo(f"kctl-claude {__version__}")
        raise typer.Exit()

    ctx.ensure_object(dict)
    ctx.obj = AppContext(json_mode=json_output, quiet=quiet)

    # If no subcommand, show help
    if ctx.invoked_subcommand is None and not version:
        typer.echo(ctx.get_help())
        raise typer.Exit()


def _run() -> None:
    """Entry point with error handling."""
    try:
        app()
    except KeyboardInterrupt:
        sys.exit(130)
    except Exception as e:
        typer.echo(f"Error: {e}", err=True)
        sys.exit(1)
