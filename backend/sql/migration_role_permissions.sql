-- =============================================================================
-- Migration: Hệ thống Nhóm quyền (Role Groups) & Phân quyền động (RBAC) - Circle K ERP
-- =============================================================================

-- 1. Bảng modules (Nhóm quyền)
CREATE TABLE IF NOT EXISTS modules (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    display_name_vi VARCHAR(255),
    display_name_en VARCHAR(255),
    icon            VARCHAR(50),
    color           VARCHAR(50),
    thu_tu          INT,
    created_by      VARCHAR(50) DEFAULT '1',
    created_at      TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status          INT DEFAULT 0,
    deleted         INT DEFAULT 0
);

ALTER TABLE modules ADD COLUMN IF NOT EXISTS icon VARCHAR(50);
ALTER TABLE modules ADD COLUMN IF NOT EXISTS color VARCHAR(50);
ALTER TABLE modules ADD COLUMN IF NOT EXISTS thu_tu INT;
ALTER TABLE modules ADD COLUMN IF NOT EXISTS display_name_vi VARCHAR(255);
ALTER TABLE modules ADD COLUMN IF NOT EXISTS display_name_en VARCHAR(255);

-- 2. Bảng permissions (Quyền hạn chi tiết)
CREATE TABLE IF NOT EXISTS permissions (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    created_by      VARCHAR(50) DEFAULT '1',
    created_at      TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status          INT DEFAULT 0,
    deleted         INT DEFAULT 0,
    module          VARCHAR(100) NOT NULL,
    display_name_vi VARCHAR(255) NOT NULL,
    display_name_en VARCHAR(255) NOT NULL
);

-- 3. Bảng vai_tro (Nhóm quyền / Vai trò)
CREATE TABLE IF NOT EXISTS vai_tro (
    id              BIGSERIAL PRIMARY KEY,
    ma_vai_tro      VARCHAR(50) NOT NULL UNIQUE,
    ten_vai_tro     VARCHAR(100) NOT NULL UNIQUE,
    mo_ta           TEXT,
    created_by      VARCHAR(50) DEFAULT '1',
    created_at      TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status          INT DEFAULT 0,
    deleted         INT DEFAULT 0
);

-- 4. Bảng role_permissions (Liên kết Vai trò <-> Quyền)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id         BIGINT NOT NULL REFERENCES vai_tro(id) ON DELETE CASCADE,
    permission_id   BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at      TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by      VARCHAR(50) DEFAULT 'SYSTEM',
    PRIMARY KEY (role_id, permission_id)
);

-- 5. Bổ sung cột id_vai_tro vào nhan_vien (nếu chưa có)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nhan_vien' AND column_name = 'id_vai_tro'
    ) THEN
        ALTER TABLE nhan_vien ADD COLUMN id_vai_tro BIGINT;
    END IF;
END $$;

-- 6. Dọn dẹp các module & quyền không thuộc nghiệp vụ Circle K và các module tiếng Việt trùng
DELETE FROM role_permissions WHERE permission_id IN (
    SELECT id FROM permissions WHERE module IN ('Tuyển dụng', 'Phòng ban', 'Chức vụ', 'candidate_cv', 'department', 'position') OR name LIKE 'candidate_cv:%' OR name LIKE 'department:%' OR name LIKE 'position:%'
);
DELETE FROM permissions WHERE module IN ('Tuyển dụng', 'Phòng ban', 'Chức vụ', 'candidate_cv', 'department', 'position') OR name LIKE 'candidate_cv:%' OR name LIKE 'department:%' OR name LIKE 'position:%';
DELETE FROM modules WHERE name IN (
    'Người dùng', 'Tài khoản', 'Nhân viên', 'Chi nhánh', 'Hàng hoá', 
    'Danh mục', 'Nhà cung cấp', 'Hợp đồng', 'Kho hàng', 'Nhập hàng', 
    'Chuyển kho', 'Kiểm kê', 'Đơn hàng', 'Chấm công', 'Bảng lương', 
    'Sổ quỹ', 'Báo cáo', 'Nhóm quyền', 'Phân quyền',
    'Tuyển dụng', 'Phòng ban', 'Chức vụ', 'candidate_cv', 'department', 'position'
);

