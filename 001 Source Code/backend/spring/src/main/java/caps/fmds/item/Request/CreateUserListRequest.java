package caps.fmds.item.Request;


import lombok.Data;

@Data
public class CreateUserListRequest {
    private String name;
    private Long userId;
}
