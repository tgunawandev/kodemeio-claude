#!/bin/bash
# =============================================================================
# init-firewall.sh — Network security rules for Claude Code container
# =============================================================================
# Restricts outbound traffic to whitelisted domains only.
# Requires: --cap-add=NET_ADMIN on docker run
# =============================================================================
set -euo pipefail

echo "Setting up firewall rules..."

# Flush existing rules
iptables -F OUTPUT 2>/dev/null || true

# Allow loopback
iptables -A OUTPUT -o lo -j ACCEPT

# Allow established connections
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow DNS
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 53 -j ACCEPT

# Whitelisted domains — resolve and allow
ALLOWED_DOMAINS=(
    # Anthropic / Claude
    "api.anthropic.com"
    "claude.ai"
    "statsig.anthropic.com"
    "sentry.io"
    # GitHub
    "github.com"
    "api.github.com"
    "objects.githubusercontent.com"
    # npm / Node
    "registry.npmjs.org"
    # PyPI / Python
    "pypi.org"
    "files.pythonhosted.org"
    # Docker Hub
    "registry-1.docker.io"
    "auth.docker.io"
    "production.cloudflare.docker.com"
    # Kodemeio infrastructure
    "dokploy.kodeme.io"
    "auth.kodeme.io"
    "plane.kodeme.io"
    "glitchtip.kodeme.io"
)

# Create ipset for efficient matching
ipset create allowed_ips hash:ip 2>/dev/null || ipset flush allowed_ips

for domain in "${ALLOWED_DOMAINS[@]}"; do
    # Resolve domain to IPs and add to set
    for ip in $(dig +short "$domain" A 2>/dev/null | grep -E '^[0-9]'); do
        ipset add allowed_ips "$ip" 2>/dev/null || true
    done
done

# Allow traffic to whitelisted IPs
iptables -A OUTPUT -m set --match-set allowed_ips dst -j ACCEPT

# Allow internal Docker network (172.16.0.0/12, 10.0.0.0/8, 192.168.0.0/16)
iptables -A OUTPUT -d 172.16.0.0/12 -j ACCEPT
iptables -A OUTPUT -d 10.0.0.0/8 -j ACCEPT
iptables -A OUTPUT -d 192.168.0.0/16 -j ACCEPT

# Drop everything else
iptables -A OUTPUT -j DROP

echo "Firewall configured. Allowed ${#ALLOWED_DOMAINS[@]} domains."
