from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_alter_user_groups'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='business_tagline',
            field=models.CharField(
                blank=True,
                help_text='Short tagline shown below business name on invoices',
                max_length=255,
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='invoice_terms',
            field=models.TextField(
                blank=True,
                help_text='Terms & conditions shown at the bottom of invoices',
            ),
        ),
        migrations.AlterField(
            model_name='user',
            name='currency',
            field=models.CharField(
                choices=[
                    ('USD', 'US Dollar'),
                    ('EUR', 'Euro'),
                    ('GBP', 'British Pound'),
                    ('CAD', 'Canadian Dollar'),
                    ('AUD', 'Australian Dollar'),
                    ('INR', 'Indian Rupee'),
                    ('BDT', 'Bangladeshi Taka'),
                ],
                default='USD',
                max_length=3,
            ),
        ),
    ]
