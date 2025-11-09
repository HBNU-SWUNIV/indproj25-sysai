package caps.fmds.Controller;


import caps.fmds.item.WebSocket.DataWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class WsController {

    private final DataWebSocketHandler ws;

    @PostMapping("/test/notify/{modelType}")
    public String notify(@PathVariable String modelType) {
        ws.notifyModelChanged(modelType);
        return "ok";
    }


}
