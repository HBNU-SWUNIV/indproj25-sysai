package caps.fmds.Service.Patient;

import caps.fmds.item.Patient;
import caps.fmds.item.Request.PatientRequest;
import caps.fmds.item.Request.PatientUpdateRequest;

import java.util.List;
import java.util.Optional;

public interface PatientService {
    Patient createPatient(PatientRequest request);
    Optional<Patient> getPatient(Long id);
    List<Patient> listPatients();
    void deletePatient(Long id);
    Patient updatePatient(Long id, PatientUpdateRequest request);
}