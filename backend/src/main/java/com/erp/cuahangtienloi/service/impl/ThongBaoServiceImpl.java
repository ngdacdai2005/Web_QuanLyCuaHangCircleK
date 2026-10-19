package com.erp.cuahangtienloi.service.impl;

import com.erp.cuahangtienloi.dto.response.ThongBaoDTO;
import com.erp.cuahangtienloi.entity.ThongBao;
import com.erp.cuahangtienloi.repository.ThongBaoRepository;
import com.erp.cuahangtienloi.service.ThongBaoService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ThongBaoServiceImpl implements ThongBaoService {

    private final ThongBaoRepository thongBaoRepository;

    @Override
    @Transactional(readOnly = true)
    public List<ThongBaoDTO> getNotifications(Boolean unreadOnly, String loai) {
        List<ThongBao> list;
        boolean filterLoai = loai != null && !loai.isBlank() && !"ALL".equalsIgnoreCase(loai);

        if (Boolean.TRUE.equals(unreadOnly)) {
            if (filterLoai) {
                list = thongBaoRepository.findByLoaiThongBaoAndDaDocFalseOrderByNgayTaoDesc(loai.trim().toUpperCase());
            } else {
                list = thongBaoRepository.findByDaDocFalseOrderByNgayTaoDesc();
            }
        } else {
            if (filterLoai) {
                list = thongBaoRepository.findByLoaiThongBaoOrderByNgayTaoDesc(loai.trim().toUpperCase());
            } else {
                list = thongBaoRepository.findAllByOrderByNgayTaoDesc();
            }
        }

        return list.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public long countUnread() {
        return thongBaoRepository.countByDaDocFalse();
    }

    @Override
    @Transactional
    public ThongBaoDTO markAsRead(Long id) {
        ThongBao tb = thongBaoRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy thông báo id: " + id));

        if (!Boolean.TRUE.equals(tb.getDaDoc())) {
            tb.setDaDoc(true);
            tb.setNgayDoc(LocalDateTime.now());
            tb = thongBaoRepository.save(tb);
        }

        return mapToDTO(tb);
    }

    @Override
    @Transactional
    public void markAllAsRead() {
        thongBaoRepository.markAllAsRead();
    }

    @Override
    @Transactional
    public ThongBaoDTO createNotification(ThongBao thongBao) {
        if (thongBao.getNgayTao() == null) {
            thongBao.setNgayTao(LocalDateTime.now());
        }
        if (thongBao.getDaDoc() == null) {
            thongBao.setDaDoc(false);
        }
        ThongBao saved = thongBaoRepository.save(thongBao);
        return mapToDTO(saved);
    }

    @Override
    @Transactional
    public void deleteNotification(Long id) {
        if (!thongBaoRepository.existsById(id)) {
            throw new NoSuchElementException("Không tìm thấy thông báo id: " + id);
        }
        thongBaoRepository.deleteById(id);
    }

    private ThongBaoDTO mapToDTO(ThongBao tb) {
        return ThongBaoDTO.builder()
                .id(tb.getId())
                .tieuDe(tb.getTieuDe())
                .noiDung(tb.getNoiDung())
                .loaiThongBao(tb.getLoaiThongBao())
                .actionUrl(tb.getActionUrl())
                .mucDo(tb.getMucDo())
                .nguoiGuiTen(tb.getNguoiGuiTen())
                .idNhanVienNhan(tb.getIdNhanVienNhan())
                .daDoc(tb.getDaDoc())
                .ngayTao(tb.getNgayTao())
                .ngayDoc(tb.getNgayDoc())
                .build();
    }
}
