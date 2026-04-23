import json
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import urlopen


BRAND_PREFIXES = (
    ('Hacendado', 'Hacendado'),
    ('Verdifresh', 'Verdifresh'),
    ('Milbona', 'Milbona'),
    ('Carrefour', 'Carrefour'),
    ('Lidl', 'Lidl'),
    ('Alcampo', 'Alcampo'),
    ('Dia', 'Dia'),
    ('Danone', 'Danone'),
    ('Gallo', 'Gallo'),
    ('Pescanova', 'Pescanova'),
    ('Bimbo', 'Bimbo'),
)

SPECIAL_PRODUCT_NAMES = {
    'lidl hummus clasico': 'Hummus clasico',
}


def normalize_product_name(name, brand=''):
    clean_name = ' '.join(str(name or '').split())
    if not clean_name:
        return ''

    normalized_name = clean_name.casefold()
    if normalized_name.startswith('hacendado lasana'):
        return 'Lasana bolonesa'

    if normalized_name in SPECIAL_PRODUCT_NAMES:
        return SPECIAL_PRODUCT_NAMES[normalized_name]

    prefixes = list(BRAND_PREFIXES)
    # Intento quitar la marca si viene al principio para guardar un nombre mas limpio.
    for brand_part in str(brand or '').replace('-', ' ').split():
        if len(brand_part) > 2:
            prefixes.append((brand_part, str(brand)))

    for prefix, _brand in sorted(prefixes, key=lambda item: len(item[0]), reverse=True):
        clean_prefix = prefix.strip()
        normalized_prefix = clean_prefix.casefold()
        if normalized_name.startswith(f'{normalized_prefix} '):
            clean_product = clean_name[len(clean_prefix):].strip()
            return _capitalize_product(clean_product)

    return _capitalize_product(clean_name)


def _capitalize_product(name):
    if not name:
        return ''

    return f'{name[:1].upper()}{name[1:]}'


def get_product_by_barcode(barcode, timeout=5):
    if not barcode:
        return None

    url = (
        f'https://world.openfoodfacts.net/api/v2/product/{quote(str(barcode))}'
        '?fields=product_name,generic_name,categories,brands,quantity'
    )

    try:
        with urlopen(url, timeout=timeout) as response:
            payload = json.load(response)
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError):
        return None

    if payload.get('status') != 1:
        return None

    product = payload.get('product') or {}
    categories = (product.get('categories') or '').split(',')
    category = categories[0].strip() if categories and categories[0].strip() else ''

    description_parts = [
        f"Marca: {product.get('brands', '').strip()}" if product.get('brands') else '',
        f"Tipo: {product.get('generic_name', '').strip()}" if product.get('generic_name') else '',
        f"Cantidad: {product.get('quantity', '').strip()}" if product.get('quantity') else '',
    ]
    description = ' | '.join(part for part in description_parts if part)

    return {
        'nombre': (product.get('product_name') or '').strip(),
        'categoria': category,
        'descripcion': description,
    }
