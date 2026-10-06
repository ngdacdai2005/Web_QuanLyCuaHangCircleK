package com.erp.cuahangtienloi.controller;

import com.erp.cuahangtienloi.dto.HoaDonDTO;
import com.erp.cuahangtienloi.dto.SoQuyDTO;
import com.erp.cuahangtienloi.entity.HoaDon;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.SoQuy;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import com.erp.cuahangtienloi.service.BranchAccessService;
import com.erp.cuahangtienloi.service.HoaDonService;
import com.erp.cuahangtienloi.service.SoQuyService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class CriticalFlowRegressionTest {

    @Test
    void createsGlobalCapitalReceiptAndDelegatesToService() {
        SoQuyService soQuyService = mock(SoQuyService.class);
        BranchAccessService branchAccessService = mock(BranchAccessService.class);
        NhanVienRepository nhanVienRepository = mock(NhanVienRepository.class);

        SoQuyController controller = new SoQuyController(
                soQuyService,
                branchAccessService,
                nhanVienRepository
        );

        UUID creatorId = UUID.randomUUID();

        SoQuy request = new SoQuy();
        request.setIdChiNhanh(null);
        request.setIdNguoiTao(creatorId);
        request.setDirection("RECEIPT");
        request.setHangMuc("CAP_VON");
        request.setHinhThucTt("CARD");
        request.setSoTien(new BigDecimal("1000000"));

        SoQuyDTO expected = new SoQuyDTO();
        expected.setRunningBalance(new BigDecimal("1000000"));

        when(soQuyService.create(request, null)).thenReturn(expected);

        var response = controller.create(
                request,
                mock(HttpServletRequest.class)
        );

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(expected, response.getBody());

        verify(soQuyService).create(request, null);
        verifyNoInteractions(branchAccessService);
    }

    @Test
    void invoiceCreateDelegatesToHoaDonService() {
        HoaDonService hoaDonService = mock(HoaDonService.class);
        NhanVienRepository nhanVienRepository = mock(NhanVienRepository.class);

        HoaDonController controller = new HoaDonController(
                hoaDonService,
                nhanVienRepository
        );

        UUID branchId = UUID.randomUUID();

        HoaDon request = invoice(
                branchId,
                "CASH",
                new BigDecimal("100000")
        );
        request.setTienKhachDua(new BigDecimal("100000"));

        when(hoaDonService.create(request)).thenReturn(null);

        var response = controller.create(request);

        assertEquals(HttpStatus.OK, response.getStatusCode());

        verify(hoaDonService).create(request);
    }

    @Test
    void invoiceCreateAcceptsDatabasePaymentMethodsThroughService() {
        HoaDonService hoaDonService = mock(HoaDonService.class);
        NhanVienRepository nhanVienRepository = mock(NhanVienRepository.class);

        HoaDonController controller = new HoaDonController(
                hoaDonService,
                nhanVienRepository
        );

        UUID branchId = UUID.randomUUID();

        for (String method : List.of(
                "CASH",
                "CARD",
                "MOMO",
                "ZALOPAY",
                "VNPAY",
                "BANK_TRANSFER"
        )) {
            HoaDon request = invoice(
                    branchId,
                    method,
                    new BigDecimal("100000")
            );

            if ("CASH".equals(method)) {
                request.setTienKhachDua(new BigDecimal("100000"));
            }

            when(hoaDonService.create(request)).thenReturn(null);

            var response = controller.create(request);

            assertEquals(
                    HttpStatus.OK,
                    response.getStatusCode(),
                    method
            );

            verify(hoaDonService).create(request);
        }
    }

    @Test
    void refundDelegatesToHoaDonServiceWithAuthenticatedEmployee() {
        HoaDonService hoaDonService = mock(HoaDonService.class);
        NhanVienRepository nhanVienRepository = mock(NhanVienRepository.class);

        HoaDonController controller = new HoaDonController(
                hoaDonService,
                nhanVienRepository
        );

        UUID employeeId = UUID.randomUUID();
        UUID invoiceId = UUID.randomUUID();

        NhanVien employee = new NhanVien();
        employee.setId(employeeId);

        HttpServletRequest request = mock(HttpServletRequest.class);

        when(request.getAttribute("authenticatedIdNhanVien"))
                .thenReturn(employeeId.toString());

        when(nhanVienRepository.findById(employeeId))
                .thenReturn(Optional.of(employee));

        HoaDonDTO expected = new HoaDonDTO();

        when(hoaDonService.refund(
                eq(invoiceId),
                eq("Khách yêu cầu hoàn tiền"),
                eq(employee)
        )).thenReturn(expected);

        var response = controller.refund(
                invoiceId,
                new HoaDonController.RefundRequest("Khách yêu cầu hoàn tiền"),
                request
        );

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(expected, response.getBody());

        verify(hoaDonService).refund(
                invoiceId,
                "Khách yêu cầu hoàn tiền",
                employee
        );
    }

    private HoaDon invoice(
            UUID branchId,
            String method,
            BigDecimal total
    ) {
        HoaDon request = new HoaDon();
        request.setIdChiNhanh(branchId);
        request.setHinhThucTt(method);
        request.setGrandTotal(total);
        return request;
    }
}