import { useEffect, useMemo, type FC } from 'react';
import {
  App as AntdApp,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
} from 'antd';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  createProduct,
  setProductModalOpen,
  updateProductThunk,
} from '@/store/slices/productSlice';
import { fetchSuppliers } from '@/store/slices/supplierSlice';
import { fetchCategories } from '@/store/slices/categorySlice';
import {
  PRODUCT_UNIT,
  PRODUCT_UNIT_LABEL,
  RECORD_STATUS,
  type ProductFormValues,
} from '@/types';
import {
  applyFormErrors,
  getErrorMessage,
  isFormValidationError,
} from '@/utils/apiError';
import './ProductFormModal.css';

const UNIT_OPTIONS = Object.values(PRODUCT_UNIT).map((unit) => ({
  value: unit,
  label: PRODUCT_UNIT_LABEL[unit],
}));

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Đang kinh doanh' },
  { value: 'Inactive', label: 'Ngừng kinh doanh' },
];

/**
 * Chuyển đổi tên danh mục thành tiền tố SKU viết tắt dễ nhận diện:
 * VD: "Nước giải khát" -> "DRINK"
 *     "Đồ ăn nóng" -> "HOTFOOD"
 *     "Bánh kẹo & Snack" -> "SNACK"
 *     "Sữa & Chế phẩm" -> "MILK"
 *     "Mì & Thực phẩm khô" -> "NOODLE"
 *     "Thức uống pha chế" -> "COFFEE"
 *     "Hàng tiêu dùng" -> "DAILY"
 *     "Kem & Đồ đông lạnh" -> "ICE"
 */
const getCategorySkuPrefix = (categoryName?: string, categoryCode?: string): string => {
  if (!categoryName && !categoryCode) return 'SP';

  const cleanName = (categoryName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  // 1. Ánh xạ danh mục chuẩn Circle K
  if (cleanName.includes('do an nong') || cleanName.includes('hot dog') || cleanName.includes('banh bao')) {
    return 'HOTFOOD';
  }
  if (cleanName.includes('nuoc giai khat') || cleanName.includes('do uong') || cleanName.includes('nuoc ngot')) {
    return 'DRINK';
  }
  if (cleanName.includes('pha che') || cleanName.includes('ca phe') || cleanName.includes('froster')) {
    return 'COFFEE';
  }
  if (cleanName.includes('banh keo') || cleanName.includes('snack')) {
    return 'SNACK';
  }
  if (cleanName.includes('sua') || cleanName.includes('che pham')) {
    return 'MILK';
  }
  if (cleanName.includes('mi') || cleanName.includes('thuc pham kho')) {
    return 'NOODLE';
  }
  if (cleanName.includes('kem') || cleanName.includes('dong lanh')) {
    return 'ICE';
  }
  if (cleanName.includes('tieu dung') || cleanName.includes('do dung') || cleanName.includes('hoa my pham')) {
    return 'DAILY';
  }

  // 2. Fallback cho danh mục mới tự tạo: Lấy chữ cái đầu các từ (VD: "Thuốc lá & Phụ kiện" -> "TLPK")
  const words = cleanName.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const acronym = words.map((w) => w[0].toUpperCase()).join('');
    if (acronym.length >= 2) return acronym;
  }
  if (words.length === 1 && words[0].length >= 3) {
    return words[0].toUpperCase().substring(0, 6);
  }

  // 3. Fallback theo mã danh mục (nếu có: DM01 -> DM01)
  if (categoryCode) {
    return categoryCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  }

  return 'SP';
};

/**
 * Tự động tìm số thứ tự lớn nhất của nhóm SKU và sinh mã tiếp theo (VD: DRINK-04)
 */
