# Odoo Model Templates

Comprehensive collection of Odoo model templates covering common business patterns and advanced use cases.

## Available Templates

### 🏢 Business Entity Models
- **Contact Management**: Partner, contact, and address models
- **Product Management**: Product, category, and pricing models
- **Sales Management**: Sales order, quote, and invoice models
- **Purchase Management**: Purchase order and vendor models
- **Inventory Management**: Stock, warehouse, and location models
- **Accounting**: Account, journal, and payment models

### 🔧 Technical Models
- **Configuration**: Settings and parameter models
- **Logging**: Audit log and activity models
- **Attachment**: Document and file management models
- **Sequence**: Auto-numbering and reference models
- **Notification**: Message and notification models

### 🎯 Advanced Patterns
- **Multi-Company**: Company and data isolation models
- **Multi-Language**: Translatable content models
- **Versioning**: Record version and history models
- **Approval**: Workflow and approval process models
- **Integration**: External system integration models

## Template Features

Each template includes:
- ✅ **Complete Model Definition**: Fields, relationships, and constraints
- ✅ **Business Logic**: Computed fields, methods, and validations
- ✅ **Security**: Access controls and record rules
- ✅ **Performance**: Optimized queries and caching
- ✅ **Integration**: API endpoints and web controllers
- ✅ **Testing**: Unit tests and test data

## Usage Examples

### Basic Product Model

