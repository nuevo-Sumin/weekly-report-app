package com.metabuild.weeklyreport.reportitem.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ReportItemSubmitRequest(
        @NotEmpty
        List<@NotNull Long> itemIds
) {
}
