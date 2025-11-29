package caps.fmds.item;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Map;
import java.util.Objects;

@Document(collection = "Data")
@Data
public class DataModel {

    @Id
    private String id;

    private String modelType;

    private Map<String, Object> fields;

    private Long createdAt;
    private String createdBy;



}