-- 7. Khởi tạo dữ liệu mẫu cho vai_tro (nếu chưa có)
INSERT INTO vai_tro (ma_vai_tro, ten_vai_tro, mo_ta, created_by, status, deleted)
VALUES 
    ('NQ01', 'ADMIN', 'Quản trị viên toàn hệ thống Circle K', '1', 0, 0),
    ('NQ02', 'QUAN_LY', 'Quản lý cửa hàng / chi nhánh', '1', 0, 0),
    ('NQ03', 'THU_KHO', 'Thủ kho Kho Tổng và điều chuyển', '1', 0, 0),
    ('NQ04', 'THU_NGAN', 'Thu ngân bán hàng POS tại quầy', '1', 0, 0),
    ('NQ05', 'KE_TOAN', 'Kế toán tài chính, sổ quỹ và duyệt chi', '1', 0, 0)
ON CONFLICT (ma_vai_tro) DO NOTHING;

-- 8. Khởi tạo 17 modules chuẩn với mã 'name' là code slug
INSERT INTO modules (name, display_name_vi, display_name_en, description, icon, color, thu_tu, created_by, status, deleted)
VALUES
    ('user', 'Tài khoản', 'User Account', 'Quản lý tài khoản đăng nhập và mật khẩu', 'T', '#06b6d4', 1, '1', 0, 0),
    ('employee', 'Nhân viên', 'Employee', 'Quản lý hồ sơ nhân viên và ca làm việc', 'N', '#8b5cf6', 2, '1', 0, 0),
    ('branch', 'Chi nhánh', 'Branch', 'Quản lý cửa hàng bán lẻ và Kho Tổng', 'C', '#ec4899', 3, '1', 0, 0),
    ('product', 'Hàng hoá', 'Product', 'Quản lý SKU, mã vạch và giá bán sản phẩm', 'H', '#3b82f6', 4, '1', 0, 0),
    ('category', 'Danh mục', 'Category', 'Phân loại nhóm ngành hàng và icon hiển thị', 'D', '#10b981', 5, '1', 0, 0),
    ('supplier', 'Nhà cung cấp', 'Supplier', 'Quản lý thông tin đối tác cung ứng hàng hoá', 'N', '#f59e0b', 6, '1', 0, 0),
    ('contract', 'Hợp đồng', 'Contract', 'Quản lý hợp đồng mua bán với nhà cung cấp', 'H', '#6366f1', 7, '1', 0, 0),
    ('warehouse', 'Kho hàng', 'Warehouse', 'Quản lý tồn kho và biến động thẻ kho', 'K', '#ec4899', 8, '1', 0, 0),
    ('purchase', 'Nhập hàng', 'Purchase', 'Quản lý phiếu nhập hàng từ nhà cung cấp', 'N', '#14b8a6', 9, '1', 0, 0),
    ('transfer', 'Chuyển kho', 'Transfer', 'Luân chuyển xuất nhập hàng hoá nội bộ', 'C', '#f97316', 10, '1', 0, 0),
    ('stocktake', 'Kiểm kê', 'Stocktake', 'Phiếu kiểm kê và cân bằng tồn kho thực tế', 'K', '#ef4444', 11, '1', 0, 0),
    ('order', 'Đơn hàng', 'Sales Order', 'Quản lý hoá đơn bán hàng và POS', 'Đ', '#ef4444', 12, '1', 0, 0),
    ('attendance', 'Chấm công', 'Attendance', 'Chấm công check-in/out ca làm việc', 'C', '#84cc16', 13, '1', 0, 0),
    ('payroll', 'Bảng lương', 'Payroll', 'Tính lương và duyệt chi bảng lương', 'B', '#0ea5e9', 14, '1', 0, 0),
    ('cashbook', 'Sổ quỹ', 'Cashbook', 'Sổ quỹ thu chi và dòng tiền cửa hàng', 'S', '#a855f7', 15, '1', 0, 0),
    ('report', 'Báo cáo', 'Report', 'Báo cáo doanh thu, lợi nhuận và tồn kho', 'B', '#d946ef', 16, '1', 0, 0),
    ('role', 'Nhóm quyền', 'Role Groups', 'Quản lý phân quyền và nhóm quyền người dùng', 'Q', '#64748b', 17, '1', 0, 0)
ON CONFLICT (name) DO UPDATE SET
    display_name_vi = EXCLUDED.display_name_vi,
    display_name_en = EXCLUDED.display_name_en,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    thu_tu = EXCLUDED.thu_tu;

