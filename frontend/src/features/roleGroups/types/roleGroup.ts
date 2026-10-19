export interface RoleGroup {
  id: string;
  maVaiTro: string;
  tenVaiTro: string;
  moTa?: string;
  status: number;
  userCount: number;
}

export interface PermissionItem {
  id: string;
  name: string;
  description?: string;
  displayNameVi: string;
  displayNameEn: string;
  module: string;
  status: number;
}

export interface ModuleItem {
  id: string;
  name: string;
  displayNameVi: string;
  displayNameEn: string;
  description?: string;
  icon?: string;
  color?: string;
  thuTu?: number;
  status: number;
  permissionCount: number;
}

export type GroupedPermissions = Record<string, PermissionItem[]>;

export interface PermissionSyncResult {
  createdPermissions: number;
  createdModules: number;
  totalPermissions: number;
}

export interface RoleCreatePayload {
  maVaiTro: string;
  tenVaiTro: string;
  moTa?: string;
}

export interface RoleUpdatePayload {
  tenVaiTro: string;
  moTa?: string;
  status?: number;
}

export interface PermissionCreatePayload {
  name: string;
  displayNameVi: string;
  displayNameEn: string;
  description?: string;
  module: string;
  status?: number;
}

export interface PermissionUpdatePayload {
  displayNameVi: string;
  displayNameEn: string;
  description?: string;
  module?: string;
  status?: number;
}

export interface ModuleCreatePayload {
  name: string;
  displayNameVi: string;
  displayNameEn: string;
  description?: string;
  icon?: string;
  color?: string;
  thuTu?: number;
}

export interface ModuleUpdatePayload {
  displayNameVi: string;
  displayNameEn: string;
  description?: string;
  icon?: string;
  color?: string;
  thuTu?: number;
  status?: number;
}
