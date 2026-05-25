package com.metabuild.weeklyreport.reportitem.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record ReportItemSubmitRequest(
        @NotEmpty
        List<Long> itemIds
) {
}