-- 9. Khởi tạo danh sách quyền động chi tiết (hasAuthority('<module>:<action>'))
INSERT INTO permissions (name, description, created_by, created_at, updated_at, status, deleted, module, display_name_vi, display_name_en)
VALUES
    -- User
    ('user:read', 'Xem danh sách tài khoản', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'user', 'Xem tài khoản', 'Read users'),
    ('user:create', 'Tạo tài khoản đăng nhập', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'user', 'Tạo tài khoản', 'Create user'),
    ('user:update', 'Cập nhật tài khoản và đổi mật khẩu', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'user', 'Cập nhật tài khoản', 'Update user'),
    ('user:delete', 'Xoá hoặc khoá tài khoản', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'user', 'Xoá tài khoản', 'Delete user'),

    -- Employee
    ('employee:read', 'Xem danh sách nhân viên', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'employee', 'Xem nhân viên', 'Read employees'),
    ('employee:create', 'Thêm mới nhân viên', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'employee', 'Tạo nhân viên', 'Create employee'),
    ('employee:update', 'Cập nhật hồ sơ nhân viên', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'employee', 'Cập nhật nhân viên', 'Update employee'),
    ('employee:delete', 'Xoá nhân viên', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'employee', 'Xoá nhân viên', 'Delete employee'),

    -- Branch
    ('branch:read', 'Xem danh sách chi nhánh và kho', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'branch', 'Xem chi nhánh', 'Read branches'),
    ('branch:create', 'Tạo chi nhánh mới', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'branch', 'Tạo chi nhánh', 'Create branch'),
    ('branch:update', 'Cập nhật thông tin chi nhánh / quản lý', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'branch', 'Cập nhật chi nhánh', 'Update branch'),
    ('branch:delete', 'Xoá chi nhánh', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'branch', 'Xoá chi nhánh', 'Delete branch'),

    -- Product
    ('product:read', 'Xem danh sách sản phẩm và lô hàng', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'product', 'Xem hàng hoá', 'Read products'),
    ('product:create', 'Tạo mới sản phẩm', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'product', 'Tạo hàng hoá', 'Create product'),
    ('product:update', 'Cập nhật thông tin hàng hoá / huỷ lô', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'product', 'Cập nhật hàng hoá', 'Update product'),
    ('product:delete', 'Xoá hàng hoá', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'product', 'Xoá hàng hoá', 'Delete product'),

    -- Category
    ('category:read', 'Xem danh mục hàng hoá', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'category', 'Xem danh mục', 'Read categories'),
    ('category:create', 'Tạo mới danh mục', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'category', 'Tạo danh mục', 'Create category'),
    ('category:update', 'Cập nhật danh mục', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'category', 'Cập nhật danh mục', 'Update category'),
    ('category:delete', 'Xoá danh mục', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'category', 'Xoá danh mục', 'Delete category'),

    -- Warehouse
    ('warehouse:read', 'Xem tồn kho và thẻ kho', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'warehouse', 'Xem tồn kho', 'Read inventory'),
    ('warehouse:adjust', 'Điều chỉnh cân bằng tồn kho', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'warehouse', 'Cân bằng tồn kho', 'Adjust inventory'),

    -- Purchase
    ('purchase:read', 'Xem phiếu nhập kho NCC', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'purchase', 'Xem phiếu nhập', 'Read purchase orders'),
    ('purchase:create', 'Tạo phiếu nhập hàng từ NCC', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'purchase', 'Tạo phiếu nhập', 'Create purchase order'),
    ('purchase:update', 'Cập nhật phiếu nhập kho', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'purchase', 'Cập nhật phiếu nhập', 'Update purchase order'),
    ('purchase:approve', 'Duyệt / Hoàn thành phiếu nhập kho', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'purchase', 'Duyệt phiếu nhập', 'Approve purchase order'),
    ('purchase:delete', 'Xoá phiếu nhập hàng', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'purchase', 'Xoá phiếu nhập', 'Delete purchase order'),

    -- Transfer
    ('transfer:read', 'Xem phiếu điều chuyển / xuất kho', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'transfer', 'Xem chuyển kho', 'Read transfers'),
    ('transfer:create', 'Tạo phiếu xuất chuyển hàng', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'transfer', 'Tạo chuyển kho', 'Create transfer'),
    ('transfer:update', 'Cập nhật phiếu chuyển kho', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'transfer', 'Cập nhật chuyển kho', 'Update transfer'),
    ('transfer:approve', 'Duyệt xuất kho / Nhận hàng chuyển', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'transfer', 'Duyệt chuyển kho', 'Approve transfer'),
    ('transfer:delete', 'Xoá phiếu chuyển kho', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'transfer', 'Xoá chuyển kho', 'Delete transfer'),

    -- Stocktake
    ('stocktake:read', 'Xem danh sách phiếu kiểm kê', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'stocktake', 'Xem kiểm kê', 'Read stocktakes'),
    ('stocktake:create', 'Tạo phiếu kiểm kê', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'stocktake', 'Tạo kiểm kê', 'Create stocktake'),
    ('stocktake:update', 'Cập nhật số liệu kiểm kê', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'stocktake', 'Cập nhật kiểm kê', 'Update stocktake'),
    ('stocktake:approve', 'Duyệt cân bằng phiếu kiểm kê', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'stocktake', 'Duyệt kiểm kê', 'Approve stocktake'),
    ('stocktake:delete', 'Xoá phiếu kiểm kê', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'stocktake', 'Xoá kiểm kê', 'Delete stocktake'),

    -- Order (POS)
    ('order:read', 'Xem hoá đơn bán hàng', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'order', 'Xem hoá đơn', 'Read sales orders'),
    ('order:create', 'Tạo hoá đơn bán hàng POS', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'order', 'Tạo hoá đơn POS', 'Create sales order'),
    ('order:cancel', 'Huỷ hoá đơn bán hàng', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'order', 'Huỷ đơn hàng', 'Cancel sales order'),
    ('order:update', 'Cập nhật thông tin đơn hàng', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'order', 'Cập nhật đơn hàng', 'Update sales order'),
    ('order:delete', 'Xoá đơn hàng', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'order', 'Xoá đơn hàng', 'Delete sales order'),

    -- Supplier
    ('supplier:read', 'Xem danh sách nhà cung cấp', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'supplier', 'Xem nhà cung cấp', 'Read suppliers'),
    ('supplier:create', 'Thêm mới nhà cung cấp', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'supplier', 'Tạo nhà cung cấp', 'Create supplier'),
    ('supplier:update', 'Cập nhật thông tin nhà cung cấp', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'supplier', 'Cập nhật nhà cung cấp', 'Update supplier'),
    ('supplier:delete', 'Xoá nhà cung cấp', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'supplier', 'Xoá nhà cung cấp', 'Delete supplier'),

    -- Contract
    ('contract:read', 'Xem danh sách hợp đồng', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'contract', 'Xem hợp đồng', 'Read contracts'),
    ('contract:create', 'Tạo mới hợp đồng', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'contract', 'Tạo hợp đồng', 'Create contract'),
    ('contract:update', 'Cập nhật / trình duyệt hợp đồng', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'contract', 'Cập nhật hợp đồng', 'Update contract'),
    ('contract:approve', 'Duyệt hoặc từ chối hợp đồng', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'contract', 'Duyệt hợp đồng', 'Approve contract'),
    ('contract:delete', 'Xoá hợp đồng', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'contract', 'Xoá hợp đồng', 'Delete contract'),

    -- Attendance
    ('attendance:read', 'Xem bảng chấm công', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'attendance', 'Xem chấm công', 'Read attendance'),
    ('attendance:checkin', 'Check-in / Check-out ca làm', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'attendance', 'Chấm công vào/ra', 'Check-in / Check-out'),
    ('attendance:update', 'Phân ca / điều chỉnh giờ công', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'attendance', 'Phân ca làm việc', 'Schedule / Update attendance'),
    ('attendance:approve', 'Duyệt / chốt dữ liệu chấm công', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'attendance', 'Duyệt công', 'Approve attendance'),

    -- Payroll
    ('payroll:read', 'Xem bảng tính lương', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'payroll', 'Xem bảng lương', 'Read payroll'),
    ('payroll:calculate', 'Tính toán và sinh bảng lương', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'payroll', 'Tính lương', 'Calculate payroll'),
    ('payroll:approve', 'Duyệt và xác nhận chi trả lương', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'payroll', 'Duyệt bảng lương', 'Approve payroll'),

    -- Cashbook
    ('cashbook:read', 'Xem sổ quỹ thu chi', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'cashbook', 'Xem sổ quỹ', 'Read cashbook'),
    ('cashbook:create', 'Lập phiếu thu / chi tiền mặt', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'cashbook', 'Tạo phiếu thu/chi', 'Create cashbook entry'),

    -- Role & Permissions
    ('role:read', 'Xem danh sách vai trò và quyền', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'role', 'Xem phân quyền', 'Read roles & permissions'),
    ('role:create', 'Tạo vai trò / nhóm quyền mới', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'role', 'Tạo vai trò', 'Create role'),
    ('role:update', 'Cập nhật thông tin vai trò', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'role', 'Cập nhật vai trò', 'Update role'),
    ('role:delete', 'Xoá vai trò', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'role', 'Xoá vai trò', 'Delete role'),
    ('role:assign', 'Gán quyền động cho vai trò', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'role', 'Gán quyền vai trò', 'Assign permissions to role')
