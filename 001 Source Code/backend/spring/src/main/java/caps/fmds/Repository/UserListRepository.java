package caps.fmds.Repository;

import caps.fmds.item.UserList;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface UserListRepository extends JpaRepository<UserList, Long> {
    List<UserList> findByUserId(Long userId);


}
