package caps.fmds.item.Request;


import lombok.Data;

import java.util.List;

@Data
public class CustomRequest {
    private Long userListId;
    private List<UserCustomRequest> components;

}
