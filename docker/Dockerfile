FROM node:22-bookworm-slim

ARG CLAUDE_CODE_VERSION=latest
ARG TZ=Asia/Jakarta

ENV TZ="$TZ"
ENV DEVCONTAINER=true
ENV TERM=xterm-256color
ENV SHELL=/bin/zsh

# System dependencies — complete dev toolchain
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Core
    git curl wget ca-certificates sudo \
    # Terminal
    tmux zsh fzf less nano vim \
    # Build tools
    build-essential python3 python3-pip python3-venv \
    # Docker CLI (uses host Docker via mounted socket)
    docker.io docker-compose \
    # Network
    openssh-client iptables ipset iproute2 dnsutils \
    # Utilities
    jq yq unzip procps man-db ffmpeg \
    # GitHub CLI
    gh \
    # Database clients
    postgresql-client redis-tools \
    # Document tools (for PDF generation via pandoc — used by product-factory)
    pandoc \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install uv (Python package manager)
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/home/dev/.local/bin:/root/.local/bin:$PATH"

# Install pnpm
RUN npm install -g pnpm@latest

# Install Claude Code + Playwright CLI + dev formatters
RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION} @playwright/cli prettier

# Install ruff (Python linter/formatter — used by PostToolUse hooks)
RUN pip3 install --break-system-packages ruff

# Install worktrunk (Git worktree manager for parallel AI agents)
RUN curl -fsSL https://github.com/max-sixty/worktrunk/releases/latest/download/wt-x86_64-unknown-linux-gnu.tar.xz \
    | tar -xJ -C /usr/local/bin/ wt && chmod +x /usr/local/bin/wt

# Install Terraform (for kodemeio-infra: Hetzner, Cloudflare, Dokploy IaC)
RUN curl -fsSL https://releases.hashicorp.com/terraform/1.12.1/terraform_1.12.1_linux_amd64.zip \
    -o /tmp/terraform.zip && unzip /tmp/terraform.zip -d /usr/local/bin/ && rm /tmp/terraform.zip

# Create dev user with same UID/GID as host user (for bind mount permissions)
ARG DEV_UID=1000
ARG DEV_GID=1000
RUN groupadd -g ${DEV_GID} dev && \
    useradd -m -s /bin/zsh -u ${DEV_UID} -g ${DEV_GID} -G docker dev && \
    echo "dev ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/dev

# Persistent history
RUN mkdir -p /commandhistory && chown dev:dev /commandhistory
ENV HISTFILE=/commandhistory/.zsh_history

# Workspace + Claude config
RUN mkdir -p /opt/dev /home/dev/.claude && \
    chown -R dev:dev /opt/dev /home/dev

# Copy configs — includes settings, agents, skills, commands, hooks, CLAUDE.md
COPY config/tmux.conf /home/dev/.tmux.conf
COPY config/zshrc /home/dev/.zshrc
COPY config/.claude/ /home/dev/.claude/

# Keep a baked-in backup — entrypoint seeds the runtime volume from this
# on first run (volume mount overwrites /home/dev/.claude/ at runtime)
RUN cp -r /home/dev/.claude /opt/claude-config-baked

# Copy SDK server — compile TypeScript then prune dev deps
COPY sdk/ /opt/sdk/
RUN cd /opt/sdk && pnpm install --frozen-lockfile && pnpm run build && pnpm prune --prod

# Copy scripts + health check into PATH
COPY scripts/ /opt/scripts/
RUN chmod +x /opt/scripts/*.sh && \
    cp /opt/scripts/health.sh /usr/local/bin/health.sh

# Copy entrypoint and firewall
COPY docker/init-firewall.sh /usr/local/bin/
COPY docker/entrypoint.sh /usr/local/bin/

RUN chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/init-firewall.sh && \
    chown -R dev:dev /home/dev /opt/sdk /opt/scripts /opt/claude-config-baked

USER dev
WORKDIR /opt/dev

EXPOSE 3100

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["tmux", "new-session", "-A", "-s", "main"]
