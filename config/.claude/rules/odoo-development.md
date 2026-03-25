---
description: Odoo 18 module development standards
globs: "**/odoo*/**,**/src/private/**,**/__manifest__.py,**/__openerp__.py"
---

# Odoo Development Rules

- All modules must have `__manifest__.py` with proper metadata and `installable: True`
- Use `_inherit` for extending existing models, `_name` for new models
- Follow OCA coding standards for all contributions
- Use `fields.Many2one` with `ondelete='cascade'` or `'restrict'` — never leave default
- Always define `_description` on new models
- Security: every model needs `ir.model.access.csv` and `security.xml` if using record rules
- Test with `odoo-bin -d test_db --test-enable --stop-after-init -i module_name`
- For FastAPI routers: use `odoo-fastapi-backend` skill patterns, not generic FastAPI
- Database: PostgreSQL 16, shared instance across all Odoo versions
