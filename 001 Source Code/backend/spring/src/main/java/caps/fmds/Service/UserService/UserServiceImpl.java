package caps.fmds.Service.UserService;

//import caps.fmds.Repository.UserGroupRepository;
import caps.fmds.Repository.UserRepository;
import caps.fmds.item.Request.UserRequest;
import caps.fmds.item.Request.UserUpdateRequest;
import caps.fmds.item.User;
//import caps.fmds.item.UserGroup;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
//    private final UserGroupRepository userGroupRepository;

    @Override
    public User createUser(UserRequest request) {
//        UserGroup group = userGroupRepository.findByName(request.getGroupName())
//                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 그룹입니다 => " + request.getGroupName()));

        if (userRepository.findByName(request.getName()).isPresent()) {
            throw new IllegalArgumentException("이미 존재하는 이름입니다 => " + request.getName());
        }

        User user = new User();
        user.setName(request.getName());
        user.setAdmin(request.getAdmin());
//        user.setUserGroup(group);

        user.setRole(request.getRole());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());

        return userRepository.save(user);
    }

    @Override
    public Optional<User> getUser(Long id) {
        return userRepository.findById(id);
    }

    @Override
    public List<User> listUsers() {
        return userRepository.findAll();
    }

    @Override
    public User updateUser(Long id, UserUpdateRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다. id=" + id));

        if (request.getName() != null) {
            userRepository.findByName(request.getName()).ifPresent(u -> {
                if (!u.getId().equals(id)) {
                    throw new IllegalArgumentException("이미 존재하는 이름입니다 => " + request.getName());
                }
            });
            user.setName(request.getName());
        }

        if (request.getAdmin() != null) {
            user.setAdmin(request.getAdmin());
        }

        // 역할(role)
        if (request.getRole() != null) {
            user.setRole(request.getRole());
        }

        // 이메일
        if (request.getEmail() != null) {
            String email = request.getEmail().trim();
            if (!email.isEmpty() && !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
                throw new IllegalArgumentException("이메일 형식이 올바르지 않습니다");
            }
            user.setEmail(email.isEmpty() ? null : email);
        }


        if (request.getPhone() != null) {
            String phone = request.getPhone().trim();
            // 숫자/하이픈만 허용
            if (!phone.isEmpty() && !phone.matches("^[0-9\\-]+$")) {
                throw new IllegalArgumentException("전화번호 형식이 올바르지 않습니다");
            }
            user.setPhone(phone.isEmpty() ? null : phone);
        }

//        if (request.getGroupName() != null) {
//            var group = userGroupRepository.findByName(request.getGroupName())
//                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 그룹입니다 => " + request.getGroupName()));
//            user.setUserGroup(group);
//        }

        return userRepository.save(user);
    }

    @Override
    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }

}