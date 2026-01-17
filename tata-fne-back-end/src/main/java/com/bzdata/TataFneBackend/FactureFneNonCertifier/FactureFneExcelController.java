package com.bzdata.TataFneBackend.FactureFneNonCertifier;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("fne/excel")
@Tag(name = "Facture FNE Excel", description = "Lecture des fichiers Excel FNE")
@RequiredArgsConstructor
public class FactureFneExcelController {

    private final FactureFneService factureFneService;

    @PostMapping(value = "/read", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ExcelReadResult> readExcel(@RequestPart("file") MultipartFile file) throws IOException {
        ExcelReadResult readResult = readExcelInternal(file);
        return ResponseEntity.ok(readResult);
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ExcelImportResult> importExcel(@RequestPart("file") MultipartFile file) throws IOException {
        ExcelReadResult readResult = readExcelInternal(file);
        ExcelImportResult importResult = factureFneService.importInvoices(readResult.rows());
        return ResponseEntity.ok(importResult);
    }

    private ExcelReadResult readExcelInternal(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Aucun fichier téléchargé");
        }

        try (InputStream input = file.getInputStream(); Workbook workbook = WorkbookFactory.create(input)) {
            Sheet sheet = workbook.getNumberOfSheets() > 0 ? workbook.getSheetAt(0) : null;
            if (sheet == null) {
                return new ExcelReadResult(List.of(), List.of(), 0);
            }

            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                return new ExcelReadResult(List.of(), List.of(), 0);
            }

            DataFormatter formatter = new DataFormatter();
            List<String> headers = new ArrayList<>();
            int lastCell = Math.max(headerRow.getLastCellNum(), 0);
            for (int col = 0; col < lastCell; col++) {
                String header = formatter.formatCellValue(headerRow.getCell(col));
                headers.add(header == null ? "" : header.trim());
            }

            List<Map<String, String>> rows = new ArrayList<>();
            for (int rowIndex = 1; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null) {
                    continue;
                }
                Map<String, String> rowData = new LinkedHashMap<>();
                boolean hasValue = false;
                for (int col = 0; col < headers.size(); col++) {
                    String header = headers.get(col);
                    if (header.isBlank()) {
                        continue;
                    }
                    String value = formatter.formatCellValue(row.getCell(col));
                    if (value != null && !value.isBlank()) {
                        hasValue = true;
                    }
                    rowData.put(header, value == null ? "" : value);
                }
                if (hasValue) {
                    rows.add(rowData);
                }
            }

            return new ExcelReadResult(headers, rows, rows.size());
        }
    }


}
