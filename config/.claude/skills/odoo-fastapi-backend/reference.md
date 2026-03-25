# Odoo Comprehensive Reference Documentation

Complete reference guide for Odoo development, covering addon development, OCA integration, modern DevOps practices, and enterprise patterns.

## Table of Contents

1. [Odoo Architecture Fundamentals](#odoo-architecture-fundamentals)
2. [Module Development](#module-development)
3. [Model Development](#model-development)
4. [View Architecture](#view-architecture)
5. [Security Implementation](#security-implementation)
6. [API Development](#api-development)
7. [Testing Frameworks](#testing-frameworks)
8. [OCA Integration](#oca-integration)
9. [Performance Optimization](#performance-optimization)
10. [DevOps and Deployment](#devops-and-deployment)

## Odoo Architecture Fundamentals

### Core Technical Stack (2024/2025)

**Backend Architecture:**
```python
# Technical Components
- Python 3.8+ (Odoo 18) / Python 3.10+ (Odoo 19)
- PostgreSQL 12+ (database backend)
- PostgreSQL ORM (Object-Relational Mapping)
- XML-RPC and JSON-RPC protocols
- Werkzeug WSGI server
- Gunicorn/Unicorn for production

# Frontend Architecture
- JavaScript (ES6+) with OWL framework
- QWeb templating engine
- Bootstrap 5 for UI components
- SCSS for styling
- jQuery (legacy support)
```

### MVC Pattern Implementation

**Model Layer (Data Access):**
```python
# models/res_partner.py
from odoo import models, fields, api

class ResPartner(models.Model):
    _name = 'res.partner'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _description = 'Contact'
    _order = 'name'

    # Field definitions
    name = fields.Char(string='Name', required=True, tracking=True)
    email = fields.Char(string='Email', tracking=True)
    phone = fields.Char(string='Phone')
    is_company = fields.Boolean(string='Is a Company', default=False)
    parent_id = fields.Many2one('res.partner', string='Related Company')
    child_ids = fields.One2many('res.partner', 'parent_id', string='Contacts')

    # Computed fields
    display_name = fields.Char(
        compute='_compute_display_name',
        inverse='_inverse_display_name',
        search='_search_display_name'
    )

    @api.depends('name', 'is_company')
    def _compute_display_name(self):
        for record in self:
            if record.is_company:
                record.display_name = record.name
            else:
                record.display_name = f"{record.name} (Contact)"
```

**View Layer (Presentation):**
```xml
<!-- views/res_partner_views.xml -->
<odoo>
    <record id="view_partner_form" model="ir.ui.view">
        <field name="name">res.partner.form</field>
        <field name="model">res.partner</field>
        <field name="arch" type="xml">
            <form string="Contact">
                <sheet>
                    <div class="oe_button_box" name="button_box">
                        <button name="toggle_active" type="object" class="oe_stat_button" icon="fa-archive">
                            <field name="active" widget="boolean_button" options='{"terminology": "archive"}'/>
                        </button>
                    </div>
                    <group>
                        <group>
                            <field name="name"/>
                            <field name="is_company"/>
                            <field name="email" widget="email"/>
                            <field name="phone" widget="phone"/>
                        </group>
                        <group>
                            <field name="parent_id" domain="[('is_company', '=', True)]"/>
                            <field name="create_date" readonly="1"/>
                            <field name="write_date" readonly="1"/>
                        </group>
                    </group>
                </sheet>
                <div class="oe_chatter">
                    <field name="message_follower_ids"/>
                    <field name="activity_ids"/>
                    <field name="message_ids"/>
                </div>
            </form>
        </field>
    </record>
</odoo>
```

**Controller Layer (Business Logic):**
```python
# controllers/main.py
from odoo import http
from odoo.http import request, content_disposition

class MainController(http.Controller):

    @http.route('/api/partners', type='json', auth='user', methods=['GET'])
    def get_partners(self, **kwargs):
        """Get partners with optional filtering"""
        partners = request.env['res.partner'].search([])
        return {
            'partners': partners.read(['name', 'email', 'phone', 'is_company'])
        }

    @http.route('/api/partners', type='json', auth='user', methods=['POST'])
    def create_partner(self, **kwargs):
        """Create a new partner"""
        partner = request.env['res.partner'].create({
            'name': kwargs.get('name'),
            'email': kwargs.get('email'),
            'phone': kwargs.get('phone'),
            'is_company': kwargs.get('is_company', False)
        })
        return {'id': partner.id, 'name': partner.name}
```

## Module Development

### Module Structure

**Standard Module Architecture:**
```
my_custom_module/
├── __init__.py              # Package initialization
├── __manifest__.py          # Module manifest (metadata)
├── models/                  # Model definitions
│   ├── __init__.py
│   ├── res_partner.py       # Model extensions
│   └── custom_model.py      # Custom models
├── views/                   # View definitions
│   ├── res_partner_views.xml
│   └── custom_model_views.xml
├── controllers/             # Web controllers
│   ├── __init__.py
│   └── main.py
├── security/                # Security configuration
│   ├── ir.model.access.csv
│   └── security_groups.xml
├── data/                    # Data files
│   ├── ir.config_parameter.xml
│   └── demo_data.xml
├── static/                  # Static assets
│   ├── css/
│   ├── js/
│   └── images/
├── tests/                   # Test files
│   ├── __init__.py
│   ├── test_models.py
│   └── test_controllers.py
├── wizard/                  # Transient models
│   ├── __init__.py
│   └── custom_wizard.py
├── report/                  # Custom reports
│   ├── __init__.py
│   └── custom_report.xml
├── lib/                     # External libraries
├── migrations/              # Migration scripts
│   └── 1.0.0.1/
└── README.md               # Module documentation
```

### Module Manifest Configuration

**Complete __manifest__.py Template:**
```python
# __manifest__.py
{
    'name': 'My Custom Module',
    'version': '18.0.1.0.0',
    'category': 'Extra Tools',
    'summary': 'Custom module for specific business needs',
    'description': """
        Long description of the module functionality.
        This module provides:
        - Custom partner management
        - Enhanced reporting
        - API endpoints
        - Integration capabilities
    """,
    'author': 'Your Company',
    'website': 'https://www.yourcompany.com',
    'license': 'LGPL-3',
    'depends': [
        'base',
        'mail',
        'contacts',
        'web',
    ],
    'data': [
        # Security
        'security/security_groups.xml',
        'security/ir.model.access.csv',

        # Data files
        'data/ir.config_parameter.xml',
        'data/demo_data.xml',

        # Views
        'views/res_partner_views.xml',
        'views/custom_model_views.xml',
        'views/menu_items.xml',

        # Reports
        'report/custom_report.xml',

        # Wizards
        'wizard/custom_wizard_views.xml',
    ],
    'demo': [
        'data/demo_data.xml',
    ],
    'installable': True,
    'auto_install': False,
    'application': True,
    'sequence': 100,
    'pre_init_hook': 'pre_init_hook',
    'post_init_hook': 'post_init_hook',
    'uninstall_hook': 'uninstall_hook',
    'external_dependencies': {
        'python': ['requests', 'python-dateutil'],
        'bin': ['wkhtmltopdf'],
    },
    'images': [
        'static/description/banner.png',
        'static/description/main_screenshot.png',
    ],
    'price': 0.00,
    'currency': 'EUR',
    'live_test_url': 'https://demo.yourcompany.com',
    'support': 'support@yourcompany.com',
}
```

### Initialization and Migration Hooks

**Pre/Post Installation Hooks:**
```python
# __init__.py
import logging

_logger = logging.getLogger(__name__)

def pre_init_hook(cr):
    """Pre-initialization hook"""
    _logger.info("Running pre-initialization hook")
    # Create custom database tables or run migrations
    cr.execute("""
        CREATE TABLE IF NOT EXISTS custom_table (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

def post_init_hook(cr, registry):
    """Post-initialization hook"""
    _logger.info("Running post-initialization hook")
    env = api.Environment(cr, 1, {})  # Admin user

    # Create default records
    if not env['res.groups'].search([('name', '=', 'Custom Group')]):
        env['res.groups'].create({
            'name': 'Custom Group',
            'comment': 'Group for custom module access'
        })

def uninstall_hook(cr, registry):
    """Uninstallation hook"""
    _logger.info("Running uninstallation hook")
    # Clean up custom data
    cr.execute("DROP TABLE IF EXISTS custom_table;")
```

## Model Development

### Field Types and Definitions

**Complete Field Reference:**
```python
# models/custom_model.py
from odoo import models, fields, api, _
from odoo.exceptions import ValidationError

class CustomModel(models.Model):
    _name = 'custom.model'
    _description = 'Custom Model'
    _order = 'name'
    _rec_name = 'display_name'
    _inherit = ['mail.thread', 'mail.activity.mixin']

    # Basic Fields
    name = fields.Char(
        string='Name',
        required=True,
        tracking=True,
        copy=False,
        help="Human-readable name"
    )

    display_name = fields.Char(
        compute='_compute_display_name',
        store=True,
        string='Display Name'
    )

    # Numeric Fields
    amount = fields.Monetary(
        string='Amount',
        currency_field='currency_id',
        tracking=True
    )

    quantity = fields.Float(
        string='Quantity',
        digits=(16, 2),
        default=0.0,
        help="Quantity with decimal precision"
    )

    count_items = fields.Integer(
        string='Item Count',
        default=0,
        help="Number of items"
    )

    # Date and Time Fields
    date_field = fields.Date(
        string='Date',
        default=fields.Date.today,
        tracking=True
    )

    datetime_field = fields.Datetime(
        string='DateTime',
        default=fields.Datetime.now,
        tracking=True
    )

    # Boolean and Selection
    is_active = fields.Boolean(
        string='Active',
        default=True,
        tracking=True
    )

    state = fields.Selection([
        ('draft', 'Draft'),
        ('confirmed', 'Confirmed'),
        ('done', 'Done'),
        ('cancelled', 'Cancelled')
    ], string='State', default='draft', tracking=True)

    # Text Fields
    description = fields.Text(
        string='Description',
        tracking=True,
        translate=True
    )

    notes = fields.Html(
        string='Notes',
        sanitize_attributes=False
    )

    # Relational Fields
    partner_id = fields.Many2one(
        'res.partner',
        string='Partner',
        required=True,
        tracking=True,
        domain="[('is_company', '=', True)]",
        help="Related partner"
    )

    user_id = fields.Many2one(
        'res.users',
        string='Responsible User',
        default=lambda self: self.env.user,
        tracking=True
    )

    tag_ids = fields.Many2many(
        'custom.tag',
        'custom_model_tag_rel',
        'model_id', 'tag_id',
        string='Tags'
    )

    line_ids = fields.One2many(
        'custom.model.line',
        'model_id',
        string='Lines'
    )

    # Computed and Related Fields
    currency_id = fields.Many2one(
        'res.currency',
        string='Currency',
        related='company_id.currency_id',
        readonly=True
    )

    total_amount = fields.Float(
        compute='_compute_total_amount',
        store=True,
        string='Total Amount'
    )

    company_id = fields.Many2one(
        'res.company',
        string='Company',
        default=lambda self: self.env.company,
        required=True
    )

    @api.depends('line_ids.amount')
    def _compute_total_amount(self):
        for record in self:
            record.total_amount = sum(line.amount for line in record.line_ids)

    @api.depends('name', 'partner_id.name')
    def _compute_display_name(self):
        for record in self:
            if record.partner_id:
                record.display_name = f"{record.name} - {record.partner_id.name}"
            else:
                record.display_name = record.name

    # Constraints and Validations
    @api.constrains('amount')
    def _check_amount(self):
        for record in self:
            if record.amount < 0:
                raise ValidationError(_('Amount must be positive!'))

    # SQL Constraints
    _sql_constraints = [
        ('name_unique', 'UNIQUE(name)', 'Name must be unique!'),
        ('amount_check', 'CHECK(amount >= 0)', 'Amount must be non-negative!'),
    ]

    # ORM Methods
    @api.model
    def create(self, vals):
        if 'name' not in vals:
            vals['name'] = self.env['ir.sequence'].next_by_code('custom.model') or 'New'
        return super().create(vals)

    def write(self, vals):
        # Custom logic before write
        if 'state' in vals and vals['state'] == 'done':
            self._validate_before_done()
        return super().write(vals)

    def unlink(self):
        # Prevent deletion of confirmed records
        if self.filtered(lambda r: r.state != 'draft'):
            raise ValidationError(_('Cannot delete confirmed records!'))
        return super().unlink()

    def action_confirm(self):
        """Action method for state transition"""
        self.write({'state': 'confirmed'})
        self._send_confirmation_email()

    def _validate_before_done(self):
        """Custom validation before marking as done"""
        for record in self:
            if not record.line_ids:
                raise ValidationError(_('Cannot confirm without lines!'))

    def _send_confirmation_email(self):
        """Send confirmation email"""
        template = self.env.ref('custom_module.email_template_confirmation')
        for record in self:
            template.send_mail(record.id, force_send=True)

    # Business Logic Methods
    def calculate_totals(self):
        """Calculate and update totals"""
        for record in self:
            record._compute_total_amount()

    @api.model
    def get_dashboard_data(self):
        """Return data for dashboard widgets"""
        records = self.search([('state', '!=', 'cancelled')])
        return {
            'total_count': len(records),
            'total_amount': sum(r.total_amount for r in records),
            'draft_count': len(records.filtered(lambda r: r.state == 'draft')),
            'done_count': len(records.filtered(lambda r: r.state == 'done')),
        }

    # Search and Filter Methods
    @api.model
    def _name_search(self, name='', args=None, operator='ilike', limit=100):
        """Custom name search"""
        args = args or []
        domain = []
        if name:
            domain = ['|', ('name', operator, name), ('partner_id.name', operator, name)]
        return self._search(domain + args, limit=limit)

    # Import/Export Methods
    def export_data(self, fields_to_export):
        """Custom export logic"""
        return super().export_data(fields_to_export)

    @api.model
    def import_data(self, fields, data):
        """Custom import logic"""
        return super().import_data(fields, data)
```

### Model Inheritance Patterns

**Classical Inheritance:**
```python
# models/sale_order_inherit.py
from odoo import models, fields, api

class SaleOrder(models.Model):
    _inherit = 'sale.order'

    custom_field = fields.Char(string='Custom Field')
    priority = fields.Selection([
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ], string='Priority', default='medium')

    def action_confirm(self):
        """Override and extend confirmation action"""
        # Custom logic before confirmation
        if self.priority == 'high':
            self._send_priority_notification()

        # Call parent method
        result = super().action_confirm()

        # Custom logic after confirmation
        self._log_confirmation()

        return result

    def _send_priority_notification(self):
        """Send notification for high priority orders"""
        # Implementation
        pass

    def _log_confirmation(self):
        """Log order confirmation"""
        # Implementation
        pass
```

**Prototype Inheritance:**
```python
# models/res_partner_prototype.py
from odoo import models, fields, api

class ResPartner(models.Model):
    _inherit = 'res.partner'

    # Add new fields to existing model
    custom_rating = fields.Float(string='Rating', digits=(3, 2))
    last_purchase_date = fields.Datetime(string='Last Purchase')

    # Add new methods
    @api.model
    def get_top_customers(self, limit=10):
        """Get top customers by rating"""
        return self.search([
            ('custom_rating', '>', 0)
        ], order='custom_rating desc', limit=limit)
```

**Delegation Inheritance:**
```python
# models/custom_model_delegate.py
from odoo import models, fields, api

class CustomModel(models.Model):
    _name = 'custom.model'
    _inherits = {'res.partner': 'partner_id'}

    partner_id = fields.Many2one(
        'res.partner',
        string='Partner',
        required=True,
        ondelete='cascade'
    )

    custom_field = fields.Char(string='Custom Field')

    # All fields from res.partner are available through delegation
    @api.model
    def create(self, vals):
        # Automatically create partner if not provided
        if 'partner_id' not in vals:
            partner_vals = {
                'name': vals.get('name'),
                'is_company': True,
            }
            partner = self.env['res.partner'].create(partner_vals)
            vals['partner_id'] = partner.id

        return super().create(vals)
```

## View Architecture

### View Types and Definitions

**Form View with Dynamic Elements:**
```xml
<!-- views/custom_model_views.xml -->
<odoo>
    <record id="view_custom_model_form" model="ir.ui.view">
        <field name="name">custom.model.form</field>
        <field name="model">custom.model</field>
        <field name="arch" type="xml">
            <form string="Custom Model">
                <header>
                    <button name="action_draft" type="object"
                            string="Draft" states="confirmed,done"
                            class="btn-secondary"/>
                    <button name="action_confirm" type="object"
                            string="Confirm" states="draft"
                            class="btn-primary"/>
                    <button name="action_done" type="object"
                            string="Mark Done" states="confirmed"
                            class="btn-success"/>
                    <button name="action_cancel" type="object"
                            string="Cancel" states="draft,confirmed"
                            class="btn-danger" confirm="Are you sure?"/>
                    <field name="state" widget="statusbar"
                           statusbar_visible="draft,confirmed,done"/>
                </header>

                <sheet>
                    <div class="oe_title">
                        <label for="name"/>
                        <h1>
                            <field name="name" placeholder="Enter name..."/>
                        </h1>
                    </div>

                    <group>
                        <group name="basic_info">
                            <field name="partner_id" required="1"/>
                            <field name="user_id"/>
                            <field name="currency_id" invisible="1"/>
                            <field name="priority" widget="priority"/>
                            <field name="is_active"/>
                        </group>
                        <group name="amounts">
                            <field name="amount" widget="monetary"/>
                            <field name="total_amount" widget="monetary"/>
                            <field name="date_field"/>
                            <field name="datetime_field"/>
                        </group>
                    </group>

                    <notebook>
                        <page string="Description" name="description">
                            <group>
                                <field name="description" placeholder="Enter description..."/>
                            </group>
                            <group>
                                <field name="notes" placeholder="Additional notes..."/>
                            </group>
                        </page>

                        <page string="Lines" name="lines">
                            <field name="line_ids">
                                <tree editable="bottom">
                                    <field name="product_id"/>
                                    <field name="description"/>
                                    <field name="quantity"/>
                                    <field name="price_unit"/>
                                    <field name="amount" sum="Total"/>
                                </tree>
                            </field>
                        </page>

                        <page string="Tags" name="tags">
                            <group>
                                <field name="tag_ids" widget="many2many_tags"
                                       options="{'color_field': 'color'}"/>
                            </group>
                        </page>
                    </notebook>
                </sheet>

                <div class="oe_chatter">
                    <field name="message_follower_ids"/>
                    <field name="activity_ids"/>
                    <field name="message_ids"/>
                </div>
            </form>
        </field>
    </record>
</odoo>
```

**List View with Custom Features:**
```xml
<record id="view_custom_model_tree" model="ir.ui.view">
    <field name="name">custom.model.tree</field>
    <field name="model">custom.model</field>
    <field name="arch" type="xml">
        <tree string="Custom Models"
              default_order="date_field desc"
              decoration-success="state == 'done'"
              decoration-warning="state == 'confirmed'"
              decoration-danger="state == 'cancelled'">
            <field name="name"/>
            <field name="partner_id"/>
            <field name="date_field"/>
            <field name="amount" widget="monetary" sum="Total"/>
            <field name="state" widget="badge"
                   decoration-success="state == 'done'"
                   decoration-warning="state == 'confirmed'"/>
            <field name="user_id" optional="show"/>
            <field name="create_uid" optional="hide"/>
            <button name="action_confirm" type="object"
                    string="Confirm" icon="fa-check"
                    attrs="{'invisible': [('state', '!=', 'draft')]}"/>
            <button name="action_done" type="object"
                    string="Done" icon="fa-check-circle"
                    attrs="{'invisible': [('state', '!=', 'confirmed')]}"/>
        </tree>
    </field>
</record>
```

**Kanban View with Cards:**
```xml
<record id="view_custom_model_kanban" model="ir.ui.view">
    <field name="name">custom.model.kanban</field>
    <field name="model">custom.model</field>
    <field name="arch" type="xml">
        <kanban default_group_by="state"
                class="o_kanban_small_column">
            <field name="name"/>
            <field name="partner_id"/>
            <field name="amount"/>
            <field name="currency_id"/>
            <field name="state"/>
            <field name="priority"/>

            <templates>
                <t t-name="kanban-box">
                    <div t-attf-class="oe_kanban_card oe_kanban_global_click #{record.priority.raw_value == 'high' ? 'oe_kanban_color_2' : ''}">
                        <div class="o_kanban_record_top">
                            <div class="o_kanban_record_headings">
                                <strong class="o_kanban_record_title">
                                    <field name="name"/>
                                </strong>
                                <div class="o_kanban_record_subtitle">
                                    <field name="partner_id"/>
                                </div>
                            </div>
                            <div class="o_kanban_manage_button_section">
                                <a class="o_kanban_manage_toggle_button" href="#" tabindex="-1">
                                    <i class="fa fa-ellipsis-v" role="img" aria-label="Manage" title="Manage"/>
                                </a>
                            </div>
                        </div>

                        <div class="o_kanban_record_body">
                            <div class="o_kanban_record_bottom">
                                <div class="oe_kanban_bottom_left">
                                    <field name="amount" widget="monetary"/>
                                </div>
                                <div class="oe_kanban_bottom_right">
                                    <img t-att-src="kanban_image('res.partner', 'image_128', record.partner_id.raw_value)"
                                         t-att-title="record.partner_id.value"
                                         t-att-alt="record.partner_id.value"
                                         class="oe_kanban_avatar"/>
                                </div>
                            </div>
                        </div>

                        <div class="o_kanban_manage_button_section o_kanban_manage_view">
                            <a class="btn btn-primary btn-sm o_kanban_manage_new_column"
                               type="edit" tabindex="-1">
                                <i class="fa fa-pencil"/> Edit
                            </a>
                            <a class="btn btn-secondary btn-sm o_kanban_manage_new_column"
                               type="delete" tabindex="-1">
                                <i class="fa fa-trash"/> Delete
                            </a>
                        </div>
                    </div>
                </t>
            </templates>
        </kanban>
    </field>
</record>
```

**Search View with Filters:**
```xml
<record id="view_custom_model_search" model="ir.ui.view">
    <field name="name">custom.model.search</field>
    <field name="model">custom.model</field>
    <field name="arch" type="xml">
        <search string="Search Custom Models">
            <field name="name" string="Name" filter_domain="[('name', 'ilike', self)]"/>
            <field name="partner_id" string="Partner"/>
            <field name="user_id" string="Salesperson"/>
            <field name="amount" string="Amount"/>

            <filter string="My Models" name="my_models"
                    domain="[('user_id', '=', uid)]"/>
            <filter string="Active" name="active"
                    domain="[('is_active', '=', True)]"/>
            <filter string="Archived" name="archived"
                    domain="[('is_active', '=', False)]"/>

            <separator/>
            <filter string="Draft" name="draft"
                    domain="[('state', '=', 'draft')]"/>
            <filter string="Confirmed" name="confirmed"
                    domain="[('state', '=', 'confirmed')]"/>
            <filter string="Done" name="done"
                    domain="[('state', '=', 'done')]"/>

            <separator/>
            <filter string="Created Today" name="today"
                    domain="[('create_date', '>=', context_today().strftime('%Y-%m-%d 00:00:00'))]"/>
            <filter string="Created This Week" name="week"
                    domain="[('create_date', '>=', (context_today() - datetime.timedelta(days=7)).strftime('%Y-%m-%d 00:00:00'))]"/>
            <filter string="Created This Month" name="month"
                    domain="[('create_date', '>=', context_today().replace(day=1).strftime('%Y-%m-%d 00:00:00'))]"/>

            <group expand="0" string="Group By">
                <filter string="Partner" name="group_partner" context="{'group_by': 'partner_id'}"/>
                <filter string="Salesperson" name="group_user" context="{'group_by': 'user_id'}"/>
                <filter string="State" name="group_state" context="{'group_by': 'state'}"/>
                <filter string="Creation Date" name="group_create_date" context="{'group_by': 'create_date:month'}"/>
            </group>
        </search>
    </field>
</record>
```

### Advanced View Features

**Dynamic Views with attrs:**
```xml
<field name="amount" attrs="{
    'readonly': [('state', 'in', ['done', 'cancelled'])],
    'required': [('state', '=', 'confirmed')],
    'invisible': [('state', '=', 'draft')]
}"/>
```

**Computed Fields in Views:**
```xml
<field name="total_amount" widget="monetary"
       attrs="{'readonly': [('state', '!=', 'draft')]}"/>
```

**Custom Widgets:**
```xml
<field name="priority" widget="priority"/>
<field name="state" widget="statusbar"
       options="{'clickable': True, 'fold_field': 'fold_field'}"/>
<field name="tag_ids" widget="many2many_tags"
       options="{'no_create': True, 'no_create_edit': True}"/>
```

**Button Actions:**
```xml
<button name="action_method" type="object"
        string="Action" class="btn-primary"
        icon="fa-check" confirm="Are you sure?"/>

<button name="%(action_id)d" type="action"
        string="Wizard" class="btn-secondary"/>

<button name="%(report_id)d" type="action"
        string="Print Report" class="btn-info"/>
```

## Security Implementation

### Access Control Lists (ACLs)

**ir.model.access.csv Configuration:**
```csv
# security/ir.model.access.csv
id,name,model_id:id,group_id:id,perm_read,perm_write,perm_create,perm_unlink
access_custom_model_user,custom.model.user,model_custom_model,group_custom_user,1,1,1,0
access_custom_model_manager,custom.model.manager,model_custom_model,group_custom_manager,1,1,1,1
access_custom_model_portal,custom.model.portal,model_custom_model,base.group_portal,1,0,0,0
access_custom_model_public,custom.model.public,model_custom_model,base.group_public,1,0,0,0
```

**Security Groups Configuration:**
```xml
<!-- security/security_groups.xml -->
<odoo>
    <record id="group_custom_user" model="res.groups">
        <field name="name">Custom User</field>
        <field name="comment">Users can access custom models</field>
        <field name="category_id" ref="base.module_category_operations"/>
        <field name="implied_ids" eval="[(4, ref('base.group_user'))]"/>
    </record>

    <record id="group_custom_manager" model="res.groups">
        <field name="name">Custom Manager</field>
        <field name="comment">Managers can manage custom models</field>
        <field name="category_id" ref="base.module_category_management"/>
        <field name="implied_ids" eval="[(4, ref('group_custom_user'))]"/>
        <field name="users" eval="[(4, ref('base.user_root')), (4, ref('base.user_admin'))]"/>
    </record>
</odoo>
```

### Record Rules

**Domain-Based Record Rules:**
```xml
<!-- security/record_rules.xml -->
<odoo>
    <record id="rule_custom_model_user" model="ir.rule">
        <field name="name">Custom Model User Rule</field>
        <field name="model_id" ref="model_custom_model"/>
        <field name="domain_force">[('user_id', '=', user.id)]</field>
        <field name="groups" eval="[(4, ref('group_custom_user'))]"/>
        <field name="perm_read" eval="True"/>
        <field name="perm_write" eval="True"/>
        <field name="perm_create" eval="True"/>
        <field name="perm_unlink" eval="False"/>
    </record>

    <record id="rule_custom_model_manager" model="ir.rule">
        <field name="name">Custom Model Manager Rule</field>
        <field name="model_id" ref="model_custom_model"/>
        <field name="domain_force">[(1, '=', 1)]</field>
        <field name="groups" eval="[(4, ref('group_custom_manager'))]"/>
        <field name="perm_read" eval="True"/>
        <field name="perm_write" eval="True"/>
        <field name="perm_create" eval="True"/>
        <field name="perm_unlink" eval="True"/>
    </record>

    <record id="rule_custom_model_portal" model="ir.rule">
        <field name="name">Custom Model Portal Rule</field>
        <field name="model_id" ref="model_custom_model"/>
        <field name="domain_force">[('partner_id', '=', user.partner_id.id)]</field>
        <field name="groups" eval="[(4, ref('base.group_portal'))]"/>
        <field name="perm_read" eval="True"/>
        <field name="perm_write" eval="False"/>
        <field name="perm_create" eval="False"/>
        <field name="perm_unlink" eval="False"/>
    </record>
</odoo>
```

### Field-Level Security

**Sensitive Field Protection:**
```python
# models/custom_model.py
class CustomModel(models.Model):
    _name = 'custom.model'

    # Public fields
    name = fields.Char(string='Name')
    description = fields.Text(string='Description')

    # Sensitive fields with groups
    secret_data = fields.Text(
        string='Secret Data',
        groups='group_custom_manager'
    )

    internal_notes = fields.Text(
        string='Internal Notes',
        groups='group_custom_user,group_custom_manager'
    )

    financial_amount = fields.Float(
        string='Financial Amount',
        groups='group_custom_manager',
        digits=(16, 2)
    )
```

### API Security

**Controller Authentication:**
```python
# controllers/api.py
from odoo import http
from odoo.http import request
from odoo.exceptions import AccessError

class ApiController(http.Controller):

    @http.route('/api/custom-model', type='json', auth='user', methods=['GET'])
    def get_custom_models(self, **kwargs):
        """API endpoint for authenticated users"""
        # User is already authenticated via auth='user'
        try:
            models = request.env['custom.model'].search([])
            return {
                'success': True,
                'data': models.read(['name', 'description', 'state'])
            }
        except AccessError:
            return {
                'success': False,
                'error': 'Access denied'
            }

    @http.route('/api/public/custom-model', type='json', auth='public', methods=['GET'])
    def get_public_models(self, **kwargs):
        """Public API endpoint with limited access"""
        # Public access - need to check permissions manually
        public_models = request.env['custom.model'].sudo().search([
            ('is_public', '=', True)
        ])
        return {
            'success': True,
            'data': public_models.read(['name', 'description'])
        }

    @http.route('/api/custom-model/<int:model_id>', type='json', auth='user', methods=['PUT'])
    def update_custom_model(self, model_id, **kwargs):
        """Update model with permission check"""
        try:
            model = request.env['custom.model'].browse(model_id)
            # Check write access
            if not model.check_access_rights('write', raise_exception=False):
                raise AccessError('No write access')

            # Update with provided values
            allowed_fields = ['name', 'description', 'state']
            update_vals = {k: v for k, v in kwargs.items() if k in allowed_fields}

            model.write(update_vals)
            return {
                'success': True,
                'message': 'Model updated successfully'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

## API Development

### REST API Controllers

**Complete API Implementation:**
```python
# controllers/rest_api.py
import json
from odoo import http
from odoo.http import request, Response
from odoo.exceptions import ValidationError, AccessError

class RestApiController(http.Controller):

    def _prepare_response(self, data, status=200, headers=None):
        """Prepare standardized API response"""
        headers = headers or {}
        headers.update({
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        })
        return Response(
            json.dumps(data),
            status=status,
            headers=headers
        )

    def _get authenticated_user(self):
        """Get authenticated user from request"""
        token = request.httprequest.headers.get('Authorization')
        if not token or not token.startswith('Bearer '):
            return None

        token_value = token.replace('Bearer ', '')
        # Implement token validation logic here
        # For now, return current user
        return request.env.user

    @http.route('/api/v1/models', type='json', auth='user', methods=['GET'])
    def list_models(self, **kwargs):
        """List models with filtering and pagination"""
        try:
            # Get query parameters
            page = int(kwargs.get('page', 1))
            limit = int(kwargs.get('limit', 20))
            domain = kwargs.get('domain', [])

            # Build search domain
            if kwargs.get('search'):
                domain.append(('name', 'ilike', kwargs['search']))

            if kwargs.get('state'):
                domain.append(('state', '=', kwargs['state']))

            # Execute search with pagination
            total_count = request.env['custom.model'].search_count(domain)
            models = request.env['custom.model'].search(
                domain,
                limit=limit,
                offset=(page - 1) * limit,
                order='create_date desc'
            )

            return self._prepare_response({
                'success': True,
                'data': {
                    'models': models.read(),
                    'pagination': {
                        'page': page,
                        'limit': limit,
                        'total': total_count,
                        'pages': (total_count + limit - 1) // limit
                    }
                }
            })

        except Exception as e:
            return self._prepare_response({
                'success': False,
                'error': str(e)
            }, status=500)

    @http.route('/api/v1/models', type='json', auth='user', methods=['POST'])
    def create_model(self, **kwargs):
        """Create new model"""
        try:
            # Validate required fields
            required_fields = ['name', 'partner_id']
            for field in required_fields:
                if field not in kwargs:
                    raise ValidationError(f"Missing required field: {field}")

            # Create model
            model_vals = {
                'name': kwargs['name'],
                'partner_id': kwargs['partner_id'],
                'description': kwargs.get('description', ''),
                'amount': kwargs.get('amount', 0.0),
                'state': kwargs.get('state', 'draft'),
            }

            model = request.env['custom.model'].create(model_vals)

            return self._prepare_response({
                'success': True,
                'data': model.read()[0],
                'message': 'Model created successfully'
            }, status=201)

        except ValidationError as e:
            return self._prepare_response({
                'success': False,
                'error': str(e)
            }, status=400)
        except Exception as e:
            return self._prepare_response({
                'success': False,
                'error': str(e)
            }, status=500)

    @http.route('/api/v1/models/<int:model_id>', type='json', auth='user', methods=['GET'])
    def get_model(self, model_id, **kwargs):
        """Get single model by ID"""
        try:
            model = request.env['custom.model'].browse(model_id)
            if not model.exists():
                return self._prepare_response({
                    'success': False,
                    'error': 'Model not found'
                }, status=404)

            return self._prepare_response({
                'success': True,
                'data': model.read()[0]
            })

        except Exception as e:
            return self._prepare_response({
                'success': False,
                'error': str(e)
            }, status=500)

    @http.route('/api/v1/models/<int:model_id>', type='json', auth='user', methods=['PUT'])
    def update_model(self, model_id, **kwargs):
        """Update existing model"""
        try:
            model = request.env['custom.model'].browse(model_id)
            if not model.exists():
                return self._prepare_response({
                    'success': False,
                    'error': 'Model not found'
                }, status=404)

            # Check write permissions
            if not model.check_access_rights('write'):
                return self._prepare_response({
                    'success': False,
                    'error': 'Write access denied'
                }, status=403)

            # Update allowed fields
            allowed_fields = ['name', 'description', 'amount', 'state']
            update_vals = {k: v for k, v in kwargs.items() if k in allowed_fields}

            if update_vals:
                model.write(update_vals)

            return self._prepare_response({
                'success': True,
                'data': model.read()[0],
                'message': 'Model updated successfully'
            })

        except Exception as e:
            return self._prepare_response({
                'success': False,
                'error': str(e)
            }, status=500)

    @http.route('/api/v1/models/<int:model_id>', type='json', auth='user', methods=['DELETE'])
    def delete_model(self, model_id, **kwargs):
        """Delete model"""
        try:
            model = request.env['custom.model'].browse(model_id)
            if not model.exists():
                return self._prepare_response({
                    'success': False,
                    'error': 'Model not found'
                }, status=404)

            # Check delete permissions
            if not model.check_access_rights('unlink'):
                return self._prepare_response({
                    'success': False,
                    'error': 'Delete access denied'
                }, status=403)

            # Check if model can be deleted
            if model.state not in ['draft']:
                return self._prepare_response({
                    'success': False,
                    'error': 'Cannot delete model in state: ' + model.state
                }, status=400)

            model.unlink()

            return self._prepare_response({
                'success': True,
                'message': 'Model deleted successfully'
            })

        except Exception as e:
            return self._prepare_response({
                'success': False,
                'error': str(e)
            }, status=500)

    @http.route('/api/v1/models/<int:model_id>/action', type='json', auth='user', methods=['POST'])
    def call_model_action(self, model_id, **kwargs):
        """Call model action"""
        try:
            model = request.env['custom.model'].browse(model_id)
            if not model.exists():
                return self._prepare_response({
                    'success': False,
                    'error': 'Model not found'
                }, status=404)

            action = kwargs.get('action')
            if not action:
                return self._prepare_response({
                    'success': False,
                    'error': 'Action parameter required'
                }, status=400)

            # Call action method if it exists
            if hasattr(model, action) and callable(getattr(model, action)):
                method = getattr(model, action)
                result = method()
                return self._prepare_response({
                    'success': True,
                    'data': result,
                    'message': f'Action {action} executed successfully'
                })
            else:
                return self._prepare_response({
                    'success': False,
                    'error': f'Action {action} not found'
                }, status=400)

        except Exception as e:
            return self._prepare_response({
                'success': False,
                'error': str(e)
            }, status=500)

    # CORS preflight handler
    @http.route('/api/v1/models/<path:path>', type='json', auth='none', methods=['OPTIONS'])
    def handle_options(self, path, **kwargs):
        """Handle CORS preflight requests"""
        return self._prepare_response({}, status=200)
```

## Testing Frameworks

### Unit Testing

**Model Tests:**
```python
# tests/test_models.py
from odoo.tests.common import TransactionCase, tagged
from odoo.exceptions import ValidationError

@tagged('post_install', '-at_install')
class TestCustomModel(TransactionCase):

    def setUp(self):
        super().setUp()
        # Create test data
        self.partner = self.env['res.partner'].create({
            'name': 'Test Partner',
            'is_company': True,
        })

        self.user = self.env['res.users'].create({
            'name': 'Test User',
            'login': 'test_user',
            'groups_id': [(4, self.env.ref('custom_module.group_custom_user').id)]
        })

    def test_create_custom_model(self):
        """Test custom model creation"""
        model = self.env['custom.model'].create({
            'name': 'Test Model',
            'partner_id': self.partner.id,
            'amount': 100.0,
        })

        self.assertEqual(model.name, 'Test Model')
        self.assertEqual(model.partner_id, self.partner)
        self.assertEqual(model.amount, 100.0)
        self.assertEqual(model.state, 'draft')

    def test_model_state_transitions(self):
        """Test state transitions"""
        model = self.env['custom.model'].create({
            'name': 'Test Model',
            'partner_id': self.partner.id,
        })

        # Test draft to confirmed
        model.action_confirm()
        self.assertEqual(model.state, 'confirmed')

        # Test confirmed to done
        model.action_done()
        self.assertEqual(model.state, 'done')

        # Test done back to draft (should work)
        model.action_draft()
        self.assertEqual(model.state, 'draft')

    def test_negative_amount_validation(self):
        """Test negative amount validation"""
        with self.assertRaises(ValidationError):
            self.env['custom.model'].create({
                'name': 'Test Model',
                'partner_id': self.partner.id,
                'amount': -100.0,
            })

    def test_model_constraints(self):
        """Test model constraints"""
        model1 = self.env['custom.model'].create({
            'name': 'Unique Name',
            'partner_id': self.partner.id,
        })

        # Test unique constraint
        with self.assertRaises(Exception):  # Should raise IntegrityError
            self.env['custom.model'].create({
                'name': 'Unique Name',  # Same name
                'partner_id': self.partner.id,
            })

    def test_computed_fields(self):
        """Test computed fields"""
        model = self.env['custom.model'].create({
            'name': 'Test Model',
            'partner_id': self.partner.id,
            'amount': 100.0,
        })

        # Add a line to test total computation
        self.env['custom.model.line'].create({
            'model_id': model.id,
            'amount': 50.0,
        })

        model._compute_total_amount()
        self.assertEqual(model.total_amount, 50.0)

    def test_access_rights(self):
        """Test access rights"""
        # Create model as admin
        model = self.env['custom.model'].create({
            'name': 'Test Model',
            'partner_id': self.partner.id,
            'user_id': self.user.id,
        })

        # Test user access
        model_as_user = model.sudo(self.user)
        self.assertTrue(model_as_user.check_access_rights('read'))
        self.assertTrue(model_as_user.check_access_rights('write'))
        self.assertTrue(model_as_user.check_access_rights('create'))
        self.assertFalse(model_as_user.check_access_rights('unlink'))

    def test_record_rules(self):
        """Test record rules"""
        # Create models for different users
        model1 = self.env['custom.model'].create({
            'name': 'Model 1',
            'partner_id': self.partner.id,
            'user_id': self.user.id,
        })

        other_user = self.env['res.users'].create({
            'name': 'Other User',
            'login': 'other_user',
            'groups_id': [(4, self.env.ref('custom_module.group_custom_user').id)]
        })

        model2 = self.env['custom.model'].create({
            'name': 'Model 2',
            'partner_id': self.partner.id,
            'user_id': other_user.id,
        })

        # Test user can only see their own models
        user_models = self.env['custom.model'].sudo(self.user).search([])
        self.assertIn(model1, user_models)
        self.assertNotIn(model2, user_models)

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # Set up test environment for all tests
        cls.company = cls.env['res.company'].create({
            'name': 'Test Company',
        })

@tagged('standard', 'security')
class TestCustomModelSecurity(TransactionCase):
    """Test security aspects"""

    def setUp(self):
        super().setUp()
        self.user = self.env['res.users'].create({
            'name': 'Test User',
            'login': 'test_user',
        })
        self.manager = self.env['res.users'].create({
            'name': 'Test Manager',
            'login': 'test_manager',
            'groups_id': [(4, self.env.ref('custom_module.group_custom_manager').id)]
        })

    def test_group_permissions(self):
        """Test group permissions"""
        partner = self.env['res.partner'].create({
            'name': 'Test Partner',
        })

        # Test user without group cannot access
        self.assertFalse(self.user.has_group('custom_module.group_custom_user'))

        # Add user to group
        self.user.write({
            'groups_id': [(4, self.env.ref('custom_module.group_custom_user').id)]
        })

        self.assertTrue(self.user.has_group('custom_module.group_custom_user'))

        # Test model creation with user permissions
        model = self.env['custom.model'].sudo(self.user).create({
            'name': 'Test Model',
            'partner_id': partner.id,
        })
        self.assertTrue(model.exists())
```

### Integration Tests

**Controller Tests:**
```python
# tests/test_controllers.py
from odoo.tests.common import HttpCase, tagged
import json

@tagged('post_install', '-at_install')
class TestCustomModelControllers(HttpCase):

    def setUp(self):
        super().setUp()
        # Authenticate test user
        self.authenticate('admin', 'admin')

        # Create test data
        self.partner = self.env['res.partner'].create({
            'name': 'Test Partner',
            'is_company': True,
        })

        self.model = self.env['custom.model'].create({
            'name': 'Test Model',
            'partner_id': self.partner.id,
            'amount': 100.0,
        })

    def test_list_models_api(self):
        """Test list models API endpoint"""
        response = self.url_open('/api/v1/models')
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('models', data['data'])
        self.assertIn('pagination', data['data'])

    def test_get_model_api(self):
        """Test get single model API endpoint"""
        response = self.url_open(f'/api/v1/models/{self.model.id}')
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['id'], self.model.id)

    def test_create_model_api(self):
        """Test create model API endpoint"""
        model_data = {
            'name': 'API Test Model',
            'partner_id': self.partner.id,
            'amount': 200.0,
        }

        response = self.url_open(
            '/api/v1/models',
            data=json.dumps(model_data).encode(),
            headers={'Content-Type': 'application/json'}
        )
        self.assertEqual(response.status_code, 201)

        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['name'], 'API Test Model')

    def test_update_model_api(self):
        """Test update model API endpoint"""
        update_data = {
            'name': 'Updated Model Name',
            'amount': 300.0,
        }

        response = self.url_open(
            f'/api/v1/models/{self.model.id}',
            data=json.dumps(update_data).encode(),
            headers={'Content-Type': 'application/json'},
            method='PUT'
        )
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['name'], 'Updated Model Name')

    def test_delete_model_api(self):
        """Test delete model API endpoint"""
        # Create a model in draft state for deletion
        draft_model = self.env['custom.model'].create({
            'name': 'Draft Model',
            'partner_id': self.partner.id,
            'state': 'draft',
        })

        response = self.url_open(
            f'/api/v1/models/{draft_model.id}',
            method='DELETE'
        )
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertTrue(data['success'])
        self.assertFalse(draft_model.exists())

    def test_api_authentication(self):
        """Test API authentication"""
        # Logout and try to access protected endpoint
        self.logout()

        response = self.url_open('/api/v1/models')
        # Should redirect to login or return 403
        self.assertIn(response.status_code, [401, 403, 302])

    def test_api_error_handling(self):
        """Test API error handling"""
        # Test invalid model ID
        response = self.url_open('/api/v1/models/99999')
        self.assertEqual(response.status_code, 404)

        data = response.json()
        self.assertFalse(data['success'])
        self.assertEqual(data['error'], 'Model not found')

    def test_api_validation(self):
        """Test API input validation"""
        # Test missing required fields
        response = self.url_open(
            '/api/v1/models',
            data=json.dumps({'name': 'Test'}).encode(),
            headers={'Content-Type': 'application/json'}
        )
        self.assertEqual(response.status_code, 400)

        data = response.json()
        self.assertFalse(data['success'])
        self.assertIn('error', data)
```

### UI Tours

**Tour Testing:**
```python
# tests/test_tours.py
from odoo.tests.common import HttpCase, tagged
import json

@tagged('post_install', '-at_install')
class TestCustomModelTours(HttpCase):

    def test_custom_model_tour(self):
        """Test custom model UI tour"""
        self.browser_js(
            "/web",
            "odoo.__DEBUG__.services['web_tour.tour'].run('custom_model_tour')",
            "odoo.__DEBUG__.services['web_tour.tour'].tours.custom_model_tour.ready",
            login="admin"
        )

# Tour definition (would be in static/src/js/tour.js)
"""
odoo.define('custom_module.tour', function(require) {
    'use strict';

    var tour = require('web_tour.tour');

    tour.register('custom_model_tour', {
        url: '/web',
        test: true,
    }, [{
        trigger: '.o_app[data-menu-xmlid="custom_module.menu_root"]',
        content: 'Go to Custom Module',
        run: 'click',
    }, {
        trigger: 'button[data-name="action_create_model"]',
        content: 'Click Create button',
        run: 'click',
    }, {
        trigger: 'input[name="name"]',
        content: 'Enter model name',
        run: 'text Test Model from Tour',
    }, {
        trigger: '.o_field_many2one[name="partner_id"] input',
        content: 'Select partner',
        run: 'text,',
    }, {
        trigger: '.ui-menu-item:contains("Test Partner")',
        content: 'Choose Test Partner',
        run: 'click',
    }, {
        trigger: 'button[name="action_save"]',
        content: 'Save the model',
        run: 'click',
    }, {
        trigger: '.o_notification_success',
        content: 'Verify success message',
        run: function () {
            // Custom verification logic
        },
    }]);
});
"""
```

This comprehensive reference documentation provides detailed coverage of Odoo development patterns, from basic concepts to advanced enterprise implementations. Each section includes production-ready code examples, best practices, and security considerations. The documentation serves as both a learning resource and a practical reference for developers at all skill levels.

The reference continues with OCA integration, performance optimization, and DevOps patterns in the subsequent sections of the complete skill implementation.