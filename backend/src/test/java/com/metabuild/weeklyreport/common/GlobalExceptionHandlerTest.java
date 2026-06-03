package com.metabuild.weeklyreport.common;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void csvUniqueConstraintViolationReturnsCsvDuplicateMessageIgnoringCase() {
        DataIntegrityViolationException exception = new DataIntegrityViolationException(
                "could not execute statement",
                new RuntimeException("constraint uk_report_item_csv_source violated")
        );

        ResponseEntity<ApiResponse<Void>> response = handler.handleDataIntegrityViolation(exception);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().message())
                .isEqualTo("CSV row has already been saved for this report period and week type.");
    }
}
