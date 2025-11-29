package caps.fmds.Controller;

import org.apache.poi.ss.usermodel.*;
import java.io.InputStream;
import java.util.*;

public class ExcelParser {

    public static List<Map<String, Object>> parse(InputStream inputStream) throws Exception {
        List<Map<String, Object>> result = new ArrayList<>();

        Workbook workbook = WorkbookFactory.create(inputStream);
        Sheet sheet = workbook.getSheetAt(0);
        Row header = sheet.getRow(0);

        for (int i = 1; i <= sheet.getLastRowNum(); i++) {
            Row row = sheet.getRow(i);
            Map<String, Object> rowMap = new LinkedHashMap<>();

            for (int j = 0; j < header.getLastCellNum(); j++) {
                Cell keyCell = header.getCell(j);
                Cell valueCell = row.getCell(j);

                String key = keyCell.getStringCellValue();
                Object value = getCellValue(valueCell);

                rowMap.put(key, value);
            }

            result.add(rowMap);
        }

        return result;
    }

    private static Object getCellValue(Cell cell) {
        if (cell == null) return null;

        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> cell.getNumericCellValue();
            case BOOLEAN -> cell.getBooleanCellValue();
            default -> null;
        };
    }
}