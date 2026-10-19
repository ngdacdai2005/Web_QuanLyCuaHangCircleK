package com.erp.cuahangtienloi.seeder;

import com.erp.cuahangtienloi.service.PermissionSyncService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(10)
@RequiredArgsConstructor
public class PermissionSyncRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(PermissionSyncRunner.class);
    private final PermissionSyncService permissionSyncService;

    @Override
    public void run(ApplicationArguments args) {
        int maxRetries = 5;
        int delaySeconds = 3;

        for (int i = 1; i <= maxRetries; i++) {
            try {
                log.info("Thực hiện tự động đồng bộ quyền hệ thống khi khởi động (Lần thử {}/{})...", i, maxRetries);
                permissionSyncService.syncPermissions();
                return;
            } catch (Exception e) {
                log.warn("Đồng bộ quyền lần {} thất bại: {}. Đợi {}s để thử lại...", i, e.getMessage(), delaySeconds);
                try {
                    Thread.sleep(delaySeconds * 1000L);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    return;
                }
            }
        }
        log.warn("Không thể đồng bộ quyền tự động lúc khởi động sau {} lần thử. Hệ thống sẽ đồng bộ theo cơ chế on-demand.", maxRetries);
    }
}
