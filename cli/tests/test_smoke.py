"""Smoke tests for kctl-claude CLI."""

from typer.testing import CliRunner

from kctl_claude.cli import app

runner = CliRunner()


class TestCLISmoke:
    def test_help_exits_zero(self) -> None:
        result = runner.invoke(app, ["--help"])
        assert result.exit_code == 0

    def test_version_flag(self) -> None:
        result = runner.invoke(app, ["--version"])
        assert result.exit_code == 0
        assert "0.1.0" in result.output
