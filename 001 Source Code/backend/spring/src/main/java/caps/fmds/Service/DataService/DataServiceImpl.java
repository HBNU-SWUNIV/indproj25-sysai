package caps.fmds.Service.DataService;

import caps.fmds.Controller.ExcelParser;
import caps.fmds.item.DataModel;
import caps.fmds.item.WebSocket.DataWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
public class DataServiceImpl implements DataService{

    private final MongoTemplate mongoTemplate;
    private final DataWebSocketHandler webSocketHandler;

    @Override
    public int uploadExcelAndSaveToMongo(MultipartFile file) throws Exception {
        String filename = file.getOriginalFilename();
        String modelType = filename != null ? filename.replace(".xlsx", "") : "unknown";

        List<Map<String, Object>> rows = ExcelParser.parse(file.getInputStream());

        List<DataModel> saved = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            DataModel model = new DataModel();
            model.setModelType(modelType);
            model.setFields(row);
            model.setCreatedAt(System.currentTimeMillis());
            model.setCreatedBy("tester");

            mongoTemplate.insert(model, modelType);
            webSocketHandler.notifyModelChanged(modelType);

            saved.add(model);
        }

        return saved.size();

    }

    @Override
    public List<DataModel> getAllByModelType(String modelType) {
        return mongoTemplate.findAll(DataModel.class, modelType);
    }

    @Override
    public DataModel getById(String modelType, String id) {
        return mongoTemplate.findById(id, DataModel.class, modelType);
    }

    @Override
    public List<String> getAllModelTypes() {
        Set<String> collectionNames = mongoTemplate.getCollectionNames();
        return collectionNames.stream()
                .filter(name -> !name.startsWith("system."))
                .collect(Collectors.toList());
    }

    @Override
    public DataModel createData(DataModel request) {
        request.setCreatedAt(System.currentTimeMillis());
        request.setCreatedBy("tester2");
        DataModel saved = mongoTemplate.insert(request, request.getModelType());
        webSocketHandler.notifyModelChanged(request.getModelType());
        return saved;
    }

    @Override
    public void updateData(String modelType, String id, Map<String, Object> updateFields) {
        Query query = new Query(Criteria.where("_id").is(id));
        Update update = new Update()
                .set("fields", updateFields)
                .set("createdAt", System.currentTimeMillis())
                .set("createdBy", "updated");

        mongoTemplate.updateFirst(query, update, modelType);
    }

    @Override
    public void deleteData(String modelType, String id) {
        Query query = new Query(Criteria.where("_id").is(id));
        mongoTemplate.remove(query, modelType);
    }


}
