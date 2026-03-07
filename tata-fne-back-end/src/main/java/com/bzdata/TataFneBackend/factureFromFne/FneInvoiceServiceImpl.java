package com.bzdata.TataFneBackend.factureFromFne;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import com.bzdata.TataFneBackend.exception.ResourceNonFoundException;
import com.bzdata.TataFneBackend.newCertificationWay.VerificationRefundResponse;
import com.bzdata.TataFneBackend.newCertificationWay.VerificationResponseRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FneInvoiceServiceImpl implements FneInvoiceService {

    private final FneInvoiceClient fneInvoiceClient;
    private final FneAuthService authService;
    private final FneReceivedInvoiceRepository receivedInvoiceRepository;
    private final VerificationResponseRepository verificationRefundResponseRepo;
    private final ObjectMapper objectMapper;

    @Transactional
    @Override
    public FneInvoiceSyncResult syncAndStore(FneInvoiceQuery query, String username) {
        validateQuery(query);

        Instant fetchedAt = Instant.now();
        Set<String> processedExternalIds = new HashSet<>();

        int currentPage = 1;
        int remotePerPage = query.resolvedPerPage();
        int savedCount = 0;
        int createdCount = 0;
        int updatedCount = 0;

        int safetyCounter = 0;
        final int maxPages = 500;

        while (safetyCounter++ < maxPages) {
            FneInvoiceQuery pageQuery = new FneInvoiceQuery(
                    currentPage,
                    remotePerPage,
                    query.resolvedFromDate(),
                    query.resolvedToDate(),
                    query.resolvedSortBy(),
                    query.resolvedListing(),
                    query.resolvedComplete()
            );

            JsonNode root = fetchInvoicesWithRefresh(pageQuery, username);
            ArrayNode dataArray = extractDataArray(root);

            SyncCounters counters = savePage(dataArray, fetchedAt, processedExternalIds, query.resolvedListing());
            savedCount += counters.savedCount();
            createdCount += counters.createdCount();
            updatedCount += counters.updatedCount();

            int responsePage = root.path("page").asInt(currentPage);
            int responsePerPage = root.path("perPage").asInt(remotePerPage);
            int responseTotal = root.path("total").asInt(0);
            int pageSize = dataArray.size();

            if (pageSize == 0) {
                break;
            }
            if (responseTotal > 0 && responsePage * responsePerPage >= responseTotal) {
                break;
            }
            if (pageSize < responsePerPage) {
                break;
            }

            currentPage = responsePage + 1;
        }

        if (safetyCounter >= maxPages) {
            throw new IllegalStateException("Synchronisation FNE interrompue: nombre de pages trop eleve.");
        }

        return buildDatabaseResult(query, savedCount, createdCount, updatedCount);
    }

    @Transactional(readOnly = true)
    @Override
    public FneInvoiceSyncResult findFromDatabase(FneInvoiceQuery query) {
        validateQuery(query);
        return buildDatabaseResult(query, 0, 0, 0);
    }

    @Transactional(readOnly = true)
    @Override
    public JsonNode findInvoiceByExternalId(String externalId) {
        FneReceivedInvoiceEntity entity = receivedInvoiceRepository.findByExternalId(externalId)
                .orElseThrow(() -> new ResourceNonFoundException("Facture non trouvee pour l'id: " + externalId));
        return toInvoiceNode(
                entity,
                resolveCreditNoteMetadata(
                        toCreditNoteMetadata(receivedInvoiceRepository
                                .findFirstByParentIdAndSubtypeIgnoreCaseOrderByInvoiceDateDesc(externalId, "refund")
                                .orElse(null)),
                        toCreditNoteMetadata(verificationRefundResponseRepo
                                .findByInvoiceIdOrderByCreatedAtDesc(externalId).stream()
                                .findFirst()
                                .orElse(null))));
    }

    private JsonNode fetchInvoicesWithRefresh(FneInvoiceQuery query, String username) {
        String token = authService.resolveValidToken(username);
        try {
            return fneInvoiceClient.fetchInvoices(token, query);
        } catch (WebClientResponseException.Unauthorized ex) {
            String refreshedToken = authService.refreshToken(username);
            return fneInvoiceClient.fetchInvoices(refreshedToken, query);
        }
    }

    private ArrayNode extractDataArray(JsonNode root) {
        JsonNode dataNode = root.path("data");
        if (!dataNode.isArray()) {
            throw new IllegalStateException("Format de reponse FNE inattendu: champ 'data' absent ou invalide.");
        }
        return (ArrayNode) dataNode;
    }

    private SyncCounters savePage(
            ArrayNode dataArray,
            Instant fetchedAt,
            Set<String> processedExternalIds,
            String defaultListing
    ) {
        Map<String, FneReceivedInvoiceEntity> existingByExternalId = loadExistingByExternalId(dataArray);
        List<FneReceivedInvoiceEntity> toSave = new ArrayList<>();

        int createdCount = 0;
        int updatedCount = 0;

        for (JsonNode invoiceNode : dataArray) {
            String externalId = asText(invoiceNode, "id");
            if (!StringUtils.hasText(externalId) || !processedExternalIds.add(externalId)) {
                continue;
            }

            FneReceivedInvoiceEntity entity = existingByExternalId.get(externalId);
            if (entity == null) {
                entity = FneReceivedInvoiceEntity.builder().externalId(externalId).build();
                createdCount++;
            } else {
                updatedCount++;
            }

            fillEntity(entity, invoiceNode, fetchedAt, defaultListing);
            toSave.add(entity);
        }

        if (!toSave.isEmpty()) {
            receivedInvoiceRepository.saveAll(toSave);
        }

        return new SyncCounters(toSave.size(), createdCount, updatedCount);
    }

    private FneInvoiceSyncResult buildDatabaseResult(
            FneInvoiceQuery query,
            int savedCount,
            int createdCount,
            int updatedCount
    ) {
        Pageable pageable = PageRequest.of(
                query.resolvedPage() - 1,
                query.resolvedPerPage(),
                resolveSort(query.resolvedSortBy())
        );

        Instant fromInclusive = query.resolvedFromDate().atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant toExclusive = query.resolvedToDate().plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();

        Specification<FneReceivedInvoiceEntity> byDateRange = (root, cq, cb) ->
                cb.and(
                        cb.greaterThanOrEqualTo(root.get("invoiceDate"), fromInclusive),
                        cb.lessThan(root.get("invoiceDate"), toExclusive)
                );
        String listing = query.resolvedListing().toLowerCase(Locale.ROOT);
        Specification<FneReceivedInvoiceEntity> byListing = (root, cq, cb) ->
                cb.or(
                        cb.equal(cb.lower(root.get("source")), listing),
                        cb.equal(cb.lower(root.get("source")), "api"),
                        cb.isNull(root.get("source"))
                );

        Page<FneReceivedInvoiceEntity> resultPage = receivedInvoiceRepository.findAll(byDateRange.and(byListing), pageable);
        Map<String, CreditNoteMetadata> creditNotesByParentId = loadCreditNotesByParentId(resultPage.getContent());
        ArrayNode data = objectMapper.createArrayNode();
        for (FneReceivedInvoiceEntity entity : resultPage.getContent()) {
            data.add(toInvoiceNode(entity, creditNotesByParentId.get(entity.getExternalId())));
        }

        return new FneInvoiceSyncResult(
                resultPage.getNumber() + 1,
                resultPage.getSize(),
                resultPage.getTotalElements(),
                resultPage.getNumberOfElements(),
                savedCount,
                createdCount,
                updatedCount,
                data
        );
    }

    private Sort resolveSort(String sortBy) {
        String normalizedSort = StringUtils.hasText(sortBy) ? sortBy.trim() : "-date";
        boolean descending = normalizedSort.startsWith("-");
        String field = descending ? normalizedSort.substring(1) : normalizedSort;

        String mappedField = switch (field) {
            case "reference" -> "reference";
            case "status" -> "status";
            case "createdAt" -> "createdAt";
            case "date" -> "invoiceDate";
            default -> "invoiceDate";
        };

        return Sort.by(descending ? Sort.Direction.DESC : Sort.Direction.ASC, mappedField);
    }

    private Map<String, CreditNoteMetadata> loadCreditNotesByParentId(List<FneReceivedInvoiceEntity> invoices) {
        Set<String> invoiceIds = invoices.stream()
                .map(FneReceivedInvoiceEntity::getExternalId)
                .filter(StringUtils::hasText)
                .collect(Collectors.toSet());

        if (invoiceIds.isEmpty()) {
            return Map.of();
        }

        Map<String, CreditNoteMetadata> refundsByParentId = new HashMap<>();
        for (FneReceivedInvoiceEntity refund : receivedInvoiceRepository
                .findAllByParentIdInAndSubtypeIgnoreCaseOrderByInvoiceDateDesc(invoiceIds, "refund")) {
            String parentId = refund.getParentId();
            if (!StringUtils.hasText(parentId)) {
                continue;
            }
            mergeCreditNoteMetadata(refundsByParentId, parentId, toCreditNoteMetadata(refund));
        }

        for (VerificationRefundResponse refund : verificationRefundResponseRepo
                .findByInvoiceIdInOrderByCreatedAtDesc(invoiceIds)) {
            String invoiceId = refund.getInvoiceId();
            if (!StringUtils.hasText(invoiceId)) {
                continue;
            }
            mergeCreditNoteMetadata(refundsByParentId, invoiceId, toCreditNoteMetadata(refund));
        }

        return refundsByParentId;
    }

    private JsonNode toInvoiceNode(FneReceivedInvoiceEntity entity, CreditNoteMetadata creditNote) {
        boolean hasCreditNote = creditNote != null;
        if (StringUtils.hasText(entity.getRawPayload())) {
            try {
                JsonNode rawNode = objectMapper.readTree(entity.getRawPayload());
                if (rawNode instanceof ObjectNode objectNode) {
                    enrichWithCreditNote(objectNode, creditNote);
                }
                return rawNode;
            } catch (JsonProcessingException ignored) {
                // Fallback minimal payload below.
            }
        }

        ObjectNode node = objectMapper.createObjectNode();
        node.put("id", entity.getExternalId());
        enrichWithCreditNote(node, creditNote);
        putIfNotBlank(node, "reference", entity.getReference());
        putIfNotBlank(node, "parentId", entity.getParentId());
        putIfNotBlank(node, "parentReference", entity.getParentReference());
        putIfNotBlank(node, "type", entity.getType());
        putIfNotBlank(node, "subtype", entity.getSubtype());
        if (entity.getInvoiceDate() != null) {
            node.put("date", entity.getInvoiceDate().toString());
        }
        if (entity.getAmount() != null) {
            node.put("amount", entity.getAmount());
        }
        if (entity.getTotalDue() != null) {
            node.put("totalDue", entity.getTotalDue());
        }
        if (entity.getTotalAfterTaxes() != null) {
            node.put("totalAfterTaxes", entity.getTotalAfterTaxes());
        }
        putIfNotBlank(node, "status", entity.getStatus());
        putIfNotBlank(node, "clientNcc", entity.getClientNcc());
        putIfNotBlank(node, "clientCompanyName", entity.getClientCompanyName());
        putIfNotBlank(node, "source", entity.getSource());
        node.putArray("items");
        return node;
    }

    private void enrichWithCreditNote(ObjectNode node, CreditNoteMetadata creditNote) {
        boolean hasCreditNote = creditNote != null;
        node.put("hasCreditNote", hasCreditNote);

        if (!hasCreditNote) {
            return;
        }

        putIfNotBlank(node, "creditNoteId", creditNote.id());
        putIfNotBlank(node, "creditNoteReference", creditNote.reference());
        putIfNotBlank(node, "creditNoteToken", creditNote.token());
        if (creditNote.date() != null) {
            node.put("creditNoteDate", creditNote.date().toString());
        }
    }

    private void mergeCreditNoteMetadata(
            Map<String, CreditNoteMetadata> creditNotesByInvoiceId,
            String invoiceId,
            CreditNoteMetadata candidate
    ) {
        if (!StringUtils.hasText(invoiceId) || candidate == null) {
            return;
        }
        creditNotesByInvoiceId.merge(invoiceId, candidate, FneInvoiceServiceImpl::resolveCreditNoteMetadata);
    }

    static CreditNoteMetadata resolveCreditNoteMetadata(CreditNoteMetadata current, CreditNoteMetadata candidate) {
        if (current == null) {
            return candidate;
        }
        if (candidate == null) {
            return current;
        }

        Instant currentDate = current.date();
        Instant candidateDate = candidate.date();

        if (currentDate == null && candidateDate != null) {
            return candidate;
        }
        if (candidateDate == null && currentDate != null) {
            return current;
        }
        if (currentDate != null && candidateDate != null && !candidateDate.equals(currentDate)) {
            return candidateDate.isAfter(currentDate) ? candidate : current;
        }

        boolean currentHasToken = StringUtils.hasText(current.token());
        boolean candidateHasToken = StringUtils.hasText(candidate.token());
        if (currentHasToken != candidateHasToken) {
            return candidateHasToken ? candidate : current;
        }

        return current;
    }

    private CreditNoteMetadata toCreditNoteMetadata(FneReceivedInvoiceEntity refund) {
        if (refund == null) {
            return null;
        }
        return new CreditNoteMetadata(
                refund.getExternalId(),
                refund.getReference(),
                refund.getExternalToken(),
                refund.getInvoiceDate());
    }

    private CreditNoteMetadata toCreditNoteMetadata(VerificationRefundResponse refund) {
        if (refund == null) {
            return null;
        }
        return new CreditNoteMetadata(
                refund.getId() == null ? null : refund.getId().toString(),
                refund.getReference(),
                refund.getToken(),
                refund.getCreatedAt() == null ? null : refund.getCreatedAt().toInstant());
    }

    private void putIfNotBlank(ObjectNode node, String field, String value) {
        if (StringUtils.hasText(value)) {
            node.put(field, value);
        }
    }

    private void validateQuery(FneInvoiceQuery query) {
        if (query == null) {
            throw new IllegalArgumentException("Les parametres de recherche sont requis.");
        }
        if (query.resolvedFromDate().isAfter(query.resolvedToDate())) {
            throw new IllegalArgumentException("fromDate doit etre anterieure ou egale a toDate.");
        }
    }

    private Map<String, FneReceivedInvoiceEntity> loadExistingByExternalId(ArrayNode dataArray) {
        Set<String> externalIds = new HashSet<>();
        for (JsonNode invoiceNode : dataArray) {
            String externalId = asText(invoiceNode, "id");
            if (StringUtils.hasText(externalId)) {
                externalIds.add(externalId);
            }
        }

        Map<String, FneReceivedInvoiceEntity> map = new HashMap<>();
        if (externalIds.isEmpty()) {
            return map;
        }

        for (FneReceivedInvoiceEntity entity : receivedInvoiceRepository.findAllByExternalIdIn(externalIds)) {
            map.put(entity.getExternalId(), entity);
        }
        return map;
    }

    private void fillEntity(FneReceivedInvoiceEntity entity, JsonNode invoiceNode, Instant fetchedAt, String defaultListing) {
        entity.setExternalToken(asText(invoiceNode, "token"));
        entity.setReference(asText(invoiceNode, "reference"));
        entity.setParentId(asText(invoiceNode, "parentId"));
        entity.setParentReference(asText(invoiceNode, "parentReference"));
        entity.setType(asText(invoiceNode, "type"));
        entity.setSubtype(asText(invoiceNode, "subtype"));
        entity.setInvoiceDate(asInstant(invoiceNode, "date"));
        entity.setAmount(asBigDecimal(invoiceNode, "amount"));
        entity.setTotalDue(asBigDecimal(invoiceNode, "totalDue"));
        entity.setTotalAfterTaxes(asBigDecimal(invoiceNode, "totalAfterTaxes"));
        entity.setStatus(asText(invoiceNode, "status"));
        entity.setClientNcc(asText(invoiceNode, "clientNcc"));
        entity.setClientCompanyName(asText(invoiceNode, "clientCompanyName"));
        String source = asText(invoiceNode, "source");
        if (!StringUtils.hasText(source) || "api".equalsIgnoreCase(source)) {
            source = defaultListing;
        }
        entity.setSource(StringUtils.hasText(source) ? source.toLowerCase(Locale.ROOT) : null);

        JsonNode companyNode = invoiceNode.path("company");
        if (companyNode.isObject()) {
            entity.setCompanyNcc(asText(companyNode, "ncc"));
            entity.setCompanyName(asText(companyNode, "name"));
        } else {
            entity.setCompanyNcc(null);
            entity.setCompanyName(null);
        }

        entity.setRawPayload(writeJson(invoiceNode));
        entity.setFetchedAt(fetchedAt);
    }

    private String asText(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) {
            return null;
        }
        String text = value.asText();
        return StringUtils.hasText(text) ? text : null;
    }

    private BigDecimal asBigDecimal(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) {
            return null;
        }
        try {
            if (value.isNumber()) {
                return value.decimalValue();
            }
            String text = value.asText();
            if (!StringUtils.hasText(text)) {
                return null;
            }
            return new BigDecimal(text.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Instant asInstant(JsonNode node, String field) {
        String value = asText(node, field);
        if (!StringUtils.hasText(value)) {
            return null;
        }
        try {
            return Instant.parse(value);
        } catch (Exception ex) {
            return null;
        }
    }

    private String writeJson(JsonNode node) {
        try {
            return objectMapper.writeValueAsString(node);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Impossible de serialiser une facture FNE.", ex);
        }
    }

    private record SyncCounters(int savedCount, int createdCount, int updatedCount) {
    }

    record CreditNoteMetadata(
            String id,
            String reference,
            String token,
            Instant date) {
    }
}
