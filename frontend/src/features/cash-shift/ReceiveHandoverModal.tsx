import { useState, useEffect, type FC } from 'react';
import {
  Modal,
  Form,
  InputNumber,
  Input,
  Alert,
  Button,
  message,
  Descriptions,
  Tag,
  Divider,
} from 'antd';
import {
  SwapOutlined,
  DollarOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  UserOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { formatVND } from '@/utils/formatters';
import { phienThuNganApi, type PhienThuNganRecord, type CashDenominations } from '@/api/phienThuNgan';
import { CashDenominationTable } from './CashDenominationTable';

interface ReceiveHandoverModalProps {
  open: boolean;
  shift: PhienThuNganRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReceiveHandoverModal: FC<ReceiveHandoverModalProps> = ({
  open,
  shift,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [showDenomTable, setShowDenomTable] = useState(false);
  const [denomCounts, setDenomCounts] = useState<CashDenominations>({});

  const expectedAmount = shift?.soTienBanGiao ?? shift?.tienThucDemCuoiCa ?? 0;
  const [actualCash, setActualCash] = useState<number>(expectedAmount);

  useEffect(() => {
    if (shift) {
      const exp = shift.soTienBanGiao ?? shift.tienThucDemCuoiCa ?? 0;
      setActualCash(exp);
      setDenomCounts({});
      setShowDenomTable(false);
      form.setFieldsValue({
        quyDauCaDuKien: exp,
        quyDauCaThucTe: exp,
        quaySo: shift.quaySo || 'Quầy 1',
        ghiChuMoCa: '',
        lyDoChenhLech: '',
      });
    }
  }, [shift, form]);

  if (!shift) return null;

  const diff = actualCash - expectedAmount;

  const handleDenomChange = (total: number, counts: Record<string, number>) => {
    setActualCash(total);
    setDenomCounts(counts);
    form.setFieldsValue({ quyDauCaThucTe: total });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const note = [
        `Tiếp quản ca ${shift.maPhien} từ ${shift.tenThuNgan || 'ca trước'}.`,
        values.ghiChuMoCa,
        diff !== 0 && values.lyDoChenhLech ? `[Lệch kiểm quỹ: ${values.lyDoChenhLech}]` : '',
      ]
        .filter(Boolean)
        .join(' ');

      await phienThuNganApi.tiepQuanVaMoCa(shift.id, {
        idChiNhanh: shift.idChiNhanh,
        quaySo: shift.quaySo || values.quaySo || 'Quầy 1',
        quyDauCaDuKien: expectedAmount,
        quyDauCaThucTe: values.quyDauCaThucTe || actualCash,
        ghiChuMoCa: note,
        bangKeMoCa: denomCounts,
      });

      message.success('Tiếp quản bàn giao và bắt đầu ca làm mới thành công!');
      onSuccess();
      onClose();
    } catch (err: any) {
      message.error(err.message || 'Tiếp quản ca thất bại');
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
              width: 38,
              height: 38,
              borderRadius: 10,
              background: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
            }}
          >
            <SwapOutlined />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
              Tiếp nhận bàn giao ca & Khởi tạo ca mới
            </div>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 400 }}>
              Xác nhận tiền bàn giao từ ca trước và nhận quỹ để bắt đầu bán hàng
            </div>
          </div>
        </div>
      }
      onCancel={onClose}
      width={720}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={loading}>
          Để sau
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
          style={{
            background: '#2563eb',
            borderColor: '#2563eb',
            fontWeight: 600,
            height: 40,
            paddingInline: 24,
          }}
        >
          Xác nhận tiếp quản & Mở ca
        </Button>,
      ]}
    >
      <div style={{ marginTop: 12 }}>
        {/* Shift summary card */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '14px 18px',
            marginBottom: 18,
          }}
        >
          <Descriptions size="small" column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Mã ca trước">
              <Tag color="blue" style={{ fontWeight: 600 }}>{shift.maPhien}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Người bàn giao">
              <span style={{ fontWeight: 600, color: '#1e293b' }}>
                <UserOutlined style={{ marginRight: 6, color: '#64748b' }} />
                {shift.tenThuNgan || 'Nhân viên ca trước'}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Quầy bàn giao">
              <span style={{ fontWeight: 500 }}>{shift.quaySo || 'Quầy 1'}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Thời gian bàn giao">
              <span>
                <ClockCircleOutlined style={{ marginRight: 6, color: '#64748b' }} />
                {shift.thoiGianBanGiao
                  ? new Date(shift.thoiGianBanGiao).toLocaleString('vi-VN')
                  : 'Vừa xong'}
              </span>
            </Descriptions.Item>
            {shift.ghiChuBanGiao && (
              <Descriptions.Item label="Ghi chú ca trước" span={2}>
                <span style={{ fontStyle: 'italic', color: '#475569' }}>
                  "{shift.ghiChuBanGiao}"
                </span>
              </Descriptions.Item>
            )}
          </Descriptions>

          <Divider style={{ margin: '12px 0' }} />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#eff6ff',
              padding: '10px 16px',
              borderRadius: 6,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1e40af' }}>
              Số tiền ca trước bàn giao lại:
            </span>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#1d4ed8' }}>
              {formatVND(expectedAmount)}
            </span>
          </div>
        </div>

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            quyDauCaDuKien: expectedAmount,
            quyDauCaThucTe: expectedAmount,
            quaySo: shift.quaySo || 'Quầy 1',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="quyDauCaDuKien"
              label="Quỹ dự kiến nhận (VNĐ)"
              tooltip="Số tiền người bàn giao ghi nhận chuyển giao"
            >
              <InputNumber
                style={{ width: '100%' }}
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                disabled
              />
            </Form.Item>

            <Form.Item
              name="quyDauCaThucTe"
              label="Số tiền thực đếm trong két (VNĐ)"
              rules={[{ required: true, message: 'Vui lòng nhập tiền thực đếm' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(val) => Number(val?.replace(/\D/g, '') || 0)}
                onChange={(val) => setActualCash(Number(val) || 0)}
                prefix={<DollarOutlined />}
              />
            </Form.Item>
          </div>

          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="link"
              onClick={() => setShowDenomTable(!showDenomTable)}
              style={{ padding: 0 }}
            >
              {showDenomTable ? 'Ẩn bảng đếm mệnh giá' : '📋 Mở bảng đếm chi tiết từng mệnh giá'}
            </Button>
          </div>

          {showDenomTable && (
            <div style={{ marginBottom: 16 }}>
              <CashDenominationTable onChange={handleDenomChange} value={denomCounts} />
            </div>
          )}

          {/* Diff comparison alert */}
          {diff === 0 ? (
            <Alert
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
              message="Khớp số liệu bàn giao"
              description="Tiền thực nhận hoàn toàn khớp với số tiền ca trước bàn giao."
              style={{ marginBottom: 16 }}
            />
          ) : (
            <Alert
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              message={`Chênh lệch: ${diff > 0 ? '+' : ''}${formatVND(diff)}`}
              description={
                diff > 0
                  ? 'Tiền thực tế trong két nhiều hơn số tiền ca trước khai báo.'
                  : 'Tiền thực tế trong két ít hơn số tiền ca trước khai báo. Vui lòng ghi rõ nguyên nhân.'
              }
              style={{ marginBottom: 16 }}
            />
          )}

          {diff !== 0 && (
            <Form.Item
              name="lyDoChenhLech"
              label="Lý do chênh lệch"
              rules={[{ required: true, message: 'Bắt buộc giải trình khi có chênh lệch tiền' }]}
            >
              <Input.TextArea
                rows={2}
                placeholder="Nhập nguyên nhân tiền thực tế khác với số bàn giao..."
              />
            </Form.Item>
          )}

          <Form.Item name="ghiChuMoCa" label="Ghi chú khi tiếp quản ca (tùy chọn)">
            <Input.TextArea rows={2} placeholder="Nhập ghi chú mở ca làm nếu có..." />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};
