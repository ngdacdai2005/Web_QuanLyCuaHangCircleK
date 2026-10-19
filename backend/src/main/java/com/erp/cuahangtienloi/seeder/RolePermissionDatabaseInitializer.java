package com.erp.cuahangtienloi.seeder;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Order(1) // Chạy trước tiên để bảo đảm bảng DB tồn tại
@RequiredArgsConstructor
public class RolePermissionDatabaseInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(RolePermissionDatabaseInitializer.class);
    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        log.info("Kiểm tra và tự động tạo bảng dữ liệu cho Nhóm quyền (vai_tro, modules, permissions, role_permissions)...");
        try {
            // 1. Tạo bảng modules
            jdbcTemplate.execute("""
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
                )
            """);

            jdbcTemplate.execute("""
                ALTER TABLE modules ADD COLUMN IF NOT EXISTS icon VARCHAR(50);
                ALTER TABLE modules ADD COLUMN IF NOT EXISTS color VARCHAR(50);
                ALTER TABLE modules ADD COLUMN IF NOT EXISTS thu_tu INT;
                ALTER TABLE modules ADD COLUMN IF NOT EXISTS display_name_vi VARCHAR(255);
                ALTER TABLE modules ADD COLUMN IF NOT EXISTS display_name_en VARCHAR(255);
                ALTER TABLE modules ADD COLUMN IF NOT EXISTS description TEXT;
                ALTER TABLE modules ADD COLUMN IF NOT EXISTS status INT DEFAULT 0;
                ALTER TABLE modules ADD COLUMN IF NOT EXISTS deleted INT DEFAULT 0;
                ALTER TABLE modules ADD COLUMN IF NOT EXISTS created_by VARCHAR(50) DEFAULT '1';
                ALTER TABLE modules ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;
                ALTER TABLE modules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;
            """);

            // 2. Tạo bảng permissions
            jdbcTemplate.execute("""
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
                )
            """);

            jdbcTemplate.execute("""
                ALTER TABLE permissions ADD COLUMN IF NOT EXISTS module VARCHAR(100);
                ALTER TABLE permissions ADD COLUMN IF NOT EXISTS display_name_vi VARCHAR(255);
                ALTER TABLE permissions ADD COLUMN IF NOT EXISTS display_name_en VARCHAR(255);
                ALTER TABLE permissions ADD COLUMN IF NOT EXISTS description TEXT;
                ALTER TABLE permissions ADD COLUMN IF NOT EXISTS status INT DEFAULT 0;
                ALTER TABLE permissions ADD COLUMN IF NOT EXISTS deleted INT DEFAULT 0;
                ALTER TABLE permissions ADD COLUMN IF NOT EXISTS created_by VARCHAR(50) DEFAULT '1';
                ALTER TABLE permissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;
                ALTER TABLE permissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;
            """);

            // 3. Tạo bảng vai_tro
            jdbcTemplate.execute("""
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
                )
            """);

            jdbcTemplate.execute("""
                ALTER TABLE vai_tro ADD COLUMN IF NOT EXISTS ma_vai_tro VARCHAR(50);
                ALTER TABLE vai_tro ADD COLUMN IF NOT EXISTS ten_vai_tro VARCHAR(100);
                ALTER TABLE vai_tro ADD COLUMN IF NOT EXISTS mo_ta TEXT;
                ALTER TABLE vai_tro ADD COLUMN IF NOT EXISTS status INT DEFAULT 0;
                ALTER TABLE vai_tro ADD COLUMN IF NOT EXISTS deleted INT DEFAULT 0;
                ALTER TABLE vai_tro ADD COLUMN IF NOT EXISTS created_by VARCHAR(50) DEFAULT '1';
                ALTER TABLE vai_tro ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;
                ALTER TABLE vai_tro ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;
            """);

            // 4. Tạo bảng role_permissions
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS role_permissions (
                    role_id         BIGINT NOT NULL REFERENCES vai_tro(id) ON DELETE CASCADE,
                    permission_id   BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
                    created_at      TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    created_by      VARCHAR(50) DEFAULT 'SYSTEM',
                    PRIMARY KEY (role_id, permission_id)
                )
            """);

            jdbcTemplate.execute("""
                ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;
                ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS created_by VARCHAR(50) DEFAULT 'SYSTEM';
            """);

            // 4.1 Tạo bảng thong_bao cho Module Thông báo
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS thong_bao (
                    id                  BIGSERIAL PRIMARY KEY,
                    tieu_de             VARCHAR(255) NOT NULL,
                    noi_dung            TEXT,
                    loai_thong_bao      VARCHAR(50) NOT NULL,
                    action_url          VARCHAR(255),
                    muc_do              VARCHAR(20) DEFAULT 'INFO',
                    nguoi_gui_ten       VARCHAR(100),
                    id_nhan_vien_nhan   UUID,
                    id_chi_nhanh        UUID,
                    da_doc              BOOLEAN DEFAULT FALSE,
                    ngay_tao            TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    ngay_doc            TIMESTAMP WITHOUT TIME ZONE
                );
                ALTER TABLE thong_bao ADD COLUMN IF NOT EXISTS id_chi_nhanh UUID;
            """);

            // 5. Thêm cột id_vai_tro vào nhan_vien nếu chưa có
            jdbcTemplate.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'nhan_vien' AND column_name = 'id_vai_tro'
                    ) THEN
                        ALTER TABLE nhan_vien ADD COLUMN id_vai_tro BIGINT;
                    END IF;
                END $$;
            """);

            // 6. Dọn dẹp dữ liệu rác mẫu cũ (Tuyển dụng, Phòng ban, Chức vụ) và các module tiếng Việt trùng lặp
            jdbcTemplate.execute("""
                DELETE FROM role_permissions 
                WHERE permission_id IN (
                    SELECT id FROM permissions 
                    WHERE module IN ('Tuyển dụng', 'Phòng ban', 'Chức vụ', 'candidate_cv', 'department', 'position') 
                       OR name LIKE 'candidate_cv:%' 
                       OR name LIKE 'department:%' 
                       OR name LIKE 'position:%'
                );
                DELETE FROM permissions 
                WHERE module IN ('Tuyển dụng', 'Phòng ban', 'Chức vụ', 'candidate_cv', 'department', 'position') 
                   OR name LIKE 'candidate_cv:%' 
                   OR name LIKE 'department:%' 
                   OR name LIKE 'position:%';

                -- Dọn dẹp các module trùng lặp với tên tiếng Việt có dấu cũ
                DELETE FROM modules 
                WHERE name IN (
                    'Tài khoản', 'Người dùng', 'Nhân viên', 'Chi nhánh', 'Hàng hoá', 
                    'Danh mục', 'Nhà cung cấp', 'Hợp đồng', 'Kho hàng', 'Nhập hàng', 
                    'Chuyển kho', 'Kiểm kê', 'Đơn hàng', 'Chấm công', 'Bảng lương', 
                    'Sổ quỹ', 'Báo cáo', 'Nhóm quyền', 'Phân quyền',
                    'Tuyển dụng', 'Phòng ban', 'Chức vụ', 'candidate_cv', 'department', 'position'
                );
            """);

            // 7. Seed vai trò mẫu nếu chưa có
            jdbcTemplate.execute("""
                INSERT INTO vai_tro (ma_vai_tro, ten_vai_tro, mo_ta, created_by, status, deleted)
                VALUES 
                    ('NQ01', 'ADMIN', 'Quản trị viên toàn hệ thống Circle K', '1', 0, 0),
                    ('NQ02', 'QUAN_LY', 'Quản lý cửa hàng / chi nhánh', '1', 0, 0),
                    ('NQ03', 'THU_KHO', 'Thủ kho Kho Tổng và điều chuyển', '1', 0, 0),
                    ('NQ04', 'THU_NGAN', 'Thu ngân bán hàng POS tại quầy', '1', 0, 0),
                    ('NQ05', 'KE_TOAN', 'Kế toán tài chính, sổ quỹ và duyệt chi', '1', 0, 0)
                ON CONFLICT (ma_vai_tro) DO NOTHING;
            """);

            // 8. Seed 17 modules chuẩn với mã 'name' là code slug (user, branch, ...)
            jdbcTemplate.execute("""
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
                    ('role', 'Nhóm quyền', 'Role Groups', 'Quản lý phân quyền và nhóm quyền người dùng', 'Q', '#64748b', 17, '1', 0, 0),
                    ('notification', 'Thông báo', 'Notifications', 'Quản lý thông báo và nhắc nhở hoạt động cửa hàng', 'T', '#f59e0b', 18, '1', 0, 0)
                ON CONFLICT (name) DO UPDATE SET
                    display_name_vi = EXCLUDED.display_name_vi,
                    display_name_en = EXCLUDED.display_name_en,
                    description = EXCLUDED.description,
                    icon = EXCLUDED.icon,
                    color = EXCLUDED.color,
                    thu_tu = EXCLUDED.thu_tu;
            """);

            // 9. Seed permissions mẫu đúng theo hệ thống Circle K với module code chuẩn
            jdbcTemplate.execute("""
                INSERT INTO permissions (name, description, created_by, created_at, updated_at, status, deleted, module, display_name_vi, display_name_en)
                VALUES
                    ('user:create', 'Tạo tài khoản', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'user', 'Tạo tài khoản', 'Create user'),
                    ('user:read', 'Xem tài khoản', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'user', 'Xem tài khoản', 'Read user'),
                    ('user:update', 'Cập nhật tài khoản', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'user', 'Cập nhật tài khoản', 'Update user'),
                    ('user:delete', 'Xoá tài khoản', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'user', 'Xoá tài khoản', 'Delete user'),

                    ('employee:create', 'Thêm nhân viên', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'employee', 'Thêm nhân viên', 'Create employee'),
                    ('employee:read', 'Xem nhân viên', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'employee', 'Xem nhân viên', 'Read employee'),
                    ('employee:update', 'Cập nhật nhân viên', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'employee', 'Cập nhật nhân viên', 'Update employee'),
                    ('employee:delete', 'Xoá nhân viên', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'employee', 'Xoá nhân viên', 'Delete employee'),

                    ('branch:create', 'Tạo chi nhánh', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'branch', 'Tạo chi nhánh', 'Create branch'),
                    ('branch:read', 'Xem chi nhánh', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'branch', 'Xem chi nhánh', 'Read branch'),
                    ('branch:update', 'Cập nhật chi nhánh', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'branch', 'Cập nhật chi nhánh', 'Update branch'),
                    ('branch:delete', 'Xoá chi nhánh', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'branch', 'Xoá chi nhánh', 'Delete branch'),

                    ('product:create', 'Tạo hàng hoá', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'product', 'Tạo hàng hoá', 'Create product'),
                    ('product:read', 'Xem hàng hoá', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'product', 'Xem hàng hoá', 'Read product'),
                    ('product:update', 'Cập nhật hàng hoá', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'product', 'Cập nhật hàng hoá', 'Update product'),
                    ('product:delete', 'Xoá hàng hoá', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'product', 'Xoá hàng hoá', 'Delete product'),

                    ('category:create', 'Tạo danh mục', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'category', 'Tạo danh mục', 'Create category'),
                    ('category:read', 'Xem danh mục', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'category', 'Xem danh mục', 'Read category'),
                    ('category:update', 'Cập nhật danh mục', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'category', 'Cập nhật danh mục', 'Update category'),
                    ('category:delete', 'Xoá danh mục', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'category', 'Xoá danh mục', 'Delete category'),

                    ('supplier:create', 'Tạo nhà cung cấp', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'supplier', 'Tạo nhà cung cấp', 'Create supplier'),
                    ('supplier:read', 'Xem nhà cung cấp', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'supplier', 'Xem nhà cung cấp', 'Read supplier'),
                    ('supplier:update', 'Cập nhật nhà cung cấp', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'supplier', 'Cập nhật nhà cung cấp', 'Update supplier'),
                    ('supplier:delete', 'Xoá nhà cung cấp', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'supplier', 'Xoá nhà cung cấp', 'Delete supplier'),

                    ('warehouse:read', 'Xem tồn kho & thẻ kho', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'warehouse', 'Xem kho hàng', 'Read warehouse'),
                    ('warehouse:adjust', 'Điều chỉnh tồn kho', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'warehouse', 'Điều chỉnh kho', 'Adjust warehouse'),

                    ('purchase:create', 'Tạo phiếu nhập hàng', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'purchase', 'Tạo phiếu nhập', 'Create purchase'),
                    ('purchase:read', 'Xem phiếu nhập hàng', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'purchase', 'Xem phiếu nhập', 'Read purchase'),
                    ('purchase:update', 'Cập nhật phiếu nhập', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'purchase', 'Cập nhật phiếu nhập', 'Update purchase'),
                    ('purchase:approve', 'Duyệt thanh toán phiếu nhập', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'purchase', 'Duyệt phiếu nhập', 'Approve purchase'),
                    ('purchase:delete', 'Xoá phiếu nhập', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'purchase', 'Xoá phiếu nhập', 'Delete purchase'),

                    ('transfer:create', 'Tạo phiếu chuyển kho', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'transfer', 'Tạo phiếu chuyển kho', 'Create transfer'),
                    ('transfer:read', 'Xem phiếu chuyển kho', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'transfer', 'Xem phiếu chuyển kho', 'Read transfer'),
                    ('transfer:update', 'Cập nhật phiếu chuyển kho', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'transfer', 'Cập nhật phiếu chuyển kho', 'Update transfer'),
                    ('transfer:approve', 'Duyệt xuất/nhận chuyển kho', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'transfer', 'Duyệt chuyển kho', 'Approve transfer'),
                    ('transfer:delete', 'Xoá phiếu chuyển kho', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'transfer', 'Xoá phiếu chuyển kho', 'Delete transfer'),

                    ('stocktake:create', 'Tạo phiếu kiểm kê', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'stocktake', 'Tạo phiếu kiểm kê', 'Create stocktake'),
                    ('stocktake:read', 'Xem phiếu kiểm kê', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'stocktake', 'Xem phiếu kiểm kê', 'Read stocktake'),
                    ('stocktake:update', 'Cập nhật phiếu kiểm kê', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'stocktake', 'Cập nhật phiếu kiểm kê', 'Update stocktake'),
                    ('stocktake:approve', 'Cân bằng kho kiểm kê', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'stocktake', 'Duyệt kiểm kê', 'Approve stocktake'),
                    ('stocktake:delete', 'Xoá phiếu kiểm kê', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'stocktake', 'Xoá phiếu kiểm kê', 'Delete stocktake'),

                    ('order:create', 'Tạo hoá đơn bán hàng POS', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'order', 'Tạo đơn hàng POS', 'Create sales order'),
                    ('order:read', 'Xem hoá đơn bán hàng', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'order', 'Xem đơn hàng', 'Read sales order'),
                    ('order:cancel', 'Huỷ / Hoàn tiền đơn hàng', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'order', 'Huỷ đơn hàng', 'Cancel sales order'),
                    ('order:update', 'Cập nhật hoá đơn', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'order', 'Cập nhật đơn hàng', 'Update sales order'),
                    ('order:delete', 'Xoá hoá đơn', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'order', 'Xoá đơn hàng', 'Delete sales order'),

                    ('contract:create', 'Tạo hợp đồng NCC', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'contract', 'Tạo hợp đồng', 'Create contract'),
                    ('contract:read', 'Xem hợp đồng NCC', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'contract', 'Xem hợp đồng', 'Read contract'),
                    ('contract:update', 'Cập nhật hợp đồng NCC', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'contract', 'Cập nhật hợp đồng', 'Update contract'),
                    ('contract:approve', 'Duyệt hợp đồng NCC', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'contract', 'Duyệt hợp đồng', 'Approve contract'),
                    ('contract:delete', 'Xoá hợp đồng NCC', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'contract', 'Xoá hợp đồng', 'Delete contract'),

                    ('attendance:read', 'Xem chấm công', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'attendance', 'Xem chấm công', 'Read attendance'),
                    ('attendance:checkin', 'Check-in/out chấm công', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'attendance', 'Điểm danh ca làm', 'Checkin attendance'),
                    ('attendance:update', 'Sửa dữ liệu chấm công', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'attendance', 'Cập nhật chấm công', 'Update attendance'),
                    ('attendance:approve', 'Chốt ca / duyệt công', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'attendance', 'Duyệt công', 'Approve attendance'),

                    ('payroll:read', 'Xem bảng lương', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'payroll', 'Xem bảng lương', 'Read payroll'),
                    ('payroll:calculate', 'Tính toán bảng lương', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'payroll', 'Tính bảng lương', 'Calculate payroll'),
                    ('payroll:approve', 'Duyệt chi bảng lương', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'payroll', 'Duyệt bảng lương', 'Approve payroll'),

                    ('cashbook:read', 'Xem sổ quỹ thu chi', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'cashbook', 'Xem sổ quỹ', 'Read cashbook'),
                    ('cashbook:create', 'Lập phiếu thu / chi', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'cashbook', 'Lập phiếu thu chi', 'Create cashbook entry'),

                    ('report:read', 'Xem báo cáo doanh thu & kho', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'report', 'Xem báo cáo', 'Read report'),

                    ('role:create', 'Tạo nhóm quyền', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'role', 'Tạo nhóm quyền', 'Create role'),
                    ('role:read', 'Xem nhóm quyền & quyền hạn', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'role', 'Xem nhóm quyền', 'Read role'),
                    ('role:update', 'Cập nhật nhóm quyền', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'role', 'Cập nhật nhóm quyền', 'Update role'),
                    ('role:delete', 'Xoá nhóm quyền', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'role', 'Xoá nhóm quyền', 'Delete role'),
                    ('role:assign', 'Phân quyền cho nhóm', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'role', 'Gán quyền', 'Assign role'),

                    ('notification:read', 'Xem thông báo', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'notification', 'Xem thông báo', 'Read notifications'),
                    ('notification:create', 'Tạo thông báo', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'notification', 'Tạo thông báo', 'Create notification'),
                    ('notification:update', 'Cập nhật trạng thái thông báo', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'notification', 'Cập nhật thông báo', 'Update notification'),
                    ('notification:delete', 'Xoá thông báo', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'notification', 'Xoá thông báo', 'Delete notification'),

                    ('notification:read_inventory', 'Xem thông báo Kho & Tồn kho', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'notification', 'Xem thông báo Kho', 'Read inventory notifications'),
                    ('notification:read_stocktake', 'Xem thông báo Kiểm kê kho', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'notification', 'Xem thông báo Kiểm kê', 'Read stocktake notifications'),
                    ('notification:read_shift', 'Xem thông báo Lịch & Ca làm', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'notification', 'Xem thông báo Ca làm', 'Read shift notifications'),
                    ('notification:read_order', 'Xem thông báo Hoá đơn & Bán hàng', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'notification', 'Xem thông báo Hoá đơn', 'Read order notifications'),
                    ('notification:read_contract', 'Xem thông báo Hợp đồng NCC', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'notification', 'Xem thông báo Hợp đồng', 'Read contract notifications'),
                    ('notification:read_system', 'Xem thông báo Hệ thống chung', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'notification', 'Xem thông báo Hệ thống', 'Read system notifications')
                ON CONFLICT (name) DO UPDATE SET
                    module = EXCLUDED.module,
                    description = EXCLUDED.description,
                    display_name_vi = EXCLUDED.display_name_vi,
                    display_name_en = EXCLUDED.display_name_en;

                -- Đồng bộ chuẩn hoá: cột module luôn khớp với phần tiền tố trước dấu ':' của name
                UPDATE permissions SET module = SPLIT_PART(name, ':', 1) WHERE name LIKE '%:%';
            """);

            // 10. Gán quyền mặc định cho từng vai trò (ADMIN, QUAN_LY, THU_KHO, THU_NGAN, KE_TOAN)

            // 10.1 ADMIN: Có tất cả các quyền
            jdbcTemplate.execute("""
                INSERT INTO role_permissions (role_id, permission_id, created_by)
                SELECT v.id, p.id, 'SYSTEM'
                FROM vai_tro v
                CROSS JOIN permissions p
                WHERE v.ma_vai_tro = 'NQ01'
                ON CONFLICT DO NOTHING;
            """);

            // 10.2 QUAN_LY: Quản lý vận hành chi nhánh, nhân viên, POS, kiểm kê, chấm công
            jdbcTemplate.execute("""
                INSERT INTO role_permissions (role_id, permission_id, created_by)
                SELECT v.id, p.id, 'SYSTEM'
                FROM vai_tro v
                CROSS JOIN permissions p
                WHERE v.ma_vai_tro = 'NQ02'
                  AND p.name IN (
                    'order:read', 'order:create', 'order:cancel', 'order:update',
                    'product:read', 'product:update',
                    'category:read',
                    'branch:read',
                    'employee:read', 'employee:create', 'employee:update',
                    'warehouse:read',
                    'purchase:read',
                    'transfer:read', 'transfer:create', 'transfer:approve',
                    'stocktake:read', 'stocktake:create', 'stocktake:update', 'stocktake:approve',
                    'attendance:read', 'attendance:checkin', 'attendance:update', 'attendance:approve',
                    'payroll:read',
                    'cashbook:read',
                    'contract:read',
                    'supplier:read',
                    'report:read'
                  )
                ON CONFLICT DO NOTHING;
            """);

            // 10.3 THU_KHO: Quản lý kho, nhập hàng NCC, chuyển kho, kiểm kê
            jdbcTemplate.execute("""
                INSERT INTO role_permissions (role_id, permission_id, created_by)
                SELECT v.id, p.id, 'SYSTEM'
                FROM vai_tro v
                CROSS JOIN permissions p
                WHERE v.ma_vai_tro = 'NQ03'
                  AND p.name IN (
                    'warehouse:read', 'warehouse:adjust',
                    'purchase:read', 'purchase:create', 'purchase:update',
                    'transfer:read', 'transfer:create', 'transfer:approve',
                    'stocktake:read', 'stocktake:create', 'stocktake:update',
                    'product:read',
                    'category:read',
                    'supplier:read',
                    'attendance:checkin'
                  )
                ON CONFLICT DO NOTHING;
            """);

            // 10.4 THU_NGAN: Bán hàng POS, xem đơn hàng, checkin ca làm
            jdbcTemplate.execute("""
                INSERT INTO role_permissions (role_id, permission_id, created_by)
                SELECT v.id, p.id, 'SYSTEM'
                FROM vai_tro v
                CROSS JOIN permissions p
                WHERE v.ma_vai_tro = 'NQ04'
                  AND p.name IN (
                    'order:read', 'order:create',
                    'product:read',
                    'category:read',
                    'attendance:checkin'
                  )
                ON CONFLICT DO NOTHING;
            """);

            // 10.5 KE_TOAN: Sổ quỹ thu chi, duyệt thanh toán nhập hàng, bảng lương, báo cáo
            jdbcTemplate.execute("""
                INSERT INTO role_permissions (role_id, permission_id, created_by)
                SELECT v.id, p.id, 'SYSTEM'
                FROM vai_tro v
                CROSS JOIN permissions p
                WHERE v.ma_vai_tro = 'NQ05'
                  AND p.name IN (
                    'cashbook:read', 'cashbook:create', 'cashbook:export',
                    'purchase:read', 'purchase:approve',
                    'payroll:read', 'payroll:calculate', 'payroll:approve', 'payroll:export',
                    'report:read', 'report:export',
                    'order:read',
                    'contract:read', 'contract:create', 'contract:update',
                    'attendance:read', 'attendance:checkin',
                    'supplier:read',
                    'product:read'
                  )
                ON CONFLICT DO NOTHING;
            """);

            // 10.6 Cấp quyền thông báo theo vai trò và nghiệp vụ
            jdbcTemplate.execute("""
                INSERT INTO role_permissions (role_id, permission_id, created_by)
                SELECT v.id, p.id, 'SYSTEM'
                FROM vai_tro v
                CROSS JOIN permissions p
                WHERE (
                    -- QUAN_LY: Tất cả các nghiệp vụ thông báo + tạo/cập nhật/xoá
                    (v.ma_vai_tro = 'NQ02' AND p.name IN (
                        'notification:read', 'notification:create', 'notification:update', 'notification:delete',
                        'notification:read_inventory', 'notification:read_stocktake', 'notification:read_shift',
                        'notification:read_order', 'notification:read_contract', 'notification:read_system'
                    ))
                    OR
                    -- THU_KHO: Kho hàng, Kiểm kê, Hệ thống
                    (v.ma_vai_tro = 'NQ03' AND p.name IN (
                        'notification:read', 'notification:update',
                        'notification:read_inventory', 'notification:read_stocktake', 'notification:read_system'
                    ))
                    OR
                    -- THU_NGAN: Ca làm, Hoá đơn POS, Hệ thống
                    (v.ma_vai_tro = 'NQ04' AND p.name IN (
                        'notification:read', 'notification:update',
                        'notification:read_shift', 'notification:read_order', 'notification:read_system'
                    ))
                    OR
                    -- KE_TOAN: Kho hàng, Hoá đơn, Hợp đồng NCC, Hệ thống
                    (v.ma_vai_tro = 'NQ05' AND p.name IN (
                        'notification:read', 'notification:update',
                        'notification:read_inventory', 'notification:read_order', 'notification:read_contract', 'notification:read_system'
                    ))
                )
                ON CONFLICT DO NOTHING;
            """);

            // 11. Seed thông báo mẫu thực tế cho cửa hàng Circle K nếu bảng đang trống
            Integer countTb = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM thong_bao", Integer.class);
            if (countTb == null || countTb == 0) {
                jdbcTemplate.execute("""
                    INSERT INTO thong_bao (tieu_de, noi_dung, loai_thong_bao, action_url, muc_do, nguoi_gui_ten, da_doc, ngay_tao)
                    VALUES
                        ('Tạo lịch ca làm việc', 'Nguyễn Đắc Đại đã tạo lịch ca làm việc cho chi nhánh Tân Bình vào 2026-10-20.', 'LICH_LAM', '/attendance', 'INFO', 'Nguyễn Đắc Đại', false, CURRENT_TIMESTAMP - INTERVAL '15 MINUTE'),
                        ('Cảnh báo tồn kho dưới mức tối thiểu', 'Sản phẩm Coca Cola 330ml tại chi nhánh Quận 1 chỉ còn 6 lon (dưới ngưỡng an toàn 24 lon).', 'KHO_HANG', '/inventory', 'WARNING', 'Hệ thống kho', false, CURRENT_TIMESTAMP - INTERVAL '2 HOUR'),
                        ('Tiếp nhận yêu cầu nhập hàng', 'Nguyễn Minh Tuấn đã tiếp nhận phiếu nhập hàng số PN-2026-088 từ Nhà cung cấp Vinamilk.', 'KHO_HANG', '/purchase', 'INFO', 'Nguyễn Minh Tuấn', false, CURRENT_TIMESTAMP - INTERVAL '5 HOUR'),
                        ('Hoàn tất kiểm kê kho hàng', 'Phiếu kiểm kê số KK-2026-015 tại Chi nhánh Quận 3 đã kiểm đếm xong và đang chờ quản lý duyệt.', 'KIEM_KE', '/stocktakes', 'INFO', 'Trần Văn Bảo', false, CURRENT_TIMESTAMP - INTERVAL '1 DAY'),
                        ('Hợp đồng NCC sắp hết hạn', 'Hợp đồng số HD-2025-012 với NCC Masan Consumer sẽ hết hạn vào ngày 30/10/2026.', 'HOP_DONG', '/hop-dong', 'WARNING', 'Phòng Thu mua', false, CURRENT_TIMESTAMP - INTERVAL '2 DAY'),
                        ('Cập nhật bảng giá khuyến mãi', 'Quản lý cửa hàng đã cập nhật bảng giá khuyến mãi tháng 10 cho nhóm Nước giải khát.', 'KHO_HANG', '/products', 'INFO', 'Lê Thị Thu', true, CURRENT_TIMESTAMP - INTERVAL '3 DAY');
                """);
            }

            log.info("Tự động khởi tạo schema và dữ liệu cho Nhóm quyền thành công!");
        } catch (Exception e) {
            log.error("Lỗi khi tự động khởi tạo bảng Nhóm quyền: {}", e.getMessage(), e);
        }
    }
}
