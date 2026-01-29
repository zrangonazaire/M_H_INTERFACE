package com.bzdata.TataFneBackend.newCertificationWay;

import java.time.OffsetDateTime;

import lombok.Data;

@Data
public class ItemDto {

    private String id;

    private Integer quantity;
    private String reference;
    private String description;

    private Long amount;
    private Integer discount;

    private String measurementUnit;

    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    private String invoiceId;
    private String parentId;

}
