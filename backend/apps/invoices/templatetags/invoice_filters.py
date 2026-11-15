from django import template

register = template.Library()


@register.filter
def currency(value, symbol='$'):
    """Format a number as currency."""
    try:
        return f'{symbol}{value:,.2f}'
    except (ValueError, TypeError):
        return value


@register.filter
def format_address(value):
    """Split comma-separated address into two lines (last two parts on second line)."""
    if not value:
        return value
    if '\n' in value or '\r' in value:
        return value
    parts = [part.strip() for part in value.split(',') if part.strip()]
    if len(parts) <= 2:
        return value
    first_line = ', '.join(parts[:-2])
    second_line = ', '.join(parts[-2:])
    return f'{first_line}\n{second_line}'
