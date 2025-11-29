package caps.fmds.Controller;

import caps.fmds.Service.Patient.PatientService;
import caps.fmds.item.Patient;
import caps.fmds.item.Request.PatientRequest;
import caps.fmds.item.Request.PatientUpdateRequest;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@CrossOrigin("*")
@RequestMapping("/patients")
public class PatientController {

    private final PatientService patientService;

    @PostMapping
    @Operation(summary = "환자 생성 (QR 자동 생성)")
    public ResponseEntity<?> create(@RequestBody PatientRequest request) {
        try {
            return ResponseEntity.ok(patientService.createPatient(request));
        } catch (IllegalArgumentException e) { // 유효성
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IllegalStateException e) {    // QR 실패
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    @GetMapping("/{id}")
    @Operation(summary = "환자 단건 조회")
    public ResponseEntity<?> get(@PathVariable Long id) {
        return patientService.getPatient(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    @Operation(summary = "환자 전체 조회")
    public List<Patient> list() {
        return patientService.listPatients();
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "환자 삭제")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        patientService.deletePatient(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}")
    @Operation(summary = "환자 정보 수정")
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @RequestBody PatientUpdateRequest request) {
        try {
            return ResponseEntity.ok(patientService.updatePatient(id, request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
