import { BRANCH_KIND, REGION, type BranchKind, type Region } from '@/types/branchTypes';

/**
 * Trả về tiền tố mã chi nhánh dựa vào Loại điểm (Cửa hàng / Kho tổng) và Vùng miền:
 * - Cửa hàng (STORE) + Miền Nam (SOUTH) -> "CK-MN"
 * - Cửa hàng (STORE) + Miền Bắc (NORTH) -> "CK-MB"
 * - Cửa hàng (STORE) + Miền Trung (CENTRAL) -> "CK-MT"
 * - Kho tổng (DISTRIBUTION_CENTER) + Miền Nam -> "DC-MN"
 * - Kho tổng (DISTRIBUTION_CENTER) + Miền Bắc -> "DC-MB"
 * - Kho tổng (DISTRIBUTION_CENTER) + Miền Trung -> "DC-MT"
 */
export const getBranchPrefix = (
  kind?: BranchKind | string,
  region?: Region | string,
): string => {
  const isDC =
    kind === BRANCH_KIND.DistributionCenter ||
    kind === 'DISTRIBUTION_CENTER' ||
    kind === 'KHO_TONG';
  const kindPrefix = isDC ? 'DC' : 'CK';

  let regionPrefix = 'MN';
  const normalizedRegion = String(region || '').toUpperCase();
  if (normalizedRegion === REGION.North || normalizedRegion.includes('BAC') || normalizedRegion.includes('BẮC')) {
    regionPrefix = 'MB';
  } else if (normalizedRegion === REGION.Central || normalizedRegion.includes('TRUNG')) {
    regionPrefix = 'MT';
  } else {
    regionPrefix = 'MN';
  }

  return `${kindPrefix}-${regionPrefix}`;
};

/**
 * Tự động tìm số thứ tự lớn nhất của nhóm tiền tố chi nhánh và sinh mã tiếp theo (VD: CK-MN-01, DC-MB-01)
 */
export const generateNextBranchCode = (
  kind?: BranchKind | string,
  region?: Region | string,
  branches: Array<{ code?: string }> = [],
): string => {
  const prefix = getBranchPrefix(kind, region);
  const regex = new RegExp(`^${prefix}-(\\d+)$`, 'i');

  let maxSeq = 0;
  for (const b of branches) {
    if (!b?.code) continue;
    const match = b.code.trim().match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  let nextSeq = maxSeq + 1;
  let candidate = `${prefix}-${String(nextSeq).padStart(2, '0')}`;

  while (branches.some((b) => b?.code?.toUpperCase() === candidate)) {
    nextSeq += 1;
    candidate = `${prefix}-${String(nextSeq).padStart(2, '0')}`;
  }

  return candidate;
};
