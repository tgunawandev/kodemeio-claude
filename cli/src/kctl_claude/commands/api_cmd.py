"""kctl-claude api — interact with the SDK REST API."""

from __future__ import annotations

from typing import Annotated

import typer
import httpx

from kctl_claude.core.context import AppContext

app = typer.Typer(help="SDK REST API operations.")

DEFAULT_URL = "http://localhost:3100"


def _base_url() -> str:
    import os

    return os.environ.get("SDK_BASE_URL", DEFAULT_URL)


def _api_key() -> str:
    import os

    return os.environ.get("SDK_API_KEY", "")


@app.command()
def health(ctx: typer.Context) -> None:
    """Check SDK API health."""
    actx: AppContext = ctx.obj
    out = actx.output
    try:
        resp = httpx.get(f"{_base_url()}/health", timeout=5)
        data = resp.json()
        if actx.json_mode:
            out.json_out(data)
        else:
            out.ok(f"Status: {data.get('status', 'unknown')}")
            out.ok(f"Tasks: {data.get('inFlight', 0)}/{data.get('maxConcurrent', 3)} in flight")
    except (httpx.ConnectError, httpx.TimeoutException) as e:
        out.fail(f"SDK API unreachable: {e}")
        raise typer.Exit(code=1)


@app.command()
def task(
    ctx: typer.Context,
    prompt: Annotated[str, typer.Argument(help="Task prompt for Claude Code")],
    workspace: Annotated[str, typer.Option("--workspace", "-w", help="Workspace name")] = "",
    bare: Annotated[bool, typer.Option("--bare", help="Skip auto-discovery")] = False,
) -> None:
    """Send a task to Claude Code via SDK API."""
    actx: AppContext = ctx.obj
    out = actx.output
    headers = {"Content-Type": "application/json"}
    key = _api_key()
    if key:
        headers["Authorization"] = f"Bearer {key}"

    body: dict = {"prompt": prompt}
    if workspace:
        body["workspace"] = workspace
    if bare:
        body["bare"] = True

    try:
        resp = httpx.post(f"{_base_url()}/task", json=body, headers=headers, timeout=310)
        data = resp.json()
        if actx.json_mode:
            out.json_out(data)
        else:
            if resp.status_code == 200:
                out.ok("Task completed")
                out.print(data.get("result", str(data)))
            else:
                out.fail(f"Error {resp.status_code}: {data.get('error', str(data))}")
                raise typer.Exit(code=1)
    except httpx.TimeoutException:
        out.fail("Task timed out (310s)")
        raise typer.Exit(code=1)
    except httpx.ConnectError as e:
        out.fail(f"SDK API unreachable: {e}")
        raise typer.Exit(code=1)
