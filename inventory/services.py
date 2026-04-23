from .models import ExpiryStatus


def get_alert_days(status):
    if status is None:
        return None

    statuses = list(ExpiryStatus.objects.all().order_by('id_estado'))
    if not statuses:
        return None

    fallback_status = max(statuses, key=lambda item: (item.dias_max, item.dias_min, -item.pk))
    if status.pk == fallback_status.pk:
        return None

    return int(status.dias_max)
