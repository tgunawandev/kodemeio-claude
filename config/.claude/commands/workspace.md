Navigate to a workspace. Available workspaces:

| Shortcut | Container Path | Local Path |
|----------|---------------|------------|
| kodemeio-app | /opt/dev/kodemeio-app | ~/project/00-new-projects/kodemeio-app |
| kodemeio-core | /opt/dev/kodemeio-core | ~/project/00-new-projects/kodemeio-core |
| kodemeio-ext | /opt/dev/kodemeio-ext | ~/project/00-new-projects/kodemeio-ext |
| kodemeio-infra | /opt/dev/kodemeio-infra | ~/project/00-new-projects/kodemeio-infra |
| kontenos-app | /opt/dev/kontenos-app | ~/project/00-new-projects/kontenos-app |
| journaltx-app | /opt/dev/journaltx-app | ~/project/00-new-projects/journaltx-app |
| kidneuro-app | /opt/dev/kidneuro-app | ~/project/00-new-projects/kidneuro-app |

Use `cd` to navigate to the requested workspace, then run `git status` to show the current state. If the user says just a company name (e.g. "kodemeio"), navigate to the -app workspace. Auto-detect whether running in container (/opt/dev exists) or locally.
