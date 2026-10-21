import { useState, useEffect, type FC } from 'react';
import {
  Modal,
  Form,
  InputNumber,
  Input,
  Alert,
  Divider,
  Button,
  message,
  Row,
  Col,
  Card,
  Spin,
  Tag,
} from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  CalculatorOutlined,
} from '@ant-design/icons';
import { formatVND } from '@/utils/formatters';
import {
  phienThuNganApi,
  type PhienThuNganRecord,
  type DoiSoatPhienDTO,
  type CashDenominations,
} from '@/api/phienThuNgan';
import { CashDenominationTable } from './CashDenominationTable';

interface CloseShiftModalProps {
  open: boolean;
  shift: PhienThuNganRecord | null;
  onClose: () => void;
  onSuccess: (closedShift: PhienThuNganRecord) => void;
}

export const CloseShiftModal: FC<CloseShiftModalProps> = ({
  open,
  shift,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetchingDoiSoat, setFetchingDoiSoat] = useState(false);
  const [doiSoat, setDoiSoat] = useState<DoiSoatPhienDTO | null>(null);
  const [actualCash, setActualCash] = useState<number>(0);
  const [showDenomTable, setShowDenomTable] = useState(false);
  const [denomCounts, setDenomCounts] = useState<CashDenominations>({});

  useEffect(() => {
    if (open && shift) {
      loadDoiSoat();
    }
  }, [open, shift]);

  const loadDoiSoat = async () => {
    if (!shift) return;
    try {
      setFetchingDoiSoat(true);
      const res = await phienThuNganApi.getDoiSoat(shift.id);
      setDoiSoat(res);
      setActualCash(res.tienDuKienCuoiCa || 0);
      form.setFieldsValue({
        tienThucDemCuoiCa: res.tienDuKienCuoiCa || 0,
      });
    } catch (err: any) {
      message.error(err.message || 'Không thể tải đối soát ca');
    } finally {
      setFetchingDoiSoat(false);
    }
  };

  const expectedCash = doiSoat?.tienDuKienCuoiCa || 0;
  const diff = actualCash - expectedCash;

  const handleDenomChange = (total: number, counts: Record<string, number>) => {
    setActualCash(total);
    setDenomCounts(counts);
    form.setFieldsValue({ tienThucDemCuoiCa: total });
  };

  const handleSubmit = async () => {
    if (!shift) return;
    try {
      const values = await form.validateFields();
      if (diff !== 0 && (!values.lyDoChenhLech || !values.lyDoChenhLech.trim())) {
        message.warning('Có chênh lệch tiền cuối ca! Vui lòng nhập lý do giải trình.');
        return;
      }

      setLoading(true);
      const updated = await phienThuNganApi.chotCa(shift.id, {
        tienThucDemCuoiCa: values.tienThucDemCuoiCa || 0,
        lyDoChenhLech: values.lyDoChenhLech,
        bangKeDongCa: denomCounts,
      });

      message.success('Chốt ca thu ngân thành công!');
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      message.error(err.message || 'Chốt ca thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalculatorOutlined style={{ color: '#dc2626', fontSize: 20 }} />
          <span style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
            Kết thúc ca — Chốt sổ & Đối soát quỹ tiền mặt
          </span>
          {shift && (
            <Tag color="blue" style={{ marginLeft: 8, fontWeight: 600 }}>
              {shift.maPhien} ({shift.quaySo})
            </Tag>
          )}
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
          danger
          loading={loading}
          onClick={handleSubmit}
          style={{
            fontWeight: 600,
            paddingLeft: 24,
            paddingRight: 24,
          }}
        >
          Xác nhận chốt ca & Khóa giao dịch
        </Button>,
      ]}
      width={900}
      centered
      destroyOnHidden
    >
      {fetchingDoiSoat ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin tip="Đang tự động đối soát giao dịch ca..." />
        </div>
      ) : (
        <div>
          <Alert
            type="warning"
            showIcon
            message="Nguyên tắc đối soát bán lẻ Circle K"
            description="Số tiền dự kiến được hệ thống tự tính tự động từ toàn bộ giao dịch POS phát sinh trong ca. Thu ngân kiểm đếm tiền mặt thực tế và giải trình nếu có chênh lệch thừa/thiếu."
            style={{ marginBottom: 16 }}
          />

          <Row gutter={16}>
            {/* Cột trái: Tự động tính toán theo công thức */}
            <Col span={12}>
              <Card
                size="small"
                title={
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                    📊 ĐỐI SOÁT TỰ ĐỘNG THEO HỆ THỐNG
                  </span>
                }
                style={{ background: '#f8fafc', borderColor: '#e2e8f0', height: '100%' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Quỹ tiền mặt đầu ca:</span>
                    <strong style={{ color: '#0f172a' }}>
                      {formatVND(doiSoat?.quyDauCaThucTe || 0)}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>
                      (+) Tiền mặt bán hàng ({doiSoat?.soDonTienMat || 0} đơn):
                    </span>
                    <strong style={{ color: '#059669' }}>
                      +{formatVND(doiSoat?.tongTienMatBanHang || 0)}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>(+) Tiền thu bổ sung:</span>
                    <strong style={{ color: '#0284c7' }}>
                      +{formatVND(doiSoat?.tongThuBoSung || 0)}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>
                      (-) Hoàn tiền mặt cho khách ({doiSoat?.soDonHoanTienMat || 0} đơn):
                    </span>
                    <strong style={{ color: '#dc2626' }}>
                      -{formatVND(doiSoat?.tongHoanTienMat || 0)}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>(-) Tiền chi hợp lệ trong ca:</span>
                    <strong style={{ color: '#dc2626' }}>
                      -{formatVND(doiSoat?.tongChiHopLe || 0)}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>(-) Tiền đã nộp vào két an toàn:</span>
                    <strong style={{ color: '#dc2626' }}>
                      -{formatVND(doiSoat?.tongNopKet || 0)}
                    </strong>
                  </div>

                  <Divider style={{ margin: '6px 0' }} />

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#f1f5f9',
                      padding: '8px 12px',
                      borderRadius: 6,
                    }}
                  >
                    <span style={{ fontWeight: 700, color: '#334155' }}>
                      TIỀN DỰ KIẾN TRONG NGĂN KÉO:
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                      {formatVND(expectedCash)}
                    </span>
                  </div>

                  {/* Doanh số thẻ & QR theo dõi riêng */}
                  <div
                    style={{
                      marginTop: 8,
                      padding: 8,
                      background: '#eff6ff',
                      borderRadius: 6,
                      fontSize: 12,
                      color: '#1e40af',
                    }}
                  >
                    <div>
                      💳 <strong>Doanh thu không dùng tiền mặt (Đối soát riêng):</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span>Thẻ ({doiSoat?.soDonThe || 0} đơn):</span>
                      <span>{formatVND(doiSoat?.tongDoanhThuThe || 0)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>QR / Ví ({doiSoat?.soDonQr || 0} đơn):</span>
                      <span>{formatVND(doiSoat?.tongDoanhThuQr || 0)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>

            {/* Cột phải: Kiểm đếm thực tế & Giải trình */}
            <Col span={12}>
              <Form form={form} layout="vertical">
                <Form.Item
                  name="tienThucDemCuoiCa"
                  label={
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>
                      Tiền mặt thực đếm còn trong ngăn kéo
                    </span>
                  }
                  rules={[{ required: true, message: 'Vui lòng nhập số tiền thực đếm' }]}
                >
                  <InputNumber
                    style={{ width: '100%', height: 42, fontSize: 16 }}
                    formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(val) => Number(val?.replace(/\$\s?|(,*)/g, '')) || 0}
                    addonAfter="VNĐ"
                    onChange={(val) => setActualCash(Number(val) || 0)}
                  />
                </Form.Item>

                {/* Kết quả đối soát */}
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    marginBottom: 16,
                    background: diff === 0 ? '#f0fdf4' : diff < 0 ? '#fef2f2' : '#fefce8',
                    border: `1px solid ${diff === 0 ? '#bbf7d0' : diff < 0 ? '#fecaca' : '#fef08a'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {diff === 0 ? (
                        <CheckCircleOutlined style={{ color: '#16a34a', fontSize: 16 }} />
                      ) : (
                        <WarningOutlined style={{ color: diff < 0 ? '#dc2626' : '#ca8a04', fontSize: 16 }} />
                      )}
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>
                        Chênh lệch quỹ cuối ca:
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: diff === 0 ? '#16a34a' : diff < 0 ? '#dc2626' : '#ca8a04',
                      }}
                    >
                      {diff === 0
                        ? '0đ (Khớp hoàn toàn)'
                        : diff < 0
                        ? `Thiếu ${formatVND(Math.abs(diff))}`
                        : `Thừa +${formatVND(diff)}`}
                    </span>
                  </div>

                  <div style={{ marginTop: 8, textAlign: 'right' }}>
                    <Button
                      size="small"
                      type="link"
                      onClick={() => setShowDenomTable(!showDenomTable)}
                      style={{ padding: 0 }}
                    >
                      {showDenomTable ? 'Ẩn bảng đếm mệnh giá ▲' : 'Bật bảng đếm theo mệnh giá tiền ▼'}
                    </Button>
                  </div>
                </div>

                {showDenomTable && (
                  <div style={{ marginBottom: 16 }}>
                    <CashDenominationTable
                      value={denomCounts}
                      onChange={handleDenomChange}
                    />
                  </div>
                )}

                <Form.Item
                  name="lyDoChenhLech"
                  label={
                    <span style={{ fontWeight: 600 }}>
                      Lý do giải trình chênh lệch {diff !== 0 && <span style={{ color: '#dc2626' }}>(Bắt buộc khi lệch)</span>}
                    </span>
                  }
                >
                  <Input.TextArea
                    rows={3}
                    placeholder={
                      diff < 0
                        ? 'Ví dụ: Khách quên lấy tiền thừa, nhầm tiền thối ca chiều...'
                        : 'Ví dụ: Tiền boa của khách, tiền tip...'
                    }
                  />
                </Form.Item>
              </Form>
            </Col>
          </Row>
        </div>
      )}
    </Modal>
  );
};