ON CONFLICT (name) DO UPDATE SET
    module = EXCLUDED.module,
    description = EXCLUDED.description,
    display_name_vi = EXCLUDED.display_name_vi,
    display_name_en = EXCLUDED.display_name_en;

-- Đồng bộ chuẩn hoá: cột module luôn khớp với phần tiền tố trước dấu ':' của name
UPDATE permissions SET module = SPLIT_PART(name, ':', 1) WHERE name LIKE '%:%';

-- 10. Gán toàn bộ quyền cho ADMIN (NQ01)
INSERT INTO role_permissions (role_id, permission_id, created_by)
SELECT v.id, p.id, 'SYSTEM'
FROM vai_tro v
CROSS JOIN permissions p
WHERE v.ma_vai_tro = 'NQ01'
ON CONFLICT DO NOTHING;

-- 11. Gán quyền mặc định cho QUAN_LY (NQ02)
INSERT INTO role_permissions (role_id, permission_id, created_by)
SELECT v.id, p.id, 'SYSTEM'
FROM vai_tro v
JOIN permissions p ON p.name IN (
    'branch:read', 'employee:read', 'employee:create', 'employee:update',
    'product:read', 'category:read', 'warehouse:read',
    'purchase:read', 'transfer:read', 'transfer:create', 'transfer:approve',
    'stocktake:read', 'stocktake:create', 'stocktake:update', 'stocktake:approve',
    'order:read', 'order:create', 'order:cancel',
    'supplier:read', 'contract:read',
    'attendance:read', 'attendance:checkin', 'attendance:update',
    'payroll:read', 'cashbook:read'
)
WHERE v.ma_vai_tro = 'NQ02'
ON CONFLICT DO NOTHING;

