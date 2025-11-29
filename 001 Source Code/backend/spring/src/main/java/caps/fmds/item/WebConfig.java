package caps.fmds.item;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    @Value("${app.qr.output-dir}")
    private String qrOutputDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 예: http://localhost:8080/qr/user_1.png => file:/var/abs/qr/user_1.png
        registry.addResourceHandler("/qr/**")
                .addResourceLocations("file:" + qrOutputDir + "/");
    }
}