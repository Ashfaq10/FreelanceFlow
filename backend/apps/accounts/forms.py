from django import forms

from .models import User


class UserProfileForm(forms.ModelForm):
    class Meta:
        model = User
        fields = [
            'full_name',
            'business_name',
            'logo',
            'currency',
            'bank_details',
            'tax_number',
            'address',
            'phone',
            'website',
        ]
        widgets = {
            'full_name': forms.TextInput(attrs={'class': 'form-input'}),
            'business_name': forms.TextInput(attrs={'class': 'form-input'}),
            'bank_details': forms.Textarea(attrs={'class': 'form-textarea', 'rows': 3}),
            'address': forms.Textarea(attrs={'class': 'form-textarea', 'rows': 3}),
            'tax_number': forms.TextInput(attrs={'class': 'form-input'}),
            'phone': forms.TextInput(attrs={'class': 'form-input'}),
            'website': forms.URLInput(attrs={'class': 'form-input'}),
        }


class UserSettingsForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ['email', 'full_name']
        widgets = {
            'email': forms.EmailInput(attrs={'class': 'form-input'}),
            'full_name': forms.TextInput(attrs={'class': 'form-input'}),
        }