const generateNextSku = (
  categoryId: any,
  allCategories: Array<{ id: any; name?: string; code?: string; skuPrefix?: string }>,
  allProducts: Array<{ sku?: string }>,
): string => {
  if (!categoryId) return '';
  const cat = allCategories.find((c) => String(c.id) === String(categoryId));
  if (!cat) return '';

  const prefix = cat.skuPrefix && cat.skuPrefix.trim() !== ''
    ? cat.skuPrefix.trim().toUpperCase()
    : getCategorySkuPrefix(cat.name, cat.code);

  // Tìm tất cả các mã SKU hiện tại khớp với CK-{prefix}-{số} hoặc {prefix}-{số}
  const regex = new RegExp(`^(?:CK-)?${prefix}-(\\d+)$`, 'i');
  let maxSeq = 0;

  for (const p of allProducts) {
    if (!p.sku) continue;
    const match = p.sku.trim().match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  const seqStr = nextSeq < 10 ? `0${nextSeq}` : `${nextSeq}`;
  return `${prefix}-${seqStr}`;
};

export const ProductFormModal: FC = () => {
  const [form] = Form.useForm<ProductFormValues>();
  const dispatch = useAppDispatch();
  const { message } = AntdApp.useApp();

  const { isModalOpen, selectedProduct, products } = useAppSelector(
    (state) => state.product,
  );
  const categories = useAppSelector((state) => state.category.categories);
  const suppliers = useAppSelector((state) => state.supplier.suppliers);
  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: `${c.code} - ${c.name}${c.skuPrefix ? ` [${c.skuPrefix}]` : ''}`,
  }));
  const isEditing = selectedProduct !== null;
  const selectedCategoryId = Form.useWatch('categoryId', form);
  const selectedSupplierId = Form.useWatch('supplierId', form);

  /** NCC cung ứng danh mục đang chọn. Ưu tiên lọc theo `categoryIds` của NCC. */
  const supplierOptions = useMemo(() => {
    if (!selectedCategoryId) {
      return suppliers.map((s) => ({ value: s.id, label: `${s.code} - ${s.name}` }));
    }
    const matched = suppliers.filter(
        (s) => s.status === 'Active' && s.categoryIds?.includes(selectedCategoryId),
    );
    // Sửa sản phẩm cũ: NCC đã lưu có thể không khớp danh mục (dữ liệu legacy) —
    // vẫn giữ trong danh sách để Select không hiển thị value rỗng.
    if (selectedSupplierId && !matched.some((s) => s.id === selectedSupplierId)) {
      const current = suppliers.find((s) => s.id === selectedSupplierId);
      if (current) matched.push(current);
    }
    return matched.map((s) => ({ value: s.id, label: `${s.code} - ${s.name}` }));
  }, [suppliers, selectedCategoryId, selectedSupplierId]);

  /** Xử lý khi người dùng chọn Danh mục -> tự động sinh SKU */
  const handleCategoryChange = (val: any) => {
    form.setFieldValue('categoryId', val);
    if (!isEditing) {
      const autoSku = generateNextSku(val, categories, products);
      if (autoSku) {
        form.setFieldValue('sku', autoSku);
      }
    }
  };


  /** Sinh ngẫu nhiên mã vạch EAN-13 gồm 13 chữ số hợp lệ và không trùng lặp */
  const generateUniqueBarcode = (): string => {
    const existingBarcodes = new Set(products.map((p) => p.barcode).filter(Boolean));
    for (let attempts = 0; attempts < 1000; attempts++) {
      // 12 số đầu tiên (bắt đầu bằng 893 cho mã Việt Nam)
      let code12 = '893';
      for (let i = 0; i < 9; i++) {
        code12 += Math.floor(Math.random() * 10).toString();
      }
      // Tính check digit EAN-13
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        const digit = parseInt(code12[i], 10);
        sum += i % 2 === 0 ? digit : digit * 3;
      }
      const checkDigit = (10 - (sum % 10)) % 10;
      const barcode = code12 + checkDigit.toString();
      if (!existingBarcodes.has(barcode)) {
        return barcode;
      }
    }
    // Fallback nếu trùng nhiều
    return '893' + Date.now().toString().slice(-10);
  };

  useEffect(() => {
    if (!isModalOpen) return;
    // Load dropdown data
    dispatch(fetchCategories());
    dispatch(fetchSuppliers());
    if (selectedProduct !== null) {
      // Khi chỉnh sửa: nếu sku bắt đầu bằng CK-, bóc tách tiền tố để hiển thị trong input có addonBefore="CK-"
      const rawSku = selectedProduct.sku || '';
      const displaySku = rawSku.startsWith('CK-') ? rawSku.substring(3) : rawSku;
      form.setFieldsValue({
        ...selectedProduct,
        sku: displaySku,
      });
      return;
    }
    form.resetFields();
    form.setFieldsValue({
      sku: '',
      unit: PRODUCT_UNIT.Piece,
      vatPercent: 8,
      minStock: 10,
      maxStock: 100,
      shelfLifeDays: 30,
      status: RECORD_STATUS.Active,
      isPerishable: false,
    });
  }, [isModalOpen, selectedProduct, form, dispatch]);

  const handleSubmit = async (): Promise<void> => {
    try {
      const values = await form.validateFields();
      const rawSku = values.sku?.trim() || '';
      const formattedSku = rawSku.startsWith('CK-') ? rawSku : `CK-${rawSku}`;

      const normalizedValues: ProductFormValues = {
        ...values,
        sku: formattedSku,
      };

      if (isEditing && selectedProduct) {
        await dispatch(updateProductThunk({ id: selectedProduct.id, values: normalizedValues })).unwrap();
        message.success('Đã cập nhật thông tin sản phẩm.');
      } else {
        const payload: ProductFormValues = {
          ...normalizedValues,
          barcode: values.barcode?.trim() || generateUniqueBarcode(),
        };
        await dispatch(createProduct(payload)).unwrap();
        message.success('Đã thêm sản phẩm mới.');
      }
      dispatch(setProductModalOpen(false));
    } catch (error: unknown) {
      if (isFormValidationError(error)) return;
      const errorMessage = getErrorMessage(error, 'Không thể lưu thông tin sản phẩm');
      const handled = applyFormErrors(form, errorMessage, {
        barcode: ['mã vạch'],
        sku: ['sku'],
        salePrice: ['giá bán'],
        costPrice: ['giá nhập'],
        maxStock: ['tồn tối đa'],
      });
      if (!handled) message.error(errorMessage);
    }
  };

  return (
    <Modal
      open={isModalOpen}
      title={
        isEditing
          ? `Chỉnh sửa sản phẩm ${selectedProduct?.sku}`
          : 'Thêm sản phẩm mới'
      }
      okText={isEditing ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
      cancelText="Huỷ"
      width={720}
      onOk={handleSubmit}
      onCancel={() => dispatch(setProductModalOpen(false))}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" className="product-form" validateTrigger={['onSubmit']}>
        {/* Hàng 1: Danh mục sản phẩm (chọn trước) & Mã SKU (tự động điền) */}
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="categoryId"
              label="Danh mục"
              rules={[{ required: true, message: 'Vui lòng chọn danh mục.' }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                filterOption={(input, option) =>
                  String(option?.label ?? '')
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                placeholder="Chọn danh mục"
                options={categoryOptions}
                onChange={handleCategoryChange}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="sku"
              label="Mã SKU (Tự động)"
              rules={[
                { required: true, whitespace: true, message: 'Vui lòng chọn danh mục để tự động tạo SKU.' },
                { max: 47, message: 'Phần mã SKU tối đa 47 ký tự.' },
              ]}
            >
              <Input
                disabled
                addonBefore="CK-"
                placeholder="Chọn danh mục để tự động tạo SKU"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Hàng 2: Tên sản phẩm & Đơn vị tính */}
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="name"
              label="Tên sản phẩm"
              rules={[{ required: true, message: 'Vui lòng nhập tên.' }]}
            >
              <Input placeholder="Tên sản phẩm" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="unit"
              label="Đơn vị"
              rules={[{ required: true, message: 'Chọn đơn vị.' }]}
            >
              <Select options={UNIT_OPTIONS} />
            </Form.Item>
          </Col>
        </Row>

        {/* Hàng 3: Nhà cung cấp & VAT (%) */}
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="supplierId"
              label="Nhà cung cấp"
              rules={[{ required: true, message: 'Chọn nhà cung cấp.' }]}
            >
              <Select placeholder="Chọn nhà cung cấp" options={supplierOptions} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="vatPercent"
              label="VAT (%)"
              rules={[
                {
                  type: 'number',
                  min: 0,
                  max: 100,
                  message: 'VAT từ 0-100%.',
                },
              ]}
            >
              <InputNumber className="product-amount-input" min={0} max={100} step={1} addonAfter="%" />
            </Form.Item>
          </Col>
        </Row>

        {/* Hàng bổ sung khi chỉnh sửa: Mã vạch */}
        {isEditing && (
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="barcode"
                label="Mã vạch (EAN-13)"
                rules={[
                  { required: true, whitespace: true, message: 'Vui lòng nhập mã vạch.' },
                  { pattern: /^\d{13}$/, message: 'Mã vạch phải đúng 13 chữ số.' },
                ]}
              >
                <Input placeholder="8934567000011" maxLength={13} disabled />
              </Form.Item>
            </Col>
          </Row>
        )}

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="costPrice"
              label="Giá nhập (đồng)"
              rules={[
                {
                  required: true,
                  message: 'Vui lòng nhập giá nhập.',
                },
                {
                  type: 'number',
                  min: 1001,
                  message: 'Giá nhập phải lớn hơn 1.000 VNĐ.',
                },
              ]}
            >
              <InputNumber className="product-amount-input" step={100} addonAfter="₫" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="salePrice"
              label="Giá bán (đồng)"
              rules={[
                {
                  required: !isEditing,
                  message: 'Vui lòng nhập giá bán.',
                },
                {
                  type: 'number',
                  min: 1001,
                  message: 'Giá bán phải lớn hơn 1.000 VNĐ.',
                },
              ]}
            >
              <InputNumber className="product-amount-input" step={100} addonAfter="₫" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="minStock"
              label="Tồn tối thiểu"
              rules={[
                {
                  type: 'number',
                  min: 0,
                  message: 'Tồn tối thiểu phải >= 0.',
                },
              ]}
            >
              <InputNumber className="product-amount-input" min={0} step={1} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="maxStock"
              label="Tồn tối đa"
              dependencies={['minStock']}
              rules={[
                {
                  type: 'number',
                  min: 0,
                  message: 'Tồn tối đa phải >= 0.',
                },
                ({ getFieldValue }) => ({
                  validator: (_rule, value: number | null | undefined) => {
                    const minStock = getFieldValue('minStock') as number | null | undefined;
                    if (value === undefined || value === null || value === 0
                      || minStock === undefined || minStock === null || value >= minStock) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error('Tồn tối đa phải lớn hơn hoặc bằng tồn tối thiểu.'),
                    );
                  },
                }),
              ]}
            >
              <InputNumber className="product-amount-input" min={0} step={1} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="shelfLifeDays"
              label="Hạn sử dụng (ngày)"
              rules={[
                {
                  type: 'number',
                  min: 0,
                  message: 'HSD phải >= 0.',
                },
              ]}
            >
              <InputNumber className="product-amount-input" min={0} step={1} addonAfter="ngày" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="isPerishable"
              label="Hàng dễ hỏng"
            >
              <Select
                options={[
                  { value: true, label: 'Có' },
                  { value: false, label: 'Không' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="status"
              label="Trạng thái"
              rules={[{ required: true, message: 'Chọn trạng thái.' }]}
            >
              <Select options={STATUS_OPTIONS} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};
