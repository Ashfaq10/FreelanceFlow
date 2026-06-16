from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='client',
            name='city',
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name='client',
            name='state',
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name='client',
            name='zip_code',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name='client',
            name='country',
            field=models.CharField(blank=True, max_length=120),
        ),
    ]