-- 12. Gán quyền mặc định cho THU_KHO (NQ03)
INSERT INTO role_permissions (role_id, permission_id, created_by)
SELECT v.id, p.id, 'SYSTEM'
FROM vai_tro v
JOIN permissions p ON p.name IN (
    'branch:read', 'product:read', 'product:create', 'product:update',
    'category:read', 'warehouse:read', 'warehouse:adjust',
    'purchase:read', 'purchase:create', 'purchase:update', 'purchase:approve',
    'transfer:read', 'transfer:create', 'transfer:update', 'transfer:approve',
    'stocktake:read', 'stocktake:create', 'stocktake:update',
    'supplier:read', 'attendance:checkin'
)
WHERE v.ma_vai_tro = 'NQ03'
ON CONFLICT DO NOTHING;

-- 13. Gán quyền mặc định cho THU_NGAN (NQ04)
INSERT INTO role_permissions (role_id, permission_id, created_by)
SELECT v.id, p.id, 'SYSTEM'
FROM vai_tro v
JOIN permissions p ON p.name IN (
    'branch:read', 'product:read', 'category:read', 'warehouse:read',
    'order:read', 'order:create',
    'attendance:checkin'
)
WHERE v.ma_vai_tro = 'NQ04'
ON CONFLICT DO NOTHING;

-- 14. Gán quyền mặc định cho KE_TOAN (NQ05)
INSERT INTO role_permissions (role_id, permission_id, created_by)
SELECT v.id, p.id, 'SYSTEM'
FROM vai_tro v
JOIN permissions p ON p.name IN (
    'branch:read', 'employee:read', 'product:read', 'category:read', 'warehouse:read',
    'purchase:read', 'purchase:approve',
    'transfer:read', 'stocktake:read', 'order:read',
    'supplier:read', 'contract:read', 'contract:create', 'contract:update',
    'attendance:read', 'attendance:checkin', 'attendance:approve',
    'payroll:read', 'payroll:calculate', 'payroll:approve',
    'cashbook:read', 'cashbook:create'
)
WHERE v.ma_vai_tro = 'NQ05'
ON CONFLICT DO NOTHING;
