package caps.fmds.Service.UserListService;

import caps.fmds.Repository.UserListRepository;
import caps.fmds.Repository.UserRepository;
import caps.fmds.item.Request.CreateUserListRequest;
import caps.fmds.item.User;
import caps.fmds.item.UserList;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserListServiceImpl implements UserListService {

    private final UserListRepository userListRepository;
    private final UserRepository userRepository;

    @Override
    public UserList createList(CreateUserListRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("유저 없음"));

        UserList userList = new UserList();
        userList.setName(request.getName());
        userList.setUser(user);

        // TODO: 생성시간, updatedBy 등도 여기에 추가 가능
        return userListRepository.save(userList);
    }

    @Override
    public List<UserList> getListsByUserId(Long userId) {
        return userListRepository.findByUserId(userId);
    }
}