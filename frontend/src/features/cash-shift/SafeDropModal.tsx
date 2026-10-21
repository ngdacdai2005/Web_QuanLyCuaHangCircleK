import { useState, type FC } from 'react';
import {
  Modal,
  Form,
  InputNumber,
  Input,
  Button,
  message,
  Alert,
  Radio,
} from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import { phienThuNganApi, type PhienThuNganRecord } from '@/api/phienThuNgan';

interface SafeDropModalProps {
  open: boolean;
  shift: PhienThuNganRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const SafeDropModal: FC<SafeDropModalProps> = ({
  open,
  shift,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [transType, setTransType] = useState<'NOP_KET' | 'THU_BO_SUNG' | 'CHI_TAM_UNG'>('NOP_KET');

  const handleSubmit = async () => {
    if (!shift) return;
    try {
      const values = await form.validateFields();
      setLoading(true);

      await phienThuNganApi.themGiaoDichQuy({
        idPhienThuNgan: shift.id,
        loaiGiaoDich: values.loaiGiaoDich || 'NOP_KET',
        soTien: values.soTien,
        lyDo: values.lyDo,
      });

      message.success('Đã ghi nhận giao dịch quỹ ca thành công!');
      onSuccess();
      onClose();
    } catch (err: any) {
      message.error(err.message || 'Thực hiện giao dịch thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SafetyCertificateOutlined style={{ color: '#0284c7', fontSize: 20 }} />
          <span style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
            Quản lý dòng tiền trong ca — Nộp két / Thu chi phụ
          </span>
        </div>
      }
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={loading}>
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
          style={{
            background: '#0284c7',
            borderColor: '#0284c7',
            fontWeight: 600,
            paddingLeft: 20,
            paddingRight: 20,
          }}
        >
          Xác nhận giao dịch quỹ
        </Button>,
      ]}
      width={560}
      centered
      destroyOnHidden
    >
      <Alert
        type="info"
        showIcon
        message="Nguyên tắc an toàn quỹ Circle K"
        description="Khi tiền mặt trong ngăn kéo vượt quá định mức quy định, thu ngân nộp bớt vào két sắt an toàn để giảm rủi ro. Hệ thống sẽ tự động trừ số tiền này khỏi số dư dự kiến cuối ca."
        style={{ marginBottom: 16 }}
      />

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          loaiGiaoDich: 'NOP_KET',
          soTien: 2000000,
        }}
      >
        <Form.Item name="loaiGiaoDich" label="Loại nghiệp vụ quỹ trong ca">
          <Radio.Group
            buttonStyle="solid"
            onChange={(e) => setTransType(e.target.value)}
            style={{ width: '100%', display: 'flex' }}
          >
            <Radio.Button value="NOP_KET" style={{ flex: 1, textAlign: 'center' }}>
              🔒 Nộp vào két an toàn
            </Radio.Button>
            <Radio.Button value="THU_BO_SUNG" style={{ flex: 1, textAlign: 'center' }}>
              ➕ Thu bổ sung tiền lẻ
            </Radio.Button>
            <Radio.Button value="CHI_TAM_UNG" style={{ flex: 1, textAlign: 'center' }}>
              ➖ Chi tạm ứng hợp lệ
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="soTien"
          label="Số tiền thực hiện"
          rules={[
            { required: true, message: 'Vui lòng nhập số tiền' },
            { type: 'number', min: 1000, message: 'Số tiền tối thiểu là 1,000 VNĐ' },
          ]}
        >
          <InputNumber
            style={{ width: '100%', height: 42, fontSize: 16 }}
            formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            addonAfter="VNĐ"
            step={50000}
          />
        </Form.Item>

        <Form.Item
          name="lyDo"
          label="Lý do / Diễn giải"
          rules={[
            {
              required: transType !== 'NOP_KET',
              message: 'Vui lòng nhập lý do giao dịch',
            },
          ]}
        >
          <Input.TextArea
            rows={2}
            placeholder={
              transType === 'NOP_KET'
                ? 'Ví dụ: Nộp bớt tiền ca trưa đợt 1 vào két an toàn...'
                : 'Ví dụ: Đổi thêm cọc tiền lẻ 10k, 20k hoặc mua đá lạnh...'
            }
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
