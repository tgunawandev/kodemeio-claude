# OCA Integration Guide

Comprehensive guide to integrating with the Odoo Community Association (OCA) ecosystem, including repository standards, contribution workflows, and best practices.

## Table of Contents

1. [OCA Overview](#oca-overview)
2. [Repository Structure](#repository-structure)
3. [Development Standards](#development-standards)
4. [Contribution Workflow](#contribution-workflow)
5. [Quality Assurance](#quality-assurance)
6. [Popular OCA Addons](#popular-oca-addons)
7. [Integration Patterns](#integration-patterns)
8. [Maintainer Guidelines](#maintainer-guidelines)

## OCA Overview

### What is OCA?

The Odoo Community Association (OCA) is a nonprofit organization whose mission is to promote the widespread use of Odoo and to support the collaborative development of Odoo features.

**Key Benefits:**
- 🌐 **Global Community**: 5000+ contributors worldwide
- 📦 **Quality Addons**: 200+ repositories with enterprise-grade modules
- 🔧 **Open Standards**: Consistent development patterns and quality standards
- 🤝 **Collaboration**: Peer review and knowledge sharing
- 📚 **Documentation**: Comprehensive guides and best practices

### OCA Repository Organization

```
OCA Organization on GitHub:
├── account-financial-tools/     # Accounting & Finance
├── crm/                        # Customer Relationship Management
├── hr/                         # Human Resources
├── inventory/                  # Inventory & Stock Management
├── manufacturing/              # Manufacturing & MRP
├── project/                    # Project Management
├── sale-workflow/              # Sales & Order Management
├── server-tools/               # Server & Development Tools
├── web/                        # Web & UI Enhancements
├── vertical-restaurant/        # Restaurant Management
├── vertical-hotel/             # Hotel Management
├── vertical-education/         # Education Management
└── connector/                  # Third-party Integrations
```

## Repository Structure

### Standard OCA Repository Layout

```
oca-repository-name/
├── .github/                    # GitHub configuration
│   ├── workflows/              # CI/CD workflows
│   │   ├── tests.yml          # Automated testing
│   │   ├── lint.yml           # Code quality checks
│   │   └── translation.yml    # Translation updates
│   ├── ISSUE_TEMPLATE/        # Issue templates
│   └── PULL_REQUEST_TEMPLATE.md # PR template
├── .copier-answers.yml        # Repository configuration
├── .eslintrc.yml              # JavaScript linting
├── .pre-commit-config.yaml    # Pre-commit hooks
├── .prettierrc                # Code formatting
├── .travis.yml               # Travis CI configuration
├── setup.cfg                 # Python package configuration
├── requirements.txt          # Python dependencies
├── test-requirements.txt     # Test dependencies
├── README.md                 # Repository documentation
├── CONTRIBUTING.md           # Contribution guidelines
├── LICENSE                   # License file (AGPL-3)
├── MANIFEST.in               # Package manifest
├── your_addon/               # Main addon directory
│   ├── __init__.py
│   ├── __manifest__.py
│   ├── models/
│   ├── views/
│   ├── controllers/
│   ├── data/
│   ├── security/
│   ├── static/
│   ├── tests/
│   ├── i18n/
│   ├── wizard/
│   └── report/
├── your_other_addon/          # Additional addons
└── docs/                     # Additional documentation
```

### Module Manifest Requirements

**OCA Standard __manifest__.py:**
```python
{
    'name': 'OCA Addon Name',
    'version': '18.0.1.0.0',
    'category': 'Extra Tools',
    'summary': 'Brief description of the addon',
    'description': """
        Long description of what the addon does.
        Include key features and use cases.

        This addon provides:
        - Feature 1
        - Feature 2
        - Feature 3
    """,
    'author': 'Your Name, OCA',
    'website': 'https://github.com/OCA/repository-name',
    'license': 'AGPL-3',
    'depends': [
        'base',
        'mail',
        # List exact dependencies
    ],
    'data': [
        # Data files in order of dependency
        'security/security.xml',
        'data/ir_config_parameter.xml',
        'views/views.xml',
    ],
    'demo': [
        # Demo data files
    ],
    'installable': True,
    'application': False,
    'auto_install': False,
    'external_dependencies': {
        'python': ['requests', 'python-dateutil'],
        'bin': ['wkhtmltopdf'],
    },
    'maintainers': ['YourGitHubHandle'],
    'development_status': 'Alpha/Beta/Production/Stable/Mature',
}
```

## Development Standards

### Code Quality Standards

#### Python Code Style
```python
# ✅ Good OCA Code Style
from odoo import models, fields, api, _

class YourModel(models.Model):
    """Model description following OCA standards."""

    _name = 'your.model'
    _description = 'Your Model Description'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'name'
    _rec_name = 'display_name'

    name = fields.Char(
        string='Name',
        required=True,
        tracking=True,
        copy=False,
        help="Field description"
    )

    @api.depends('field1', 'field2')
    def _compute_computed_field(self):
        """Compute field value."""
        for record in self:
            # Computation logic
            pass

    @api.model
    def your_method(self, arg1, arg2):
        """Method description.

        Args:
            arg1: Description of arg1
            arg2: Description of arg2

        Returns:
            Description of return value
        """
        # Method implementation
        pass
```

#### JavaScript/TypeScript Standards
```javascript
// ✅ Good OCA JavaScript Style
odoo.define('your_addon.your_module', function (require) {
    'use strict';

    var core = require('web.core');
    var Widget = require('web.Widget');
    var rpc = require('web.rpc');

    var _t = core._t;

    var YourWidget = Widget.extend({
        template: 'your_addon.your_template',

        init: function (parent, options) {
            this._super.apply(this, arguments);
            this.options = options || {};
        },

        willStart: function () {
            var self = this;
            return this._loadData().then(function () {
                return self._super.apply(self, arguments);
            });
        },

        _loadData: function () {
            return rpc.query({
                model: 'your.model',
                method: 'search_read',
                args: [[]],
            });
        },

        renderElement: function () {
            this._super.apply(this, arguments);
            this.$('.your-selector').on('click', this._onButtonClick.bind(this));
        },

        _onButtonClick: function (ev) {
            ev.preventDefault();
            // Button click logic
        },
    });

    return {
        YourWidget: YourWidget,
    };
});
```

#### XML/View Standards
```xml
<!-- ✅ Good OCA XML Structure -->
<odoo>
    <record id="view_your_model_form" model="ir.ui.view">
        <field name="name">your.model.form</field>
        <field name="model">your.model</field>
        <field name="arch" type="xml">
            <form string="Your Model">
                <header>
                    <button name="action_confirm" type="object"
                            string="Confirm" states="draft"
                            class="btn-primary"/>
                    <field name="state" widget="statusbar"/>
                </header>
                <sheet>
                    <group name="main_group">
                        <group name="left_group">
                            <field name="name"/>
                            <field name="field1"/>
                        </group>
                        <group name="right_group">
                            <field name="field2"/>
                            <field name="date_field"/>
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

### Naming Conventions

#### Files and Directories
```
your_addon_name/
├── models/
│   ├── res_partner.py          # Extend existing models
│   ├── your_model.py          # New models
│   └── __init__.py
├── views/
│   ├── res_partner_views.xml   # Extended model views
│   ├── your_model_views.xml   # New model views
│   ├── menu_items.xml         # Menu definitions
│   └── __init__.py
├── security/
│   ├── ir.model.access.csv    # Access control lists
│   └── security.xml           # Security groups
├── data/
│   ├── ir_config_parameter.xml
│   └── demo_data.xml
├── static/
│   ├── css/
│   │   └── your_addon.css
│   ├── js/
│   │   └── your_addon.js
│   └── images/
├── tests/
│   ├── __init__.py
│   ├── test_models.py
│   └── test_ui.py
└── i18n/
    ├── your_addon.pot
    └── es.po
```

#### Python Naming
```python
# Classes: PascalCase
class YourModel(models.Model):
    pass

class ModelInheritance(models.Model):
    _inherit = 'base.model'

# Functions and variables: snake_case
def your_function():
    your_variable = 'value'

# Private members: prefix with underscore
_private_variable = 'private'
def _private_method(self):
    pass

# Constants: UPPER_CASE
MAX_FIELD_LENGTH = 255
DEFAULT_VALUE = 'default'
```

### Documentation Standards

#### Module Documentation
```python
"""
Your Addon Description

This module provides comprehensive functionality for...

Features:
- Feature 1 with detailed description
- Feature 2 with use cases
- Feature 3 with benefits

Configuration:
1. Install module
2. Configure settings in Settings → Your Module
3. Set up required parameters

Usage:
1. Navigate to appropriate menu
2. Create new records
3. Configure necessary options

Dependencies:
- base
- mail
- Other required modules

Author: Your Name <your.email@example.com>
License: AGPL-3
"""
```

#### Method Documentation
```python
def calculate_total(self, lines, tax_included=False):
    """Calculate total amount from invoice lines.

    Args:
        lines (recordset): Invoice lines to calculate
        tax_included (bool): Whether to include taxes in total

    Returns:
        float: Total amount

    Raises:
        ValidationError: If lines are empty or invalid

    Example:
        >>> invoice = self.env['account.invoice'].browse(1)
        >>> total = invoice.calculate_total(invoice.line_ids)
        >>> print(f"Total: {total}")
        Total: 1500.00
    """
    pass
```

## Contribution Workflow

### Step 1: Fork and Clone

```bash
# Fork the repository on GitHub
# Clone your fork locally
git clone https://github.com/your-username/oca-repo-name.git
cd oca-repo-name

# Add upstream remote
git remote add upstream https://github.com/OCA/oca-repo-name.git
```

### Step 2: Set Up Development Environment

```bash
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install development dependencies
pip install -r test-requirements.txt
pip install -r requirements.txt

# Install pre-commit hooks
pre-commit install
```

### Step 3: Create Feature Branch

```bash
# Sync with upstream
git fetch upstream
git checkout upstream/18.0 -b your-feature-branch

# Create your feature branch
git checkout -b feature/your-feature-name
```

### Step 4: Make Changes

#### Follow Development Workflow
```bash
# Make your changes
# Add new files
git add your_new_file.py

# Commit with descriptive message
git commit -m "[IMP] Add feature: your feature description

* Add new model with proper validation
* Implement necessary views and security
* Add comprehensive tests
* Update documentation"

# Push to your fork
git push origin feature/your-feature-name
```

#### Commit Message Format
```
[TYPE] Brief description

Detailed explanation of changes:

* What was changed
* Why it was changed
* How it was changed
* Any breaking changes or migration notes

Closes #issue_number
Fixes #issue_number
```

**Types:**
- `ADD` - New functionality
- `IMP` - Improvement to existing functionality
- `FIX` - Bug fix
- `REF` - Refactoring (no functional change)
- `REM` - Removal of functionality
- `MOV` - Code movement/refactoring
- `CLA` - Explicit signature agreement
- `WIP` - Work in progress (do not merge)

### Step 5: Quality Assurance

#### Run Tests
```bash
# Run specific test
pytest tests/test_models.py::TestYourModel::test_method

# Run all tests
pytest tests/

# Run with coverage
pytest --cov=your_addon tests/
```

#### Code Quality Checks
```bash
# Run linting
flake8 your_addon/

# Run security check
bandit -r your_addon/

# Check complexity
radon cc your_addon/ -a

# Run pre-commit hooks
pre-commit run --all-files
```

#### Manual Testing
```bash
# Start Odoo with your addon
odoo-bin -d test_db -u your_addon --dev=reload,qweb,xml

# Test in browser
# - Install addon
# - Test all features
# - Check UI responsiveness
# - Verify security permissions
```

### Step 6: Create Pull Request

1. **Open PR on GitHub** with clear title and description
2. **Fill PR template** completely
3. **Link to relevant issues**
4. **Request reviewers** from maintainers
5. **Ensure CI passes** all checks

#### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Checklist
- [ ] I have read the [CONTRIBUTING](CONTRIBUTING.md) doc
- [ ] I have signed the [CLA](https://cla-assistant.io/oca)
- [ ] Lint and unit tests pass locally with my changes
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] I have updated the documentation accordingly
```

## Quality Assurance

### Automated Testing

#### CI/CD Pipeline Configuration
```yaml
# .github/workflows/tests.yml
name: Tests

on:
  push:
    branches: [ 18.0, 17.0, 16.0 ]
  pull_request:
    branches: [ 18.0, 17.0, 16.0 ]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        python-version: [3.8, 3.9, 3.10]

    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: odoo
          POSTGRES_DB: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3

    - name: Set up Python ${{ matrix.python-version }}
      uses: actions/setup-python@v4
      with:
        python-version: ${{ matrix.python-version }}

    - name: Install dependencies
      run: |
        pip install -r test-requirements.txt
        pip install -r requirements.txt

    - name: Lint with flake8
      run: |
        flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
        flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics

    - name: Run tests
      run: |
        pytest --cov-report=xml --cov-report=term-missing tests/
      env:
        ODOO_TEST_DB: test

    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage.xml
```

#### Test Structure
```python
# tests/__init__.py
from . import test_models
from . import test_ui
from . import test_performance

# tests/test_models.py
import unittest
from odoo.tests.common import TransactionCase, tagged

@tagged('post_install', '-at_install')
class TestYourModel(TransactionCase):
    """Test cases for YourModel"""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # Create test data
        cls.partner = cls.env['res.partner'].create({
            'name': 'Test Partner',
        })

    def test_create_record(self):
        """Test record creation"""
        record = self.env['your.model'].create({
            'name': 'Test Record',
            'partner_id': self.partner.id,
        })
        self.assertEqual(record.name, 'Test Record')
        self.assertEqual(record.partner_id, self.partner)

    def test_validation(self):
        """Test field validation"""
        with self.assertRaises(Exception):
            self.env['your.model'].create({
                'name': '',  # Should fail validation
            })

    def test_computed_fields(self):
        """Test computed field calculation"""
        record = self.env['your.model'].create({
            'name': 'Test Record',
            'field1': 100,
            'field2': 200,
        })
        record._compute_total()
        self.assertEqual(record.total, 300)

# tests/test_ui.py
from odoo.tests.common import HttpCase, tagged

@tagged('post_install', '-at_install')
class TestUI(HttpCase):
    """UI test cases"""

    def test_ui_flow(self):
        """Test complete UI flow"""
        self.start_tour("/", "your_addon_tour", login="admin")

# tests/test_performance.py
from odoo.tests.common import TransactionCase, tagged

@tagged('post_install', '-at_install')
class TestPerformance(TransactionCase):
    """Performance test cases"""

    def test_query_performance(self):
        """Test database query performance"""
        # Test query with proper indexing
        pass
```

### Code Review Standards

#### Review Checklist
- [ ] **Code Quality**: Follows PEP8 and OCA standards
- [ ] **Functionality**: Works as intended and matches requirements
- [ ] **Tests**: Adequate test coverage for new code
- [ ] **Documentation**: Updated and comprehensive
- [ ] **Security**: No security vulnerabilities
- [ ] **Performance**: Efficient implementation
- [ ] **Compatibility**: Works with Odoo version
- [ ] **Migration**: Proper migration scripts if needed

#### Review Guidelines
1. **Be constructive** in feedback
2. **Explain reasoning** behind suggestions
3. **Check for edge cases** and error handling
4. **Verify security implications**
5. **Consider performance impact**
6. **Test the changes** if possible

## Popular OCA Addons

### Accounting & Finance

**account-financial-tools** repository:
- `account_payment_order` - Automated payment processing
- `account_financial_report` - Enhanced financial reporting
- `account_bank_statement_import` - Bank statement import
- `account_invoice_export` - Invoice export functionality

### CRM & Sales

**crm** repository:
- `crm_lead_website` - Lead capture from website
- `crm_helpdesk` - Helpdesk and support ticketing
- `crm_salesperson_planning` - Sales territory planning
- `crm_partner_hierarchy` - Partner relationship management

### Human Resources

**hr** repository:
- `hr_holidays_public` - Public holidays management
- `hr_attendance_rfid` - RFID attendance tracking
- `hr_expense_sepa` - SEPA payment for expenses
- `hr_employee_grade` - Employee grade and salary management

### Inventory & Manufacturing

**inventory** repository:
- `stock_location_automatic` - Automatic location assignment
- `stock_picking_package_autocomplete` - Package completion
- `stock_demand_estimate` - Demand estimation
- `stock_valuation_layer` - Enhanced inventory valuation

**manufacturing** repository:
- `mrp_bom_component_price` - Component price tracking
- `mrp_multi_level` - Multi-level MRP
- `mrp_workorder_quality` - Quality control in work orders
- `mrp_production_batch` - Batch production management

### Project Management

**project** repository:
- `project_task_default_stage` - Default task stages
- `project_task_material` - Material management in tasks
- `project_timesheet_time_control` - Time sheet controls
- `project_role` - Project role management

### Web & UI Enhancements

**web** repository:
- `web_responsive` - Responsive web interface
- `web_environment_ribbon` - Environment indicator
- `web_dark_mode` - Dark mode support
- `web_widget_x2many_2d_matrix` - Matrix widget

## Integration Patterns

### Using OCA Addons

#### Installation and Configuration
```python
# __manifest__.py
{
    'name': 'Your Custom Module',
    'depends': [
        'base',
        'sale_management',           # Core Odoo
        'sale_stock',                # OCA addon
        'account_payment_order',      # OCA addon
        'hr_holidays_public',        # OCA addon
    ],
    # ... other configuration
}
```

#### Extending OCA Models
```python
# models/sale_order.py
from odoo import models, fields, api

class SaleOrder(models.Model):
    _inherit = 'sale.order'

    # Add new fields
    custom_field = fields.Char(string='Custom Field')

    # Override OCA methods
    def action_confirm(self):
        # Custom logic before confirm
        result = super().action_confirm()
        # Custom logic after confirm
        return result
```

#### Customizing OCA Views
```xml
<!-- views/sale_order_views.xml -->
<odoo>
    <!-- Inherit OCA view -->
    <record id="view_order_form_inherit" model="ir.ui.view">
        <field name="name">sale.order.form.inherit</field>
        <field name="model">sale.order</field>
        <field name="inherit_id" ref="sale.view_order_form"/>
        <field name="arch" type="xml">
            <!-- Add custom fields -->
            <xpath expr="//field[@name='note']" position="before">
                <field name="custom_field"/>
            </xpath>

            <!-- Add custom buttons -->
            <xpath expr="//button[@name='action_confirm']" position="before">
                <button name="action_custom" type="object" string="Custom Action"/>
            </xpath>
        </field>
    </record>
</odoo>
```

### Contributing to OCA

#### Setting Up for Development
```bash
# Clone multiple OCA repositories
gh repo clone OCA/account-financial-tools
gh repo clone OCA/crm
gh repo clone OCA/hr

# Set up git configuration
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Sign CLA
# Visit: https://cla-assistant.io/oca
```

#### Forking and Contributing Workflow
```bash
# Fork and clone repository
gh repo clone OCA/your-target-repo
cd your-target-repo

# Create development branch
git checkout -b feature/your-contribution

# Make changes
# Add tests
# Update documentation

# Commit changes
git add .
git commit -m "[IMP] Add your feature description"

# Push to fork
git push origin feature/your-contribution

# Create pull request
gh pr create --title "Add: Your feature title" --body "Description of changes"
```

## Maintainer Guidelines

### Repository Management

#### Release Process
```bash
# Ensure all tests pass
pytest tests/

# Update version numbers
# Update __manifest__.py files
# Update README.md

# Create release tag
git tag -a 18.0.1.0.0 -m "Release 18.0.1.0.0"
git push origin 18.0.1.0.0

# Create GitHub release
gh release create 18.0.1.0.0 --title "Release 18.0.1.0.0" --notes "Release notes"
```

#### Branch Management
```bash
# Create stable branch for new version
git checkout -b 18.0 upstream/18.0
git push origin 18.0

# Merge features to stable
git checkout 18.0
git merge feature/new-feature
git push origin 18.0
```

### Community Engagement

#### Code Review Best Practices
1. **Respond promptly** to PRs and issues
2. **Provide clear feedback** with reasoning
3. **Encourage contributors** to improve their skills
4. **Document decisions** and rationale
5. **Mentor new contributors** when possible

#### Issue Management
1. **Label issues** appropriately
2. **Provide reproduction steps** for bugs
3. **Suggest solution approaches**
4. **Track progress** with milestones
5. **Close resolved issues** with explanation

### Quality Standards

#### Release Criteria
- [ ] All tests pass
- [ ] Code coverage ≥ 80%
- [ ] Documentation complete
- [ ] Security review passed
- [ ] Performance acceptable
- [ ] Compatibility verified

#### Version Management
```python
# Semantic versioning
MAJOR.MINOR.PATCH

# Examples:
18.0.1.0.0  # Major.Minor.Patch.Patch
18.0.1.1.0  # Bug fix
18.0.2.0.0  # New features
18.1.0.0.0  # Breaking changes
```

This comprehensive OCA integration guide provides everything needed to successfully work with the Odoo Community Association ecosystem, from basic contributions to repository maintenance and community leadership.