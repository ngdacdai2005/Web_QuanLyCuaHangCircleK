import { API_BASE_URL } from '@/config/api';
import { getAuthHeaders } from '@/api/http';
import { parseApiError } from '@/utils/apiError';
import type {
  GroupedPermissions,
  ModuleCreatePayload,
  ModuleItem,
  ModuleUpdatePayload,
  PermissionCreatePayload,
  PermissionItem,
  PermissionSyncResult,
  PermissionUpdatePayload,
  RoleCreatePayload,
  RoleGroup,
  RoleUpdatePayload,
} from '../types/roleGroup';

export const rolesApi = {
  getAll: async (): Promise<RoleGroup[]> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/roles`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw await parseApiError(res, 'Không thể tải danh sách vai trò');
    return res.json();
  },

  getById: async (id: string): Promise<RoleGroup> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/roles/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw await parseApiError(res, 'Không thể tải chi tiết vai trò');
    return res.json();
  },

  create: async (data: RoleCreatePayload): Promise<RoleGroup> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/roles`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw await parseApiError(res, 'Không thể tạo mới vai trò');
    return res.json();
  },

  update: async (id: string, data: RoleUpdatePayload): Promise<RoleGroup> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/roles/${id}`, {
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw await parseApiError(res, 'Không thể cập nhật vai trò');
    return res.json();
  },

  delete: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/roles/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw await parseApiError(res, 'Không thể xoá vai trò');
  },

  getPermissions: async (roleId: string): Promise<string[]> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/roles/${roleId}/permissions`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw await parseApiError(res, 'Không thể tải quyền của vai trò');
    return res.json();
  },

  assignPermissions: async (roleId: string, permissionIds: string[]): Promise<void> => {
    const numericIds = permissionIds.map((id) => Number(id));
    const res = await fetch(`${API_BASE_URL}/api/v1/roles/${roleId}/permissions`, {
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissionIds: numericIds }),
    });
    if (!res.ok) throw await parseApiError(res, 'Không thể lưu quyền cho vai trò');
  },
};

export const permissionsApi = {
  getAll: async (): Promise<PermissionItem[]> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/permissions`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw await parseApiError(res, 'Không thể tải danh sách quyền');
    return res.json();
  },

  getGrouped: async (): Promise<GroupedPermissions> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/permissions/grouped`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw await parseApiError(res, 'Không thể tải danh sách quyền theo nhóm');
    return res.json();
  },

  sync: async (): Promise<PermissionSyncResult> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/permissions/sync`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw await parseApiError(res, 'Không thể đồng bộ quyền');
    return res.json();
  },

  create: async (data: PermissionCreatePayload): Promise<PermissionItem> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/permissions`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw await parseApiError(res, 'Không thể tạo quyền');
    return res.json();
  },

  update: async (id: string, data: PermissionUpdatePayload): Promise<PermissionItem> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/permissions/${id}`, {
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw await parseApiError(res, 'Không thể cập nhật quyền');
    return res.json();
  },

  delete: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/permissions/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw await parseApiError(res, 'Không thể xoá quyền');
  },

  deleteBulk: async (ids: string[]): Promise<void> => {
    const numericIds = ids.map((id) => Number(id));
    const res = await fetch(`${API_BASE_URL}/api/v1/permissions/bulk-delete`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(numericIds),
    });
    if (!res.ok) throw await parseApiError(res, 'Không thể xoá hàng loạt quyền');
  },
};

export const modulesApi = {
  getAll: async (): Promise<ModuleItem[]> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/permission-modules`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw await parseApiError(res, 'Không thể tải danh sách module');
    return res.json();
  },

  create: async (data: ModuleCreatePayload): Promise<ModuleItem> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/permission-modules`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw await parseApiError(res, 'Không thể tạo module');
    return res.json();
  },

  update: async (id: string, data: ModuleUpdatePayload): Promise<ModuleItem> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/permission-modules/${id}`, {
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw await parseApiError(res, 'Không thể cập nhật module');
    return res.json();
  },

  delete: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/permission-modules/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw await parseApiError(res, 'Không thể xoá module');
  },
};
