"""Seed a demo account with realistic clients, invoices, payments and time logs.

Usage:
    python manage.py seed_demo          # create the demo account (fails if it exists)
    python manage.py seed_demo --reset  # delete the demo account and everything it owns, then recreate

All client emails use the reserved example.com domain so reminder tasks can never
mail a real person. Refuses to run unless DEBUG=True: the demo password is public.
"""
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.clients.models import Client
from apps.invoices.models import Invoice, InvoiceItem
from apps.payments.models import Payment
from apps.time_tracker.models import TimeLog

DEMO_EMAIL = 'demo@freelanceflow.dev'
DEMO_PASSWORD = 'demo-pass-2026'

CLIENTS = [
    {
        'name': 'Sarah Mitchell', 'company': 'Brightline Studio', 'email': 'sarah@brightline.example.com',
        'address': '48 Mercer Street', 'city': 'New York', 'state': 'NY', 'zip_code': '10013',
        'country': 'United States', 'phone': '+1 212 555 0148',
    },
    {
        'name': 'Daniel Okafor', 'company': 'Northwind Logistics', 'email': 'daniel.okafor@northwind.example.com',
        'address': '1200 Harbor Blvd, Suite 400', 'city': 'Oakland', 'state': 'CA', 'zip_code': '94607',
        'country': 'United States', 'phone': '+1 510 555 0192',
    },
    {
        'name': 'Emma Schulz', 'company': 'Kraftwerk Coffee GmbH', 'email': 'emma@kraftwerk.example.com',
        'address': 'Torstrasse 112', 'city': 'Berlin', 'state': '', 'zip_code': '10119',
        'country': 'Germany', 'phone': '+49 30 5550 1123',
    },
    {
        'name': 'Priya Raman', 'company': 'Lumen Health', 'email': 'priya@lumenhealth.example.com',
        'address': '77 King Street West', 'city': 'Toronto', 'state': 'ON', 'zip_code': 'M5K 1A2',
        'country': 'Canada', 'phone': '+1 416 555 0177',
    },
    {
        'name': 'Marcus Chen', 'company': '', 'email': 'marcus.chen@example.com',
        'address': '15 Rose Lane', 'city': 'Austin', 'state': 'TX', 'zip_code': '78704',
        'country': 'United States', 'phone': '+1 512 555 0115',
        'notes': 'Individual client. Prefers bank transfer.',
    },
    {
        'name': 'Olivia Hart', 'company': 'Fernbrook Realty', 'email': 'olivia@fernbrook.example.com',
        'address': '9 Wellington Road', 'city': 'Manchester', 'state': '', 'zip_code': 'M14 6WF',
        'country': 'United Kingdom', 'phone': '+44 161 555 0109', 'is_archived': True,
        'notes': 'Project finished in spring. Archived.',
    },
]

# (client index, issued days ago, net days, status, tax %, discount, items, payment method)
# Items: (description, quantity, unit price).
INVOICES = [
    (5, 240, 14, 'paid', '0', '0', [
        ('Property listing website: design + build', '1', '4200.00'),
        ('Content migration (120 listings)', '12', '45.00'),
    ], 'bank'),
    (0, 215, 30, 'paid', '8.875', '0', [
        ('Brand identity refresh', '1', '3500.00'),
        ('Marketing site: 6 page templates', '6', '350.00'),
    ], 'stripe'),
    (1, 190, 30, 'paid', '0', '250.00', [
        ('Shipment tracking dashboard: discovery sprint', '32', '95.00'),
        ('Technical specification document', '1', '800.00'),
    ], 'bank'),
    (2, 165, 14, 'paid', '19', '0', [
        ('Online shop build (Shopify theme customisation)', '1', '2800.00'),
        ('Product photography retouching', '40', '12.50'),
    ], 'stripe'),
    (3, 140, 30, 'paid', '13', '0', [
        ('Patient intake form: UX research', '18', '110.00'),
        ('Clickable prototype (Figma)', '1', '1450.00'),
    ], 'stripe'),
    (1, 112, 30, 'paid', '0', '0', [
        ('Tracking dashboard: frontend development', '64', '95.00'),
    ], 'bank'),
    (0, 95, 30, 'paid', '8.875', '0', [
        ('Monthly website retainer: August', '1', '900.00'),
        ('Landing page: Fall campaign', '1', '1200.00'),
    ], 'stripe'),
    (4, 80, 14, 'paid', '0', '0', [
        ('Personal portfolio site', '1', '1600.00'),
        ('Domain + hosting setup', '1', '150.00'),
    ], 'cash'),
    (3, 70, 30, 'paid', '13', '0', [
        ('Patient intake form: frontend build', '42', '110.00'),
        ('Accessibility audit (WCAG 2.1 AA)', '1', '950.00'),
    ], 'stripe'),
    (0, 62, 30, 'paid', '8.875', '0', [
        ('Monthly website retainer: September', '1', '900.00'),
    ], 'stripe'),
    (1, 48, 30, 'overdue', '0', '0', [
        ('Tracking dashboard: API integration', '38', '95.00'),
        ('Load testing + performance fixes', '10', '95.00'),
    ], None),
    (2, 35, 14, 'overdue', '19', '0', [
        ('Holiday menu landing page', '1', '850.00'),
        ('Newsletter template (Mailchimp)', '1', '400.00'),
    ], None),
    (0, 31, 30, 'paid', '8.875', '0', [
        ('Monthly website retainer: October', '1', '900.00'),
    ], 'stripe'),
    (3, 26, 30, 'sent', '13', '0', [
        ('Patient portal: authentication flow', '28', '110.00'),
    ], None),
    (0, 14, 16, 'sent', '8.875', '100.00', [
        ('Monthly website retainer: November', '1', '900.00'),
        ('Blog redesign', '1', '1100.00'),
    ], None),
    (4, 10, 30, 'sent', '0', '0', [
        ('Portfolio: case study pages', '3', '220.00'),
    ], None),
    (1, 3, 30, 'draft', '0', '0', [
        ('Tracking dashboard: phase 3 (mobile views)', '40', '95.00'),
    ], None),
    (2, 1, 14, 'draft', '19', '0', [
        ('Loyalty programme microsite', '1', '1900.00'),
    ], None),
    (5, 200, 14, 'cancelled', '0', '0', [
        ('Virtual tour integration (scope dropped)', '1', '1200.00'),
    ], None),
]

