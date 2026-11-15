from rest_framework.pagination import PageNumberPagination


class DefaultPagination(PageNumberPagination):
    """Lets a client ask for a bigger page (`?page_size=`), which the SPA needs for selects and totals (BUG-7)."""

    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 200
