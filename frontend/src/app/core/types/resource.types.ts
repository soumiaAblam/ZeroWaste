export type ResourceFieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'textarea'
  | 'number'
  | 'date'
  | 'datetime-local'
  | 'checkbox'
  | 'select';

export interface ResourceOptionSource {
  endpoint: string;
  labelKey: string;
  valueKey: string;
}

export interface ResourceFieldConfig {
  key: string;
  label: string;
  type: ResourceFieldType;
  placeholder?: string;
  helpText?: string;
  requiredOnCreate?: boolean;
  requiredOnEdit?: boolean;
  step?: string;
  min?: number;
  integer?: boolean;
  optionSource?: ResourceOptionSource;
}

export interface ResourceDisplayField {
  label: string;
  key: string;
}

export type ResourceKey = 'inventory' | 'products';

export interface ResourceConfig {
  key: ResourceKey;
  endpoint: string;
  idField: string;
  title: string;
  singular: string;
  searchPlaceholder: string;
  columns: ResourceDisplayField[];
  detailFields: ResourceDisplayField[];
  formFields: ResourceFieldConfig[];
  barcodeLookup?: boolean;
}

export interface NavLink {
  label: string;
  path: string;
  icon: string;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
}

export interface UserProfileSummary {
  id_usuario: number;
  nombre_usuario: string;
  email: string;
  fecha_registro: string | null;
}

export interface AuthSessionResponse {
  access: string;
  refresh: string;
  auth_user: AuthUser;
  usuario: UserProfileSummary | null;
}

export interface AuthMeResponse {
  auth_user: AuthUser;
  usuario: UserProfileSummary | null;
}

export interface DashboardInventoryAlert {
  id_inventario: number;
  producto_nombre: string;
  producto_categoria: string | null;
  producto_codigo_barras: string | null;
  producto_precio: number | string | null;
  producto_imagen_url: string | null;
  estado_nombre: string;
  estado_color: string | null;
  estado_dias_aviso: number | null;
  dias_restantes: number;
  cantidad: number | string;
  fecha_caducidad: string;
  ubicacion?: string | null;
  consumido: boolean;
}

export interface ShoppingSuggestion {
  id_item: number;
  producto_nombre: string;
  producto_categoria: string | null;
  producto_codigo_barras: string | null;
  producto_imagen_url: string | null;
  cantidad: number | string;
  comprado: boolean | null;
  sugerencia_motivos: string[];
}
