package caps.fmds.Repository;

import caps.fmds.item.DataModel;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface DataModelRepository extends MongoRepository<DataModel, String> {

    List<DataModel> findByModelType(String modelType);


}
