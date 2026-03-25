# Odoo Development Best Practices

Comprehensive guide to Odoo development best practices, covering code quality, security, performance, and maintainability standards.

## Table of Contents

1. [Code Quality Standards](#code-quality-standards)
2. [Security Best Practices](#security-best-practices)
3. [Performance Optimization](#performance-optimization)
4. [Database Best Practices](#database-best-practices)
5. [Testing Best Practices](#testing-best-practices)
6. [Documentation Standards](#documentation-standards)
7. [Version Control and Collaboration](#version-control-and-collaboration)
8. [Deployment and Operations](#deployment-and-operations)
9. [User Experience Design](#user-experience-design)
10. [Maintainability and Scalability](#maintainability-and-scalability)

## Code Quality Standards

### Python Code Style

#### PEP 8 Compliance
```python
# ✅ Good: Follow PEP 8 guidelines
from odoo import models, fields, api, _
from odoo.exceptions import ValidationError

class YourModel(models.Model):
    """Model description following PEP 8.

    This class demonstrates proper Python styling for Odoo models.
    It includes proper docstrings, type hints where applicable,
    and follows naming conventions.
    """

    _name = 'your.model'
    _description = 'Your Model Description'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'name'

    # Use snake_case for variable and method names
    your_field = fields.Char(
        string='Your Field',
        required=True,
        tracking=True,
        copy=False,
        help="Field description in title case"
    )

    @api.depends('your_field')
    def _compute_computed_field(self):
        """Compute field value with proper docstring.

        Args:
            None (uses instance variables)

        Returns:
            None (sets instance variable)
        """
        for record in self:
            record.computed_field = f"Computed: {record.your_field}"

    @api.model
    def your_method(self, arg1, arg2=None):
        """Method with proper docstring and type hints.

        Args:
            arg1 (str): First argument description
            arg2 (int, optional): Second argument description

        Returns:
            bool: Result of the operation

        Raises:
            ValidationError: When validation fails
        """
        if not arg1:
            raise ValidationError(_('First argument is required'))

        if arg2 is None:
            arg2 = 0

        return len(arg1) > arg2

# ❌ Bad: Violates PEP 8
class your_model(models.Model):  # Class name should be PascalCase
    _name='your.model'  # Space around operators

    def YourMethod(self):  # Method name should be snake_case
        if not self.your_field:
            return  # Add pass if method is empty
```

#### Naming Conventions
```python
# ✅ Good naming conventions

# Classes: PascalCase
class CustomerOrder(models.Model):
    pass

class ProductCategory(models.Model):
    pass

# Functions and variables: snake_case
def calculate_total_amount(lines):
    total = 0.0
    for line in lines:
        total += line.amount
    return total

max_retries = 3
current_user_id = user.id

# Constants: UPPER_CASE
MAX_FILE_SIZE = 10485760  # 10MB
DEFAULT_TIMEOUT = 30

# Private members: prefix with underscore
class OrderLine(models.Model):
    _name = 'order.line'

    def _validate_line(self):
        """Private method for internal validation."""
        pass

    _private_variable = 'internal'
```

#### Import Statements
```python
# ✅ Good import organization
# Standard library imports first
import os
import sys
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, List

# Third-party imports
import requests
from dateutil.relativedelta import relativedelta

# Odoo imports
from odoo import models, fields, api, _
from odoo.exceptions import ValidationError, UserError
from odoo.tools.translate import _
from odoo.addons.http_routing import Controller, route

# Relative imports
from . import utils
from .constants import DEFAULT_VALUES

# ❌ Bad import organization
from odoo import models, fields, api, _
import sys
import os
import requests
from datetime import datetime
```

### Documentation Standards

#### Module Documentation
```python
"""
Your Addon Comprehensive Documentation

This module provides comprehensive functionality for managing business operations.

Features:
- Feature 1 with detailed description
- Feature 2 with use cases and benefits
- Feature 3 with configuration options

Configuration:
1. Install the module
2. Go to Settings → Your Module
3. Configure necessary parameters

Usage:
1. Navigate to the appropriate menu
2. Create new records using the wizard
3. Configure options as needed

API Integration:
The module provides REST API endpoints for external integration:
- GET /api/your_module/data
- POST /api/your_module/create
- PUT /api/your_module/update/<id>

Dependencies:
- base
- mail
- Other required modules

Author: Your Name <your.email@example.com>
License: AGPL-3
Version: 18.0.1.0.0
"""
```

#### Method Documentation
```python
def calculate_order_total(self, lines, tax_included=False, currency=None):
    """Calculate total amount from order lines.

    This method computes the total amount of an order, optionally including taxes
    and handling currency conversion.

    Args:
        lines (recordset): Order lines to calculate
        tax_included (bool): Whether to include taxes in calculation
        currency (recordset, optional): Currency for conversion

    Returns:
        float: Total amount in the specified currency

    Raises:
        ValidationError: If lines are empty or currency is invalid

    Example:
        >>> order = self.env['sale.order'].browse(1)
        >>> total = order.calculate_order_total(order.order_line)
        >>> print(f"Order total: {total:.2f}")
        Order total: 1500.00

    Note:
        This method is called automatically when order is confirmed.
    """
    if not lines:
        raise ValidationError(_('Order lines cannot be empty'))

    # Implementation details
    subtotal = sum(line.price_subtotal for line in lines)

    if tax_included:
        tax_amount = sum(line.price_tax for line in lines)
        total = subtotal + tax_amount
    else:
        total = subtotal

    if currency and currency != self.currency_id:
        total = self.currency_id._convert(
            total, currency, self.date_order or fields.Date.today()
        )

    return total
```

### Error Handling

#### Exception Handling Best Practices
```python
# ✅ Good exception handling
class YourModel(models.Model):
    _name = 'your.model'

    def action_process(self):
        """Process record with comprehensive error handling."""
        try:
            # Validate prerequisites
            if not self.state == 'draft':
                raise UserError(_('Only draft records can be processed'))

            # Main processing logic
            self._validate_data()
            result = self._perform_processing()
            self._update_status('processed')

            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': _('Success'),
                    'message': _('Record processed successfully'),
                    'type': 'success',
                }
            }

        except ValidationError as e:
            # Validation errors (expected errors)
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': _('Validation Error'),
                    'message': str(e),
                    'type': 'danger',
                }
            }

        except UserError as e:
            # User errors (expected errors)
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': _('Error'),
                    'message': str(e),
                    'type': 'warning',
                }
            }

        except Exception as e:
            # Unexpected errors
            _logger.exception('Unexpected error during processing')
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': _('System Error'),
                    'message': _('An unexpected error occurred. Please contact support.'),
                    'type': 'danger',
                }
            }

    def _validate_data(self):
        """Validate record data."""
        # Specific validation logic
        if not self.name:
            raise ValidationError(_('Name is required'))

        if self.amount < 0:
            raise ValidationError(_('Amount cannot be negative'))

    def _perform_processing(self):
        """Perform main processing logic."""
        # Processing implementation
        pass

    def _update_status(self, new_status):
        """Update record status."""
        self.write({'state': new_status})
```

## Security Best Practices

### Access Control Implementation

#### Proper Security Configuration
```python
# ✅ Good security implementation
class YourModel(models.Model):
    _name = 'your.model'

    # Use proper field-level security
    sensitive_field = fields.Text(
        string='Sensitive Data',
        groups='your_module.group_manager'  # Only managers can see
    )

    internal_notes = fields.Text(
        string='Internal Notes',
        groups='base.group_user,base.group_portal'  # Users and portal users
    )

    # Record-level security in methods
    def action_sensitive_operation(self):
        """Perform sensitive operation with proper security checks."""
        # Check user permissions
        if not self.env.user.has_group('your_module.group_manager'):
            raise UserError(_('You do not have permission to perform this action'))

        # Check record ownership if needed
        if not self.check_access_rights('write'):
            raise UserError(_('You cannot modify this record'))

        # Perform operation
        self._process_sensitive_data()

    def _process_sensitive_data(self):
        """Internal method for processing sensitive data."""
        # This method assumes all security checks have been done
        pass
```

#### Input Validation
```python
# ✅ Good input validation
from odoo import fields, api
from odoo.tools import email_split
import re

class ContactForm(models.Model):
    _name = 'contact.form'

    name = fields.Char(string='Name', required=True)
    email = fields.Char(string='Email')
    phone = fields.Char(string='Phone')
    message = fields.Text(string='Message')

    @api.model
    def create(self, vals):
        """Validate input before creating record."""
        # Validate email format
        if vals.get('email'):
            if not self._validate_email(vals['email']):
                raise ValidationError(_('Invalid email address'))

        # Validate phone format
        if vals.get('phone'):
            if not self._validate_phone(vals['phone']):
                raise ValidationError(_('Invalid phone number'))

        # Validate message content
        if vals.get('message'):
            vals['message'] = self._sanitize_message(vals['message'])

        return super().create(vals)

    def _validate_email(self, email):
        """Validate email format."""
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(email_pattern, email) is not None

    def _validate_phone(self, phone):
        """Validate phone format (basic validation)."""
        # Remove non-numeric characters
        clean_phone = re.sub(r'[^\d+]', '', phone)
        return len(clean_phone) >= 10 and len(clean_phone) <= 15

    def _sanitize_message(self, message):
        """Sanitize message content."""
        # Basic HTML sanitization
        from odoo.tools import html_escape
        return html_escape(message)
```

#### SQL Injection Prevention
```python
# ✅ Good: Use ORM for database operations
class YourModel(models.Model):
    _name = 'your.model'

    def get_records_with_filter(self, domain):
        """Use ORM to prevent SQL injection."""
        # Safe: Uses ORM query builder
        return self.search(domain)

    def get_custom_report_data(self, date_from, date_to):
        """Custom query with proper parameterization."""
        # Safe: Uses parameterized query
        query = """
            SELECT id, name, date
            FROM your_model
            WHERE date BETWEEN %s AND %s
            ORDER BY date DESC
        """
        self.env.cr.execute(query, (date_from, date_to))
        return self.env.cr.fetchall()

    # ❌ Bad: Direct string concatenation (vulnerable to SQL injection)
    def bad_get_data_vulnerable(self, name_filter):
        query = f"SELECT * FROM your_model WHERE name = '{name_filter}'"
        self.env.cr.execute(query)  # DANGEROUS!
```

### API Security

#### REST API Security Implementation
```python
# ✅ Good: Secure API implementation
from odoo import http
from odoo.http import request
import hashlib
import hmac

class ApiController(http.Controller):

    @http.route('/api/v1/data', type='json', auth='user', methods=['GET'])
    def get_data(self, **kwargs):
        """Secure API endpoint with authentication."""
        # User is authenticated via auth='user'
        try:
            # Validate input parameters
            page = int(kwargs.get('page', 1))
            limit = min(int(kwargs.get('limit', 20)), 100)  # Limit page size

            # Build safe domain
            domain = [('active', '=', True)]
            if kwargs.get('search'):
                domain.append(('name', 'ilike', kwargs['search']))

            # Execute query with pagination
            records = request.env['your.model'].search(
                domain,
                limit=limit,
                offset=(page - 1) * limit,
                order='create_date desc'
            )

            return {
                'success': True,
                'data': records.read(['name', 'date', 'status']),
                'total': len(records),
                'page': page,
                'limit': limit
            }

        except Exception as e:
            return {
                'success': False,
                'error': 'Internal server error'
            }

    @http.route('/api/v1/data', type='json', auth='public', methods=['POST'])
    def create_data(self, **kwargs):
        """Public API endpoint with API key authentication."""
        # Custom authentication for public endpoint
        api_key = request.httprequest.headers.get('X-API-Key')
        expected_key = request.env['ir.config_parameter'].sudo().get_param('your_module.api_key')

        if not api_key or not hmac.compare_digest(api_key, expected_key):
            return {
                'success': False,
                'error': 'Invalid API key'
            }

        try:
            # Validate and sanitize input
            name = kwargs.get('name', '').strip()
            if not name or len(name) < 2:
                return {
                    'success': False,
                    'error': 'Name is required and must be at least 2 characters'
                }

            # Create record
            record = request.env['your.model'].sudo().create({
                'name': name,
                'description': kwargs.get('description', ''),
                'state': 'draft'
            })

            return {
                'success': True,
                'data': {
                    'id': record.id,
                    'name': record.name
                }
            }

        except Exception as e:
            return {
                'success': False,
                'error': 'Failed to create record'
            }
```

## Performance Optimization

### Database Optimization

#### Efficient Query Patterns
```python
# ✅ Good: Efficient database operations
class YourModel(models.Model):
    _name = 'your.model'

    def get_related_data_efficient(self):
        """Efficient data fetching with proper field selection."""
        # Good: Select only required fields
        records = self.search([
            ('active', '=', True)
        ]).read(['name', 'date', 'status'])  # Only fetch needed fields

        return records

    def get_related_data_inefficient(self):
        """❌ Bad: Inefficient data fetching."""
        # Bad: Fetches all fields including large text fields
        records = self.search([
            ('active', '=', True)
        ])  # This loads entire records into memory

        return records.read()  # This reads all fields again

    def batch_operation(self, record_ids):
        """Process records in batches for better performance."""
        batch_size = 100
        for i in range(0, len(record_ids), batch_size):
            batch_ids = record_ids[i:i + batch_size]
            batch_records = self.browse(batch_ids)
            # Process batch
            for record in batch_records:
                self._process_single_record(record)

    def _process_single_record(self, record):
        """Process a single record."""
        # Processing logic
        pass
```

#### Computed Fields Optimization
```python
# ✅ Good: Optimized computed fields
class ProductTemplate(models.Model):
    _name = 'product.template'

    name = fields.Char(string='Name', required=True)
    lst_price = fields.Float(string='Sale Price')
    cost_price = fields.Float(string='Cost Price')

    # Good: Use store=True for expensive computations
    margin = fields.Float(
        compute='_compute_margin',
        store=True,
        compute_sudo=False  # Only compute for current user
    )

    @api.depends('lst_price', 'cost_price')
    def _compute_margin(self):
        """Compute margin with proper dependency tracking."""
        for record in self:
            if record.lst_price and record.cost_price:
                record.margin = record.lst_price - record.cost_price
            else:
                record.margin = 0.0

    # Good: Use caching for complex calculations
    @api.model
    @tools.cache('product_categories')
    def get_categories(self):
        """Get product categories with caching."""
        return self.env['product.category'].search([])

    # Good: Use one-time computation for heavy operations
    def recompute_all_margins(self):
        """Force recomputation of all margins."""
        self.search([])._compute_margin()
```

### Frontend Performance

#### JavaScript Optimization
```javascript
// ✅ Good: Efficient JavaScript code
odoo.define('your_module.main', function (require) {
    'use strict';

    var core = require('web.core');
    var Widget = require('web.Widget');
    var rpc = require('web.rpc');

    var YourWidget = Widget.extend({
        template: 'your_module.your_template',

        // Good: Cache expensive operations
        init: function (parent, options) {
            this._super.apply(this, arguments);
            this.cachedData = {};
            this.loadingPromises = {};
        },

        // Good: Use promises for async operations
        loadData: function (id) {
            var self = this;

            // Return cached data if available
            if (this.cachedData[id]) {
                return $.when(this.cachedData[id]);
            }

            // Return existing promise if loading
            if (this.loadingPromises[id]) {
                return this.loadingPromises[id];
            }

            // Create and cache new loading promise
            this.loadingPromises[id] = rpc.query({
                model: 'your.model',
                method: 'read',
                args: [[id]],
                kwargs: {
                    fields: ['name', 'date', 'status']
                }
            }).then(function (result) {
                self.cachedData[id] = result[0];
                delete self.loadingPromises[id];
                return result[0];
            });

            return this.loadingPromises[id];
        },

        // Good: Debounce user input
        _onSearchInput: function (ev) {
            var self = this;
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(function () {
                self._performSearch(ev.target.value);
            }, 300);
        },

        _performSearch: function (searchTerm) {
            var self = this;
            return this.loadData(searchTerm).then(function (data) {
                self._updateUI(data);
            });
        }
    });

    return {
        YourWidget: YourWidget,
    };
});

// ❌ Bad: Inefficient JavaScript code
odoo.define('your_module.bad_example', function (require) {
    'use strict';

    var BadWidget = Widget.extend({
        // Bad: No caching, multiple RPC calls
        _onButtonClick: function () {
            var self = this;

            // Bad: Multiple synchronous calls
            for (var i = 0; i < 10; i++) {
                rpc.query({
                    model: 'your.model',
                    method: 'read',
                    args: [[i]]
                }).then(function (result) {
                    // This creates 10 parallel database calls
                    console.log(result);
                });
            }
        }
    });
});
```

## Database Best Practices

### Database Schema Design

#### Model Structure Best Practices
```python
# ✅ Good: Proper model structure
class SaleOrder(models.Model):
    _name = 'sale.order'
    _description = 'Sales Order'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'date_order desc, id desc'

    # Good: Proper field definitions with constraints
    name = fields.Char(
        string='Order Reference',
        required=True,
        copy=False,
        readonly=True,
        states={'draft': [('readonly', False)]},
        help="Unique order reference"
    )

    date_order = fields.Datetime(
        string='Order Date',
        required=True,
        default=fields.Datetime.now,
        help="Date when the order was created"
    )

    state = fields.Selection([
        ('draft', 'Quotation'),
        ('sent', 'Quotation Sent'),
        ('sale', 'Sales Order'),
        ('done', 'Locked'),
        ('cancel', 'Cancelled'),
    ], string='Status', readonly=True, copy=False, default='draft')

    # Good: Proper relational fields
    partner_id = fields.Many2one(
        'res.partner',
        string='Customer',
        required=True,
        change_default=True,
        index=True,
        tracking=True,
        help="Customer information"
    )

    order_line = fields.One2many(
        'sale.order.line',
        'order_id',
        string='Order Lines',
        copy=True
    )

    # Good: Computed fields with proper dependencies
    amount_total = fields.Float(
        compute='_amount_all',
        store=True,
        tracking=True,
        help="Total amount of the order"
    )

    # Good: SQL constraints
    _sql_constraints = [
        ('name_uniq', 'unique(name, company_id)', 'Order reference must be unique per company!'),
        ('date_check', 'check (date_order <= current_date)', 'Order date cannot be in the future'),
    ]

    @api.depends('order_line.price_total')
    def _amount_all(self):
        """Compute total amounts."""
        for order in self:
            amount_untaxed = amount_tax = 0.0
            for line in order.order_line:
                amount_untaxed += line.price_subtotal
                amount_tax += line.price_tax
            order.amount_untaxed = amount_untaxed
            order.amount_tax = amount_tax
            order.amount_total = amount_untaxed + amount_tax

    # Good: Business logic methods
    def action_confirm(self):
        """Confirm sales order."""
        if not self.order_line:
            raise UserError(_('You cannot confirm a sales order without any order lines.'))

        self._action_confirm()

    def _action_confirm(self):
        """Internal confirmation logic."""
        self.write({'state': 'sale'})
        self.message_post(body=_('Sales order confirmed'))
```

#### Indexing Strategy
```python
# ✅ Good: Proper indexing strategy
class LargeTableModel(models.Model):
    _name = 'large.table.model'

    # Good: Indexed fields for queries
    partner_id = fields.Many2one(
        'res.partner',
        string='Partner',
        index=True  # Explicit index
    )

    date_field = fields.Date(
        string='Date',
        index=True  # Explicit index
    )

    status = fields.Selection(
        [('draft', 'Draft'), ('confirmed', 'Confirmed')],
        string='Status',
        index=True  # Explicit index
    )

    # Good: Composite index for common queries
    @api.model
    def create_indexes(self):
        """Create custom database indexes."""
        self.env.cr.execute("""
            CREATE INDEX IF NOT EXISTS idx_large_table_partner_date
            ON large_table_model (partner_id, date_field DESC);

            CREATE INDEX IF NOT EXISTS idx_large_table_status_date
            ON large_table_model (status, date_field DESC)
            WHERE status = 'confirmed';

            CREATE INDEX IF NOT EXISTS idx_large_table_partner_status
            ON large_table_model (partner_id, status)
            WHERE status IN ('draft', 'confirmed');
        """)
```

## Testing Best Practices

### Comprehensive Test Coverage

#### Unit Testing Structure
```python
# ✅ Good: Comprehensive test structure
from odoo.tests.common import TransactionCase, tagged
from odoo.exceptions import ValidationError, UserError
from unittest.mock import patch, MagicMock

@tagged('post_install', '-at_install')
class TestYourModel(TransactionCase):
    """Comprehensive test suite for YourModel."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # Create test data once for all tests
        cls.partner = cls.env['res.partner'].create({
            'name': 'Test Partner',
            'email': 'test@example.com',
        })

    def setUp(self):
        super().setUp()
        # Create fresh data for each test
        self.test_record = self.env['your.model'].create({
            'name': 'Test Record',
            'partner_id': self.partner.id,
            'amount': 100.0,
            'state': 'draft',
        })

    def test_record_creation(self):
        """Test basic record creation."""
        record = self.env['your.model'].create({
            'name': 'New Record',
            'partner_id': self.partner.id,
        })

        self.assertEqual(record.name, 'New Record')
        self.assertEqual(record.partner_id, self.partner)
        self.assertEqual(record.state, 'draft')

    def test_state_transitions(self):
        """Test state machine transitions."""
        record = self.test_record

        # Test draft to confirmed
        record.action_confirm()
        self.assertEqual(record.state, 'confirmed')

        # Test confirmed to done
        record.action_done()
        self.assertEqual(record.state, 'done')

        # Test done back to draft (should work)
        record.action_draft()
        self.assertEqual(record.state, 'draft')

    def test_validation_errors(self):
        """Test validation error handling."""
        with self.assertRaises(ValidationError):
            self.env['your.model'].create({
                'name': '',  # Empty name should fail
                'partner_id': self.partner.id,
            })

        with self.assertRaises(ValidationError):
            self.test_record.write({
                'amount': -100.0,  # Negative amount should fail
            })

    def test_business_logic(self):
        """Test business logic methods."""
        # Test calculation method
        self.test_record.write({'amount': 200.0})
        self.test_record._calculate_total()
        self.assertEqual(self.test_record.total_amount, 200.0)

        # Test business rules
        result = self.test_record.check_business_rules()
        self.assertTrue(result)

    def test_access_rights(self):
        """Test access rights and permissions."""
        # Test as admin
        self.assertTrue(self.test_record.check_access_rights('read'))
        self.assertTrue(self.test_record.check_access_rights('write'))

        # Test as regular user
        user = self.env['res.users'].create({
            'name': 'Test User',
            'login': 'test_user',
        })
        test_record_as_user = self.test_record.sudo(user)
        self.assertTrue(test_record_as_user.check_access_rights('read'))
        self.assertFalse(test_record_as_user.check_access_rights('unlink'))

    def test_search_methods(self):
        """Test search and filtering methods."""
        # Test basic search
        records = self.env['your.model'].search([])
        self.assertIn(self.test_record, records)

        # Test domain filtering
        filtered_records = self.env['your.model'].search([
            ('partner_id', '=', self.partner.id)
        ])
        self.assertEqual(len(filtered_records), 1)

        # Test name search
        search_records = self.env['your.model'].name_search('Test')
        self.assertEqual(len(search_records), 1)

    @patch('your_module.models.your_model.external_api_call')
    def test_external_integration(self, mock_api):
        """Test external API integration with mocking."""
        mock_api.return_value = {'status': 'success', 'data': {'id': 123}}

        result = self.test_record.call_external_api()
        self.assertEqual(result['status'], 'success')
        mock_api.assert_called_once()

    def test_performance(self):
        """Test performance with large datasets."""
        # Create many records
        records = self.env['your.model'].create([
            {
                'name': f'Test Record {i}',
                'partner_id': self.partner.id,
                'amount': i * 10.0,
            }
            for i in range(100)
        ])

        # Test bulk operations
        self.env['your.model'].search([]).write({'state': 'confirmed'})

        # Verify all records were updated
        confirmed_count = self.env['your.model'].search([('state', '=', 'confirmed')])
        self.assertEqual(len(confirmed_count), 101)  # 100 + 1 original

    def test_edge_cases(self):
        """Test edge cases and boundary conditions."""
        # Test empty name
        with self.assertRaises(ValidationError):
            self.env['your.model'].create({
                'name': '   ',  # Whitespace only
                'partner_id': self.partner.id,
            })

        # Test very long name
        long_name = 'A' * 1000
        record = self.env['your.model'].create({
            'name': long_name,
            'partner_id': self.partner.id,
        })
        self.assertEqual(record.name, long_name)

        # Test zero amount
        record = self.env['your.model'].create({
            'name': 'Zero Amount',
            'partner_id': self.partner.id,
            'amount': 0.0,
        })
        self.assertEqual(record.amount, 0.0)
```

### Integration Testing
```python
# ✅ Good: Integration test structure
from odoo.tests.common import HttpCase, tagged

@tagged('post_install', '-at_install')
class TestYourModelIntegration(HttpCase):
    """Integration tests for YourModel."""

    def test_web_interface_flow(self):
        """Test complete web interface flow."""
        # Test creation through web interface
        self.start_tour("/", "your_model_creation_tour", login="admin")

        # Verify record was created
        record = self.env['your.model'].search([('name', '=', 'Test Record')])
        self.assertEqual(len(record), 1)

    def test_api_integration(self):
        """Test REST API integration."""
        # Test creation via API
        response = self.url_open(
            '/api/v1/your_model',
            data=json.dumps({
                'name': 'API Test Record',
                'partner_id': 1  # Assuming partner exists
            }).encode(),
            headers={'Content-Type': 'application/json'}
        )
        self.assertEqual(response.status_code, 200)

        # Verify record was created
        record = self.env['your_model'].search([('name', '=', 'API Test Record')])
        self.assertEqual(len(record), 1)

    def test_workflow_integration(self):
        """Test workflow integration with other modules."""
        # Create record
        record = self.env['your.model'].create({
            'name': 'Workflow Test',
        })

        # Test email notification
        record.action_confirm()
        # Verify email was sent (check email queue)
        email = self.env['mail.mail'].search([('subject', 'like', '%confirmed%')])
        self.assertTrue(email.exists())
```

## Documentation Standards

### Code Documentation
```python
# ✅ Good: Complete code documentation
class AdvancedFeature(models.Model):
    """Advanced feature implementation with comprehensive documentation.

    This class implements an advanced feature for managing complex business operations.
    It provides functionality for:
    - Feature 1 with detailed description
    - Feature 2 with technical details
    - Feature 3 with business logic explanation

    Technical Implementation:
    The class uses a combination of computed fields, stored fields, and business rules
    to provide a robust solution for managing business operations. It integrates with
    other modules through standard Odoo patterns.

    Performance Considerations:
    - Database indexes are properly configured for frequent queries
    - Computed fields are stored when expensive to calculate
    - Batch operations are used for large dataset processing

    Security Model:
    - Field-level security is implemented for sensitive data
    - Record-level security follows business rules
    - API endpoints use proper authentication and authorization

    Example Usage:
        >>> feature = self.env['advanced.feature'].create({
        ...     'name': 'Advanced Feature',
        ...     'type': 'type_a',
        ... })
        >>> feature.activate_feature()
        >>> feature.get_status()
        'active'

    Note:
        This class requires the following dependencies:
        - base
        - mail
        - Another module for advanced features

    See Also:
        - RelatedModule: Related functionality
        - AnotherClass: Similar implementation
    """

    _name = 'advanced.feature'
    _description = 'Advanced Feature Management'
    _inherit = ['mail.thread', 'mail.activity.mixin']

    # Field documentation with complete information
    name = fields.Char(
        string='Feature Name',
        required=True,
        tracking=True,
        copy=False,
        help="""Human-readable name for the feature.

        This field is used for display purposes throughout the application.
        It must be unique and should be descriptive of the feature's purpose.
        """
    )

    # Complex field with detailed explanation
    configuration_data = fields.Json(
        string='Configuration Data',
        default=lambda self: {
            'version': '1.0',
            'settings': {
                'option1': True,
                'option2': False
            }
        },
        help="""JSON configuration data for the feature.

        This field stores configuration in JSON format. The structure is:
        {
            "version": "1.0",
            "settings": {
                "option1": true,
                "option2": false,
                "custom_fields": {}
            }
        }

        Default values are automatically set when a new record is created.
        """
    )

    @api.depends('configuration_data')
    def _compute_configuration_summary(self):
        """Compute human-readable summary of configuration.

        This method processes the JSON configuration and creates a summary
        that can be easily understood by users.

        Returns:
            str: Human-readable configuration summary
        """
        for record in self:
            config = record.configuration_data or {}
            version = config.get('version', 'unknown')
            settings = config.get('settings', {})

            enabled_options = [k for k, v in settings.items() if v]
            summary = f"v{version} - {len(enabled_options)} options enabled"

            record.configuration_summary = summary

    def activate_feature(self):
        """Activate the feature with comprehensive business logic.

        This method performs the following operations:
        1. Validates that the feature can be activated
        2. Updates internal state
        3. Triggers necessary business processes
        4. Sends notifications to relevant users
        5. Logs the activation event

        Raises:
            UserError: If the feature cannot be activated due to business rules
            ValidationError: If required conditions are not met

        Example:
            >>> feature = self.env['advanced.feature'].browse(1)
            >>> feature.activate_feature()
            >>> feature.active
            True
        """
        # Validate activation conditions
        self._validate_activation()

        # Perform activation logic
        self._perform_activation()

        # Update state
        self.write({'state': 'active', 'activation_date': fields.Datetime.now()})

        # Send notifications
        self._send_activation_notification()

        # Log event
        self.message_post(body=_('Feature activated successfully'))

    def _validate_activation(self):
        """Validate that feature can be activated.

        This method contains business rules for activation validation.
        Override in subclasses to implement specific validation logic.

        Raises:
            ValidationError: When validation fails
        """
        if not self.name:
            raise ValidationError(_('Feature name is required for activation'))

        if self.state == 'active':
            raise ValidationError(_('Feature is already active'))

        # Additional validation logic
        pass

    def _perform_activation(self):
        """Perform the actual activation logic.

        This method contains the core activation logic that should be
        implemented by subclasses. It is called after validation passes.

        Returns:
            bool: True if activation was successful
        """
        # Implementation in subclasses
        return True

    def _send_activation_notification(self):
        """Send notification about feature activation.

        This method sends notifications to relevant users when a feature
        is activated. It uses the standard Odoo notification system.
        """
        template = self.env.ref('your_module.activation_notification_template')
        if template:
            template.send_mail(
                self.id,
                force_send=True,
                email_layout_xml='mail.mail_notification_light'
            )

    # Class methods for common operations
    @api.model
    def get_active_features(self, user=None):
        """Get active features for user or all.

        Args:
            user (res.users, optional): User to filter features for

        Returns:
            recordset: Active features accessible to user
        """
        domain = [('state', '=', 'active')]

        if user:
            domain.extend(self._get_user_domain(user))

        return self.search(domain)

    @api.model
    def _get_user_domain(self, user):
        """Get domain for filtering features by user.

        Args:
            user (res.users): User to filter for

        Returns:
            list: Domain expression
        """
        # Override in subclasses to implement user-specific filtering
        return []

    # SQL methods for complex queries
    @api.model
    def get_feature_statistics(self):
        """Get comprehensive statistics about features.

        Returns:
            dict: Statistics dictionary with counts by state, type, etc.
        """
        self.env.cr.execute("""
            SELECT
                state,
                COUNT(*) as count
            FROM advanced_feature
            GROUP BY state
            ORDER BY state
        """)

        results = self.env.cr.fetchall()
        return {state: count for state, count in results}
```

This comprehensive best practices guide covers all aspects of Odoo development, providing concrete examples and anti-patterns for each area. Following these practices will result in maintainable, secure, and performant Odoo applications.