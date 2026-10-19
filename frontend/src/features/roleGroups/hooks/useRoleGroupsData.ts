import { useCallback, useEffect, useMemo, useState } from 'react';
import { App as AntdApp } from 'antd';
import { modulesApi, permissionsApi, rolesApi } from '../api/roleGroupApi';
import type {
  GroupedPermissions,
  ModuleItem,
  PermissionItem,
  RoleGroup,
} from '../types/roleGroup';

export const useRoleGroupsData = () => {
  const { message } = AntdApp.useApp();

  const [roles, setRoles] = useState<RoleGroup[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingRolePerms, setLoadingRolePerms] = useState(false);
  const [savingRolePerms, setSavingRolePerms] = useState(false);

  const [allPermissions, setAllPermissions] = useState<PermissionItem[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<GroupedPermissions>({});
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);

  const [roleSearch, setRoleSearch] = useState('');
  const [permSearch, setPermSearch] = useState('');
  const [moduleSearch, setModuleSearch] = useState('');

  const loadRoles = useCallback(async () => {
    try {
      setLoadingRoles(true);
      const data = await rolesApi.getAll();
      setRoles(data);
      if (data.length > 0 && selectedRoleId === null) {
        setSelectedRoleId(data[0].id);
      }
    } catch (e: any) {
      message.error(e?.message || 'Không thể tải danh sách vai trò');
    } finally {
      setLoadingRoles(false);
    }
  }, [message, selectedRoleId]);

  const loadPermissions = useCallback(async () => {
    try {
      setLoadingPerms(true);
      const [all, grouped] = await Promise.all([
        permissionsApi.getAll(),
        permissionsApi.getGrouped(),
      ]);
      setAllPermissions(all);
      setGroupedPermissions(grouped);
    } catch (e: any) {
      message.error(e?.message || 'Không thể tải danh sách quyền');
    } finally {
      setLoadingPerms(false);
    }
  }, [message]);

  const loadModules = useCallback(async () => {
    try {
      setLoadingModules(true);
      const data = await modulesApi.getAll();
      setModules(data);
    } catch (e: any) {
      message.error(e?.message || 'Không thể tải danh sách module');
    } finally {
      setLoadingModules(false);
    }
  }, [message]);

  const loadRolePermissions = useCallback(async (roleId: string) => {
    try {
      setLoadingRolePerms(true);
      const pids = await rolesApi.getPermissions(roleId);
      setRolePermissions(pids);
    } catch (e: any) {
      message.error(e?.message || 'Không thể tải quyền của vai trò');
    } finally {
      setLoadingRolePerms(false);
    }
  }, [message]);

  useEffect(() => {
    void loadRoles();
    void loadPermissions();
    void loadModules();
  }, [loadRoles, loadPermissions, loadModules]);

  useEffect(() => {
    if (selectedRoleId) {
      void loadRolePermissions(selectedRoleId);
    } else {
      setRolePermissions([]);
    }
  }, [selectedRoleId, loadRolePermissions]);

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  );

  const filteredRoles = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(
      (r) =>
        r.maVaiTro.toLowerCase().includes(q) ||
        r.tenVaiTro.toLowerCase().includes(q) ||
        (r.moTa && r.moTa.toLowerCase().includes(q)),
    );
  }, [roles, roleSearch]);

  const filteredModules = useMemo(() => {
    const q = moduleSearch.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.displayNameVi.toLowerCase().includes(q) ||
        m.displayNameEn.toLowerCase().includes(q),
    );
  }, [modules, moduleSearch]);

  const filteredGroupedPermissions = useMemo(() => {
    const q = permSearch.trim().toLowerCase();
    if (!q) return groupedPermissions;

    const res: GroupedPermissions = {};
    for (const [modKey, perms] of Object.entries(groupedPermissions)) {
      const matched = perms.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.displayNameVi.toLowerCase().includes(q) ||
          p.displayNameEn.toLowerCase().includes(q),
      );
      if (matched.length > 0) {
        res[modKey] = matched;
      }
    }
    return res;
  }, [groupedPermissions, permSearch]);

  const handleTogglePermission = useCallback((permId: string) => {
    setRolePermissions((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId],
    );
  }, []);

  const handleToggleModulePermissions = useCallback(
    (modKey: string, selectAll: boolean) => {
      const permsInMod = groupedPermissions[modKey] || [];
      const permIds = permsInMod.map((p) => p.id);

      setRolePermissions((prev) => {
        const withoutMod = prev.filter((id) => !permIds.includes(id));
        return selectAll ? [...withoutMod, ...permIds] : withoutMod;
      });
    },
    [groupedPermissions],
  );

  const handleSaveRolePermissions = useCallback(async () => {
    if (!selectedRoleId) return;
    try {
      setSavingRolePerms(true);
      await rolesApi.assignPermissions(selectedRoleId, rolePermissions);
      message.success('Đã lưu cấu hình quyền cho vai trò.');
    } catch (e: any) {
      message.error(e?.message || 'Lỗi lưu quyền vai trò');
    } finally {
      setSavingRolePerms(false);
    }
  }, [selectedRoleId, rolePermissions, message]);

  const handleSyncPermissions = useCallback(async () => {
    try {
      setSyncing(true);
      const res = await permissionsApi.sync();
      message.success(
        `Đồng bộ thành công! Tạo mới ${res.createdModules} module, ${res.createdPermissions} quyền. Tổng cộng: ${res.totalPermissions} quyền.`,
      );
      await Promise.all([loadPermissions(), loadModules(), loadRoles()]);
      if (selectedRoleId) {
        await loadRolePermissions(selectedRoleId);
      }
    } catch (e: any) {
      message.error(e?.message || 'Đồng bộ quyền thất bại');
    } finally {
      setSyncing(false);
    }
  }, [loadPermissions, loadModules, loadRoles, loadRolePermissions, selectedRoleId, message]);

  return {
    roles,
    filteredRoles,
    selectedRoleId,
    setSelectedRoleId,
    selectedRole,
    rolePermissions,
    loadingRoles,
    loadingRolePerms,
    savingRolePerms,
    allPermissions,
    modules,
    filteredModules,
    groupedPermissions,
    filteredGroupedPermissions,
    loadingPerms,
    loadingModules,
    syncing,
    roleSearch,
    setRoleSearch,
    permSearch,
    setPermSearch,
    moduleSearch,
    setModuleSearch,
    handleTogglePermission,
    handleToggleModulePermissions,
    handleSaveRolePermissions,
    handleSyncPermissions,
    loadRoles,
    loadPermissions,
    loadModules,
  };
};
