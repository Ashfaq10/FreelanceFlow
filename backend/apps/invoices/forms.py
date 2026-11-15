from django import forms
from django.forms import inlineformset_factory

from .models import Invoice, InvoiceItem


class InvoiceForm(forms.ModelForm):
    class Meta:
        model = Invoice
        fields = ['client', 'issue_date', 'due_date', 'tax_rate', 'notes']
        widgets = {
            'client': forms.Select(attrs={'class': 'form-select'}),
            'issue_date': forms.DateTimeInput(attrs={'class': 'form-input', 'type': 'datetime-local'}),
            'due_date': forms.DateTimeInput(attrs={'class': 'form-input', 'type': 'datetime-local'}),
            'tax_rate': forms.NumberInput(attrs={'class': 'form-input', 'step': '0.01', 'min': '0', 'max': '100'}),
            'notes': forms.Textarea(
                attrs={'class': 'form-textarea', 'rows': 3, 'placeholder': 'Payment terms, bank details, etc.'}
            ),
        }

    def __init__(self, user, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['client'].queryset = user.clients.filter(is_archived=False)


class InvoiceItemForm(forms.ModelForm):
    class Meta:
        model = InvoiceItem
        fields = ['description', 'quantity', 'unit_price']
        widgets = {
            'description': forms.TextInput(
                attrs={'class': 'form-input', 'placeholder': 'Service or product description'}
            ),
            'quantity': forms.NumberInput(attrs={'class': 'form-input w-24', 'step': '0.01', 'min': '0.01'}),
            'unit_price': forms.NumberInput(attrs={'class': 'form-input w-32', 'step': '0.01', 'min': '0'}),
        }


InvoiceItemFormSet = inlineformset_factory(
    Invoice,
    InvoiceItem,
    form=InvoiceItemForm,
    extra=1,
    can_delete=True,
    min_num=1,
    validate_min=True,
)


class InvoiceSendForm(forms.Form):
    send_email = forms.BooleanField(
        required=False,
        initial=True,
        label='Send email to client',
        widget=forms.CheckboxInput(attrs={'class': 'form-checkbox'}),
    )
    message = forms.CharField(
        required=False,
        widget=forms.Textarea(
            attrs={'class': 'form-textarea', 'rows': 4, 'placeholder': 'Optional message to include in the email'}
        ),
    )
