package caps.fmds;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

//@EnableScheduling
@SpringBootApplication
public class FmdsApplication {

    public static void main(String[] args) {
        SpringApplication.run(FmdsApplication.class, args);
    }

}
