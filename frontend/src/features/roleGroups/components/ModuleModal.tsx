import { useEffect, type FC } from 'react';
import { Col, Form, Input, Modal, Row } from 'antd';
import type {
  ModuleCreatePayload,
  ModuleItem,
  ModuleUpdatePayload,
} from '../types/roleGroup';

interface ModuleModalProps {
  open: boolean;
  moduleItem: ModuleItem | null;
  onCancel: () => void;
  onSubmit: (values: ModuleCreatePayload | ModuleUpdatePayload) => Promise<void>;
  submitting: boolean;
}

export const ModuleModal: FC<ModuleModalProps> = ({
  open,
  moduleItem,
  onCancel,
  onSubmit,
  submitting,
}) => {
  const [form] = Form.useForm();
  const isEdit = Boolean(moduleItem);

  useEffect(() => {
    if (open) {
      if (moduleItem) {
        form.setFieldsValue({
          name: moduleItem.name,
          description: moduleItem.description,
          displayNameVi: moduleItem.displayNameVi,
          displayNameEn: moduleItem.displayNameEn,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, moduleItem, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    await onSubmit(values);
  };

  return (
    <Modal
      title={isEdit ? 'Chỉnh sửa nhóm quyền (module)' : 'Thêm nhóm quyền (module)'}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={submitting}
      okText={isEdit ? 'Lưu' : 'Tạo'}
      cancelText="Hủy"
      destroyOnClose
      width={560}
      okButtonProps={{ style: { backgroundColor: '#3b82f6', borderRadius: 8 } }}
      cancelButtonProps={{ style: { borderRadius: 8 } }}
    >
      <Form form={form} layout="vertical" preserve={false} style={{ marginTop: 16 }}>
        <Form.Item
          label={<span style={{ fontWeight: 600 }}>Tên module <span style={{ color: '#ef4444' }}>*</span></span>}
          name="name"
          rules={[{ required: true, message: 'Vui lòng nhập tên module' }]}
        >
          <Input placeholder="VD: Tuyển dụng" size="large" style={{ borderRadius: 8 }} />
        </Form.Item>

        <Form.Item
          label={<span style={{ fontWeight: 600 }}>Mô tả</span>}
          name="description"
        >
          <Input.TextArea
            rows={3}
            placeholder="Nhập mô tả..."
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label={<span style={{ fontWeight: 600 }}>Tên hiển thị (VI) <span style={{ color: '#ef4444' }}>*</span></span>}
              name="displayNameVi"
              rules={[{ required: true, message: 'Vui lòng nhập tên hiển thị tiếng Việt' }]}
            >
              <Input placeholder="VD: Tuyển dụng" size="large" style={{ borderRadius: 8 }} />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label={<span style={{ fontWeight: 600 }}>Tên hiển thị (EN) <span style={{ color: '#ef4444' }}>*</span></span>}
              name="displayNameEn"
              rules={[{ required: true, message: 'Vui lòng nhập tên hiển thị tiếng Anh' }]}
            >
              <Input placeholder="VD: Recruitment" size="large" style={{ borderRadius: 8 }} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};
