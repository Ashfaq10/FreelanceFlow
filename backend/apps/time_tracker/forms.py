from django import forms

from .models import TimeLog


class TimeLogForm(forms.ModelForm):
    class Meta:
        model = TimeLog
        fields = ['client', 'description', 'work_date', 'hours', 'hourly_rate']
        widgets = {
            'client': forms.Select(attrs={'class': 'form-select'}),
            'description': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'What did you work on?'}),
            'work_date': forms.DateInput(attrs={'class': 'form-input', 'type': 'date'}),
            'hours': forms.NumberInput(attrs={'class': 'form-input', 'step': '0.25', 'min': '0.25'}),
            'hourly_rate': forms.NumberInput(attrs={'class': 'form-input', 'step': '0.01', 'min': '0'}),
        }

    def __init__(self, user, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['client'].queryset = user.clients.filter(is_archived=False)
