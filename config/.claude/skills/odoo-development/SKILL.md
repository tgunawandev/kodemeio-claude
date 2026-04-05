---
name: odoo-development
description: >
  General Odoo 18 Python development — ORM, models, fields, inheritance, security, views, computed fields, recordsets, and debugging. MUST use when writing or modifying Odoo Python code, creating models, adding fields, writing security rules, or debugging ORM issues. Triggers on: "create model", "add field", "inherit model", "record rule", "access rights", "computed field", "onchange", "Odoo Python", "_inherit", "_name", or ANY Odoo development question. NOT for FastAPI router/schema work (use odoo-fastapi-backend instead).
version: 1.0.0
allowed-tools: [
  "mcp__context7__*",
  "Write", "Read", "Edit", "Glob", "Grep",
  "Task", "TodoWrite", "AskUserQuestion",
  "Bash", "WebFetch", "WebSearch"
]
examples:
  - "Create a new Odoo model with computed fields and constraints"
  - "Implement model inheritance (_inherit vs _inherits)"
  - "Write security rules and access control lists"
  - "Debug ORM queries and optimize recordset operations"
  - "Create XML views (form, list, kanban, search)"
  - "Handle Many2one, One2many, Many2many relationships"
  - "Write server actions and automated actions"
  - "Create data migrations and pre/post-migrate scripts"
  - "Configure ir.config_parameter system parameters"
  - "Use Odoo's Environment, sudo(), with_context(), with_user()"
categories:
  - odoo
  - python
  - orm
  - erp-development
tags:
  - odoo-18
  - orm
  - models
  - fields
  - inheritance
  - security
  - views
  - recordset
  - computed-fields
  - constraints
  - migrations
---

# Odoo 18 Development Best Practices

Core Odoo Python development patterns. For FastAPI router/schema patterns, see the `odoo-fastapi-backend` skill instead.

## Model Definition

```python
from odoo import models, fields, api, _
from odoo.exceptions import ValidationError, UserError

class AppItem(models.Model):
    _name = "app.item"
    _description = "Application Item"
    _order = "sequence, name"
    _rec_name = "name"

    # --- Basic fields ---
    name = fields.Char(string="Name", required=True, index=True)
    active = fields.Boolean(default=True)
    sequence = fields.Integer(default=10)
    state = fields.Selection([
        ("draft", "Draft"),
        ("confirmed", "Confirmed"),
        ("done", "Done"),
        ("cancelled", "Cancelled"),
    ], default="draft", required=True, tracking=True)
    notes = fields.Html(sanitize=True)
    date = fields.Date(default=fields.Date.context_today)
    color = fields.Integer()  # for kanban

    # --- Relational fields ---
    company_id = fields.Many2one("res.company", default=lambda self: self.env.company)
    user_id = fields.Many2one("res.users", string="Responsible", default=lambda self: self.env.user)
    category_id = fields.Many2one("app.category", string="Category", ondelete="restrict")
    tag_ids = fields.Many2many("app.tag", string="Tags")
    line_ids = fields.One2many("app.item.line", "item_id", string="Lines")
    partner_id = fields.Many2one("res.partner", string="Partner")

    # --- Computed fields ---
    line_count = fields.Integer(compute="_compute_line_count", store=True)
    total_amount = fields.Float(compute="_compute_total_amount", store=True)
    display_name = fields.Char(compute="_compute_display_name")

    @api.depends("line_ids")
    def _compute_line_count(self):
        for record in self:
            record.line_count = len(record.line_ids)

    @api.depends("line_ids.amount")
    def _compute_total_amount(self):
        for record in self:
            record.total_amount = sum(record.line_ids.mapped("amount"))

    @api.depends("name", "state")
    def _compute_display_name(self):
        for record in self:
            record.display_name = f"[{record.state}] {record.name}" if record.name else ""

    # --- Constraints ---
    _sql_constraints = [
        ("name_uniq", "UNIQUE(name, company_id)", "Name must be unique per company."),
    ]

    @api.constrains("date")
    def _check_date(self):
        for record in self:
            if record.date and record.date > fields.Date.today():
                raise ValidationError(_("Date cannot be in the future."))

    # --- CRUD overrides ---
    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if not vals.get("name"):
                vals["name"] = self.env["ir.sequence"].next_by_code("app.item") or _("New")
        return super().create(vals_list)

    def write(self, vals):
        if "state" in vals and vals["state"] == "done":
            for record in self:
                if not record.line_ids:
                    raise UserError(_("Cannot complete item without lines."))
        return super().write(vals)

    def unlink(self):
        if any(rec.state not in ("draft", "cancelled") for rec in self):
            raise UserError(_("Cannot delete confirmed/done items."))
        return super().unlink()

    # --- Business methods ---
    def action_confirm(self):
        self.filtered(lambda r: r.state == "draft").write({"state": "confirmed"})

    def action_done(self):
        for record in self:
            if record.state != "confirmed":
                raise UserError(_("Only confirmed items can be marked done."))
        self.write({"state": "done"})

    def action_cancel(self):
        self.write({"state": "cancelled"})

    def action_reset_draft(self):
        self.filtered(lambda r: r.state == "cancelled").write({"state": "draft"})
```

