package caps.fmds.item.Request;

import lombok.Data;

import java.time.LocalDate;

@Data
public class PatientRequest {
    private String name;
    private Boolean active = true;
    private LocalDate birthDate;
    private String phone;
    private String emergencyPhone;
    private String emergencyContact;
}