import uuid

from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('invoices', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Payment',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('amount_paid', models.DecimalField(decimal_places=2, max_digits=10)),
                ('paid_on', models.DateField(default=django.utils.timezone.now)),
                ('stripe_payment_id', models.CharField(blank=True, max_length=255)),
                ('stripe_session_id', models.CharField(blank=True, max_length=255)),
                ('method', models.CharField(choices=[('stripe', 'Stripe'), ('bank', 'Bank Transfer'), ('cash', 'Cash'), ('check', 'Check'), ('other', 'Other')], default='stripe', max_length=20)),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('invoice', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='payment', to='invoices.invoice')),
            ],
            options={
                'ordering': ['-paid_on', '-created_at'],
            },
        ),
    ]
