package caps.fmds.Service.DataService;

import caps.fmds.item.DataModel;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

public interface DataService {
    int uploadExcelAndSaveToMongo(MultipartFile file) throws Exception;
    List<DataModel> getAllByModelType(String modelType);
    DataModel getById(String modelType, String id);
    List<String> getAllModelTypes();
    DataModel createData(DataModel request);
    void updateData(String modelType, String id, Map<String, Object> updateFields);
    void deleteData(String modelType, String id);
}
