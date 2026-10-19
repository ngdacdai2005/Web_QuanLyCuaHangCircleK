import type { FC } from 'react';
import { Button, Col, Modal, Row, Tag } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import type { RoleGroup } from '../types/roleGroup';

interface RoleDetailModalProps {
  open: boolean;
  role: RoleGroup | null;
  onClose: () => void;
}

export const RoleDetailModal: FC<RoleDetailModalProps> = ({
  open,
  role,
  onClose,
}) => {
  if (!role) return null;

  return (
    <Modal
      title={
        <span style={{ fontSize: 16, fontWeight: 600, color: '#1f2937' }}>
          Chi tiết nhóm quyền
        </span>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button
          key="close"
          type="primary"
          onClick={onClose}
          style={{ minWidth: 80, borderRadius: 6 }}
        >
          Đóng
        </Button>,
      ]}
      destroyOnClose
      width={520}
      styles={{
        body: { padding: '20px 0 12px' },
      }}
    >
      <Row gutter={[24, 20]}>
        {/* Hàng 1 */}
        <Col span={12}>
          <div className="rg-detail-field">
            <div className="rg-detail-label">MÃ NHÓM QUYỀN</div>
            <div className="rg-detail-value">
              <Tag
                style={{
                  backgroundColor: '#e6fffb',
                  borderColor: '#87e8de',
                  color: '#08979c',
                  fontFamily: 'monospace',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '2px 10px',
                  borderRadius: 6,
                }}
              >
                {role.maVaiTro}
              </Tag>
            </div>
          </div>
        </Col>

        <Col span={12}>
          <div className="rg-detail-field">
            <div className="rg-detail-label">TÊN NHÓM QUYỀN (VAI TRÒ)</div>
            <div className="rg-detail-value" style={{ fontWeight: 600, color: '#1f2937' }}>
              {role.tenVaiTro}
            </div>
          </div>
        </Col>

        {/* Hàng 2 */}
        <Col span={12}>
          <div className="rg-detail-field">
            <div className="rg-detail-label">SỐ LƯỢNG NHÂN VIÊN</div>
            <div className="rg-detail-value">
              <Tag icon={<UserOutlined />} color="blue" style={{ borderRadius: 6, fontWeight: 600, padding: '1px 8px' }}>
                {role.userCount} nhân viên
              </Tag>
            </div>
          </div>
        </Col>

        <Col span={12}>
          <div className="rg-detail-field">
            <div className="rg-detail-label">TRẠNG THÁI</div>
            <div className="rg-detail-value">
              <Tag color={role.status === 1 ? 'success' : 'default'} style={{ borderRadius: 6, fontWeight: 500 }}>
                {role.status === 1 ? 'Đang hoạt động' : 'Tạm dừng'}
              </Tag>
            </div>
          </div>
        </Col>

        {/* Hàng 3 */}
        <Col span={12}>
          <div className="rg-detail-field">
            <div className="rg-detail-label">ID</div>
            <div className="rg-detail-value" style={{ fontWeight: 500, color: '#4b5563' }}>
              #{role.id}
            </div>
          </div>
        </Col>

        <Col span={12} />

        {/* Hàng 4 */}
        <Col span={24}>
          <div className="rg-detail-field">
            <div className="rg-detail-label">MÔ TẢ</div>
            <div className="rg-detail-value" style={{ color: '#4b5563', lineHeight: 1.5 }}>
              {role.moTa || '(Chưa có mô tả)'}
            </div>
          </div>
        </Col>
      </Row>
    </Modal>
  );
};
