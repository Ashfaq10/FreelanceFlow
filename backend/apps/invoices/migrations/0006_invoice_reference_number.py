from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('invoices', '0005_invoice_discount_amount'),
    ]

    operations = [
        migrations.AddField(
            model_name='invoice',
            name='reference_number',
            field=models.CharField(blank=True, max_length=100),
        ),
    ]
