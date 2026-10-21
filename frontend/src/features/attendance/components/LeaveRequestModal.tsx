import { useState, useEffect, type FC } from 'react';
import { Modal, Form, Select, DatePicker, Input, message } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { donNghiPhepApi } from '@/api/donNghiPhep';

interface LeaveRequestModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitSuccess?: () => void;
  defaultDate?: Dayjs | null;
  idNhanVien?: string;
  idChiNhanh?: string;
}

export const LeaveRequestModal: FC<LeaveRequestModalProps> = ({
  open,
  onClose,
  onSubmitSuccess,
  defaultDate,
  idNhanVien,
  idChiNhanh,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      const targetDate = defaultDate || dayjs().add(1, 'day');
      form.setFieldsValue({
        leaveType: 'ANNUAL',
        dateRange: [targetDate, targetDate],
        reason: '',
      });
    }
  }, [open, defaultDate, form]);

  const handleFinish = async (values: any) => {
    try {
      setSubmitting(true);
      const [from, to] = values.dateRange as [Dayjs, Dayjs];
      const days = to.diff(from, 'day') + 1;

      await donNghiPhepApi.create({
        idNhanVien,
        idChiNhanh,
        loaiNghi: values.leaveType,
        tuNgay: from.format('YYYY-MM-DD'),
        denNgay: to.format('YYYY-MM-DD'),
        soNgayNghi: Math.max(1, days),
        lyDo: values.reason?.trim() || '',
      });

      message.success('Đã nộp đơn nghỉ phép thành công! Đang chờ Quản lý duyệt.');
      form.resetFields();
      onClose();
      onSubmitSuccess?.();
    } catch (error: any) {
      message.error(error.message || 'Không thể gửi đơn nghỉ phép');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Đăng ký nghỉ phép"
      okText={submitting ? 'Đang gửi...' : 'Gửi đơn phê duyệt'}
      cancelText="Hủy"
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      destroyOnHidden
      centered
      width={520}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{
          leaveType: 'ANNUAL',
          dateRange: [dayjs().add(1, 'day'), dayjs().add(1, 'day')],
        }}
      >
        <Form.Item
          name="leaveType"
          label="Loại nghỉ phép"
          rules={[{ required: true, message: 'Vui lòng chọn loại nghỉ phép' }]}
        >
          <Select
            options={[
              { value: 'ANNUAL', label: 'Nghỉ phép năm (Hưởng nguyên lương)' },
              { value: 'UNPAID', label: 'Nghỉ không hưởng lương' },
              { value: 'SICK', label: 'Nghỉ ốm đau / Bảo hiểm y tế' },
              { value: 'PERSONAL', label: 'Nghỉ việc riêng (Hiếu, hỉ)' },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="dateRange"
          label="Thời gian nghỉ (Từ ngày - Đến ngày)"
          rules={[{ required: true, message: 'Vui lòng chọn khoảng thời gian nghỉ' }]}
        >
          <DatePicker.RangePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            prefix={<CalendarOutlined style={{ color: '#94a3b8' }} />}
          />
        </Form.Item>

        <Form.Item
          name="reason"
          label="Lý do xin nghỉ"
          rules={[{ required: true, message: 'Vui lòng nhập lý do xin nghỉ' }]}
        >
          <Input.TextArea
            rows={3}
            placeholder="Mô tả cụ thể lý do xin nghỉ và bàn giao công việc..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
