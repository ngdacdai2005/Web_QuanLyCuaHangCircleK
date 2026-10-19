import type { FC } from 'react';
import { Button, Empty, Input, List, Popconfirm, Space, Spin, Tag } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import type { RoleGroup } from '../types/roleGroup';

interface RoleListSidebarProps {
  roles: RoleGroup[];
  selectedRoleId: string | null;
  onSelectRole: (id: string) => void;
  onAddNew: () => void;
  onEdit: (role: RoleGroup) => void;
  onDelete: (id: string) => void;
  searchValue: string;
  onSearchChange: (val: string) => void;
  loading: boolean;
}

export const RoleListSidebar: FC<RoleListSidebarProps> = ({
  roles,
  selectedRoleId,
  onSelectRole,
  onAddNew,
  onEdit,
  onDelete,
  searchValue,
  onSearchChange,
  loading,
}) => {
  return (
    <div className="rg-sidebar-card">
      <div className="rg-sidebar-header">
        <Input
          prefix={<SearchOutlined className="rg-search-icon" />}
          placeholder="Nhập mã, tên nhóm quyền"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          allowClear
          className="rg-search-input"
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onAddNew}
          block
          className="rg-btn-add"
        >
          Thêm mới
        </Button>
      </div>

      <div className="rg-sidebar-body">
        {loading ? (
          <div className="rg-loading-wrap">
            <Spin size="small" />
          </div>
        ) : roles.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có nhóm quyền" />
        ) : (
          <List
            dataSource={roles}
            renderItem={(role) => {
              const isSelected = role.id === selectedRoleId;
              return (
                <div
                  key={role.id}
                  className={`rg-role-item ${isSelected ? 'rg-role-item-active' : ''}`}
                  onClick={() => onSelectRole(role.id)}
                >
                  <div className="rg-role-item-info">
                    <span className="rg-role-code">{role.maVaiTro}</span>
                    <span className="rg-role-name">{role.tenVaiTro}</span>
                  </div>

                  <div className="rg-role-item-right" onClick={(e) => e.stopPropagation()}>
                    <Space size={6}>
                      <Tag icon={<UserOutlined />} className="rg-user-badge">
                        {role.userCount}
                      </Tag>
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        className="rg-action-icon"
                        onClick={() => onEdit(role)}
                      />
                      {role.maVaiTro !== 'NQ01' && role.tenVaiTro !== 'ADMIN' && (
                        <Popconfirm
                          title="Xác nhận xoá vai trò?"
                          description="Chỉ xoá được khi không có nhân viên nào sử dụng."
                          okText="Xoá"
                          cancelText="Huỷ"
                          onConfirm={() => onDelete(role.id)}
                        >
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            className="rg-action-icon"
                          />
                        </Popconfirm>
                      )}
                    </Space>
                  </div>
                </div>
              );
            }}
          />
        )}
      </div>
    </div>
  );
};
