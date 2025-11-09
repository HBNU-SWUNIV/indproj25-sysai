package caps.fmds.Service.UserCustomService;

import caps.fmds.Repository.UserCustomRepository;
import caps.fmds.Repository.UserListRepository;
import caps.fmds.item.Request.CustomRequest;
import caps.fmds.item.UserCustom;
import caps.fmds.item.UserList;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserCustomServiceImpl implements UserCustomService {

    private final UserListRepository userListRepository;
    private final UserCustomRepository userCustomRepository;

    @Override
    @Transactional
    public List<UserCustom> replaceUserCustoms(CustomRequest request) {
        UserList userList = userListRepository.findById(request.getUserListId())
                .orElseThrow(() -> new RuntimeException("해당 유저 리스트 없음"));

        if (request.getComponents() == null || request.getComponents().isEmpty()) {
            throw new RuntimeException("저장할 컴포넌트가 없습니다.");
        }

        // 기존 컴포넌트 삭제
        userCustomRepository.deleteByUserListId(userList.getId());

        // 새 컴포넌트 생성
        List<UserCustom> newCustoms = request.getComponents().stream()
                .map(comp -> {
                    UserCustom custom = new UserCustom();
                    custom.setComponentId(comp.getComponentId());
                    custom.setX(comp.getX());
                    custom.setY(comp.getY());
                    custom.setWidth(comp.getWidth());
                    custom.setHeight(comp.getHeight());
                    custom.setQuery(comp.getQuery());
                    custom.setUserList(userList);
                    return custom;
                })
                .collect(Collectors.toList());

        return userCustomRepository.saveAll(newCustoms);
    }

    @Override
    public Map<String, Object> getCustomsByUserList(Long userListId) {
        List<UserCustom> customs = userCustomRepository.findByUserListId(userListId);

        if (customs.isEmpty()) {
            throw new RuntimeException("해당 사용자 리스트에 컴포넌트가 없습니다.");
        }

        Set<String> dataTypes = customs.stream()
                .map(UserCustom::getQuery)
                .filter(Objects::nonNull)
                .map(query -> (String) query.get("modelType"))
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        return Map.of("dataTypes", dataTypes, "customs", customs);
    }

    @Override
    public UserCustom updateCustom(Long id, Map<String, Object> updates) {
        UserCustom custom = userCustomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("해당 컴포넌트 없음"));

        if (updates.containsKey("x")) custom.setX(Double.valueOf(updates.get("x").toString()));
        if (updates.containsKey("y")) custom.setY(Double.valueOf(updates.get("y").toString()));
        if (updates.containsKey("width")) custom.setWidth(Double.valueOf(updates.get("width").toString()));
        if (updates.containsKey("height")) custom.setHeight(Double.valueOf(updates.get("height").toString()));

        if (updates.containsKey("query")) {
            Map<String, Object> query = (Map<String, Object>) updates.get("query");
            custom.setQuery(query);
        }

        return userCustomRepository.save(custom);
    }

    @Override
    public void deleteUserList(Long id) {
        if (!userListRepository.existsById(id)) {
            throw new RuntimeException("존재하지 않는 커스텀 리스트입니다.");
        }
        userListRepository.deleteById(id);
    }
}