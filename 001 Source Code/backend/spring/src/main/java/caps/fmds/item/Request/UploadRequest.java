package caps.fmds.item.Request;

import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class UploadRequest {
    private String modelType;
    private List<Map<String,Object>> data;
    private String uploadBy;
}
