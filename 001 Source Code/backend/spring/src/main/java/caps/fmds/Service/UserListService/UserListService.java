package caps.fmds.Service.UserListService;

import caps.fmds.item.Request.CreateUserListRequest;
import caps.fmds.item.UserList;

import java.util.List;

public interface UserListService {
    UserList createList(CreateUserListRequest request);
    List<UserList> getListsByUserId(Long userId);
}
