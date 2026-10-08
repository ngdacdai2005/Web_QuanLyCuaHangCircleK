package com.erp.cuahangtienloi.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final long MAX_SIZE = 10L * 1024 * 1024;
    private static final Set<String> ALLOWED_TYPES =
            Set.of("application/pdf", "image/jpeg", "image/png");

    private final Path root;

    public FileStorageService(@Value("${app.storage.contract-dir:uploads/hop-dong}") String dir) {
        this.root = Paths.get(dir).toAbsolutePath().normalize();
    }

    public StoredFile store(MultipartFile file) {
        if (file == null || file.isEmpty()) return null;
        if (file.getSize() > MAX_SIZE)
            throw new IllegalArgumentException("File scan vượt quá dung lượng cho phép (tối đa 10MB)");
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType.toLowerCase(Locale.ROOT)))
            throw new IllegalArgumentException("Chỉ chấp nhận file PDF hoặc ảnh (JPG/PNG)");
        try {
            Files.createDirectories(root);
            String original = sanitize(file.getOriginalFilename());
            String name = UUID.randomUUID() + "_" + System.currentTimeMillis() + "_" + original;
            Files.copy(file.getInputStream(), root.resolve(name), StandardCopyOption.REPLACE_EXISTING);
            return new StoredFile(name, original, contentType, file.getSize());
        } catch (IOException e) {
            throw new IllegalStateException("Không thể lưu file scan", e);
        }
    }

    public Resource load(String duongDan) {
        try {
            Path file = root.resolve(duongDan).normalize();
            if (!file.startsWith(root) || !Files.exists(file)) return null;
            return new UrlResource(file.toUri());
        } catch (IOException e) {
            return null;
        }
    }

    public void delete(String duongDan) {
        try {
            if (duongDan == null || duongDan.isBlank()) return;
            Path file = root.resolve(duongDan).normalize();
            if (file.startsWith(root)) Files.deleteIfExists(file);
        } catch (IOException ignored) { }
    }

    private String sanitize(String name) {
        if (name == null) return "file";
        return name.replaceAll("[^A-Za-z0-9._ -]", "_");
    }

    public record StoredFile(String duongDan, String tenGoc, String loai, long kichThuoc) {}
}