# (client index, days ago, description, hours, rate). Unbilled work in progress.
UNBILLED_TIME = [
    (1, 2, 'Mobile layout for shipment list', '3.50', '95.00'),
    (1, 1, 'Push notification spike', '2.25', '95.00'),
    (3, 4, 'Password reset flow: review comments', '1.50', '110.00'),
    (3, 2, 'Session timeout handling', '4.00', '110.00'),
    (2, 3, 'Loyalty microsite wireframes', '5.00', '85.00'),
    (0, 1, 'Fix contact form spam (hCaptcha)', '1.25', '75.00'),
]


class Command(BaseCommand):
    help = 'Create a demo account with realistic clients, invoices, payments and time logs.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset', action='store_true',
            help=f'Delete {DEMO_EMAIL} and all of its data before seeding.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError('seed_demo only runs with DEBUG=True; its password is published in the repo.')
        existing = User.objects.filter(email=DEMO_EMAIL).first()
        if existing:
            if not options['reset']:
                raise CommandError(f'{DEMO_EMAIL} already exists. Re-run with --reset to recreate it.')
            existing.delete()

        user = User.objects.create_user(
            email=DEMO_EMAIL,
            password=DEMO_PASSWORD,
            full_name='Alex Rivera',
            business_name='Rivera Digital Studio',
            business_tagline='Web design & development',
            business_email='hello@riveradigital.example.com',
            business_phone='+1 415 555 0123',
            currency='USD',
            address='2100 Folsom Street, Suite 3\nSan Francisco, CA 94110\nUnited States',
            phone='+1 415 555 0123',
            website='https://riveradigital.example.com',
            tax_number='EIN 84-1234567',
            bank_details=(
                'Account Name: Rivera Digital Studio LLC\n'
                'Bank: Example Community Bank\n'
                'Account Number: 000123456789\n'
                'Routing Number: 110000000'
            ),
            invoice_terms='Payment due within the stated terms. Late payments may incur a 1.5% monthly fee.',
        )

        clients = [Client.objects.create(user=user, **data) for data in CLIENTS]
        now = timezone.now()
        totals = {status: 0 for status in ('paid', 'sent', 'overdue', 'draft', 'cancelled')}

        # Oldest first, so invoice numbers increase with issue date.
        for client_idx, days_ago, net_days, status, tax, discount, items, method in sorted(
            INVOICES, key=lambda row: -row[1]
        ):
            client = clients[client_idx]
            issue_date = now - timedelta(days=days_ago)
            invoice = Invoice.objects.create(
                user=user,
                client=client,
                issue_date=issue_date,
                due_date=issue_date + timedelta(days=net_days),
                status=status,
                tax_rate=Decimal(tax),
                discount_amount=Decimal(discount),
                notes=f'Net {net_days}. Thank you for your business.',
                sent_at=None if status == 'draft' else issue_date + timedelta(hours=2),
            )
            for description, quantity, unit_price in items:
                InvoiceItem.objects.create(
                    invoice=invoice,
                    description=description,
                    quantity=Decimal(quantity),
                    unit_price=Decimal(unit_price),
                )
                # Hourly line items are backed by billed time logs, like real usage.
                if Decimal(quantity) > 1 and Decimal(unit_price) >= 85:
                    TimeLog.objects.create(
                        user=user,
                        client=client,
                        invoice=invoice,
                        description=description,
                        work_date=(issue_date - timedelta(days=3)).date(),
                        hours=Decimal(quantity),
                        hourly_rate=Decimal(unit_price),
                        is_billed=True,
                    )
            invoice.refresh_from_db()  # totals were written by the InvoiceItem post_save signal
            totals[status] += 1

            if status == 'paid':
                Payment.objects.create(
                    invoice=invoice,
                    amount_paid=invoice.total,
                    paid_on=(issue_date + timedelta(days=min(net_days - 2, 12))).date(),
                    method=method,
                    stripe_payment_id=f'pi_demo_{invoice.invoice_number.replace("-", "").lower()}'
                    if method == 'stripe' else '',
                )

        for client_idx, days_ago, description, hours, rate in UNBILLED_TIME:
            TimeLog.objects.create(
                user=user,
                client=clients[client_idx],
                description=description,
                work_date=(now - timedelta(days=days_ago)).date(),
                hours=Decimal(hours),
                hourly_rate=Decimal(rate),
            )

        summary = ', '.join(f'{count} {status}' for status, count in totals.items())
        self.stdout.write(self.style.SUCCESS(
            f'Seeded {DEMO_EMAIL} / {DEMO_PASSWORD}: {len(clients)} clients, '
            f'{len(INVOICES)} invoices ({summary}), '
            f'{TimeLog.objects.filter(user=user).count()} time logs, '
            f'{Payment.objects.filter(invoice__user=user).count()} payments.'
        ))
