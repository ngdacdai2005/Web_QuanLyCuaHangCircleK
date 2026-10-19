package com.erp.cuahangtienloi.service.impl;

import com.erp.cuahangtienloi.constant.RecordStatus;
import com.erp.cuahangtienloi.dto.response.PermissionSyncResult;
import com.erp.cuahangtienloi.entity.Module;
import com.erp.cuahangtienloi.entity.Permission;
import com.erp.cuahangtienloi.entity.RolePermission;
import com.erp.cuahangtienloi.entity.RolePermissionId;
import com.erp.cuahangtienloi.entity.VaiTro;
import com.erp.cuahangtienloi.repository.ModuleRepository;
import com.erp.cuahangtienloi.repository.PermissionRepository;
import com.erp.cuahangtienloi.repository.RolePermissionRepository;
import com.erp.cuahangtienloi.repository.VaiTroRepository;
import com.erp.cuahangtienloi.service.PermissionSyncService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationContext;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.RestController;

import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.locks.ReentrantLock;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class PermissionSyncServiceImpl implements PermissionSyncService {

    private static final Logger log = LoggerFactory.getLogger(PermissionSyncServiceImpl.class);

    private final PermissionRepository permissionRepository;
    private final ModuleRepository moduleRepository;
    private final VaiTroRepository vaiTroRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final ApplicationContext applicationContext;

    private static final long SYNC_TTL_MILLIS = 5 * 60 * 1000; // 5 phút
    private volatile long lastSyncAt = 0;
    private final ReentrantLock syncLock = new ReentrantLock();

    private static final Pattern PERMISSION_KEY_PATTERN = Pattern.compile("^[a-z0-9_-]+:[a-z0-9_-]+(:[a-z0-9_-]+)?$");
    private static final Pattern PRE_AUTH_STRING_PATTERN = Pattern.compile("['\"]([^'\"]+)['\"]");

    private static record ModuleMeta(String vi, String en, String icon, String color, int order) {}

    private static final Map<String, ModuleMeta> KNOWN_MODULES = new LinkedHashMap<>();

    static {
        KNOWN_MODULES.put("user", new ModuleMeta("Người dùng", "User", "N", "#06b6d4", 1));
        KNOWN_MODULES.put("branch", new ModuleMeta("Chi nhánh", "Branch", "C", "#8b5cf6", 2));
        KNOWN_MODULES.put("product", new ModuleMeta("Hàng hoá", "Product", "H", "#3b82f6", 3));
        KNOWN_MODULES.put("category", new ModuleMeta("Danh mục", "Category", "D", "#10b981", 4));
        KNOWN_MODULES.put("supplier", new ModuleMeta("Nhà cung cấp", "Supplier", "N", "#f59e0b", 5));
        KNOWN_MODULES.put("warehouse", new ModuleMeta("Kho hàng", "Warehouse", "K", "#ec4899", 6));
        KNOWN_MODULES.put("purchase", new ModuleMeta("Nhập hàng", "Purchase", "N", "#6366f1", 7));
        KNOWN_MODULES.put("transfer", new ModuleMeta("Chuyển kho", "Transfer", "C", "#14b8a6", 8));
        KNOWN_MODULES.put("stocktake", new ModuleMeta("Kiểm kê", "Stocktake", "K", "#f97316", 9));
        KNOWN_MODULES.put("order", new ModuleMeta("Đơn hàng", "Sales Order", "Đ", "#ef4444", 10));
        KNOWN_MODULES.put("attendance", new ModuleMeta("Chấm công", "Attendance", "C", "#84cc16", 11));
        KNOWN_MODULES.put("payroll", new ModuleMeta("Bảng lương", "Payroll", "B", "#0ea5e9", 12));
        KNOWN_MODULES.put("cashbook", new ModuleMeta("Sổ quỹ", "Cashbook", "S", "#a855f7", 13));
        KNOWN_MODULES.put("report", new ModuleMeta("Báo cáo", "Report", "B", "#d946ef", 14));
        KNOWN_MODULES.put("role", new ModuleMeta("Nhóm quyền", "Role Groups", "Q", "#64748b", 15));
        KNOWN_MODULES.put("candidate_cv", new ModuleMeta("Tuyển dụng", "Recruitment", "T", "#ec4899", 16));
        KNOWN_MODULES.put("department", new ModuleMeta("Phòng ban", "Department", "P", "#8b5cf6", 17));
        KNOWN_MODULES.put("position", new ModuleMeta("Chức vụ", "Position", "C", "#3b82f6", 18));
    }

    private static final List<String> DEFAULT_PERMISSIONS = List.of(
            "user:create", "user:read", "user:update", "user:delete", "user:import",
            "branch:create", "branch:read", "branch:update", "branch:delete",
            "product:create", "product:read", "product:update", "product:delete", "product:import",
            "category:create", "category:read", "category:update", "category:delete",
            "supplier:create", "supplier:read", "supplier:update", "supplier:delete",
            "warehouse:create", "warehouse:read", "warehouse:update", "warehouse:delete",
            "purchase:create", "purchase:read", "purchase:update", "purchase:delete", "purchase:approve",
            "transfer:create", "transfer:read", "transfer:update", "transfer:delete", "transfer:approve",
            "stocktake:create", "stocktake:read", "stocktake:update", "stocktake:delete", "stocktake:approve",
            "order:create", "order:read", "order:update", "order:delete", "order:export",
            "attendance:create", "attendance:read", "attendance:update", "attendance:delete", "attendance:approve",
            "payroll:create", "payroll:read", "payroll:update", "payroll:delete", "payroll:approve",
            "cashbook:create", "cashbook:read", "cashbook:update", "cashbook:export",
            "report:read", "report:export",
            "role:create", "role:read", "role:update", "role:delete", "role:assign",
            "candidate_cv:download", "candidate_cv:upload",
            "department:create", "department:read", "department:update", "department:delete",
            "position:create", "position:read", "position:update", "position:delete"
    );

    @Override
    public void syncIfNeeded() {
        long now = System.currentTimeMillis();
        if (now - lastSyncAt < SYNC_TTL_MILLIS) {
            return;
        }
        if (syncLock.tryLock()) {
            try {
                if (System.currentTimeMillis() - lastSyncAt >= SYNC_TTL_MILLIS) {
                    syncPermissions();
                }
            } catch (Exception e) {
                log.warn("Auto sync permissions gặp lỗi (best-effort): {}", e.getMessage());
            } finally {
                syncLock.unlock();
            }
        }
    }

    @Override
    @Transactional
    public PermissionSyncResult syncPermissions() {
        syncLock.lock();
        try {
            log.info("Bắt đầu đồng bộ danh mục Module và Permission hệ thống...");
            int createdModules = 0;
            int createdPermissions = 0;

            // 1. Quét controller lấy @PreAuthorize expressions
            Set<String> scannedKeys = new LinkedHashSet<>(DEFAULT_PERMISSIONS);
            try {
                Map<String, Object> controllers = applicationContext.getBeansWithAnnotation(RestController.class);
                controllers.putAll(applicationContext.getBeansWithAnnotation(Controller.class));
                for (Object bean : controllers.values()) {
                    Class<?> targetClass = bean.getClass();
                    for (Method method : targetClass.getDeclaredMethods()) {
                        PreAuthorize preAuth = method.getAnnotation(PreAuthorize.class);
                        if (preAuth != null && preAuth.value() != null) {
                            Matcher m = PRE_AUTH_STRING_PATTERN.matcher(preAuth.value());
                            while (m.find()) {
                                String token = m.group(1);
                                if (PERMISSION_KEY_PATTERN.matcher(token).matches()) {
                                    scannedKeys.add(token.toLowerCase());
                                }
                            }
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Không thể quét reflection @PreAuthorize: {}", e.getMessage());
            }

            // 2. Tìm hoặc tạo Role ADMIN
            VaiTro adminRole = vaiTroRepository.findByTenVaiTro("ADMIN").orElseGet(() -> {
                VaiTro admin = VaiTro.builder()
                        .maVaiTro("NQ01")
                        .tenVaiTro("ADMIN")
                        .moTa("Quản trị viên toàn hệ thống")
                        .status(RecordStatus.ACTIVE)
                        .build();
                return vaiTroRepository.save(admin);
            });

            // 3. Khởi tạo / cập nhật Module
            for (Map.Entry<String, ModuleMeta> entry : KNOWN_MODULES.entrySet()) {
                String modCode = entry.getKey();
                ModuleMeta meta = entry.getValue();
                if (!moduleRepository.existsByName(modCode)) {
                    Module newMod = Module.builder()
                            .name(modCode)
                            .displayNameVi(meta.vi())
                            .displayNameEn(meta.en())
                            .icon(meta.icon())
                            .color(meta.color())
                            .thuTu(meta.order())
                            .status(RecordStatus.ACTIVE)
                            .build();
                    moduleRepository.save(newMod);
                    createdModules++;
                }
            }

            // 4. Khởi tạo / cập nhật Permissions
            for (String key : scannedKeys) {
                if (!permissionRepository.existsByName(key)) {
                    String[] parts = key.split(":");
                    String mod = parts[0];
                    String action = parts[1];

                    ModuleMeta meta = KNOWN_MODULES.getOrDefault(mod, new ModuleMeta(mod, mod, mod.substring(0, 1).toUpperCase(), "#64748b", 99));

                    // Nếu module phát sinh chưa có trong DB thì tạo
                    if (!moduleRepository.existsByName(mod)) {
                        Module newMod = Module.builder()
                                .name(mod)
                                .displayNameVi(meta.vi())
                                .displayNameEn(meta.en())
                                .icon(meta.icon())
                                .color(meta.color())
                                .thuTu(meta.order())
                                .status(RecordStatus.ACTIVE)
                                .build();
                        moduleRepository.save(newMod);
                        createdModules++;
                    }

                    String nameVi = generateDisplayNameVi(action, meta.vi());
                    String nameEn = generateDisplayNameEn(action, meta.en());

                    Permission p = Permission.builder()
                            .name(key)
                            .displayNameVi(nameVi)
                            .displayNameEn(nameEn)
                            .description(nameVi + " (" + key + ")")
                            .module(meta.vi())
                            .status(RecordStatus.ACTIVE)
                            .build();
                    Permission saved = permissionRepository.save(p);
                    createdPermissions++;

                    // Gán tự động cho Admin
                    RolePermissionId rpId = new RolePermissionId(adminRole.getId(), saved.getId());
                    if (!rolePermissionRepository.existsById(rpId)) {
                        RolePermission rp = new RolePermission(rpId);
                        rp.setVaiTro(adminRole);
                        rp.setPermission(saved);
                        rp.setNguoiGan("SYSTEM_SYNC");
                        rolePermissionRepository.save(rp);
                    }
                }
            }

            lastSyncAt = System.currentTimeMillis();
            long total = permissionRepository.count();
            log.info("Đồng bộ hoàn tất! Tạo mới {} modules, {} permissions. Tổng số: {}", createdModules, createdPermissions, total);

            return PermissionSyncResult.builder()
                    .createdModules(createdModules)
                    .createdPermissions(createdPermissions)
                    .totalPermissions((int) total)
                    .build();
        } finally {
            syncLock.unlock();
        }
    }

    private String generateDisplayNameVi(String action, String moduleVi) {
        return switch (action.toLowerCase()) {
            case "create" -> "Tạo " + moduleVi.toLowerCase();
            case "read" -> "Xem " + moduleVi.toLowerCase();
            case "update" -> "Cập nhật " + moduleVi.toLowerCase();
            case "delete" -> "Xoá " + moduleVi.toLowerCase();
            case "import" -> "Import " + moduleVi.toLowerCase();
            case "export" -> "Export " + moduleVi.toLowerCase();
            case "approve" -> "Duyệt " + moduleVi.toLowerCase();
            case "assign" -> "Phân quyền " + moduleVi.toLowerCase();
            case "manage" -> "Quản trị " + moduleVi.toLowerCase();
            default -> action + " " + moduleVi.toLowerCase();
        };
    }

    private String generateDisplayNameEn(String action, String moduleEn) {
        String actCap = action.substring(0, 1).toUpperCase() + action.substring(1).toLowerCase();
        return actCap + " " + moduleEn.toLowerCase();
    }
}
