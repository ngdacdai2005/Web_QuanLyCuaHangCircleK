import { useEffect, type FC } from 'react';
import { Form, Input, Modal, Select } from 'antd';
import type {
  ModuleItem,
  PermissionCreatePayload,
  PermissionItem,
  PermissionUpdatePayload,
} from '../types/roleGroup';

interface PermissionModalProps {
  open: boolean;
  permission: PermissionItem | null;
  modules: ModuleItem[];
  onCancel: () => void;
  onSubmit: (values: PermissionCreatePayload | PermissionUpdatePayload) => Promise<void>;
  submitting: boolean;
}

export const PermissionModal: FC<PermissionModalProps> = ({
  open,
  permission,
  modules,
  onCancel,
  onSubmit,
  submitting,
}) => {
  const [form] = Form.useForm();
  const isEdit = Boolean(permission);

  useEffect(() => {
    if (open) {
      if (permission) {
        form.setFieldsValue({
          name: permission.name,
          displayNameVi: permission.displayNameVi,
          displayNameEn: permission.displayNameEn,
          module: permission.module,
          description: permission.description,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, permission, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    await onSubmit(values);
  };

  return (
    <Modal
      title={isEdit ? 'Chỉnh sửa quyền hạn' : 'Thêm mới quyền hạn'}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={submitting}
      okText={isEdit ? 'Lưu thay đổi' : 'Thêm mới'}
      cancelText="Huỷ"
      destroyOnClose
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          label="Mã quyền (định danh)"
          name="name"
          rules={[
            { required: true, message: 'Vui lòng nhập mã quyền (ví dụ: product:approve)' },
            { pattern: /^[a-z0-9_-]+:[a-z0-9_-]+(:[a-z0-9_-]+)?$/, message: 'Định dạng chuẩn: module:action (ví dụ order:read)' },
          ]}
        >
          <Input placeholder="product:approve" disabled={isEdit} />
        </Form.Item>

        <Form.Item
          label="Tên hiển thị (Tiếng Việt)"
          name="displayNameVi"
          rules={[{ required: true, message: 'Vui lòng nhập tên hiển thị tiếng Việt' }]}
        >
          <Input placeholder="Duyệt sản phẩm mới" />
        </Form.Item>

        <Form.Item
          label="Tên hiển thị (Tiếng Anh)"
          name="displayNameEn"
          rules={[{ required: true, message: 'Vui lòng nhập tên hiển thị tiếng Anh' }]}
        >
          <Input placeholder="Approve product" />
        </Form.Item>

        <Form.Item
          label="Thuộc Nhóm quyền (Module)"
          name="module"
          rules={[{ required: true, message: 'Vui lòng chọn nhóm quyền' }]}
        >
          <Select
            placeholder="Chọn module"
            options={modules.map((m) => ({
              label: `${m.displayNameVi} (${m.name})`,
              value: m.name,
            }))}
          />
        </Form.Item>

        <Form.Item label="Mô tả quyền hạn" name="description">
          <Input.TextArea rows={2} placeholder="Mô tả phạm vi ảnh hưởng của quyền hạn này..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};
