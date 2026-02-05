package com.bzdata.TataFneBackend.newCertificationWay;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import com.bzdata.TataFneBackend.exception.ResourceNonFoundException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class InvoiceCertificationServiceImpl implements InvoiceCertificationService {
    private final ObjectMapper objectMapper;
    private final InvoiceMainResponseRepository mainRepo;
    private final WebClient invoiceWebClient;
    private final InvoiceApiProperties props;
    private final InvoiceFneCertifyRepository invoiceRepo;
    private final ItemRepository itemRepo;
    private final InvoiceCertifierCustomTaxRepository invoiceCustomTaxRepo;
    private final VerificationResponseRepository verificationRefundResponseRepo;

    @Override
    public JsonNode certifyInvoice(InvoiceSignRequest request) {

        try {
            log.info("Calling FNE sign API with payload: {}", objectMapper.writeValueAsString(request));
        } catch (Exception e) {
            log.warn("Unable to serialize InvoiceSignRequest for logging", e);
        }

        return invoiceWebClient.post()
                .uri(props.getSignPath())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + props.getToken())
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();
    }

    @Override
    public InvoiceMainResponse certifyInvoicePropre(InvoiceSignRequest request) {
        return invoiceWebClient.post()
                .uri(props.getSignPath())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + props.getToken())
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .bodyToMono(InvoiceMainResponse.class)
                .block();
    }

    @Override
    public InvoiceMainResponse saveFromJson(JsonNode json) {
        return null;
    }

    @Override

    public void saveFromJsonToDataba(JsonNode json) {

        // ===== 1) MAIN RESPONSE =====
        InvoiceMainResponse main = new InvoiceMainResponse();
        main.setReference(text(json, "reference")); // PK
        main.setNcc(text(json, "ncc"));
        main.setToken(text(json, "token"));
        main.setWarning(bool(json, "warning"));
        main.setBalanceFunds(intVal(json, "balance_funds"));

        // on sauve main maintenant (sans invoice lié pour l’instant)
        mainRepo.save(main);

        // ===== 2) INVOICE =====
        JsonNode invoiceNode = json.path("invoice");
        if (invoiceNode.isMissingNode() || invoiceNode.isNull()) {
            return;
        }

        InvoiceFneCertify invoice = new InvoiceFneCertify();
        invoice.setInvoiceType(text(invoiceNode, "invoiceType"));
        invoice.setId(text(invoiceNode, "id"));
        invoice.setParentId(textOrNull(invoiceNode, "parentId"));
        invoice.setParentReference(textOrNull(invoiceNode, "parentReference"));
        invoice.setToken(text(invoiceNode, "token"));
        invoice.setReference(text(invoiceNode, "reference"));
        invoice.setType(textOrNull(invoiceNode, "type"));
        invoice.setSubtype(textOrNull(invoiceNode, "subtype"));
        invoice.setDate(odt(invoiceNode, "date"));
        invoice.setPaymentMethod(textOrNull(invoiceNode, "paymentMethod"));

        invoice.setAmount(longVal(invoiceNode, "amount"));
        invoice.setVatAmount(longVal(invoiceNode, "vatAmount"));
        invoice.setFiscalStamp(longVal(invoiceNode, "fiscalStamp"));
        invoice.setDiscount(intValOrNull(invoiceNode, "discount"));

        invoice.setTotalBeforeTaxes(longVal(invoiceNode, "totalBeforeTaxes"));
        invoice.setTotalDiscounted(longVal(invoiceNode, "totalDiscounted"));
        invoice.setTotalTaxes(longVal(invoiceNode, "totalTaxes"));
        invoice.setTotalAfterTaxes(longVal(invoiceNode, "totalAfterTaxes"));
        invoice.setTotalCustomTaxes(longVal(invoiceNode, "totalCustomTaxes"));
        invoice.setTotalDue(longVal(invoiceNode, "totalDue"));

        invoice.setClientNcc(textOrNull(invoiceNode, "clientNcc"));
        invoice.setClientCompanyName(textOrNull(invoiceNode, "clientCompanyName"));
        invoice.setClientPhone(textOrNull(invoiceNode, "clientPhone"));
        invoice.setClientEmail(textOrNull(invoiceNode, "clientEmail"));
        invoice.setClientTerminal(textOrNull(invoiceNode, "clientTerminal"));
        invoice.setClientMerchantName(textOrNull(invoiceNode, "clientMerchantName"));
        invoice.setClientRccm(textOrNull(invoiceNode, "clientRccm"));
        invoice.setClientSellerName(textOrNull(invoiceNode, "clientSellerName"));
        invoice.setClientEstablishment(textOrNull(invoiceNode, "clientEstablishment"));
        invoice.setClientPointOfSale(textOrNull(invoiceNode, "clientPointOfSale"));
        invoice.setClientTaxRegime(textOrNull(invoiceNode, "clientTaxRegime"));

        invoice.setStatus(textOrNull(invoiceNode, "status"));
        invoice.setTemplate(textOrNull(invoiceNode, "template"));

        invoice.setDescription(textOrNull(invoiceNode, "description"));
        invoice.setFooter(textOrNull(invoiceNode, "footer"));
        invoice.setCommercialMessage(textOrNull(invoiceNode, "commercialMessage"));

        invoice.setForeignCurrency(textOrNull(invoiceNode, "foreignCurrency"));
        invoice.setForeignCurrencyRate(intValOrNull(invoiceNode, "foreignCurrencyRate"));

        invoice.setIsRne(boolOrNull(invoiceNode, "isRne"));
        invoice.setRne(textOrNull(invoiceNode, "rne"));

        invoice.setSource(textOrNull(invoiceNode, "source"));
        invoice.setCreatedAt(odt(invoiceNode, "createdAt"));
        invoice.setUpdatedAt(odt(invoiceNode, "updatedAt"));

        // sauver invoice
        invoiceRepo.save(invoice);

        // ===== 3) Lier main -> invoice (sans cascade, on met juste la FK et on resave
        // main) =====
        main.setInvoice(invoice);
        mainRepo.save(main);

        // ===== 4) ITEMS =====
        JsonNode itemsNode = invoiceNode.path("items");
        if (itemsNode.isArray()) {
            for (JsonNode itemNode : itemsNode) {

                Item item = new Item();
                item.setId(text(itemNode, "id"));
                item.setQuantity(intValOrNull(itemNode, "quantity"));
                item.setReference(textOrNull(itemNode, "reference"));
                item.setDescription(textOrNull(itemNode, "description"));
                item.setAmount(longVal(itemNode, "amount"));
                item.setDiscount(intValOrNull(itemNode, "discount"));
                item.setMeasurementUnit(textOrNull(itemNode, "measurementUnit"));
                item.setCreatedAt(odt(itemNode, "createdAt"));
                item.setUpdatedAt(odt(itemNode, "updatedAt"));
                item.setInvoiceId(textOrNull(itemNode, "invoiceId"));
                item.setParentId(textOrNull(itemNode, "parentId"));

                // IMPORTANT: FK ManyToOne obligatoire
                item.setInvoice(invoice);

                itemRepo.save(item);

                // ===== 5) Taxes de l’item (si tu veux) =====
                // JsonNode taxesNode = itemNode.path("taxes");
                // if (taxesNode.isArray()) {
                // for (JsonNode taxNode : taxesNode) {
                // ItemTax tax = new ItemTax();
                // tax.set... // mapping
                // tax.setItem(item);
                // itemTaxRepo.save(tax);
                // }
                // }

                // JsonNode itemCustomTaxesNode = itemNode.path("customTaxes");
                // if (itemCustomTaxesNode.isArray()) {
                // for (JsonNode ctNode : itemCustomTaxesNode) {
                // ItemCustomTax ct = new ItemCustomTax();
                // ct.set... // mapping
                // ct.setItem(item);
                // itemCustomTaxRepo.save(ct);
                // }
                // }
            }
        }

        // ===== 6) INVOICE CUSTOM TAXES =====
        JsonNode invCustomTaxesNode = invoiceNode.path("customTaxes");
        if (invCustomTaxesNode.isArray()) {
            for (JsonNode ctNode : invCustomTaxesNode) {
                InvoiceCertifierCustomTax ct = new InvoiceCertifierCustomTax();
                ct.setId(textOrNull(ctNode, "id"));
                ct.setInvoiceId(textOrNull(ctNode, "invoiceId"));
                ct.setAmount(intValOrNull(ctNode, "amount"));
                ct.setName(textOrNull(ctNode, "name"));
                ct.setCreatedAt(odt(ctNode, "createdAt"));
                ct.setUpdatedAt(odt(ctNode, "updatedAt"));

                ct.setInvoice(invoice); // FK obligatoire
                invoiceCustomTaxRepo.save(ct);
            }
        }
        // Si customTaxes est null, on ne fait rien - cela signifie qu'aucun custom tax n'est présent
        // et la base de données gérera cela comme un tableau vide par défaut
    }

    @Override
    public void saveFromJsonToDatabaWithNumFacture(JsonNode json, String numFacture, String utiliseur) {
        if (invoiceRepo.existsByNumeroFacture(numFacture)) {
            throw new ResourceNonFoundException(
                    "La facture " + numFacture + " est déjà certifiée et ne peut plus être traitée.");
        }
        // ===== 1) MAIN RESPONSE =====
        InvoiceMainResponse main = new InvoiceMainResponse();
        main.setReference(text(json, "reference")); // PK
        main.setNcc(text(json, "ncc"));
        main.setToken(text(json, "token"));
        main.setWarning(bool(json, "warning"));
        main.setBalanceFunds(intVal(json, "balance_funds"));

        // on sauve main maintenant (sans invoice lié pour l’instant)
        mainRepo.save(main);

        // ===== 2) INVOICE =====
        JsonNode invoiceNode = json.path("invoice");
        if (invoiceNode.isMissingNode() || invoiceNode.isNull()) {
            return;
        }

        InvoiceFneCertify invoice = new InvoiceFneCertify();
        invoice.setInvoiceType("sale");
        invoice.setId(text(invoiceNode, "id"));
        invoice.setNumeroFacture(numFacture);
        invoice.setUtilisateurCreateur(utiliseur);
        invoice.setParentId(textOrNull(invoiceNode, "parentId"));
        invoice.setParentReference(textOrNull(invoiceNode, "parentReference"));
        invoice.setToken(text(invoiceNode, "token"));
        invoice.setReference(text(invoiceNode, "reference"));
        invoice.setType(textOrNull(invoiceNode, "type"));
        invoice.setSubtype(textOrNull(invoiceNode, "subtype"));
        invoice.setDate(odt(invoiceNode, "date"));
        invoice.setPaymentMethod(textOrNull(invoiceNode, "paymentMethod"));

        invoice.setAmount(longVal(invoiceNode, "amount"));
        invoice.setVatAmount(longVal(invoiceNode, "vatAmount"));
        invoice.setFiscalStamp(longVal(invoiceNode, "fiscalStamp"));
        invoice.setDiscount(intValOrNull(invoiceNode, "discount"));

        invoice.setTotalBeforeTaxes(longVal(invoiceNode, "totalBeforeTaxes"));
        invoice.setTotalDiscounted(longVal(invoiceNode, "totalDiscounted"));
        invoice.setTotalTaxes(longVal(invoiceNode, "totalTaxes"));
        invoice.setTotalAfterTaxes(longVal(invoiceNode, "totalAfterTaxes"));
        invoice.setTotalCustomTaxes(longVal(invoiceNode, "totalCustomTaxes"));
        invoice.setTotalDue(longVal(invoiceNode, "totalDue"));

        invoice.setClientNcc(textOrNull(invoiceNode, "clientNcc"));
        invoice.setClientCompanyName(textOrNull(invoiceNode, "clientCompanyName"));
        invoice.setClientPhone(textOrNull(invoiceNode, "clientPhone"));
        invoice.setClientEmail(textOrNull(invoiceNode, "clientEmail"));
        invoice.setClientTerminal(textOrNull(invoiceNode, "clientTerminal"));
        invoice.setClientMerchantName(textOrNull(invoiceNode, "clientMerchantName"));
        invoice.setClientRccm(textOrNull(invoiceNode, "clientRccm"));
        invoice.setClientSellerName(textOrNull(invoiceNode, "clientSellerName"));
        invoice.setClientEstablishment(textOrNull(invoiceNode, "clientEstablishment"));
        invoice.setClientPointOfSale(textOrNull(invoiceNode, "clientPointOfSale"));
        invoice.setClientTaxRegime(textOrNull(invoiceNode, "clientTaxRegime"));

        invoice.setStatus(textOrNull(invoiceNode, "status"));
        invoice.setTemplate(textOrNull(invoiceNode, "template"));

        invoice.setDescription(textOrNull(invoiceNode, "description"));
        invoice.setFooter(textOrNull(invoiceNode, "footer"));
        invoice.setCommercialMessage(textOrNull(invoiceNode, "commercialMessage"));

        invoice.setForeignCurrency(textOrNull(invoiceNode, "foreignCurrency"));
        invoice.setForeignCurrencyRate(intValOrNull(invoiceNode, "foreignCurrencyRate"));

        invoice.setIsRne(boolOrNull(invoiceNode, "isRne"));
        invoice.setRne(textOrNull(invoiceNode, "rne"));

        invoice.setSource(textOrNull(invoiceNode, "source"));
        invoice.setCreatedAt(odt(invoiceNode, "createdAt"));
        invoice.setUpdatedAt(odt(invoiceNode, "updatedAt"));

        // sauver invoice
        invoiceRepo.save(invoice);

        // ===== 3) Lier main -> invoice (sans cascade, on met juste la FK et on resave
        // main) =====
        main.setInvoice(invoice);
        mainRepo.save(main);

        // ===== 4) ITEMS =====
        JsonNode itemsNode = invoiceNode.path("items");
        if (itemsNode.isArray()) {
            for (JsonNode itemNode : itemsNode) {

                Item item = new Item();
                item.setId(text(itemNode, "id"));
                item.setQuantity(intValOrNull(itemNode, "quantity"));
                item.setReference(textOrNull(itemNode, "reference"));
                item.setDescription(textOrNull(itemNode, "description"));
                item.setAmount(longVal(itemNode, "amount"));
                item.setDiscount(intValOrNull(itemNode, "discount"));
                item.setMeasurementUnit(textOrNull(itemNode, "measurementUnit"));
                item.setCreatedAt(odt(itemNode, "createdAt"));
                item.setUpdatedAt(odt(itemNode, "updatedAt"));
                item.setInvoiceId(textOrNull(itemNode, "invoiceId"));
                item.setParentId(textOrNull(itemNode, "parentId"));

                // IMPORTANT: FK ManyToOne obligatoire
                item.setInvoice(invoice);

                itemRepo.save(item);

                // ===== 5) Taxes de l’item (si tu veux) =====
                // JsonNode taxesNode = itemNode.path("taxes");
                // if (taxesNode.isArray()) {
                // for (JsonNode taxNode : taxesNode) {
                // ItemTax tax = new ItemTax();
                // tax.set... // mapping
                // tax.setItem(item);
                // itemTaxRepo.save(tax);
                // }
                // }

                // JsonNode itemCustomTaxesNode = itemNode.path("customTaxes");
                // if (itemCustomTaxesNode.isArray()) {
                // for (JsonNode ctNode : itemCustomTaxesNode) {
                // ItemCustomTax ct = new ItemCustomTax();
                // ct.set... // mapping
                // ct.setItem(item);
                // itemCustomTaxRepo.save(ct);
                // }
                // }
            }
        }

        // ===== 6) INVOICE CUSTOM TAXES =====
        JsonNode invCustomTaxesNode = invoiceNode.path("customTaxes");
        if (invCustomTaxesNode.isArray()) {
            for (JsonNode ctNode : invCustomTaxesNode) {
                InvoiceCertifierCustomTax ct = new InvoiceCertifierCustomTax();
                ct.setId(textOrNull(ctNode, "id"));
                ct.setInvoiceId(textOrNull(ctNode, "invoiceId"));
                ct.setAmount(intValOrNull(ctNode, "amount"));
                ct.setName(textOrNull(ctNode, "name"));
                ct.setCreatedAt(odt(ctNode, "createdAt"));
                ct.setUpdatedAt(odt(ctNode, "updatedAt"));

                ct.setInvoice(invoice); // FK obligatoire
                invoiceCustomTaxRepo.save(ct);
            }
        }
    }

    @Override
    public Long countByNumeroFacture(String numeroFacture) {
        return invoiceRepo.countByNumeroFacture(numeroFacture);
    }

    @Override
    public List<InvoiceFneCertifyDto> getAll() {
        return invoiceRepo.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public List<InvoiceFneCertifyDto> getByNumeroFacture(String numeroFacture) {
        return invoiceRepo.findByNumeroFactureOrderByCreatedAtDesc(numeroFacture)
                .stream()
                .map(this::toDto)
                .toList();
    }

    private InvoiceFneCertifyDto toDto(InvoiceFneCertify invoice) {
        InvoiceFneCertifyDto dto = new InvoiceFneCertifyDto();
        InvoiceMainResponse mainResp = mainRepo.findByInvoice(invoice);
        dto.setInvoiceType(invoice.getInvoiceType());
        dto.setId(invoice.getId());
        dto.setNumeroFactureInterne(invoice.getNumeroFacture());
        dto.setUtilisateurCreateur(invoice.getUtilisateurCreateur());

        // Convertir les items en ItemDto
        if (invoice.getItems() != null) {
            dto.setItems(invoice.getItems().stream()
                    .map(this::toItemDto)
                    .toList());
        }

        dto.setReference(invoice.getReference());
        dto.setDate(invoice.getDate());

        dto.setTotalTTC(invoice.getTotalAfterTaxes());
        dto.setTotalHorsTaxes(invoice.getTotalBeforeTaxes());
        dto.setTotalTaxes(invoice.getTotalTaxes());
        dto.setToken(mainResp.getToken());
        return dto;
    }

    private ItemDto toItemDto(Item item) {
        ItemDto dto = new ItemDto();
        dto.setId(item.getId());
        dto.setQuantity(item.getQuantity());
        dto.setReference(item.getReference());
        dto.setDescription(item.getDescription());
        dto.setAmount(item.getAmount());
        dto.setDiscount(item.getDiscount());
        dto.setMeasurementUnit(item.getMeasurementUnit());
        dto.setCreatedAt(item.getCreatedAt());
        dto.setUpdatedAt(item.getUpdatedAt());
        dto.setInvoiceId(item.getInvoiceId());
        dto.setParentId(item.getParentId());
        return dto;
    }

    private void linkRelations(InvoiceMainResponse main) {
        if (main == null || main.getInvoice() == null)
            return;

        InvoiceFneCertify inv = main.getInvoice();

        // Items -> invoice
        if (inv.getItems() != null) {
            for (Item it : inv.getItems()) {
                it.setInvoice(inv);

                // Taxes -> item
                if (it.getTaxes() != null) {
                    for (ItemTax tx : it.getTaxes()) {
                        tx.setItem(it);
                    }
                }

                // CustomTaxes item -> item
                if (it.getCustomTaxes() != null) {
                    for (ItemCustomTax ct : it.getCustomTaxes()) {
                        ct.setItem(it);
                    }
                }
            }
        }

        // CustomTaxes invoice -> invoice
        if (inv.getCustomTaxes() != null) {
            for (InvoiceCertifierCustomTax ct : inv.getCustomTaxes()) {
                ct.setInvoice(inv);
            }
        }
    }

    private static String text(JsonNode node, String field) {
        JsonNode v = node.path(field);
        return (v.isMissingNode() || v.isNull()) ? null : v.asText();
    }

    private static String textOrNull(JsonNode node, String field) {
        return text(node, field);
    }

    private static boolean bool(JsonNode node, String field) {
        JsonNode v = node.path(field);
        return !v.isMissingNode() && !v.isNull() && v.asBoolean(false);
    }

    private static Boolean boolOrNull(JsonNode node, String field) {
        JsonNode v = node.path(field);
        return (v.isMissingNode() || v.isNull()) ? null : v.asBoolean();
    }

    private static Integer intVal(JsonNode node, String field) {
        JsonNode v = node.path(field);
        return (v.isMissingNode() || v.isNull()) ? null : v.asInt();
    }

    private static Integer intValOrNull(JsonNode node, String field) {
        return intVal(node, field);
    }

    private static Long longVal(JsonNode node, String field) {
        JsonNode v = node.path(field);
        return (v.isMissingNode() || v.isNull()) ? null : v.asLong();
    }

    private static OffsetDateTime odt(JsonNode node, String field) {
        String s = text(node, field);
        return (s == null || s.isBlank()) ? null : OffsetDateTime.parse(s);
    }

 @Override
@Transactional
public VerificationRefundResponse refundInvoice(RefundInvoiceDTO refundDto) {

    // ===== 1) LOG =====
    try {
        log.info(
                "Calling FNE REFUND API | invoiceId={} | payload={}",
                refundDto.getInvoiceId(),
                objectMapper.writeValueAsString(refundDto)
        );
    } catch (Exception e) {
        log.warn("Unable to serialize RefundInvoiceDTO for logging", e);
    }

    // ===== 2) APPEL API FNE =====
    VerificationRefundResponseDto response;
    try {
        log.info("Url  is {}",props.getBaseUrl());
        // return invoiceWebClient.post()
        //         .uri(props.getSignPath() + "ws/external/invoices/{id}/refund", refundDto.getInvoiceId())
        //         .header(HttpHeaders.AUTHORIZATION, "Bearer " + props.getToken())
        //         .contentType(MediaType.APPLICATION_JSON)
        //         .accept(MediaType.APPLICATION_JSON)
        //         .bodyValue(refundDto)
        //         .retrieve()
        //         .bodyToMono(JsonNode.class)
        //         .block();
        response = invoiceWebClient
                .post()
               
                .uri(props.getBaseUrl() + "/ws/external/invoices/{id}/refund", refundDto.getInvoiceId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + props.getToken())
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)

                // ⬅️ BODY = DTO (invoiceId ignoré par Jackson)
                .bodyValue(refundDto)

                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError, res ->
                        res.bodyToMono(String.class)
                                .map(body -> {
                                    log.error("FNE REFUND 4xx error: {}", body);
                                    return new RuntimeException(body);
                                })
                )
                .onStatus(HttpStatusCode::is5xxServerError, res ->
                        res.bodyToMono(String.class)
                                .map(body -> {
                                    log.error("FNE REFUND 5xx error: {}", body);
                                    return new RuntimeException(body);
                                })
                )
                .bodyToMono(VerificationRefundResponseDto.class)
                .block();

    } catch (Exception e) {
        log.error("Exception while calling FNE REFUND API", e);
        throw new RuntimeException("Impossible de contacter l’API FNE (refund)", e);
    }

    if (response == null) {
        throw new RuntimeException("Réponse FNE refund vide");
    }

    // ===== 3) MAPPING DTO → ENTITY =====
    VerificationRefundResponse entity = VerificationRefundResponse.builder()
            .reference(response.getReference())
            .ncc(response.getNcc())
            .token(response.getToken())
            .warning(response.isWarning())
            .balanceSticker(response.getBalanceSticker())
            .invoiceId(refundDto.getInvoiceId())
            .createdAt(OffsetDateTime.now())
            .build();

    // ===== 4) SAUVEGARDE DB =====
    VerificationRefundResponse saved =
            verificationRefundResponseRepo.save(entity);

    log.info(
            "Refund saved successfully | reference={} | invoiceId={}",
            saved.getReference(),
            saved.getInvoiceId()
    );

    return saved;
}

 @Override
 public List<VerificationRefundResponse> getAllRefundInvoiceList() {
    // TODO Auto-generated method stub
    throw new UnsupportedOperationException("Unimplemented method 'getAllRefundInvoiceList'");
 }

@Override
public List<VerificationRefundResponse> getAllRefunds() {
    return verificationRefundResponseRepo.findAllByOrderByCreatedAtDesc();
}

@Override
public List<VerificationRefundResponse> getRefundsByInvoiceId(String invoiceId) {
    return verificationRefundResponseRepo.findByInvoiceIdOrderByCreatedAtDesc(invoiceId);
}


    
//     private VerificationRefundResponse toRefundEntity(
//         VerificationRefundResponseDto dto,
//         String invoiceId
// ) {
//     return VerificationRefundResponse.builder()
//             .reference(dto.getReference())
//             .ncc(dto.getNcc())
//             .token(dto.getToken())
//             .warning(dto.isWarning())
//             .balanceSticker(dto.getBalanceSticker())
//             .invoiceId(invoiceId)
//             .createdAt(OffsetDateTime.now())
//             .build();
// }

}
