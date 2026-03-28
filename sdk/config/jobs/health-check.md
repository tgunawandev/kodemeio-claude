---
name: health-check
schedule: "0 */6 * * *"
workspace: kodemeio
enabled: false
priority: low
timeout_minutes: 5
forward_to_telegram: true
---

Quick infrastructure health check:

1. Run `docker ps --format "table {{.Names}}\t{{.Status}}"` to check container status
2. Check disk usage with `df -h /`
3. Check memory usage
4. Report any containers that are not running or unhealthy
