import { NavLink, ResourceConfig } from '../types/resource.types';

export const PRODUCTS_RESOURCE_CONFIG: ResourceConfig = {
  key: 'products',
  endpoint: 'productos',
  idField: 'id_producto',
  title: 'Productos',
  singular: 'producto',
  searchPlaceholder: 'Buscar producto',
  barcodeLookup: true,
  columns: [
    { label: 'ID', key: 'id_producto' },
    { label: 'Nombre', key: 'nombre' },
    { label: 'Categoria', key: 'categoria' },
    { label: 'Precio', key: 'precio' },
    { label: 'Codigo de barras', key: 'codigo_barras' },
    { label: 'Descripcion', key: 'descripcion' },
  ],
  detailFields: [
    { label: 'ID', key: 'id_producto' },
    { label: 'Nombre', key: 'nombre' },
    { label: 'Categoria', key: 'categoria' },
    { label: 'Precio', key: 'precio' },
    { label: 'Codigo de barras', key: 'codigo_barras' },
    { label: 'Descripcion', key: 'descripcion' },
  ],
  formFields: [
    { key: 'nombre', label: 'Nombre', type: 'text', requiredOnCreate: true, requiredOnEdit: true },
    { key: 'categoria', label: 'Categoria', type: 'text', requiredOnCreate: true, requiredOnEdit: true },
    { key: 'descripcion', label: 'Descripcion', type: 'textarea' },
    { key: 'precio', label: 'Precio', type: 'number', step: '0.01', min: 0 },
    {
      key: 'codigo_barras',
      label: 'Codigo de barras',
      type: 'text',
      placeholder: 'Ej. 3017624010701',
      helpText: 'Se puede escribir o buscar.',
    },
  ],
};

export const INVENTORY_RESOURCE_CONFIG: ResourceConfig = {
  key: 'inventory',
  endpoint: 'inventarios',
  idField: 'id_inventario',
  title: 'Inventario',
  singular: 'registro de inventario',
  searchPlaceholder: 'Buscar en inventario',
  columns: [
    { label: 'ID', key: 'id_inventario' },
    { label: 'Producto', key: 'producto_nombre' },
    { label: 'Aviso', key: 'estado_nombre' },
    { label: 'Cantidad', key: 'cantidad' },
    { label: 'Caducidad', key: 'fecha_caducidad' },
    { label: 'Consumido', key: 'consumido' },
  ],
  detailFields: [
    { label: 'ID', key: 'id_inventario' },
    { label: 'Producto', key: 'producto_nombre' },
    { label: 'Aviso', key: 'estado_nombre' },
    { label: 'Cantidad', key: 'cantidad' },
    { label: 'Fecha de compra', key: 'fecha_compra' },
    { label: 'Fecha de caducidad', key: 'fecha_caducidad' },
    { label: 'Marca', key: 'ubicacion' },
    { label: 'Consumido', key: 'consumido' },
  ],
  formFields: [
    {
      key: 'producto',
      label: 'Producto existente',
      type: 'select',
      optionSource: { endpoint: 'productos', labelKey: 'nombre', valueKey: 'id_producto' },
      helpText: 'Si ya existe, seleccionalo aqui.',
    },
    {
      key: 'producto_nombre_nuevo',
      label: 'Producto nuevo',
      type: 'text',
      placeholder: 'Ej. Yogur natural',
      helpText: 'Usalo si no aparece en el selector.',
    },
    {
      key: 'producto_categoria_nueva',
      label: 'Categoria del producto nuevo',
      type: 'text',
      placeholder: 'Ej. Lacteos, conservas, pasta',
    },
    {
      key: 'producto_precio_nuevo',
      label: 'Precio estimado del producto nuevo',
      type: 'number',
      step: '0.01',
      min: 0,
    },
    {
      key: 'producto_codigo_barras_nuevo',
      label: 'Codigo de barras del producto nuevo',
      type: 'text',
      placeholder: 'Se podra escanear mas adelante',
    },
    {
      key: 'cantidad',
      label: 'Cantidad',
      type: 'number',
      requiredOnCreate: true,
      requiredOnEdit: true,
      step: '1',
      min: 1,
      integer: true,
    },
    { key: 'fecha_compra', label: 'Fecha de compra', type: 'date' },
    {
      key: 'fecha_caducidad',
      label: 'Fecha de caducidad',
      type: 'date',
      requiredOnCreate: true,
      requiredOnEdit: true,
      helpText: 'La app calcula el aviso.',
    },
    {
      key: 'ubicacion',
      label: 'Marca',
      type: 'text',
      placeholder: 'Ej. Hacendado, Carrefour, Danone',
      helpText: 'Marca o supermercado.',
    },
  ],
};

export const NAV_LINKS: NavLink[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'space_dashboard' },
  { label: 'Inventario', path: '/inventory', icon: 'inventory_2' },
  { label: 'Productos', path: '/products', icon: 'category' },
  { label: 'Lista de compra', path: '/shopping-list', icon: 'shopping_cart' },
  { label: 'Recetas', path: '/recipes', icon: 'restaurant_menu' },
  { label: 'Desperdicio', path: '/waste', icon: 'delete_outline' },
  { label: 'Estadisticas', path: '/statistics', icon: 'bar_chart' },
];

export function getProductsResourceConfig(): ResourceConfig {
  return PRODUCTS_RESOURCE_CONFIG;
}

export function getInventoryResourceConfig(): ResourceConfig {
  return INVENTORY_RESOURCE_CONFIG;
}