## Inheritance Patterns

```python
# --- Classical inheritance (extend existing model) ---
class ResPartner(models.Model):
    _inherit = "res.partner"

    custom_field = fields.Char(string="Custom Field")
    item_ids = fields.One2many("app.item", "partner_id")
    item_count = fields.Integer(compute="_compute_item_count")

    @api.depends("item_ids")
    def _compute_item_count(self):
        for partner in self:
            partner.item_count = len(partner.item_ids)

# --- Delegation inheritance (embed another model) ---
class AppSpecialItem(models.Model):
    _name = "app.special.item"
    _inherits = {"app.item": "item_id"}  # gets all fields from app.item

    item_id = fields.Many2one("app.item", required=True, ondelete="cascade")
    special_field = fields.Char()

# --- Abstract model (mixin, no database table) ---
class GeoMixin(models.AbstractModel):
    _name = "geo.mixin"
    _description = "GPS Coordinates Mixin"

    latitude = fields.Float(digits=(10, 7))
    longitude = fields.Float(digits=(10, 7))

    def get_coordinates(self):
        self.ensure_one()
        return (self.latitude, self.longitude)

# Use the mixin:
class AppLocation(models.Model):
    _name = "app.location"
    _inherit = ["geo.mixin"]  # inherits latitude/longitude
```

## Environment & Recordsets

```python
# --- Environment ---
env = self.env                          # current environment
env.user                                # current user (res.users)
env.company                             # current company
env.context                             # context dict
env.cr                                  # database cursor
env.uid                                 # current user ID

# --- Switching context ---
env_sudo = self.sudo()                  # bypass access rights
env_user = self.with_user(user_id)      # run as another user
env_ctx = self.with_context(key="val")  # add context
env_company = self.with_company(company) # switch company

# --- Recordset operations ---
records = self.env["app.item"].search([("state", "=", "draft")], limit=10, order="name")
count = self.env["app.item"].search_count([("active", "=", True)])
record = self.env["app.item"].browse(42)        # by ID
records = self.env["app.item"].browse([1, 2, 3]) # multiple IDs

# Check existence
if not record.exists():
    raise UserError(_("Record not found."))

record.ensure_one()  # raises if not exactly one record

# Recordset arithmetic
all_records = set_a | set_b    # union
common = set_a & set_b         # intersection
diff = set_a - set_b           # difference

# Iteration & mapping
names = records.mapped("name")                   # list of values
partners = records.mapped("partner_id")          # recordset
filtered = records.filtered(lambda r: r.state == "draft")
sorted_recs = records.sorted(key=lambda r: r.name)

# --- Search domains ---
# Common operators: =, !=, >, <, >=, <=, like, ilike, in, not in,
#                   child_of, parent_of, =like, =ilike
domain = [
    ("state", "in", ["draft", "confirmed"]),
    ("date", ">=", "2026-01-01"),
    "|",
        ("name", "ilike", "test"),
        ("partner_id.name", "ilike", "test"),
]
```

