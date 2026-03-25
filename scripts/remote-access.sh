#!/bin/bash
# =============================================================================
# remote-access.sh — SSH into the Claude Code container on Hetzner
# =============================================================================
# Usage:
#   ./scripts/remote-access.sh              # Shell into container
#   ./scripts/remote-access.sh kodemeio     # Attach to kodemeio tmux session
#   ./scripts/remote-access.sh --tunnel     # SSH tunnel for SDK API (port 3100)
# =============================================================================
set -euo pipefail

SERVER="${HETZNER_SSH:-root@dokploy.kodeme.io}"
CONTAINER="kodemeio-claude"

case "${1:-shell}" in
    --tunnel)
        echo "SSH tunnel: localhost:3100 → $SERVER → $CONTAINER:3100"
        echo "Press Ctrl+C to stop the tunnel."
        echo "Use: curl http://localhost:3100/health"
        # Get container IP on the Docker network, forward to it
        CONTAINER_IP=$(ssh "$SERVER" "docker inspect --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $CONTAINER")
        ssh -N -L "3100:${CONTAINER_IP}:3100" "$SERVER"
        ;;
    shell)
        ssh -t "$SERVER" "docker exec -it $CONTAINER zsh"
        ;;
    *)
        # Attach to a specific tmux session
        ssh -t "$SERVER" "docker exec -it $CONTAINER tmux attach -t '$1'"
        ;;
esac
