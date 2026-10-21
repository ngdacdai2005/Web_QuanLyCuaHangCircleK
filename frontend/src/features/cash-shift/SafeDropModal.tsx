import { useState, type FC } from 'react';
import {
  Modal,
  Form,
  InputNumber,
  Input,
  Button,
  message,
  Alert,
  Tag,
} from 'antd';
import {
  SafetyCertificateOutlined,
  LockOutlined,
  PlusCircleOutlined,
  MinusCircleOutlined,
  DollarOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import { phienThuNganApi, type PhienThuNganRecord } from '@/api/phienThuNgan';
import { formatVND } from '@/utils/formatters';

interface SafeDropModalProps {
  open: boolean;
  shift: PhienThuNganRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

type TransType = 'NOP_KET' | 'THU_BO_SUNG' | 'CHI_TAM_UNG';

const TRANSACTION_OPTIONS: {
  key: TransType;
  title: string;
  subtitle: string;
  impact: string;
  impactColor: string;
  icon: any;
  activeColor: string;
}[] = [
  {
    key: 'NOP_KET',
    title: 'Nộp két an toàn',
    subtitle: 'Chuyển tiền ngăn kéo vào két sắt',
    impact: '- Trừ tiền dự kiến ca',
    impactColor: '#dc2626',
    icon: LockOutlined,
    activeColor: '#2563eb',
  },
  {
    key: 'THU_BO_SUNG',
    title: 'Thu bổ sung tiền lẻ',
    subtitle: 'Đổi thêm tiền lẻ thối khách',
    impact: '+ Cộng tiền dự kiến ca',
    impactColor: '#16a34a',
    icon: PlusCircleOutlined,
    activeColor: '#16a34a',
  },
  {
    key: 'CHI_TAM_UNG',
    title: 'Chi tạm ứng hợp lệ',
    subtitle: 'Chi tiền mua đá, đồ dùng khẩn cấp',
    impact: '- Trừ tiền dự kiến ca',
    impactColor: '#ea580c',
    icon: MinusCircleOutlined,
    activeColor: '#ea580c',
  },
];

const QUICK_AMOUNTS = [200000, 500000, 1000000, 2000000, 5000000];

export const SafeDropModal: FC<SafeDropModalProps> = ({
  open,
  shift,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [transType, setTransType] = useState<TransType>('NOP_KET');

  const handleSelectType = (key: TransType) => {
    setTransType(key);
    form.setFieldsValue({ loaiGiaoDich: key });
  };

  const handleQuickAmount = (amount: number) => {
    form.setFieldsValue({ soTien: amount });
  };

  const handleSubmit = async () => {
    if (!shift) return;
    try {
      const values = await form.validateFields();
      setLoading(true);

      await phienThuNganApi.themGiaoDichQuy({
        idPhienThuNgan: shift.id,
        loaiGiaoDich: values.loaiGiaoDich || transType,
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
            }}
          >
            <SafetyCertificateOutlined />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
              Quản lý dòng tiền trong ca — Nộp két / Thu chi quỹ
            </div>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 400 }}>
              Ghi nhận các giao dịch tiền mặt phát sinh trong ca để đối soát chuẩn xác
            </div>
          </div>
        </div>
      }
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={loading} style={{ height: 38 }}>
          Hủy bỏ
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
            height: 38,
            paddingInline: 24,
          }}
        >
          Xác nhận giao dịch quỹ
        </Button>,
      ]}
      width={680}
      centered
      destroyOnHidden
    >
      <div style={{ marginTop: 12 }}>
        <Alert
          type="info"
          showIcon
          message="Nguyên tắc an toàn quỹ Circle K"
          description="Khi tiền mặt trong ngăn kéo vượt định mức an toàn, thu ngân nộp bớt vào két sắt ngầm dưới quầy. Số tiền nộp két sẽ tự động được trừ khỏi tiền dự kiến khi chốt ca, giúp ngăn ngừa rủi ro thất thoát."
          style={{ marginBottom: 18, borderRadius: 8 }}
        />

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            loaiGiaoDich: 'NOP_KET',
            soTien: 2000000,
          }}
        >
          {/* 3 Option Selection Cards */}
          <Form.Item
            label={<span style={{ fontWeight: 600 }}>Loại nghiệp vụ quỹ trong ca</span>}
            required
            style={{ marginBottom: 18 }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
              }}
            >
              {TRANSACTION_OPTIONS.map((opt) => {
                const isSelected = transType === opt.key;
                const IconComponent = opt.icon;
                return (
                  <div
                    key={opt.key}
                    onClick={() => handleSelectType(opt.key)}
                    style={{
                      border: `1.5px solid ${isSelected ? opt.activeColor : '#e2e8f0'}`,
                      background: isSelected ? '#f8fafc' : '#ffffff',
                      boxShadow: isSelected ? '0 0 0 1px ' + opt.activeColor : 'none',
                      borderRadius: 10,
                      padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: 105,
                    }}
                  >
                    {isSelected && (
                      <CheckCircleFilled
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          color: opt.activeColor,
                          fontSize: 14,
                        }}
                      />
                    )}
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontWeight: 700,
                          fontSize: 13,
                          color: isSelected ? opt.activeColor : '#1e293b',
                          marginBottom: 4,
                        }}
                      >
                        <IconComponent />
                        <span>{opt.title}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.3 }}>
                        {opt.subtitle}
                      </div>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <Tag
                        bordered={false}
                        style={{
                          margin: 0,
                          fontSize: 11,
                          fontWeight: 600,
                          color: opt.impactColor,
                          background: `${opt.impactColor}15`,
                          padding: '1px 6px',
                        }}
                      >
                        {opt.impact}
                      </Tag>
                    </div>
                  </div>
                );
              })}
            </div>
          </Form.Item>

          {/* Amount Input */}
          <Form.Item
            name="soTien"
            label={<span style={{ fontWeight: 600 }}>Số tiền thực hiện (VNĐ)</span>}
            rules={[
              { required: true, message: 'Vui lòng nhập số tiền' },
              { type: 'number', min: 1000, message: 'Số tiền tối thiểu là 1,000 VNĐ' },
            ]}
            style={{ marginBottom: 12 }}
          >
            <InputNumber
              style={{
                width: '100%',
                height: 44,
                fontSize: 18,
                fontWeight: 700,
                color: '#0f172a',
                borderRadius: 8,
              }}
              formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(val) => Number(val?.replace(/\D/g, '') || 0)}
              prefix={<DollarOutlined style={{ color: '#0284c7', marginRight: 6 }} />}
              step={50000}
            />
          </Form.Item>

          {/* Quick Amount Chips */}
          <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>Chọn nhanh:</span>
            {QUICK_AMOUNTS.map((amt) => (
              <Button
                key={amt}
                size="small"
                onClick={() => handleQuickAmount(amt)}
                style={{
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#334155',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                }}
              >
                +{formatVND(amt)}
              </Button>
            ))}
          </div>

          {/* Reason Input */}
          <Form.Item
            name="lyDo"
            label={<span style={{ fontWeight: 600 }}>Lý do / Diễn giải nghiệp vụ</span>}
            rules={[
              {
                required: transType !== 'NOP_KET',
                message: 'Vui lòng nhập lý do giao dịch',
              },
            ]}
            style={{ marginBottom: 0 }}
          >
            <Input.TextArea
              rows={3}
              placeholder={
                transType === 'NOP_KET'
                  ? 'Ví dụ: Nộp bớt tiền bán hàng đợt 1 vào két ngầm theo định mức quy định...'
                  : transType === 'THU_BO_SUNG'
                  ? 'Ví dụ: Đổi thêm 2 cọc tiền lẻ 10,000đ và 20,000đ từ quỹ chính...'
                  : 'Ví dụ: Tạm ứng tiền quầy mua đá lạnh / túi nilon gấp cho ca...'
              }
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};
