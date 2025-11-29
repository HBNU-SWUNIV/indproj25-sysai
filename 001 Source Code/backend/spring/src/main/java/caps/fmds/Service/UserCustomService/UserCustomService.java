package caps.fmds.Service.UserCustomService;

import caps.fmds.item.Request.CustomRequest;
import caps.fmds.item.UserCustom;

import java.util.List;
import java.util.Map;

public interface UserCustomService {
    List<UserCustom> replaceUserCustoms(CustomRequest request);
    Map<String, Object> getCustomsByUserList(Long userListId);
    UserCustom updateCustom(Long id, Map<String, Object> updates);
    void deleteUserList(Long id);
}
