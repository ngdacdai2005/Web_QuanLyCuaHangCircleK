import { useState, useEffect, type FC } from 'react';
import {
  Modal,
  Form,
  Select,
  InputNumber,
  Input,
  Button,
  message,
  Alert,
} from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import { phienThuNganApi, type PhienThuNganRecord } from '@/api/phienThuNgan';

interface HandoverShiftModalProps {
  open: boolean;
  shift: PhienThuNganRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const HandoverShiftModal: FC<HandoverShiftModalProps> = ({
  open,
  shift,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<{ id: string; hoTen: string; chucVu?: string; viTri?: string; vaiTro?: string }[]>([]);

  useEffect(() => {
    if (open) {
      loadEmployees();
      if (shift) {
        form.setFieldsValue({
          soTienBanGiao: shift.tienThucDemCuoiCa || shift.tienDuKienCuoiCa || 0,
        });
      }
    }
  }, [open, shift]);

  const loadEmployees = async () => {
    try {
      const res = await phienThuNganApi.getNhanVienBanGiao();
      setEmployees(res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async () => {
    if (!shift) return;
    try {
      const values = await form.validateFields();
      setLoading(true);

      await phienThuNganApi.banGiao(shift.id, {
        idNguoiNhanBanGiao: values.idNguoiNhanBanGiao,
        soTienBanGiao: values.soTienBanGiao,
        ghiChuBanGiao: values.ghiChuBanGiao,
      });

      message.success('Đã gửi thông tin bàn giao ca thành công! Đang chờ ca sau tiếp quản.');
      onSuccess();
      onClose();
    } catch (err: any) {
      message.error(err.message || 'Bàn giao ca thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SwapOutlined style={{ color: '#8b5cf6', fontSize: 20 }} />
          <span style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
            Bàn giao ca — Chuyển giao trách nhiệm quản lý quỹ
          </span>
        </div>
      }
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={loading}>
          Đóng
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
          style={{
            background: '#8b5cf6',
            borderColor: '#8b5cf6',
            fontWeight: 600,
            paddingLeft: 24,
            paddingRight: 24,
          }}
        >
          Xác nhận bàn giao sang ca sau
        </Button>,
      ]}
      width={600}
      centered
      destroyOnHidden
    >
      <Alert
        type="info"
        showIcon
        message="Xác nhận bàn giao song phương"
        description="Số tiền bàn giao này sẽ là căn cứ Quỹ dự kiến ban đầu cho người nhận ca. Người nhận ca phải kiểm đếm thực tế và xác nhận nhận đủ trước khi bắt đầu."
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical">
        <Form.Item
          name="idNguoiNhanBanGiao"
          label="Người nhận bàn giao (Thu ngân ca sau hoặc Quản lý)"
          rules={[{ required: true, message: 'Vui lòng chọn người nhận' }]}
        >
          <Select
            placeholder="Chọn nhân viên nhận bàn giao..."
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={employees.map((e) => ({
              value: e.id,
              label: `${e.hoTen} (${e.chucVu || e.viTri || (e.vaiTro === 'QUAN_LY' ? 'Quản lý cửa hàng' : 'Thu ngân')})`,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="soTienBanGiao"
          label="Số tiền mặt bàn giao thực tế"
          rules={[{ required: true, message: 'Nhập số tiền bàn giao' }]}
        >
          <InputNumber
            style={{ width: '100%', height: 40, fontSize: 15 }}
            formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(val) => Number(val?.replace(/\$\s?|(,*)/g, '')) || 0}
            addonAfter="VNĐ"
          />
        </Form.Item>

        <Form.Item name="ghiChuBanGiao" label="Ghi chú bàn giao ca">
          <Input.TextArea
            rows={2}
            placeholder="Ví dụ: Bàn giao ngăn kéo, chìa khóa quầy, hóa đơn hủy trong ca..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
