from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_user_invoice_branding'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='business_email',
            field=models.EmailField(
                blank=True,
                help_text='Business contact email shown on invoices',
                max_length=254,
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='business_phone',
            field=models.CharField(
                blank=True,
                help_text='Business contact phone shown on invoices',
                max_length=20,
            ),
        ),
    ]