```python
# templates/product_model.py
from odoo import models, fields, api, _
from odoo.exceptions import ValidationError

class ProductTemplate(models.Model):
    _name = 'product.template'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _description = 'Product Template'
    _order = 'name'

    # Basic Information
    name = fields.Char(
        string='Product Name',
        required=True,
        tracking=True,
        translate=True,
        help="Product name"
    )

    default_code = fields.Char(
        string='Internal Reference',
        tracking=True,
        copy=False,
        help="Internal product code"
    )

    barcode = fields.Char(
        string='Barcode',
        copy=False,
        help="Barcode for product identification"
    )

    # Categorization
    categ_id = fields.Many2one(
        'product.category',
        string='Product Category',
        required=True,
        tracking=True,
        help="Product category"
    )

    # Pricing
    list_price = fields.Float(
        string='Sales Price',
        digits=(16, 2),
        tracking=True,
        help="Selling price"
    )

    cost_price = fields.Float(
        string='Cost',
        digits=(16, 2),
        tracking=True,
        help="Cost price"
    )

    currency_id = fields.Many2one(
        'res.currency',
        string='Currency',
        related='company_id.currency_id',
        readonly=True
    )

    # Inventory
    type = fields.Selection([
        ('consu', 'Consumable'),
        ('service', 'Service'),
        ('product', 'Stockable Product'),
    ], string='Product Type', default='product', required=True, tracking=True)

    # Status
    active = fields.Boolean(
        string='Active',
        default=True,
        tracking=True,
        help="If unchecked, the product is archived"
    )

    sale_ok = fields.Boolean(
        string='Can be Sold',
        default=True,
        tracking=True,
        help="Can be sold to customers"
    )

    purchase_ok = fields.Boolean(
        string='Can be Purchased',
        default=True,
        tracking=True,
        help="Can be purchased from vendors"
    )

    # Description
    description = fields.Html(
        string='Description',
        translate=True,
        sanitize_attributes=False,
        help="Product description"
    )

    description_sale = fields.Html(
        string='Sale Description',
        translate=True,
        help="Description for sales documents"
    )

    description_purchase = fields.Html(
        string='Purchase Description',
        translate=True,
        help="Description for purchase documents"
    )

    # Company
    company_id = fields.Many2one(
        'res.company',
        string='Company',
        default=lambda self: self.env.company,
        required=True
    )

    # Computed Fields
    quantity_available = fields.Float(
        compute='_compute_quantity_available',
        string='Quantity On Hand',
        digits=(16, 2),
        help="Current stock quantity"
    )

    virtual_available = fields.Float(
        compute='_compute_quantity_available',
        string='Forecast Quantity',
        digits=(16, 2),
        help="Forecasted quantity"
    )

    # Constraints
    @api.constrains('list_price', 'cost_price')
    def _check_prices(self):
        for record in self:
            if record.list_price < 0:
                raise ValidationError(_('Sales price cannot be negative!'))
            if record.cost_price < 0:
                raise ValidationError(_('Cost price cannot be negative!'))

    @api.constrains('default_code')
    def _check_default_code(self):
        for record in self:
            if record.default_code:
                duplicates = self.search([
                    ('default_code', '=', record.default_code),
                    ('id', '!=', record.id)
                ])
                if duplicates:
                    raise ValidationError(_('Internal Reference must be unique!'))

    # Computed Methods
    @api.depends('product_variant_ids')
    def _compute_quantity_available(self):
        for template in self:
            template.quantity_available = sum(
                variant.qty_available for variant in template.product_variant_ids
            )
            template.virtual_available = sum(
                variant.virtual_available for variant in template.product_variant_ids
            )

    # Business Logic Methods
    def action_duplicate(self):
        """Duplicate product template"""
        self.ensure_one()
        default_vals = {
            'name': _('%s (copy)') % self.name,
            'default_code': False,
            'barcode': False,
        }
        new_template = self.copy(default_vals)

        # Return action to open new template
        return {
            'type': 'ir.actions.act_window',
            'name': _('Duplicated Product'),
            'res_model': 'product.template',
            'res_id': new_template.id,
            'view_mode': 'form',
            'target': 'current',
        }

    def action_archive(self):
        """Archive product template"""
        for record in self:
            if record.sale_ok or record.purchase_ok:
                record.sale_ok = False
                record.purchase_ok = False
        return super().write({'active': False})

    def action_unarchive(self):
        """Unarchive product template"""
        return super().write({'active': True})

    # Class Methods
    @api.model
    def name_search(self, name='', args=None, operator='ilike', limit=100):
        """Custom name search for products"""
        args = args or []
        domain = []
        if name:
            domain = [
                '|', '|', '|',
                ('name', operator, name),
                ('default_code', operator, name),
                ('barcode', operator, name),
                ('categ_id.name', operator, name)
            ]
        return self._search(domain + args, limit=limit)

    @api.model
    def get_products_by_category(self, category_id=None):
        """Get products by category"""
        domain = [('sale_ok', '=', True)]
        if category_id:
            domain.append(('categ_id', '=', category_id))
        return self.search(domain)

    # SQL Constraints
    _sql_constraints = [
        ('default_code_uniq', 'unique(default_code)', 'Internal Reference must be unique!'),
        ('barcode_uniq', 'unique(barcode)', 'Barcode must be unique!'),
    ]

    # Override Methods
    def write(self, vals):
        """Custom write method with logging"""
        if 'sale_ok' in vals and vals['sale_ok'] and not self.sale_ok:
            # Product is being made available for sale
            self.message_post(body=_('Product made available for sale'))

        if 'purchase_ok' in vals and vals['purchase_ok'] and not self.purchase_ok:
            # Product is being made available for purchase
            self.message_post(body=_('Product made available for purchase'))

        return super().write(vals)

    @api.model
    def create(self, vals):
        """Custom create method"""
        if 'name' not in vals:
            vals['name'] = _('New Product')

        product = super().create(vals)
        product.message_post(body=_('Product created'))
        return product
```

### Contact/Partner Model

