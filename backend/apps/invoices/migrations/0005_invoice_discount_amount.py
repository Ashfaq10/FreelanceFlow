from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('invoices', '0004_invoice_due_date_default'),
    ]

    operations = [
        migrations.AddField(
            model_name='invoice',
            name='discount_amount',
            field=models.DecimalField(blank=True, default=0, max_digits=10, decimal_places=2),
        ),
    ]