## Security

### Access Control Lists (ir.model.access.csv)

```csv
id,name,model_id/id,group_id/id,perm_read,perm_write,perm_create,perm_unlink
app_item_user,app.item user,model_app_item,app_management.group_app_user,1,1,1,0
app_item_manager,app.item manager,model_app_item,app_management.group_app_manager,1,1,1,1
```

### Record Rules (XML)

```xml
<record id="app_item_user_rule" model="ir.rule">
    <field name="name">App Item: Users see own records</field>
    <field name="model_id" ref="model_app_item"/>
    <field name="domain_force">[('user_id', '=', user.id)]</field>
    <field name="groups" eval="[(4, ref('group_app_user'))]"/>
    <field name="perm_read" eval="True"/>
    <field name="perm_write" eval="True"/>
    <field name="perm_create" eval="True"/>
    <field name="perm_unlink" eval="False"/>
</record>

<!-- Manager sees all -->
<record id="app_item_manager_rule" model="ir.rule">
    <field name="name">App Item: Managers see all</field>
    <field name="model_id" ref="model_app_item"/>
    <field name="domain_force">[(1, '=', 1)]</field>
    <field name="groups" eval="[(4, ref('group_app_manager'))]"/>
</record>
```

### Security Groups

```xml
<record id="module_category_app" model="ir.module.category">
    <field name="name">App Management</field>
</record>

<record id="group_app_user" model="res.groups">
    <field name="name">User</field>
    <field name="category_id" ref="module_category_app"/>
</record>

<record id="group_app_manager" model="res.groups">
    <field name="name">Manager</field>
    <field name="category_id" ref="module_category_app"/>
    <field name="implied_ids" eval="[(4, ref('group_app_user'))]"/>
</record>
```

## Views

### Form View

```xml
<record id="app_item_view_form" model="ir.ui.view">
    <field name="name">app.item.form</field>
    <field name="model">app.item</field>
    <field name="arch" type="xml">
        <form>
            <header>
                <button name="action_confirm" type="object" string="Confirm"
                        class="btn-primary"
                        invisible="state != 'draft'"/>
                <button name="action_done" type="object" string="Done"
                        class="btn-primary"
                        invisible="state != 'confirmed'"/>
                <button name="action_cancel" type="object" string="Cancel"
                        invisible="state in ('done', 'cancelled')"/>
                <field name="state" widget="statusbar"
                       statusbar_visible="draft,confirmed,done"/>
            </header>
            <sheet>
                <group>
                    <group>
                        <field name="name"/>
                        <field name="category_id"/>
                        <field name="partner_id"/>
                    </group>
                    <group>
                        <field name="user_id"/>
                        <field name="date"/>
                        <field name="company_id" groups="base.group_multi_company"/>
                    </group>
                </group>
                <notebook>
                    <page string="Lines" name="lines">
                        <field name="line_ids">
                            <list editable="bottom">
                                <field name="product_id"/>
                                <field name="quantity"/>
                                <field name="amount"/>
                            </list>
                        </field>
                        <group class="oe_subtotal_footer">
                            <field name="total_amount"/>
                        </group>
                    </page>
                    <page string="Notes" name="notes">
                        <field name="notes"/>
                    </page>
                </notebook>
            </sheet>
            <chatter/>
        </form>
    </field>
</record>
```

### List View

