package caps.fmds.item.Request;

import lombok.Data;

import java.util.Map;

@Data
public class UserCustomRequest {
    private int componentId;

    private Double x;
    private Double y;
    private Double width;
    private Double height;

    private Map<String, Object> query;

    private Long userListId;
}
