package com.erp.cuahangtienloi.seeder;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.stream.Collectors;

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

            // Đảm bảo các cột mới tồn tại kể cả khi bảng modules đã được tạo từ trước
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

            // Đảm bảo các cột của permissions tồn tại đầy đủ
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

            // 6. Seed vai trò mẫu nếu chưa có
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

            // 7. Seed modules mẫu
            jdbcTemplate.execute("""
                INSERT INTO modules (name, display_name_vi, display_name_en, description, created_by, status, deleted)
                VALUES
                    ('Người dùng', 'Người dùng', 'User', 'Quản lý người dùng, nhân viên và tài khoản', '1', 0, 0),
                    ('Phòng ban', 'Phòng ban', 'Department', 'Quản lý cơ cấu phòng ban và chi nhánh', '1', 0, 0),
                    ('Chức vụ', 'Chức vụ', 'Position', 'Quản lý chức vụ và vị trí công việc', '1', 0, 0),
                    ('Hàng hoá', 'Hàng hoá', 'Product', 'Quản lý danh mục sản phẩm và giá bán', '1', 0, 0),
                    ('Kho hàng', 'Kho hàng', 'Warehouse', 'Quản lý tồn kho, nhập hàng và chuyển kho', '1', 0, 0),
                    ('Đơn hàng', 'Đơn hàng', 'Sales Order', 'Quản lý hoá đơn bán hàng và POS', '1', 0, 0),
                    ('Chấm công', 'Chấm công', 'Attendance', 'Quản lý phân ca và chấm công', '1', 0, 0),
                    ('Bảng lương', 'Bảng lương', 'Payroll', 'Quản lý tính lương và duyệt chi lương', '1', 0, 0),
                    ('Sổ quỹ', 'Sổ quỹ', 'Cashbook', 'Quản lý thu chi và dòng tiền', '1', 0, 0),
                    ('Báo cáo', 'Báo cáo', 'Report', 'Báo cáo doanh thu, lợi nhuận và tồn kho', '1', 0, 0),
                    ('Tuyển dụng', 'Tuyển dụng', 'Recruitment', 'Quản lý hồ sơ ứng viên và tuyển dụng', '1', 0, 0)
                ON CONFLICT (name) DO NOTHING;
            """);

            // 8. Seed permissions mẫu
            jdbcTemplate.execute("""
                INSERT INTO permissions (name, description, created_by, created_at, updated_at, status, deleted, module, display_name_vi, display_name_en)
                VALUES
                    ('user:create', 'Create user', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'Người dùng', 'Tạo người dùng', 'Create user'),
                    ('user:read', 'Read user', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'Người dùng', 'Xem người dùng', 'Read user'),
                    ('user:update', 'Update user', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'Người dùng', 'Cập nhật người dùng', 'Update user'),
                    ('user:delete', 'Delete user', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'Người dùng', 'Xoá người dùng', 'Delete user'),
                    ('user:import', 'Import users', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'Người dùng', 'Import người dùng', 'Import users'),

                    ('department:create', 'Create department', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'Phòng ban', 'Tạo phòng ban', 'Create department'),
                    ('department:read', 'Read department', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'Phòng ban', 'Xem phòng ban', 'Read department'),
                    ('department:update', 'Update department', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'Phòng ban', 'Cập nhật phòng ban', 'Update department'),
                    ('department:delete', 'Delete department', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'Phòng ban', 'Xoá phòng ban', 'Delete department'),

                    ('product:create', 'Create product', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'Hàng hoá', 'Tạo hàng hoá', 'Create product'),
                    ('product:read', 'Read product', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'Hàng hoá', 'Xem hàng hoá', 'Read product'),
                    ('product:update', 'Update product', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'Hàng hoá', 'Cập nhật hàng hoá', 'Update product'),
                    ('product:delete', 'Delete product', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'Hàng hoá', 'Xoá hàng hoá', 'Delete product'),

                    ('warehouse:create', 'Create warehouse', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'Kho hàng', 'Tạo phiếu kho', 'Create warehouse receipt'),
                    ('warehouse:read', 'Read warehouse', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'Kho hàng', 'Xem kho hàng', 'Read warehouse'),
                    ('warehouse:update', 'Update warehouse', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'Kho hàng', 'Cập nhật kho hàng', 'Update warehouse'),
                    ('warehouse:approve', 'Approve warehouse', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'Kho hàng', 'Duyệt phiếu kho', 'Approve warehouse receipt'),

                    ('order:create', 'Create order', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'Đơn hàng', 'Tạo đơn hàng POS', 'Create sales order'),
                    ('order:read', 'Read order', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'Đơn hàng', 'Xem đơn hàng', 'Read sales order'),

                    ('candidate_cv:download', 'Download candidate CV', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'Tuyển dụng', 'Tải CV ứng viên', 'Download candidate CV'),
                    ('candidate_cv:upload', 'Upload candidate CV', '1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, 0, 'Tuyển dụng', 'Tải lên CV ứng viên', 'Upload candidate CV')
                ON CONFLICT (name) DO NOTHING;
            """);

            // 9. Gán tất cả quyền cho ADMIN (NQ01)
            jdbcTemplate.execute("""
                INSERT INTO role_permissions (role_id, permission_id, created_by)
                SELECT v.id, p.id, 'SYSTEM'
                FROM vai_tro v
                CROSS JOIN permissions p
                WHERE v.ma_vai_tro = 'NQ01'
                ON CONFLICT DO NOTHING;
            """);

            log.info("Tự động khởi tạo schema và dữ liệu cho Nhóm quyền thành công!");
        } catch (Exception e) {
            log.error("Lỗi khi tự động khởi tạo bảng Nhóm quyền: {}", e.getMessage(), e);
        }
    }
}
