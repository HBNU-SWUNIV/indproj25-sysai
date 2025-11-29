package caps.fmds.item.Request;

import lombok.Data;

@Data
public class UserUpdateRequest {
    private String name;
    private Boolean admin;

    private String role;
    private String email;
    private String phone;
}