import { useState, type FC } from 'react';
import { App as AntdApp, Tabs, Typography } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { RoleListSidebar } from './components/RoleListSidebar';
import { RolePermissionsTab } from './components/RolePermissionsTab';
import { PermissionManagerTab } from './components/PermissionManagerTab';
import { ModuleManagerTab } from './components/ModuleManagerTab';
import { RoleModal } from './components/RoleModal';
import { PermissionModal } from './components/PermissionModal';
import { PermissionDetailModal } from './components/PermissionDetailModal';
import { ModuleModal } from './components/ModuleModal';
import { ModuleDetailModal } from './components/ModuleDetailModal';
import { useRoleGroupsData } from './hooks/useRoleGroupsData';
import { modulesApi, permissionsApi, rolesApi } from './api/roleGroupApi';
import type {
  ModuleCreatePayload,
  ModuleItem,
  ModuleUpdatePayload,
  PermissionCreatePayload,
  PermissionItem,
  PermissionUpdatePayload,
  RoleCreatePayload,
  RoleGroup,
  RoleUpdatePayload,
} from './types/roleGroup';
import './RoleGroupsPage.css';

const { Title } = Typography;

export const RoleGroupsPage: FC = () => {
  const { message } = AntdApp.useApp();
  const {
    roles,
    filteredRoles,
    selectedRoleId,
    setSelectedRoleId,
    selectedRole,
    rolePermissions,
    loadingRoles,
    loadingRolePerms,
    savingRolePerms,
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
  } = useRoleGroupsData();

  const [activeTab, setActiveTab] = useState('role-perms');

  // Role Modal State
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleGroup | null>(null);
  const [submittingRole, setSubmittingRole] = useState(false);

  // Permission Modal State
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [editingPerm, setEditingPerm] = useState<PermissionItem | null>(null);
  const [submittingPerm, setSubmittingPerm] = useState(false);

  // Detail Permission Modal State
  const [detailPermModalOpen, setDetailPermModalOpen] = useState(false);
  const [viewingPerm, setViewingPerm] = useState<PermissionItem | null>(null);
  const [deletingBulkPerms, setDeletingBulkPerms] = useState(false);

  // Module Modal State
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<ModuleItem | null>(null);
  const [submittingModule, setSubmittingModule] = useState(false);

  // Detail Module Modal State
  const [detailModuleModalOpen, setDetailModuleModalOpen] = useState(false);
  const [viewingModule, setViewingModule] = useState<ModuleItem | null>(null);

  // Role actions
  const handleOpenAddRole = () => {
    setEditingRole(null);
    setRoleModalOpen(true);
  };

  const handleOpenEditRole = (role: RoleGroup) => {
    setEditingRole(role);
    setRoleModalOpen(true);
  };

  const handleSubmitRole = async (values: RoleCreatePayload | RoleUpdatePayload) => {
    try {
      setSubmittingRole(true);
      if (editingRole) {
        await rolesApi.update(editingRole.id, values as RoleUpdatePayload);
        message.success('Đã cập nhật thông tin vai trò');
      } else {
        const created = await rolesApi.create(values as RoleCreatePayload);
        message.success('Đã thêm mới nhóm quyền');
        setSelectedRoleId(created.id);
      }
      setRoleModalOpen(false);
      await loadRoles();
    } catch (e: any) {
      message.error(e?.message || 'Thao tác thất bại');
    } finally {
      setSubmittingRole(false);
    }
  };

  const handleDeleteRole = async (id: string) => {
    try {
      await rolesApi.delete(id);
      message.success('Đã xoá nhóm quyền thành công');
      if (selectedRoleId === id) {
        setSelectedRoleId(null);
      }
      await loadRoles();
    } catch (e: any) {
      message.error(e?.message || 'Không thể xoá vai trò');
    }
  };

  // Permission actions
  const handleOpenAddPerm = () => {
    setEditingPerm(null);
    setPermModalOpen(true);
  };

  const handleOpenEditPerm = (perm: PermissionItem) => {
    setEditingPerm(perm);
    setPermModalOpen(true);
  };

  const handleSubmitPerm = async (
    values: PermissionCreatePayload | PermissionUpdatePayload,
  ) => {
    try {
      setSubmittingPerm(true);
      if (editingPerm) {
        await permissionsApi.update(editingPerm.id, values as PermissionUpdatePayload);
        message.success('Đã cập nhật quyền');
      } else {
        await permissionsApi.create(values as PermissionCreatePayload);
        message.success('Đã thêm quyền mới');
      }
      setPermModalOpen(false);
      await Promise.all([loadPermissions(), loadModules()]);
    } catch (e: any) {
      message.error(e?.message || 'Thao tác thất bại');
    } finally {
      setSubmittingPerm(false);
    }
  };

  const handleDeletePerm = async (id: string) => {
    try {
      await permissionsApi.delete(id);
      message.success('Đã xoá quyền thành công');
      await Promise.all([loadPermissions(), loadModules()]);
    } catch (e: any) {
      message.error(e?.message || 'Không thể xoá quyền');
    }
  };

  const handleViewPermDetail = (perm: PermissionItem) => {
    setViewingPerm(perm);
    setDetailPermModalOpen(true);
  };

  const handleDeleteBulkPerms = async (ids: string[]) => {
    try {
      setDeletingBulkPerms(true);
      await permissionsApi.deleteBulk(ids);
      message.success(`Đã xoá thành công ${ids.length} quyền`);
      await Promise.all([loadPermissions(), loadModules()]);
    } catch (e: any) {
      message.error(e?.message || 'Không thể xoá các quyền đã chọn');
      throw e;
    } finally {
      setDeletingBulkPerms(false);
    }
  };

  // Module actions
  const handleOpenAddModule = () => {
    setEditingModule(null);
    setModuleModalOpen(true);
  };

  const handleOpenEditModule = (mod: ModuleItem) => {
    setEditingModule(mod);
    setModuleModalOpen(true);
  };

  const handleSubmitModule = async (
    values: ModuleCreatePayload | ModuleUpdatePayload,
  ) => {
    try {
      setSubmittingModule(true);
      if (editingModule) {
        await modulesApi.update(editingModule.id, values as ModuleUpdatePayload);
        message.success('Đã cập nhật nhóm quyền');
      } else {
        await modulesApi.create(values as ModuleCreatePayload);
        message.success('Đã thêm nhóm quyền mới');
      }
      setModuleModalOpen(false);
      await loadModules();
    } catch (e: any) {
      message.error(e?.message || 'Thao tác thất bại');
    } finally {
      setSubmittingModule(false);
    }
  };

  const handleDeleteModule = async (id: string) => {
    try {
      await modulesApi.delete(id);
      message.success('Đã xoá nhóm quyền thành công');
      await loadModules();
    } catch (e: any) {
      message.error(e?.message || 'Không thể xoá module');
    }
  };

  const handleViewModuleDetail = (mod: ModuleItem) => {
    setViewingModule(mod);
    setDetailModuleModalOpen(true);
  };

  const tabItems = [
    {
      key: 'role-perms',
      label: 'Thông tin quyền thuộc nhóm',
      children: (
        <RolePermissionsTab
          role={selectedRole}
          groupedPermissions={groupedPermissions}
          modules={modules}
          selectedPermissionIds={rolePermissions}
          onTogglePermission={handleTogglePermission}
          onToggleModule={handleToggleModulePermissions}
          onSave={handleSaveRolePermissions}
          saving={savingRolePerms}
          loading={loadingRolePerms || loadingPerms}
        />
      ),
    },
    {
      key: 'perm-manage',
      label: 'Quản lý quyền',
      children: (
        <PermissionManagerTab
          groupedPermissions={filteredGroupedPermissions}
          modules={modules}
          searchValue={permSearch}
          onSearchChange={setPermSearch}
          onSync={handleSyncPermissions}
          onAddNew={handleOpenAddPerm}
          onEdit={handleOpenEditPerm}
          onDelete={handleDeletePerm}
          onViewDetail={handleViewPermDetail}
          onDeleteBulk={handleDeleteBulkPerms}
          deletingBulk={deletingBulkPerms}
          syncing={syncing}
          loading={loadingPerms}
        />
      ),
    },
    {
      key: 'module-manage',
      label: 'Quản lý nhóm quyền',
      children: (
        <ModuleManagerTab
          modules={filteredModules}
          searchValue={moduleSearch}
          onSearchChange={setModuleSearch}
          onAddNew={handleOpenAddModule}
          onEdit={handleOpenEditModule}
          onDelete={handleDeleteModule}
          onViewDetail={handleViewModuleDetail}
          loading={loadingModules}
        />
      ),
    },
  ];

  return (
    <div className="rg-page-container">
      <div className="rg-header-bar">
        <div className="rg-page-title-wrap">
          <SettingOutlined className="rg-title-icon" />
          <Title level={4} className="rg-page-title">
            Nhóm quyền
          </Title>
        </div>
        <div className="rg-total-badge">Tổng số: {roles.length}</div>
      </div>

      <div className="rg-master-detail-row">
        <div className="rg-left-col">
          <RoleListSidebar
            roles={filteredRoles}
            selectedRoleId={selectedRoleId}
            onSelectRole={setSelectedRoleId}
            onAddNew={handleOpenAddRole}
            onEdit={handleOpenEditRole}
            onDelete={handleDeleteRole}
            searchValue={roleSearch}
            onSearchChange={setRoleSearch}
            loading={loadingRoles}
          />
        </div>

        <div className="rg-right-col">
          <div className="rg-detail-card">
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={tabItems}
              className="rg-detail-tabs"
            />
          </div>
        </div>
      </div>

      <RoleModal
        open={roleModalOpen}
        role={editingRole}
        onCancel={() => setRoleModalOpen(false)}
        onSubmit={handleSubmitRole}
        submitting={submittingRole}
      />

      <PermissionModal
        open={permModalOpen}
        permission={editingPerm}
        modules={modules}
        onCancel={() => setPermModalOpen(false)}
        onSubmit={handleSubmitPerm}
        submitting={submittingPerm}
      />

      <ModuleModal
        open={moduleModalOpen}
        moduleItem={editingModule}
        onCancel={() => setModuleModalOpen(false)}
        onSubmit={handleSubmitModule}
        submitting={submittingModule}
      />

      <PermissionDetailModal
        open={detailPermModalOpen}
        permission={viewingPerm}
        modules={modules}
        onClose={() => setDetailPermModalOpen(false)}
      />

      <ModuleDetailModal
        open={detailModuleModalOpen}
        moduleItem={viewingModule}
        onClose={() => setDetailModuleModalOpen(false)}
      />
    </div>
  );
};

export default RoleGroupsPage;
