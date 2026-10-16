package com.erp.cuahangtienloi.config;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class StartupBanner {

    @org.springframework.beans.factory.annotation.Value("${server.port:8089}")
    private int port;

    @EventListener(ApplicationReadyEvent.class)
    public void printStartupBanner() {
        System.out.println();
        System.out.println("=========================================================");
        System.out.println("   🚀 SERVER ĐÃ KHỞI ĐỘNG THÀNH CÔNG! ");
        System.out.println("   🌐 Trạng thái: Sẵn sàng phục vụ");
        System.out.println("   🔌 Cổng (Port): " + port);
        System.out.println("   🔗 Truy cập  : http://localhost:" + port);
        System.out.println("=========================================================");
        System.out.println();
    }
}