```python
# templates/partner_model.py
from odoo import models, fields, api, _
from odoo.exceptions import ValidationError

class ResPartner(models.Model):
    _name = 'res.partner'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _description = 'Contact'
    _order = 'display_name'

    # Basic Information
    name = fields.Char(
        string='Name',
        tracking=True,
        compute='_compute_name',
        inverse='_inverse_name',
        search='_search_name'
    )

    display_name = fields.Char(
        string='Display Name',
        tracking=True,
        store=True,
        compute='_compute_display_name'
    )

    # Contact Information
    email = fields.Char(
        string='Email',
        tracking=True
    )

    phone = fields.Char(
        string='Phone',
        tracking=True
    )

    mobile = fields.Char(
        string='Mobile',
        tracking=True
    )

    website = fields.Char(
        string='Website',
        tracking=True
    )

    # Address Information
    street = fields.Char(
        string='Street',
        tracking=True
    )

    street2 = fields.Char(
        string='Street2',
        tracking=True
    )

    city = fields.Char(
        string='City',
        tracking=True
    )

    state_id = fields.Many2one(
        'res.country.state',
        string='State',
        tracking=True
    )

    zip = fields.Char(
        string='Zip',
        tracking=True
    )

    country_id = fields.Many2one(
        'res.country',
        string='Country',
        tracking=True
    )

    # Company Information
    is_company = fields.Boolean(
        string='Is a Company',
        default=False,
        tracking=True
    )

    parent_id = fields.Many2one(
        'res.partner',
        string='Related Company',
        tracking=True,
        domain="[('is_company', '=', True)]"
    )

    child_ids = fields.One2many(
        'res.partner',
        'parent_id',
        string='Contacts'
    )

    # Commercial Information
    customer_rank = fields.Integer(
        string='Customer Rank',
        default=0,
        tracking=True,
        help="Customer ranking based on purchase history"
    )

    supplier_rank = fields.Integer(
        string='Supplier Rank',
        default=0,
        tracking=True,
        help="Supplier ranking based on sales history"
    )

    # Category and Tags
    category_id = fields.Many2many(
        'res.partner.category',
        'res_partner_category_rel',
        'partner_id', 'category_id',
        string='Tags'
    )

    # Status
    active = fields.Boolean(
        string='Active',
        default=True,
        tracking=True
    )

    # Company
    company_id = fields.Many2one(
        'res.company',
        string='Company',
        default=lambda self: self.env.company
    )

    # Computed Fields
    contact_address = fields.Char(
        compute='_compute_contact_address',
        string='Complete Address'
    )

    email_formatted = fields.Char(
        compute='_compute_email_formatted',
        string='Formatted Email'
    )

    # Constraints
    @api.constrains('email')
    def _check_email(self):
        for record in self:
            if record.email and not self._validate_email(record.email):
                raise ValidationError(_('Invalid email address!'))

    @api.constrains('website')
    def _check_website(self):
        for record in self:
            if record.website and not record.website.startswith(('http://', 'https://')):
                record.website = 'https://' + record.website

    # Computed Methods
    @api.depends('name', 'is_company', 'parent_id')
    def _compute_display_name(self):
        for partner in self:
            if partner.is_company or not partner.parent_id:
                partner.display_name = partner.name
            else:
                partner.display_name = f"{partner.parent_id.name}, {partner.name}"

    def _compute_name(self):
        for partner in self:
            if partner.is_company:
                partner.name = partner.display_name
            else:
                partner.name = partner.display_name.split(', ')[-1] if ', ' in partner.display_name else partner.display_name

    def _inverse_name(self):
        for partner in self:
            if partner.is_company:
                partner.display_name = partner.name
            else:
                if partner.parent_id:
                    partner.display_name = f"{partner.parent_id.name}, {partner.name}"
                else:
                    partner.display_name = partner.name

    def _compute_contact_address(self):
        for partner in self:
            partner.contact_address = partner._display_address()

    def _compute_email_formatted(self):
        for partner in self:
            if partner.email:
                name = partner.name or partner.display_name
                partner.email_formatted = f'"{name}" <{partner.email}>'
            else:
                partner.email_formatted = ''

    # Business Logic Methods
    def _display_address(self, without_company=False):
        """Format complete address"""
        self.ensure_one()
        address_format = self.country_id.address_format or "%(street)s\n%(street2)s\n%(city)s %(state_code)s %(zip)s\n%(country_name)s"

        args = {
            'street': self.street or '',
            'street2': self.street2 or '',
            'city': self.city or '',
            'state_code': self.state_id.code or '',
            'state_name': self.state_id.name or '',
            'zip': self.zip or '',
            'country_name': self.country_id.name or '',
        }

        return address_format % args

    def action_create_company(self):
        """Create a new company from this contact"""
        self.ensure_one()
        if self.is_company:
            raise ValidationError(_('This is already a company!'))

        # Create new company
        company = self.copy({
            'is_company': True,
            'parent_id': False,
            'child_ids': [(4, self.id)]
        })

        # Update this contact to be linked to company
        self.parent_id = company.id

        return {
            'type': 'ir.actions.act_window',
            'name': _('New Company'),
            'res_model': 'res.partner',
            'res_id': company.id,
            'view_mode': 'form',
            'target': 'current',
        }

    def action_merge_contacts(self):
        """Merge selected contacts"""
        if len(self) < 2:
            raise ValidationError(_('Select at least 2 contacts to merge!'))

        # Get primary contact (first in selection)
        primary = self[0]
        duplicates = self[1:]

        # Merge information
        for duplicate in duplicates:
            if not primary.email and duplicate.email:
                primary.email = duplicate.email
            if not primary.phone and duplicate.phone:
                primary.phone = duplicate.phone
            if not primary.mobile and duplicate.mobile:
                primary.mobile = duplicate.mobile

        # Archive duplicates
        duplicates.write({'active': False})

        return {
            'type': 'ir.actions.act_window',
            'name': _('Merged Contact'),
            'res_model': 'res.partner',
            'res_id': primary.id,
            'view_mode': 'form',
            'target': 'current',
            'warning': {
                'title': _('Contacts Merged'),
                'message': _('Successfully merged %d contacts') % len(duplicates)
            }
        }

    # Utility Methods
    def _validate_email(self, email):
        """Validate email format"""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None

    @api.model
    def create_company(self, name, **kwargs):
        """Helper method to create companies"""
        vals = {
            'name': name,
            'is_company': True,
        }
        vals.update(kwargs)
        return self.create(vals)

    @api.model
    def create_contact(self, name, parent_id=None, **kwargs):
        """Helper method to create contacts"""
        vals = {
            'name': name,
            'is_company': False,
        }
        if parent_id:
            vals['parent_id'] = parent_id
        vals.update(kwargs)
        return self.create(vals)

    # Search Methods
    def _search_name(self, name, operator, args):
        """Custom name search"""
        if not name:
            return args or []

        domain = args or []
        if operator in ('=', '!=', 'ilike', 'like', '=like', '=ilike'):
            domain = [
                '|', '|',
                ('name', operator, name),
                ('email', operator, name),
                ('phone', operator, name)
            ] + domain

        return domain

    @api.model
    def name_search(self, name='', args=None, operator='ilike', limit=100):
        """Enhanced name search"""
        args = args or []
        domain = []
        if name:
            domain = [
                '|', '|', '|',
                ('name', operator, name),
                ('email', operator, name),
                ('phone', operator, name),
                ('ref', operator, name)
            ]

        partners = self.search(domain + args, limit=limit)
        return partners.name_get()

    # Override Methods
    def write(self, vals):
        """Custom write method with logging"""
        # Track important changes
        tracking_fields = ['email', 'phone', 'mobile', 'street', 'city', 'country_id']
        changes = []

        for field in tracking_fields:
            if field in vals and vals[field] != getattr(self, field):
                old_value = getattr(self, field)
                new_value = vals[field]
                changes.append(f"{field}: {old_value} → {new_value}")

        result = super().write(vals)

        if changes:
            self.message_post(body=_("Contact information updated: %s") % ', '.join(changes))

        return result
```

