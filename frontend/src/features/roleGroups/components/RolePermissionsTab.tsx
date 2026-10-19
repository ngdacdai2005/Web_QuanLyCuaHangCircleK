import type { FC } from 'react';
import { Button, Checkbox, Empty, Row, Col, Spin, Tag, Typography } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import type { GroupedPermissions, ModuleItem, RoleGroup } from '../types/roleGroup';

const { Title, Text } = Typography;

interface RolePermissionsTabProps {
  role: RoleGroup | null;
  groupedPermissions: GroupedPermissions;
  modules: ModuleItem[];
  selectedPermissionIds: string[];
  onTogglePermission: (id: string) => void;
  onToggleModule: (modKey: string, selectAll: boolean) => void;
  onSave: () => void;
  saving: boolean;
  loading: boolean;
}

export const RolePermissionsTab: FC<RolePermissionsTabProps> = ({
  role,
  groupedPermissions,
  modules,
  selectedPermissionIds,
  onTogglePermission,
  onToggleModule,
  onSave,
  saving,
  loading,
}) => {
  if (!role) {
    return (
      <div className="rg-tab-empty">
        <Empty description="Vui lòng chọn một nhóm quyền từ danh sách bên trái để cấu hình phân quyền." />
      </div>
    );
  }

  const getModuleMeta = (key: string) => {
    return modules.find((m) => m.name.toLowerCase() === key.toLowerCase());
  };

  const selectedSet = new Set(selectedPermissionIds);
  const totalAvailable = Object.values(groupedPermissions).reduce((sum, p) => sum + p.length, 0);

  return (
    <div className="rg-tab-container">
      <div className="rg-tab-header">
        <div>
          <Title level={5} className="rg-tab-title">
            Phân quyền cho nhóm: <span className="rg-highlight">{role.maVaiTro} - {role.tenVaiTro}</span>
          </Title>
          <Text type="secondary">
            Đã chọn: <b>{selectedPermissionIds.length}</b> / {totalAvailable} quyền hệ thống.
          </Text>
        </div>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={onSave}
          loading={saving}
          className="rg-btn-primary"
        >
          Lưu phân quyền
        </Button>
      </div>

      {loading ? (
        <div className="rg-loading-wrap">
          <Spin />
        </div>
      ) : (
        <div className="rg-permissions-list">
          {Object.entries(groupedPermissions).map(([modKey, perms]) => {
            const meta = getModuleMeta(modKey);
            const modTitleVi = meta?.displayNameVi || modKey;
            const modTitleEn = meta?.displayNameEn || modKey;

            const allSelected = perms.length > 0 && perms.every((p) => selectedSet.has(p.id));
            const someSelected = perms.some((p) => selectedSet.has(p.id)) && !allSelected;

            return (
              <div key={modKey} className="rg-perm-group">
                <div className="rg-perm-group-header">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={(e) => onToggleModule(modKey, e.target.checked)}
                  >
                    <span className="rg-group-title">{modTitleVi}</span>
                    <span className="rg-group-sub">({modTitleEn})</span>
                    <Tag color="blue" className="rg-group-count">
                      {perms.length}
                    </Tag>
                  </Checkbox>
                </div>

                <div className="rg-perm-items-grid">
                  <Row gutter={[16, 12]}>
                    {perms.map((p) => {
                      const isChecked = selectedSet.has(p.id);
                      return (
                        <Col xs={24} md={12} key={p.id}>
                          <div
                            className={`rg-perm-item-card ${isChecked ? 'rg-perm-item-checked' : ''}`}
                            onClick={() => onTogglePermission(p.id)}
                          >
                            <Checkbox
                              checked={isChecked}
                              onChange={() => onTogglePermission(p.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="rg-perm-label-wrap">
                              <span className="rg-perm-code">{p.name}</span>
                              <Tag color="orange" className="rg-tag-vi">
                                {p.displayNameVi}
                              </Tag>
                              <Tag color="geekblue" className="rg-tag-en">
                                {p.displayNameEn}
                              </Tag>
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
