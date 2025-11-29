package caps.fmds.Service.UserService;

import caps.fmds.item.Request.UserRequest;
import caps.fmds.item.Request.UserUpdateRequest;
import caps.fmds.item.User;

import java.util.List;
import java.util.Optional;

public interface UserService {
    User createUser(UserRequest request);

    Optional<User> getUser(Long id);
    List<User> listUsers();
    User updateUser(Long id, UserUpdateRequest request);
    void deleteUser(Long id);
}
