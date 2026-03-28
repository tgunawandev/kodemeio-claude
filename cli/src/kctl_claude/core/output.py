"""Rich output helpers for kctl-claude."""

from __future__ import annotations

import json
import sys

from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text


class Output:
    """Handles pretty / JSON output modes."""

    def __init__(self, json_mode: bool = False, quiet: bool = False) -> None:
        self.json_mode = json_mode
        self.quiet = quiet
        self.console = Console(stderr=True) if json_mode else Console()

    def print(self, msg: str) -> None:
        if not self.quiet:
            self.console.print(msg)

    def ok(self, msg: str) -> None:
        self.console.print(f"  [green]●[/green] {msg}")

    def warn(self, msg: str) -> None:
        self.console.print(f"  [yellow]●[/yellow] {msg}")

    def fail(self, msg: str) -> None:
        self.console.print(f"  [red]●[/red] {msg}")

    def dim(self, msg: str) -> None:
        self.console.print(f"  [dim]{msg}[/dim]")

    def header(self, msg: str) -> None:
        self.console.print(f"\n[bold cyan]{msg}[/bold cyan]")

    def table(
        self,
        title: str,
        columns: list[tuple[str, str]],
        rows: list[list[str]],
        data_for_json: list[dict] | None = None,
    ) -> None:
        if self.json_mode:
            print(json.dumps(data_for_json or []))
            return
        t = Table(title=title, show_header=True, header_style="bold")
        for name, style in columns:
            t.add_column(name, style=style)
        for row in rows:
            t.add_row(*row)
        self.console.print(t)

    def detail(self, title: str, data: dict, data_for_json: dict | None = None) -> None:
        if self.json_mode:
            print(json.dumps(data_for_json or data))
            return
        lines = [f"[bold]{k}:[/bold] {v}" for k, v in data.items()]
        self.console.print(Panel("\n".join(lines), title=title))

    def json_out(self, data: dict | list) -> None:
        print(json.dumps(data, indent=2, default=str))
