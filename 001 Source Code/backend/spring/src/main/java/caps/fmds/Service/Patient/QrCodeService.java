package caps.fmds.Service.Patient;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.EnumMap;
import java.util.Map;

@Service
public class QrCodeService {

    @Value("${app.qr.output-dir}")
    private String outputDir;

    @Value("${app.qr.base-url}")
    private String baseUrl;

    public String buildValue(String namespace, Long id) {
        return "abs://" + namespace + "/" + id; // 예: abs://patient/1
    }

    public String buildFileName(String namespace, Long id) {
        return namespace + "_" + id + ".png";   // 예: patient_1.png
    }

    public String generatePng(String namespace, Long id) {
        return generatePng(namespace, id, 320, ErrorCorrectionLevel.M);
    }

    public String generatePng(String namespace, Long id, int size, ErrorCorrectionLevel ecl) {
        try {
            Files.createDirectories(Paths.get(outputDir));

            String value = buildValue(namespace, id);
            String fileName = buildFileName(namespace, id);
            Path out = Paths.get(outputDir).resolve(fileName);

            Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
            hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
            hints.put(EncodeHintType.MARGIN, 1);
            hints.put(EncodeHintType.ERROR_CORRECTION, ecl);

            BitMatrix matrix = new QRCodeWriter()
                    .encode(value, BarcodeFormat.QR_CODE, size, size, hints);

            MatrixToImageWriter.writeToPath(matrix, "PNG", out);

            return baseUrl.endsWith("/") ? (baseUrl + fileName) : (baseUrl + "/" + fileName);
        } catch (WriterException | IOException e) {
            throw new RuntimeException("QR 코드 생성 실패", e);
        }
    }
}