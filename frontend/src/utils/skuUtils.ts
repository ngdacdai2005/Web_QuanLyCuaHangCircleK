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
export const getCategorySkuPrefix = (categoryName?: string, categoryCode?: string): string => {
  if (!categoryName && !categoryCode) return 'SP';

  const cleanName = (categoryName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  // 1. Ánh xạ danh mục chuẩn Circle K
  if (cleanName.includes('do an nong') || cleanName.includes('hot dog') || cleanName.includes('banh bao')) {
    if (cleanName.includes('banh bao')) return 'BANHBAO';
    if (cleanName.includes('hot dog')) return 'HOTDOG';
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

  // 2. Fallback cho danh mục mới tự tạo: Lấy chữ cái đầu các từ
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
export const generateNextSku = (
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
