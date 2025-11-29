package caps.fmds.item.Request;

import lombok.Data;
import java.time.LocalDate;

@Data
public class PatientUpdateRequest {
    private String name;                  // 이름
    private Boolean active;               // 활성화 여부
    private LocalDate birthDate;          // 생년월일
    private String phone;                 // 개인 연락처
    private String emergencyPhone;        // 비상연락처
    private String emergencyContact;      // 보호자 이름 또는 관계
}
