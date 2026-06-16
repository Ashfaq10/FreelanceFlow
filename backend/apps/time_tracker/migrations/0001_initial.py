import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('clients', '0001_initial'),
        ('invoices', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='TimeLog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('description', models.CharField(help_text='What was worked on', max_length=500)),
                ('work_date', models.DateField(default=django.utils.timezone.now)),
                ('hours', models.DecimalField(decimal_places=2, max_digits=5)),
                ('hourly_rate', models.DecimalField(decimal_places=2, max_digits=10)),
                ('is_billed', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('client', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='time_logs', to='clients.client')),
                ('invoice', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='time_logs', to='invoices.invoice')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='time_logs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-work_date', '-created_at'],
            },
        ),
    ]
