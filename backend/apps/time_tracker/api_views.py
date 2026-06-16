from rest_framework import viewsets, permissions
from .models import TimeLog
from .serializers import TimeLogSerializer


class TimeLogViewSet(viewsets.ModelViewSet):
    serializer_class = TimeLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return TimeLog.objects.filter(user=self.request.user)