### Configuration Model

```python
# templates/config_model.py
from odoo import models, fields, api, _
from odoo.exceptions import ValidationError

class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    # Module Configuration Section
    module_your_module = fields.Boolean(
        string='Enable Your Module',
        help="Enable the features of your custom module"
    )

    # General Settings
    your_module_auto_number = fields.Boolean(
        string='Auto-Number Records',
        config_parameter='your_module.auto_number',
        help="Automatically assign numbers to new records"
    )

    your_module_prefix = fields.Char(
        string='Record Prefix',
        config_parameter='your_module.prefix',
        help="Prefix for auto-generated record numbers"
    )

    your_module_default_state = fields.Selection([
        ('draft', 'Draft'),
        ('confirmed', 'Confirmed'),
        ('done', 'Done'),
    ],
    string='Default State',
    config_parameter='your_module.default_state',
    default='draft',
    help="Default state for new records"
    )

    # Notification Settings
    your_module_notify_user = fields.Boolean(
        string='Notify Users',
        config_parameter='your_module.notify_user',
        help="Send notifications to users on record changes"
    )

    your_module_notification_email = fields.Char(
        string='Notification Email',
        config_parameter='your_module.notification_email',
        help="Email address for system notifications"
    )

    # Integration Settings
    your_module_api_enabled = fields.Boolean(
        string='Enable API',
        config_parameter='your_module.api_enabled',
        help="Enable REST API endpoints"
    )

    your_module_api_key = fields.Char(
        string='API Key',
        config_parameter='your_module.api_key',
        help="API key for external integrations"
    )

    your_module_webhook_url = fields.Char(
        string='Webhook URL',
        config_parameter='your_module.webhook_url',
        help="Webhook URL for notifications"
    )

    # Performance Settings
    your_module_cache_timeout = fields.Integer(
        string='Cache Timeout (seconds)',
        config_parameter='your_module.cache_timeout',
        default=300,
        help="Timeout for cached data in seconds"
    )

    your_module_batch_size = fields.Integer(
        string='Batch Size',
        config_parameter='your_module.batch_size',
        default=100,
        help="Number of records to process in batches"
    )

    # Validation Methods
    @api.constrains('your_module_cache_timeout')
    def _check_cache_timeout(self):
        for record in self:
            if record.your_module_cache_timeout < 0:
                raise ValidationError(_('Cache timeout must be positive!'))

    @api.constrains('your_module_batch_size')
    def _check_batch_size(self):
        for record in self:
            if record.your_module_batch_size <= 0:
                raise ValidationError(_('Batch size must be positive!'))

    @api.constrains('your_module_notification_email')
    def _check_notification_email(self):
        for record in self:
            if record.your_module_notification_email:
                import re
                pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
                if not re.match(pattern, record.your_module_notification_email):
                    raise ValidationError(_('Invalid notification email address!'))

    # Action Methods
    def action_test_api_connection(self):
        """Test API connection"""
        self.ensure_one()
        if not self.your_module_api_enabled:
            raise ValidationError(_('API is not enabled!'))

        if not self.your_module_webhook_url:
            raise ValidationError(_('Webhook URL is not configured!'))

        try:
            import requests
            response = requests.post(
                self.your_module_webhook_url,
                json={'test': True, 'message': 'Connection test'},
                timeout=10
            )

            if response.status_code == 200:
                return {
                    'type': 'ir.actions.client',
                    'tag': 'display_notification',
                    'params': {
                        'title': _('Connection Test Successful'),
                        'message': _('API connection is working properly!'),
                        'type': 'success',
                    }
                }
            else:
                return {
                    'type': 'ir.actions.client',
                    'tag': 'display_notification',
                    'params': {
                        'title': _('Connection Test Failed'),
                        'message': _('Server returned status code: %s') % response.status_code,
                        'type': 'danger',
                    }
                }
        except Exception as e:
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': _('Connection Test Failed'),
                    'message': _('Error: %s') % str(e),
                    'type': 'danger',
                }
            }

    def action_send_test_notification(self):
        """Send test notification"""
        self.ensure_one()
        if not self.your_module_notify_user:
            raise ValidationError(_('User notifications are not enabled!'))

        if not self.your_module_notification_email:
            raise ValidationError(_('Notification email is not configured!'))

        # Send test email
        template = self.env.ref('your_module.email_template_test_notification')
        if template:
            template.send_mail(
                self.env.user.id,
                email_values={'email_to': self.your_module_notification_email},
                force_send=True
            )

        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': _('Test Notification Sent'),
                'message': _('Test notification sent to %s') % self.your_module_notification_email,
                'type': 'success',
            }
        }

    def action_clear_cache(self):
        """Clear module cache"""
        self.ensure_one()

        # Clear cache
        self.env['your.model'].clear_cache()

        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': _('Cache Cleared'),
                'message': _('Module cache has been cleared successfully!'),
                'type': 'success',
            }
        }

    def action_reset_to_default(self):
        """Reset settings to default values"""
        self.ensure_one()

        default_values = {
            'your_module_auto_number': False,
            'your_module_prefix': '',
            'your_module_default_state': 'draft',
            'your_module_notify_user': False,
            'your_module_notification_email': '',
            'your_module_api_enabled': False,
            'your_module_api_key': '',
            'your_module_webhook_url': '',
            'your_module_cache_timeout': 300,
            'your_module_batch_size': 100,
        }

        self.write(default_values)

        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': _('Settings Reset'),
                'message': _('All settings have been reset to default values!'),
                'type': 'warning',
            }
        }

    # Override Methods
    def set_values(self):
        """Set configuration values"""
        super().set_values()

        # Validate settings
        if self.your_module_auto_number and not self.your_module_prefix:
            raise ValidationError(_('Record prefix is required when auto-numbering is enabled!'))

        if self.your_module_api_enabled and not self.your_module_api_key:
            raise ValidationError(_('API key is required when API is enabled!'))

    @api.model
    def get_values(self):
        """Get configuration values"""
        res = super().get_values()

        # Load values from system parameters
        ICP = self.env['ir.config_parameter']
        res.update({
            'your_module_auto_number': ICP.get_param('your_module.auto_number', 'False').lower() == 'true',
            'your_module_prefix': ICP.get_param('your_module.prefix', ''),
            'your_module_default_state': ICP.get_param('your_module.default_state', 'draft'),
            'your_module_notify_user': ICP.get_param('your_module.notify_user', 'False').lower() == 'true',
            'your_module_notification_email': ICP.get_param('your_module.notification_email', ''),
            'your_module_api_enabled': ICP.get_param('your_module.api_enabled', 'False').lower() == 'true',
            'your_module_api_key': ICP.get_param('your_module.api_key', ''),
            'your_module_webhook_url': ICP.get_param('your_module.webhook_url', ''),
            'your_module_cache_timeout': int(ICP.get_param('your_module.cache_timeout', '300')),
            'your_module_batch_size': int(ICP.get_param('your_module.batch_size', '100')),
        })

        return res
```

