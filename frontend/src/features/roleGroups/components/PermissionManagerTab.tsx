import { useState, type FC } from 'react';
import {
  Button,
  Checkbox,
  Col,
  Empty,
  Input,
  Popconfirm,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { GroupedPermissions, ModuleItem, PermissionItem } from '../types/roleGroup';

const { Title } = Typography;

interface PermissionManagerTabProps {
  groupedPermissions: GroupedPermissions;
  modules: ModuleItem[];
  searchValue: string;
  onSearchChange: (val: string) => void;
  onSync: () => void;
  onAddNew: () => void;
  onEdit: (perm: PermissionItem) => void;
  onDelete: (id: string) => void;
  syncing: boolean;
  loading: boolean;
}

export const PermissionManagerTab: FC<PermissionManagerTabProps> = ({
  groupedPermissions,
  modules,
  searchValue,
  onSearchChange,
  onSync,
  onAddNew,
  onEdit,
  onDelete,
  syncing,
  loading,
}) => {
  const [selectedPermIds, setSelectedPermIds] = useState<string[]>([]);

  const getModuleMeta = (key: string) => {
    return modules.find((m) => m.name.toLowerCase() === key.toLowerCase());
  };

  const handleToggleSelectAllModule = (modKey: string, checked: boolean) => {
    const perms = groupedPermissions[modKey] || [];
    const ids = perms.map((p) => p.id);
    setSelectedPermIds((prev) => {
      const rest = prev.filter((id) => !ids.includes(id));
      return checked ? [...rest, ...ids] : rest;
    });
  };

  const handleToggleOne = (id: string) => {
    setSelectedPermIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const hasGroups = Object.keys(groupedPermissions).length > 0;

  return (
    <div className="rg-tab-container">
      <div className="rg-tab-header">
        <Title level={5} className="rg-tab-title">
          Danh sách quyền trong hệ thống
        </Title>
      </div>

      <div className="rg-toolbar-row">
        <Input
          prefix={<SearchOutlined className="rg-search-icon" />}
          placeholder="Tìm quyền..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          allowClear
          className="rg-search-input-main"
        />

        <Space size={10}>
          <Button
            icon={<ReloadOutlined spin={syncing} />}
            onClick={onSync}
            loading={syncing}
            className="rg-btn-sync"
          >
            Đồng bộ quyền
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onAddNew}
            className="rg-btn-primary"
          >
            Thêm quyền
          </Button>
        </Space>
      </div>

      {loading ? (
        <div className="rg-loading-wrap">
          <Spin />
        </div>
      ) : !hasGroups ? (
        <Empty description="Không tìm thấy quyền nào phù hợp" />
      ) : (
        <div className="rg-permissions-list">
          {Object.entries(groupedPermissions).map(([modKey, perms]) => {
            const meta = getModuleMeta(modKey);
            const modTitleVi = meta?.displayNameVi || modKey;

            const allSelected =
              perms.length > 0 && perms.every((p) => selectedPermIds.includes(p.id));
            const someSelected =
              perms.some((p) => selectedPermIds.includes(p.id)) && !allSelected;

            return (
              <div key={modKey} className="rg-perm-group">
                <div className="rg-perm-group-header">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={(e) => handleToggleSelectAllModule(modKey, e.target.checked)}
                  >
                    <span className="rg-group-title">{modTitleVi}</span>
                    <Tag color="default" className="rg-group-count-badge">
                      {perms.length}
                    </Tag>
                  </Checkbox>
                </div>

                <div className="rg-perm-items-grid">
                  <Row gutter={[16, 12]}>
                    {perms.map((p) => {
                      const isChecked = selectedPermIds.includes(p.id);
                      return (
                        <Col xs={24} md={12} key={p.id}>
                          <div className="rg-perm-row-item">
                            <Checkbox
                              checked={isChecked}
                              onChange={() => handleToggleOne(p.id)}
                            />
                            <div className="rg-perm-code-col">
                              <span className="rg-perm-code-text">{p.name}</span>
                            </div>
                            <Tag color="orange" className="rg-tag-vi-pill">
                              {p.displayNameVi}
                            </Tag>
                            <Tag color="geekblue" className="rg-tag-en-pill">
                              {p.displayNameEn}
                            </Tag>

                            <div className="rg-perm-actions">
                              <Button
                                type="text"
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => onEdit(p)}
                              />
                              <Popconfirm
                                title="Xác nhận xoá quyền?"
                                description="Quyền này sẽ bị gỡ khỏi toàn bộ vai trò."
                                okText="Xoá"
                                cancelText="Huỷ"
                                onConfirm={() => onDelete(p.id)}
                              >
                                <Button
                                  type="text"
                                  size="small"
                                  danger
                                  icon={<DeleteOutlined />}
                                />
                              </Popconfirm>
                            </div>
                          </div>
                        </Col>
                      );
                    })}
                  </Row>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