```xml
<record id="app_item_view_list" model="ir.ui.view">
    <field name="name">app.item.list</field>
    <field name="model">app.item</field>
    <field name="arch" type="xml">
        <list decoration-danger="state == 'cancelled'"
              decoration-success="state == 'done'"
              default_order="sequence, name">
            <field name="sequence" widget="handle"/>
            <field name="name"/>
            <field name="category_id"/>
            <field name="partner_id"/>
            <field name="date"/>
            <field name="state" widget="badge"
                   decoration-info="state == 'draft'"
                   decoration-success="state == 'done'"/>
            <field name="total_amount" sum="Total"/>
        </list>
    </field>
</record>
```

### Search View

```xml
<record id="app_item_view_search" model="ir.ui.view">
    <field name="name">app.item.search</field>
    <field name="model">app.item</field>
    <field name="arch" type="xml">
        <search>
            <field name="name"/>
            <field name="partner_id"/>
            <field name="category_id"/>
            <filter name="my_items" string="My Items"
                    domain="[('user_id', '=', uid)]"/>
            <filter name="draft" string="Draft"
                    domain="[('state', '=', 'draft')]"/>
            <separator/>
            <filter name="archived" string="Archived"
                    domain="[('active', '=', False)]"/>
            <group expand="0" string="Group By">
                <filter name="group_state" string="State"
                        context="{'group_by': 'state'}"/>
                <filter name="group_category" string="Category"
                        context="{'group_by': 'category_id'}"/>
            </group>
        </search>
    </field>
</record>
```

## Manifest

```python
# __manifest__.py
{
    "name": "App Management",
    "version": "18.0.1.0.0",
    "category": "Services",
    "summary": "Short description",
    "license": "LGPL-3",
    "author": "Kodemeio",
    "website": "https://kodeme.io",
    "depends": [
        "base",
        "mail",  # for chatter/tracking
    ],
    "data": [
        # Load order matters!
        "security/app_security.xml",        # groups first
        "security/ir.model.access.csv",     # then ACLs
        "data/ir_sequence_data.xml",        # sequences
        "views/app_item_views.xml",         # views
        "views/app_menu.xml",              # menus last
    ],
    "demo": [
        "demo/app_demo.xml",
    ],
    "installable": True,
    "application": True,
    "auto_install": False,
}
```

## Migrations

```python
# migrations/18.0.1.1.0/pre-migrate.py
from odoo import api, SUPERUSER_ID
import logging

_logger = logging.getLogger(__name__)

def migrate(cr, version):
    """Pre-migration: runs before module update."""
    if not version:
        return
    _logger.info("Pre-migrating app_management from %s", version)
    # Raw SQL for schema changes before ORM loads
    cr.execute("ALTER TABLE app_item ADD COLUMN IF NOT EXISTS legacy_field VARCHAR")

# migrations/18.0.1.1.0/post-migrate.py
def migrate(cr, version):
    """Post-migration: runs after module update, ORM available."""
    if not version:
        return
    env = api.Environment(cr, SUPERUSER_ID, {})
    items = env["app.item"].search([("legacy_field", "!=", False)])
    for item in items:
        item.new_field = item.legacy_field
    _logger.info("Migrated %d items", len(items))
```

## Common Pitfalls

1. **Always iterate recordsets** — `for record in self:` in compute/constraint methods
2. **Use `ensure_one()`** before accessing fields on a single expected record
3. **`sudo()` bypasses ACLs** — use sparingly, always explain why
4. **`store=True` on computed fields** — needed for search/group_by, triggers on `@api.depends`
5. **`ondelete="restrict"`** on M2O — prevents orphaned records (default is `"set null"`)
6. **XML `invisible` in Odoo 18** — use Python expressions directly, not `attrs`
7. **`_sql_constraints`** — always include for uniqueness, DB-level enforcement
8. **`with_context()`** returns a NEW recordset — assign it: `records = records.with_context(...)`
9. **Never use `cr.execute()` for writes in normal code** — use ORM to respect ACLs and triggers
10. **`tracking=True`** on fields — requires `_inherit = ["mail.thread"]` for chatter
