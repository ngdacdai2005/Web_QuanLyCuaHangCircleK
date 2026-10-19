import { useEffect, type FC } from 'react';
import { Form, Input, Modal } from 'antd';
import type { RoleCreatePayload, RoleGroup, RoleUpdatePayload } from '../types/roleGroup';

interface RoleModalProps {
  open: boolean;
  role: RoleGroup | null;
  onCancel: () => void;
  onSubmit: (values: RoleCreatePayload | RoleUpdatePayload) => Promise<void>;
  submitting: boolean;
}

export const RoleModal: FC<RoleModalProps> = ({
  open,
  role,
  onCancel,
  onSubmit,
  submitting,
}) => {
  const [form] = Form.useForm();
  const isEdit = Boolean(role);

  useEffect(() => {
    if (open) {
      if (role) {
        form.setFieldsValue({
          maVaiTro: role.maVaiTro,
          tenVaiTro: role.tenVaiTro,
          moTa: role.moTa,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, role, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    await onSubmit(values);
  };

  return (
    <Modal
      title={isEdit ? 'Chỉnh sửa nhóm quyền' : 'Thêm mới nhóm quyền'}
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
          label="Mã nhóm quyền"
          name="maVaiTro"
          rules={[
            { required: true, message: 'Vui lòng nhập mã nhóm quyền (ví dụ NQ06)' },
            { max: 20, message: 'Tối đa 20 ký tự' },
          ]}
        >
          <Input placeholder="NQ06" disabled={isEdit} />
        </Form.Item>

        <Form.Item
          label="Tên nhóm quyền"
          name="tenVaiTro"
          rules={[{ required: true, message: 'Vui lòng nhập tên nhóm quyền (ví dụ NHAN_VIEN_CA_DEM)' }]}
        >
          <Input placeholder="Tên vai trò (viết hoa không dấu, ví dụ STORE_SUPERVISOR)" />
        </Form.Item>

        <Form.Item label="Mô tả chức năng" name="moTa">
          <Input.TextArea rows={3} placeholder="Mô tả chi tiết phạm vi quyền hạn của nhóm..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};
