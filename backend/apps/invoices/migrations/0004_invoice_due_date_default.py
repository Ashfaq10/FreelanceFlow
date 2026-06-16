from django.db import migrations, models
import django.utils.timezone


def default_due_date():
    return django.utils.timezone.now() + django.utils.timezone.timedelta(days=30)


class Migration(migrations.Migration):

    dependencies = [
        ('invoices', '0003_merge_20260517_2138'),
    ]

    operations = [
        migrations.AlterField(
            model_name='invoice',
            name='due_date',
            field=models.DateTimeField(default=default_due_date),
        ),
    ]
