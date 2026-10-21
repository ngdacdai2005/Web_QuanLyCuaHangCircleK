import { useState, type FC } from 'react';
import {
  Modal,
  Form,
  InputNumber,
  Input,
  Select,
  Alert,
  Button,
  message,
} from 'antd';
import {
  DollarOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { formatVND } from '@/utils/formatters';
import { phienThuNganApi, type CashDenominations } from '@/api/phienThuNgan';
import { CashDenominationTable } from './CashDenominationTable';

interface OpenShiftModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultExpectedCash?: number;
  branchId?: string;
  branchName?: string;
}

export const OpenShiftModal: FC<OpenShiftModalProps> = ({
  open,
  onClose,
  onSuccess,
  defaultExpectedCash = 2000000,
  branchId,
  branchName,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [showDenomTable, setShowDenomTable] = useState(false);
  const [expectedCash, setExpectedCash] = useState<number>(defaultExpectedCash);
  const [actualCash, setActualCash] = useState<number>(defaultExpectedCash);
  const [denomCounts, setDenomCounts] = useState<CashDenominations>({});

  const diff = actualCash - expectedCash;

  const handleDenomChange = (total: number, counts: Record<string, number>) => {
    setActualCash(total);
    setDenomCounts(counts);
    form.setFieldsValue({ quyDauCaThucTe: total });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      await phienThuNganApi.moCa({
        idChiNhanh: branchId,
        quaySo: values.quaySo || 'Quầy 1',
        quyDauCaDuKien: values.quyDauCaDuKien || 0,
        quyDauCaThucTe: values.quyDauCaThucTe || 0,
        ghiChuMoCa: values.ghiChuMoCa,
        bangKeMoCa: denomCounts,
      });

      message.success('Mở ca thu ngân và nhận quỹ thành công!');
      onSuccess();
      onClose();
    } catch (err: any) {
      message.error(err.message || 'Mở ca thu ngân thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DollarOutlined style={{ color: '#059669', fontSize: 20 }} />
          <span style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
            Bắt đầu ca làm — Kiểm đếm & Nhận quỹ tiền mặt đầu ca
          </span>
        </div>
      }
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={loading}>
          Hủy bỏ
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
          style={{
            background: '#059669',
            borderColor: '#059669',
            fontWeight: 600,
            paddingLeft: 24,
            paddingRight: 24,
          }}
        >
          Xác nhận nhận ca & Mở quầy bán hàng
        </Button>,
      ]}
      width={720}
      centered
      destroyOnHidden
    >
      <div style={{ marginBottom: 16 }}>
        <Alert
          type="info"
          showIcon
          message="Quy định nhận ca Circle K"
          description="Vui lòng kiểm đếm số tiền thực tế trong ngăn kéo trước khi bắt đầu bán hàng. Nếu có chênh lệch so với số tiền bàn giao, hệ thống sẽ tự động ghi nhận ngay thời điểm nhận ca."
        />
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          quaySo: 'Quầy 1',
          quyDauCaDuKien: defaultExpectedCash,
          quyDauCaThucTe: defaultExpectedCash,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item label="Chi nhánh làm việc">
            <Input
              prefix={<ShopOutlined />}
              value={branchName || 'Chi nhánh hiện tại'}
              disabled
              style={{ fontWeight: 600 }}
            />
          </Form.Item>

          <Form.Item
            name="quaySo"
            label="Quầy thu ngân"
            rules={[{ required: true, message: 'Vui lòng chọn quầy' }]}
          >
            <Select>
              <Select.Option value="Quầy 1">Quầy 1 (Chính)</Select.Option>
              <Select.Option value="Quầy 2">Quầy 2 (Phụ)</Select.Option>
              <Select.Option value="Quầy 3">Quầy 3</Select.Option>
            </Select>
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item
            name="quyDauCaDuKien"
            label="Quỹ tiền bàn giao dự kiến"
            tooltip="Số tiền được quản lý hoặc ca trước bàn giao"
            rules={[{ required: true, message: 'Nhập số quỹ dự kiến' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(val) => Number(val?.replace(/\$\s?|(,*)/g, '')) || 0}
              addonAfter="VNĐ"
              onChange={(val) => setExpectedCash(Number(val) || 0)}
            />
          </Form.Item>

          <Form.Item
            name="quyDauCaThucTe"
            label="Số tiền thực đếm trong ngăn kéo"
            rules={[{ required: true, message: 'Vui lòng nhập tiền thực đếm' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(val) => Number(val?.replace(/\$\s?|(,*)/g, '')) || 0}
              addonAfter="VNĐ"
              onChange={(val) => setActualCash(Number(val) || 0)}
            />
          </Form.Item>
        </div>

        {/* Chênh lệch đầu ca */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 8,
            marginBottom: 16,
            background: diff === 0 ? '#f0fdf4' : diff < 0 ? '#fef2f2' : '#fefce8',
            border: `1px solid ${diff === 0 ? '#bbf7d0' : diff < 0 ? '#fecaca' : '#fef08a'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {diff === 0 ? (
              <CheckCircleOutlined style={{ color: '#16a34a', fontSize: 18 }} />
            ) : (
              <WarningOutlined style={{ color: diff < 0 ? '#dc2626' : '#ca8a04', fontSize: 18 }} />
            )}
            <span style={{ fontWeight: 600, color: '#334155' }}>
              {diff === 0
                ? 'Quỹ đầu ca khớp hoàn toàn (Không chênh lệch)'
                : diff < 0
                ? `Lệch thiếu quỹ đầu ca: ${formatVND(Math.abs(diff))}`
                : `Lệch thừa quỹ đầu ca: +${formatVND(diff)}`}
            </span>
          </div>

          <Button
            size="small"
            type="link"
            onClick={() => setShowDenomTable(!showDenomTable)}
            style={{ fontWeight: 600 }}
          >
            {showDenomTable ? 'Ẩn bảng đếm mệnh giá ▲' : 'Mở bảng đếm theo mệnh giá tiền ▼'}
          </Button>
        </div>

        {showDenomTable && (
          <div style={{ marginBottom: 16 }}>
            <CashDenominationTable
              value={denomCounts}
              onChange={handleDenomChange}
            />
          </div>
        )}

        <Form.Item name="ghiChuMoCa" label="Ghi chú khi nhận ca (nếu có)">
          <Input.TextArea
            rows={2}
            placeholder="Ví dụ: Đã nhận ca lúc 06:00, thiếu 50k đã lập biên bản với ca trước..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
