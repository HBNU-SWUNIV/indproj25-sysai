//package caps.fmds.Service.UserGroupService;
//
////import caps.fmds.Repository.UserGroupRepository;
//import caps.fmds.item.Request.UserGroupRequest;
////import caps.fmds.item.UserGroup;
//import lombok.RequiredArgsConstructor;
//import org.springframework.stereotype.Service;
//
//@Service
//@RequiredArgsConstructor
//public class UserGroupServiceImpl implements UserGroupService {
//
//    private final UserGroupRepository userGroupRepository;
//
//    @Override
//    public UserGroup createGroup(UserGroupRequest request) {
//        UserGroup group = new UserGroup();
//        group.setName(request.getName());
//
//        // TODO: 그룹 중복 체크 및 삭제 여부는 향후 정책에 따라 추가 가능
//        return userGroupRepository.save(group);
//    }
//}