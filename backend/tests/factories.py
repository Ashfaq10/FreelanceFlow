import factory
from django.utils import timezone
from factory.django import DjangoModelFactory

from apps.accounts.models import User
from apps.clients.models import Client
from apps.invoices.models import Invoice, InvoiceItem
from apps.time_tracker.models import TimeLog
from apps.payments.models import Payment


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Faker('email')
    full_name = factory.Faker('name')
    business_name = factory.Faker('company')
    currency = 'USD'
    is_active = True
    email_verified = True

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        self.set_password(extracted or 'testpass123')
        if create:
            self.save()


class ClientFactory(DjangoModelFactory):
    class Meta:
        model = Client

    user = factory.SubFactory(UserFactory)
    name = factory.Faker('name')
    email = factory.Faker('email')
    company = factory.Faker('company')
    address = factory.Faker('address')
    # Faker's phone_number can exceed Client.phone's max_length=20, which Postgres rejects (SQLite does not).
    phone = factory.Faker('numerify', text='+1-###-###-####')
    is_archived = False


class InvoiceFactory(DjangoModelFactory):
    class Meta:
        model = Invoice

    user = factory.SubFactory(UserFactory)
    client = factory.SubFactory(ClientFactory)
    due_date = factory.LazyFunction(lambda: timezone.now() + timezone.timedelta(days=30))
    status = 'draft'
    tax_rate = 0
    notes = factory.Faker('paragraph')


class InvoiceItemFactory(DjangoModelFactory):
    class Meta:
        model = InvoiceItem

    invoice = factory.SubFactory(InvoiceFactory)
    description = factory.Faker('sentence')
    quantity = factory.Faker('pydecimal', left_digits=2, right_digits=2, positive=True, min_value=1, max_value=100)
    unit_price = factory.Faker('pydecimal', left_digits=4, right_digits=2, positive=True, min_value=10, max_value=1000)


class TimeLogFactory(DjangoModelFactory):
    class Meta:
        model = TimeLog

    user = factory.SubFactory(UserFactory)
    client = factory.SubFactory(ClientFactory)
    description = factory.Faker('sentence')
    work_date = factory.LazyFunction(timezone.now().date)
    hours = factory.Faker('pydecimal', left_digits=1, right_digits=2, positive=True, min_value=1, max_value=8)
    hourly_rate = factory.Faker('pydecimal', left_digits=3, right_digits=2, positive=True, min_value=50, max_value=200)
    is_billed = False


class PaymentFactory(DjangoModelFactory):
    class Meta:
        model = Payment

    invoice = factory.SubFactory(InvoiceFactory)
    amount_paid = factory.LazyAttribute(lambda o: o.invoice.total)
    paid_on = factory.LazyFunction(timezone.now().date)
    method = 'stripe'
    stripe_payment_id = factory.Faker('uuid4')
