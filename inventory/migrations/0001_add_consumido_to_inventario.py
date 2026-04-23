from django.db import migrations


def add_consumido_column(apps, schema_editor):
    if 'inventario' not in schema_editor.connection.introspection.table_names():
        return

    with schema_editor.connection.cursor() as cursor:
        cursor.execute("SHOW COLUMNS FROM inventario LIKE 'consumido'")
        if cursor.fetchone() is None:
            cursor.execute('ALTER TABLE inventario ADD COLUMN consumido BOOLEAN NOT NULL DEFAULT FALSE')


def remove_consumido_column(apps, schema_editor):
    if 'inventario' not in schema_editor.connection.introspection.table_names():
        return

    with schema_editor.connection.cursor() as cursor:
        cursor.execute("SHOW COLUMNS FROM inventario LIKE 'consumido'")
        if cursor.fetchone() is not None:
            cursor.execute('ALTER TABLE inventario DROP COLUMN consumido')


class Migration(migrations.Migration):
    dependencies = []

    operations = [
        migrations.RunPython(add_consumido_column, remove_consumido_column),
    ]
