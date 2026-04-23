from decimal import Decimal, ROUND_CEILING

from django.db.models import Q, Sum
from django.utils import timezone

from inventory.models import InventoryItem

from .models import ShoppingList, ShoppingListItem


AUTO_SHOPPING_LIST_NAME = 'Sugerencias de compra'


def normalize_unit_quantity(quantity):
    if quantity is None:
        return 1

    decimal_quantity = Decimal(str(quantity))
    whole_quantity = int(decimal_quantity.to_integral_value(rounding=ROUND_CEILING))
    return max(whole_quantity, 1)


def sync_shopping_suggestion(user_profile, product):
    shopping_list = ShoppingList.objects.filter(
        usuario=user_profile,
        nombre_lista=AUTO_SHOPPING_LIST_NAME,
    ).first()
    # Solo mando algo a la lista si realmente hay que recomprarlo.
    # En esta app eso pasa cuando se consumio o cuando ya caduco un producto.
    inventory_items_to_buy_again = InventoryItem.objects.filter(usuario=user_profile, producto=product).filter(
        Q(consumido=True) | Q(consumido=False, fecha_caducidad__lt=timezone.localdate())
    )

    if not inventory_items_to_buy_again.exists():
        if shopping_list is not None:
            ShoppingListItem.objects.filter(lista=shopping_list, producto=product).delete()
        return None

    if shopping_list is None:
        shopping_list = ShoppingList.objects.create(
            usuario=user_profile,
            nombre_lista=AUTO_SHOPPING_LIST_NAME,
            fecha_creacion=timezone.now(),
        )

    quantity = normalize_unit_quantity(inventory_items_to_buy_again.aggregate(total=Sum('cantidad'))['total'] or 1)
    item, _created = ShoppingListItem.objects.get_or_create(
        lista=shopping_list,
        producto=product,
        defaults={'cantidad': quantity, 'comprado': False},
    )

    if item.cantidad != quantity or item.comprado:
        item.cantidad = quantity
        item.comprado = False
        item.save(update_fields=['cantidad', 'comprado'])

    return item


def sync_inventory_with_shopping_list(inventory_item):
    if not inventory_item.pk or not inventory_item.usuario_id or not inventory_item.producto_id:
        return None

    return sync_shopping_suggestion(inventory_item.usuario, inventory_item.producto)


def sync_user_suggestions(user_profile):
    product_ids = (
        InventoryItem.objects.filter(usuario=user_profile)
        .values_list('producto_id', flat=True)
        .distinct()
    )
    for product_id in product_ids:
        product = (
            InventoryItem.objects.filter(usuario=user_profile, producto_id=product_id)
            .select_related('producto')
            .first()
            .producto
        )
        sync_shopping_suggestion(user_profile, product)
