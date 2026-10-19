import type { FC } from 'react';
import {
  Button,
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
  SearchOutlined,
} from '@ant-design/icons';
import type { ModuleItem } from '../types/roleGroup';

const { Title } = Typography;

interface ModuleManagerTabProps {
  modules: ModuleItem[];
  searchValue: string;
  onSearchChange: (val: string) => void;
  onAddNew: () => void;
  onEdit: (mod: ModuleItem) => void;
  onDelete: (id: string) => void;
  loading: boolean;
}

export const ModuleManagerTab: FC<ModuleManagerTabProps> = ({
  modules,
  searchValue,
  onSearchChange,
  onAddNew,
  onEdit,
  onDelete,
  loading,
}) => {
  return (
    <div className="rg-tab-container">
      <div className="rg-tab-header">
        <Space align="center">
          <Title level={5} className="rg-tab-title">
            Danh sách nhóm quyền (module)
          </Title>
          <span className="rg-module-total-counter">
            {modules.length} / {modules.length} nhóm quyền
          </span>
        </Space>
      </div>

      <div className="rg-toolbar-row">
        <Input
          prefix={<SearchOutlined className="rg-search-icon" />}
          placeholder="Tìm nhóm quyền..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          allowClear
          className="rg-search-input-main"
        />

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onAddNew}
          className="rg-btn-primary"
        >
          Thêm nhóm quyền
        </Button>
      </div>

      {loading ? (
        <div className="rg-loading-wrap">
          <Spin />
        </div>
      ) : modules.length === 0 ? (
        <Empty description="Không tìm thấy nhóm quyền nào" />
      ) : (
        <div className="rg-modules-grid">
          <Row gutter={[16, 16]}>
            {modules.map((mod) => {
              const borderLeftColor = mod.color || '#3b82f6';
              const avatarChar =
                mod.icon || (mod.displayNameVi ? mod.displayNameVi.charAt(0).toUpperCase() : 'M');

              return (
                <Col xs={24} md={12} key={mod.id}>
                  <div
                    className="rg-module-card"
                    style={{ borderLeft: `4px solid ${borderLeftColor}` }}
                  >
                    <div className="rg-module-card-left">
                      <div
                        className="rg-module-avatar"
                        style={{ backgroundColor: `${borderLeftColor}15`, color: borderLeftColor }}
                      >
                        {avatarChar}
                      </div>

                      <div className="rg-module-card-text">
                        <div className="rg-module-name-vi">{mod.displayNameVi}</div>
                        <div className="rg-module-name-en">{mod.displayNameEn}</div>
                      </div>
                    </div>

                    <div className="rg-module-card-right">
                      <Tag className="rg-module-count-badge">
                        {mod.permissionCount} quyền
                      </Tag>

                      <Space size={2} className="rg-module-actions">
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => onEdit(mod)}
                        />
                        <Popconfirm
                          title="Xác nhận xoá module?"
                          description="Chỉ xoá được khi không còn quyền nào thuộc module này."
                          okText="Xoá"
                          cancelText="Huỷ"
                          onConfirm={() => onDelete(mod.id)}
                        >
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                          />
                        </Popconfirm>
                      </Space>
                    </div>
                  </div>
                </Col>
              );
            })}
          </Row>
        </div>
      )}
    </div>
  );
};
