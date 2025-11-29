package caps.fmds.Repository;

import caps.fmds.item.UserCustom;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserCustomRepository extends JpaRepository<UserCustom, Long> {
    List<UserCustom> findByUserListId(Long userListId);

    void deleteByUserListId(Long userListId);
}
