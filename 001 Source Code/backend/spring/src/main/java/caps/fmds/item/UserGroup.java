//package caps.fmds.item;
//
//import com.fasterxml.jackson.annotation.JsonIgnore;
//import jakarta.persistence.*;
//import lombok.AllArgsConstructor;
//import lombok.Data;
//import lombok.NoArgsConstructor;
//import lombok.ToString;
//
//import java.util.ArrayList;
//import java.util.List;
//
//@Data
//@Entity
//@NoArgsConstructor
//@AllArgsConstructor
//@Table(name = "user_group")
//public class UserGroup {
//    @Id
//    @GeneratedValue(strategy = GenerationType.IDENTITY)
//    private Long id;
//
//    @Column(unique = true)
//    private String name;
//
//    @OneToMany(mappedBy = "userGroup", cascade = CascadeType.ALL, orphanRemoval = true)
//    @ToString.Exclude
//    @JsonIgnore
//    private List<User> users = new ArrayList<>();
//
//
//}