## Model Selection Guide

### Choose the Right Template

| Business Need | Recommended Template | Features |
|---------------|---------------------|----------|
| Basic CRUD operations | Basic Entity Model | Simple fields, basic validation |
| Product catalog | Product Model | Pricing, categories, variants |
| Contact management | Partner Model | Addresses, relationships, communication |
| System configuration | Configuration Model | Settings, parameters, validation |
| Workflow management | Workflow Model | State transitions, approvals |
| External integration | Integration Model | API endpoints, webhooks, synchronization |
| Multi-company setup | Multi-Company Model | Company data isolation, sharing rules |

### Customization Tips

1. **Start with the closest template** and customize as needed
2. **Add security early** - implement access controls and validation
3. **Consider performance** - add indexes and optimize queries
4. **Plan for scalability** - design for growth and multi-company use
5. **Document your models** - add clear docstrings and comments
6. **Test thoroughly** - implement comprehensive tests

## Best Practices Implemented

### Performance
- ✅ Optimized field definitions and relationships
- ✅ Proper indexing strategies
- ✅ Efficient computed fields
- ✅ Caching considerations

### Security
- ✅ Access control implementation
- ✅ Input validation patterns
- ✅ SQL injection prevention
- ✅ Data privacy controls

### Usability
- ✅ Intuitive field naming
- ✅ Helpful descriptions and tooltips
- ✅ Consistent behavior patterns
- ✅ Error handling and user feedback

### Maintainability
- ✅ Clean code structure
- ✅ Comprehensive documentation
- ✅ Modular design
- ✅ Test coverage

Accelerate your Odoo development with these comprehensive model templates!