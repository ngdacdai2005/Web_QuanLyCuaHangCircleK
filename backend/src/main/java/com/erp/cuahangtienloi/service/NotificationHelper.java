package com.erp.cuahangtienloi.service;

import com.erp.cuahangtienloi.entity.*;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import com.erp.cuahangtienloi.repository.ThongBaoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationHelper {

    private final ThongBaoRepository thongBaoRepository;
    private final NhanVienRepository nhanVienRepository;
    private final ChiNhanhRepository chiNhanhRepository;

    public void sendSafe(ThongBao tb) {
        try {
            if (tb.getNgayTao() == null) {
                tb.setNgayTao(LocalDateTime.now());
            }
            if (tb.getDaDoc() == null) {
                tb.setDaDoc(false);
            }
            if (tb.getMucDo() == null) {
                tb.setMucDo("INFO");
            }
            thongBaoRepository.save(tb);
        } catch (Exception ex) {
            log.warn("Không thể lưu thông báo: {}", ex.getMessage());
        }
    }

    private String getEmployeeName(UUID id) {
        if (id == null) return "Hệ thống";
        return nhanVienRepository.findById(id)
                .map(NhanVien::getHoTen)
                .orElse("Hệ thống");
    }

    private String getBranchName(UUID id) {
        if (id == null) return "Cửa hàng";
        return chiNhanhRepository.findById(id)
                .map(ChiNhanh::getTenChiNhanh)
                .orElse("Cửa hàng");
    }

    // ==========================================
    // 1. HỢP ĐỒNG (HOP_DONG)
    // ==========================================
    public void notifyContractSubmitted(HopDong hd, UUID actorId) {
        String actorName = getEmployeeName(actorId);
        sendSafe(ThongBao.builder()
                .tieuDe("Hợp đồng mới cần phê duyệt: " + hd.getMaHopDong())
                .noiDung("Hợp đồng '" + hd.getTenHopDong() + "' đã được gửi trình duyệt bởi " + actorName + " (chờ phê duyệt).")
                .loaiThongBao("HOP_DONG")
                .mucDo("INFO")
                .actionUrl("/hop-dong")
                .nguoiGuiTen(actorName)
                .build());
    }

    public void notifyContractApproved(HopDong hd, UUID actorId) {
        String approverName = getEmployeeName(actorId);
        // Gửi thông báo trực tiếp cho người tạo hợp đồng
        if (hd.getNguoiTao() != null) {
            sendSafe(ThongBao.builder()
                    .tieuDe("Hợp đồng đã được duyệt: " + hd.getMaHopDong())
                    .noiDung("Hợp đồng '" + hd.getTenHopDong() + "' đã được phê duyệt bởi " + approverName + ". Bảng giá cam kết đã bắt đầu có hiệu lực.")
                    .loaiThongBao("HOP_DONG")
                    .mucDo("INFO")
                    .actionUrl("/hop-dong")
                    .nguoiGuiTen(approverName)
                    .idNhanVienNhan(hd.getNguoiTao())
                    .build());
        }
        // Gửi thông báo chung trên hệ thống
        sendSafe(ThongBao.builder()
                .tieuDe("Hợp đồng đã có hiệu lực: " + hd.getMaHopDong())
                .noiDung("Hợp đồng '" + hd.getTenHopDong() + "' đã được phê duyệt thành công bởi " + approverName + ".")
                .loaiThongBao("HOP_DONG")
                .mucDo("INFO")
                .actionUrl("/hop-dong")
                .nguoiGuiTen(approverName)
                .build());
    }

    public void notifyContractRejected(HopDong hd, String lyDo, UUID actorId) {
        String rejecterName = getEmployeeName(actorId);
        sendSafe(ThongBao.builder()
                .tieuDe("Hợp đồng bị từ chối: " + hd.getMaHopDong())
                .noiDung("Hợp đồng '" + hd.getTenHopDong() + "' bị từ chối bởi " + rejecterName + ". Lý do: " + lyDo)
                .loaiThongBao("HOP_DONG")
                .mucDo("WARNING")
                .actionUrl("/hop-dong")
                .nguoiGuiTen(rejecterName)
                .idNhanVienNhan(hd.getNguoiTao())
                .build());
    }

    // ==========================================
    // 2. NHẬP KHO / ĐƠN ĐẶT HÀNG NCC (KHO_HANG)
    // ==========================================
    public void notifyPurchaseOrderCreated(PhieuNhap pn, String supplierName, String actorName) {
        sendSafe(ThongBao.builder()
                .tieuDe("Đơn nhập kho mới: " + pn.getMaPhieu())
                .noiDung("Đơn đặt hàng nhập kho từ nhà cung cấp " + (supplierName != null ? supplierName : "") + " đã được lập bởi " + actorName + " (chờ xác nhận/duyệt).")
                .loaiThongBao("KHO_HANG")
                .mucDo("INFO")
                .actionUrl("/purchase-orders")
                .nguoiGuiTen(actorName)
                .idChiNhanh(pn.getIdChiNhanh())
                .build());
    }

    public void notifyPurchaseOrderApproved(PhieuNhap pn, String approverName) {
        sendSafe(ThongBao.builder()
                .tieuDe("Đơn nhập kho đã được duyệt: " + pn.getMaPhieu())
                .noiDung("Đơn nhập " + pn.getMaPhieu() + " đã được phê duyệt bởi " + approverName + ", sẵn sàng kiểm nhận hàng vào kho.")
                .loaiThongBao("KHO_HANG")
                .mucDo("INFO")
                .actionUrl("/purchase-orders")
                .nguoiGuiTen(approverName)
                .idChiNhanh(pn.getIdChiNhanh())
                .build());
    }

    public void notifyPurchaseOrderCompleted(PhieuNhap pn, BigDecimal grandTotal, String receiverName) {
        String totalStr = (grandTotal != null) ? String.format("%,d đ", grandTotal.longValue()) : "0 đ";
        sendSafe(ThongBao.builder()
                .tieuDe("Nhập kho hoàn tất: " + pn.getMaPhieu())
                .noiDung("Đã hoàn tất kiểm nhận đơn hàng " + pn.getMaPhieu() + " bởi " + receiverName + ". Tổng giá trị: " + totalStr + ".")
                .loaiThongBao("KHO_HANG")
                .mucDo("INFO")
                .actionUrl("/purchase-orders")
                .nguoiGuiTen(receiverName)
                .idChiNhanh(pn.getIdChiNhanh())
                .build());
    }

    // ==========================================
    // 3. KIỂM KÊ KHO (KIEM_KE)
    // ==========================================
    public void notifyStocktakeSubmitted(PhieuKiemKe pkk, String actorName) {
        String branchName = getBranchName(pkk.getIdChiNhanh());
        sendSafe(ThongBao.builder()
                .tieuDe("Phiếu kiểm kê chờ cân bằng: " + pkk.getMaPhieu())
                .noiDung("Phiếu kiểm kê tại " + branchName + " đã hoàn tất kiểm đếm và gửi trình duyệt cân bằng bởi " + actorName + ".")
                .loaiThongBao("KIEM_KE")
                .mucDo("WARNING")
                .actionUrl("/stocktakes")
                .nguoiGuiTen(actorName)
                .idChiNhanh(pkk.getIdChiNhanh())
                .build());
    }

    public void notifyStocktakeBalanced(PhieuKiemKe pkk, String balancerName) {
        String branchName = getBranchName(pkk.getIdChiNhanh());
        sendSafe(ThongBao.builder()
                .tieuDe("Cân bằng kiểm kê hoàn tất: " + pkk.getMaPhieu())
                .noiDung("Phiếu kiểm kê " + pkk.getMaPhieu() + " tại " + branchName + " đã được cân bằng kho bởi " + balancerName + ". Tồn kho đã được đồng bộ.")
                .loaiThongBao("KIEM_KE")
                .mucDo("INFO")
                .actionUrl("/stocktakes")
                .nguoiGuiTen(balancerName)
                .idChiNhanh(pkk.getIdChiNhanh())
                .build());
    }

    // ==========================================
    // 4. LUÂN CHUYỂN KHO (KHO_HANG / transfers)
    // ==========================================
    public void notifyTransferShipped(PhieuXuatKho pxk, String actorName) {
        String fromBranch = getBranchName(pxk.getIdChiNhanhXuat());
        String toBranch = getBranchName(pxk.getIdChiNhanhNhan());
        sendSafe(ThongBao.builder()
                .tieuDe("Hàng luân chuyển đang đến: " + pxk.getMaPhieu())
                .noiDung("Lô hàng chuyển kho từ " + fromBranch + " đã xuất đi, đang trên đường đến " + toBranch + " (người xuất: " + actorName + ").")
                .loaiThongBao("KHO_HANG")
                .mucDo("INFO")
                .actionUrl("/transfers")
                .nguoiGuiTen(actorName)
                .idChiNhanh(pxk.getIdChiNhanhNhan())
                .build());
    }

    public void notifyTransferCompleted(PhieuXuatKho pxk, String receiverName) {
        String fromBranch = getBranchName(pxk.getIdChiNhanhXuat());
        String toBranch = getBranchName(pxk.getIdChiNhanhNhan());
        sendSafe(ThongBao.builder()
                .tieuDe("Nhận hàng chuyển kho thành công: " + pxk.getMaPhieu())
                .noiDung("Chi nhánh " + toBranch + " đã kiểm nhận xong lô hàng chuyển kho " + pxk.getMaPhieu() + " từ " + fromBranch + " (người nhận: " + receiverName + ").")
                .loaiThongBao("KHO_HANG")
                .mucDo("INFO")
                .actionUrl("/transfers")
                .nguoiGuiTen(receiverName)
                .idChiNhanh(pxk.getIdChiNhanhXuat())
                .build());
    }

    // ==========================================
    // 5. CA LÀM VIỆC & CHẤM CÔNG (LICH_LAM)
    // ==========================================
    public void notifyShiftScheduled(UUID idNhanVien, LocalDate workDate, String caLamViec, String assignerName) {
        sendSafe(ThongBao.builder()
                .tieuDe("Phân ca làm việc mới: " + workDate)
                .noiDung("Bạn đã được xếp ca làm '" + (caLamViec != null ? caLamViec : "Mặc định") + "' vào ngày " + workDate + " bởi " + assignerName + ".")
                .loaiThongBao("LICH_LAM")
                .mucDo("INFO")
                .actionUrl("/attendance")
                .nguoiGuiTen(assignerName)
                .idNhanVienNhan(idNhanVien)
                .build());
    }
}
