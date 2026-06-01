package com.metabuild.weeklyreport.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.regex.MatchResult;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "jwt.secret=12345678901234567890123456789012",
        "jwt.expiration=3600000"
})
class StaticFrontendIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void rootServesReactIndexHtml() throws Exception {
        mockMvc.perform(get("/"))
                .andExpect(status().isOk())
                .andExpect(forwardedUrl("index.html"));
    }

    @Test
    void staticFrontendAssetsAreServed() throws Exception {
        for (String assetPath : findAssetPaths()) {
            mockMvc.perform(get(assetPath))
                    .andExpect(status().isOk());
        }
    }

    @Test
    void protectedApiStillRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/report-items"))
                .andExpect(status().isUnauthorized());
    }

    private String[] findAssetPaths() throws IOException {
        String indexHtml = new ClassPathResource("static/index.html").getContentAsString(StandardCharsets.UTF_8);
        String[] assetPaths = Pattern.compile("/assets/[^\"']+")
                .matcher(indexHtml)
                .results()
                .map(MatchResult::group)
                .toArray(String[]::new);

        assertThat(assetPaths).isNotEmpty();
        return assetPaths;
    }
}
