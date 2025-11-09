package caps.fmds.item;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "patient")
public class Patient {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "patient_id")
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "active")
    private Boolean active = true;

    @Column(name = "qr_code_value", unique = true)
    private String qrCodeValue;   // 예: abs://patient/{id}

    @Column(name = "qr_code_url")
    private String qrCodeUrl;     // 예: http://localhost:8080/qr/patient_{id}.png

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(name = "phone", length = 30)
    private String phone;

    @Column(name = "emergency_phone", length = 30)
    private String emergencyPhone;

    @Column(name = "emergency_contact", length = 100)
    private String emergencyContact;

}