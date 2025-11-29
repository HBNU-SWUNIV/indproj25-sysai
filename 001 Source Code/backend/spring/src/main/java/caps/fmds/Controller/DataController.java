package caps.fmds.Controller;

import caps.fmds.Service.DataService.DataService;
import caps.fmds.Service.UserCustomService.UserCustomService;
//import caps.fmds.Service.UserGroupService.UserGroupService;
import caps.fmds.Service.UserListService.UserListService;
import caps.fmds.Service.UserService.UserService;
import caps.fmds.item.*;
import caps.fmds.item.Request.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@RestController
@RequestMapping("/data")
@RequiredArgsConstructor
@CrossOrigin("*")
@Tag(name = "FMDS API", description = "컨트롤러에 대한 설명")
public class DataController {
    private final DataService dataService;

//    private final UserGroupService userGroupService;
    private final UserService userService;

    private final UserListService userListService;
    private final UserCustomService userCustomService;


    @PostMapping("/upload")
    @Operation(summary = "엑셀데이터 올리기", description = "엑셀 데이터를 사용자가 올려주면 몽고DB에 저장시킴")
    public ResponseEntity<?> uploadExcel(@RequestParam("file") MultipartFile file) throws Exception {
        int savedCount = dataService.uploadExcelAndSaveToMongo(file);
        return ResponseEntity.ok("저장된 데이터 수: " + savedCount);
    }

    // 모델타입 전체 데이터 조회
    @GetMapping("/load/{modelType}")
    @Operation(summary = "특정 모델타입 전체 데이터 조회", description = "특정 모델타입 전체 데이터를 조회함")
    public List<DataModel> getDataByModelType(@PathVariable String modelType) {
        return dataService.getAllByModelType(modelType);
    }

    // 단건 조회
    @GetMapping("/load/{modelType}/{id}")
    @Operation(summary = "데이터 단건 조회", description = "특정 모델타입과 특정 ID로 데이터를 단건으로 조회함")
    public DataModel getOne(@PathVariable String modelType, @PathVariable String id){
        return dataService.getById(modelType, id);
    }

    @GetMapping("/load")
    @Operation(summary = "모든 모델타입 목록 조회")
    public ResponseEntity<List<String>> getAllModelTypes() {
        List<String> modelTypes = dataService.getAllModelTypes();
        return ResponseEntity.ok(modelTypes);
    }

    // 데이터 단건 추가
    @PostMapping("/add")
    @Operation(summary = "데이터 단건 추가", description = "특정 모델타입 안에 데이터를 단건으로 추가하는 것")
    public ResponseEntity<?> createData(@RequestBody DataModel request) {
        DataModel saved = dataService.createData(request);
        return ResponseEntity.ok(saved);
    }

    // 데이터 단건 수정
    @PutMapping("/update/{modelType}/{id}")
    @Operation(summary = "데이터 단건 수정", description = "특정 모델타입 안에 데이터를 단건으로 수정하는 것")
    public ResponseEntity<?> updateData(@PathVariable String modelType, @PathVariable String id,
                                        @RequestBody Map<String, Object> updateFields) {
        dataService.updateData(modelType, id, updateFields);
        return ResponseEntity.ok("수정 완료");
    }

    // 데이터 단건 삭제
    @DeleteMapping("/delete/{modelType}/{id}")
    @Operation(summary = "데이터 단건 삭제")
    public ResponseEntity<?> deleteData(@PathVariable String modelType, @PathVariable String id) {
        dataService.deleteData(modelType, id);
        return ResponseEntity.ok("삭제 완료");
    }


//    // 그룹 생성
//    @PostMapping("/group")
//    @Operation(summary = "그룹 생성")
//    public ResponseEntity<UserGroup> createGroup(@RequestBody UserGroupRequest request) {
//        UserGroup savedGroup = userGroupService.createGroup(request);
//        return ResponseEntity.ok(savedGroup);
//    }

    // 유저 생성
    @PostMapping("/user")
    @Operation(summary = "유저 생성")
    public ResponseEntity<?> createUser(@RequestBody UserRequest request) {
        try {
            User savedUser = userService.createUser(request);
            return ResponseEntity.ok(savedUser);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 유저 단건 조회
    @GetMapping("/user/{id}")
    @Operation(summary = "유저 단건 조회")
    public ResponseEntity<?> getUser(@PathVariable Long id) {
        return userService.getUser(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // 유저 전체 조회
    @GetMapping("/users")
    @Operation(summary = "유저 전체 조회")
    public ResponseEntity<List<User>> listUsers() {
        return ResponseEntity.ok(userService.listUsers());
    }

    // 유저 수정
    @PutMapping("/user/{id}")
    @Operation(summary = "유저 수정")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody UserUpdateRequest request) {
        try {
            return ResponseEntity.ok(userService.updateUser(id, request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 유저 삭제
    @DeleteMapping("/user/{id}")
    @Operation(summary = "유저 삭제")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }


    // 커스텀리스트 생성
    @PostMapping("/customlist")
    @Operation(summary = "커스텀리스트 생성")
    public ResponseEntity<?> createList(@RequestBody CreateUserListRequest request) {
        try {
            UserList saved = userListService.createList(request);
            return ResponseEntity.ok(saved);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 커스텀리스트 조회
    @GetMapping("/customlist/user/{userId}")
    @Operation(summary = "커스텀리스트 조회")
    public ResponseEntity<List<UserList>> getUserLists(@PathVariable Long userId) {
        List<UserList> lists = userListService.getListsByUserId(userId);
        return ResponseEntity.ok(lists);
    }

    // 커스텀리스트 삭제


    // 커스텀 컴포넌트 생성
    @PostMapping("/custom")
    @Operation(summary = "커스텀 컴포넌트 저장", description = "기존 컴포넌트를 모두 삭제 후 새로 저장함")
    public ResponseEntity<?> createCustom(@RequestBody CustomRequest request) {
        try {
            List<UserCustom> saved = userCustomService.replaceUserCustoms(request);
            return ResponseEntity.ok(saved);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 커스텀 리스트 안에 포함된 컴포넌트 목록을 조회
    @GetMapping("/customs/list/{userListId}")
    @Operation(summary = "특정 대시보드에 속한 컴포넌트 목록 조회")
    public ResponseEntity<Map<String, Object>> getCustomsByUserList(@PathVariable Long userListId) {
        try {
            Map<String, Object> result = userCustomService.getCustomsByUserList(userListId);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }

    // 커스텀 컴포넌트 수정
    // 이부분도 현재로서는 필요 없음
    @PutMapping("/custom/{id}")
    @Operation(summary = "커스텀 컴포넌트 단일 수정(위치, 크기, 필터 쿼리 등)")
    public ResponseEntity<?> updateCustom(@PathVariable Long id, @RequestBody Map<String, Object> updates) {
        try {
            UserCustom updated = userCustomService.updateCustom(id, updates);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(e.getMessage());
        }
    }


    // 커스텀 리스트 지우기
    @DeleteMapping("/userlist/{id}")
    @Operation(summary = "커스텀 리스트 전체 삭제")
    public ResponseEntity<?> deleteUserList(@PathVariable Long id) {
        try {
            userCustomService.deleteUserList(id);
            return ResponseEntity.ok("커스텀 리스트와 포함된 컴포넌트 삭제 완료");
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(e.getMessage());
        }
    }



}
