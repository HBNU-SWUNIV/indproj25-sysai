package caps.fmds.item;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Map;

@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "user_custom")
public class UserCustom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private int componentId;

    private Double x;
    private Double y;
    private Double width;
    private Double height;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> query;


    @ToString.Exclude // 양방향 관계 순환 방지
    @ManyToOne
    @JoinColumn(name = "user_list_id", nullable = false)
    private UserList userList;

}
