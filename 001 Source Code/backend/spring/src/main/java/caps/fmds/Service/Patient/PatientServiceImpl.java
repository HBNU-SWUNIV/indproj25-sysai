package caps.fmds.Service.Patient;

import caps.fmds.Repository.PatientRepository;
import caps.fmds.item.Patient;
import caps.fmds.item.Request.PatientRequest;

import caps.fmds.item.Request.PatientUpdateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PatientServiceImpl implements PatientService {

    private final PatientRepository patientRepository;
    private final QrCodeService qr;

    @Override
    @Transactional(rollbackFor = Exception.class) // ★ 예외 발생 시 전체 롤백
    public Patient createPatient(PatientRequest request) {
        // 0) 유효성
        patientRepository.findByName(request.getName()).ifPresent(p -> {
            throw new IllegalArgumentException("이미 존재하는 환자 이름입니다 => " + request.getName());
        });

        // 1) 우선 INSERT 해서 ID 확보 (IDENTITY 전략이면 save만으로도 insert 수행됨)
        Patient p = new Patient();
        p.setName(request.getName());
        p.setActive(request.getActive() != null ? request.getActive() : true);

        // ID가 바로 필요하면 saveAndFlush가 더 확실
        p = patientRepository.saveAndFlush(p);

        // 2) QR 생성 (여기서 실패하면 반드시 런타임 예외로 올려서 트랜잭션 롤백)
        try {
            String value = qr.buildValue("patient", p.getId());
            String url   = qr.generatePng("patient", p.getId());
            p.setQrCodeValue(value);
            p.setQrCodeUrl(url);

            // 3) QR 정보까지 반영해서 UPDATE
            return patientRepository.save(p);

        } catch (Exception e) {
            // (선택) 부분적으로 생성된 파일 정리 로직이 필요하면 여기서 처리 가능
            // Files.deleteIfExists(...)

            // ★ 반드시 런타임 예외로 던져서 롤백되게 한다
            throw new IllegalStateException("QR 코드 생성 실패", e);
        }
    }
    @Override
    public Optional<Patient> getPatient(Long id) {
        return patientRepository.findById(id);
    }

    @Override
    public List<Patient> listPatients() {
        return patientRepository.findAll();
    }

    @Override
    @Transactional
    public void deletePatient(Long id) {
        patientRepository.deleteById(id);
    }

    @Override
    @Transactional
    public Patient updatePatient(Long id, PatientUpdateRequest request) {
        Patient patient = patientRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("해당 환자를 찾을 수 없습니다."));

        if (request.getName() != null) patient.setName(request.getName());
        if (request.getActive() != null) patient.setActive(request.getActive());
        if (request.getBirthDate() != null) patient.setBirthDate(request.getBirthDate());
        if (request.getPhone() != null) patient.setPhone(request.getPhone());
        if (request.getEmergencyPhone() != null) patient.setEmergencyPhone(request.getEmergencyPhone());
        if (request.getEmergencyContact() != null) patient.setEmergencyContact(request.getEmergencyContact());

        return patientRepository.save(patient);
    }

}