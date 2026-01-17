package com.bzdata.TataFneBackend.FactureFneNonCertifier;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.transaction.annotation.Transactional;

import com.bzdata.TataFneBackend.CustomTaxe.CustomTaxDTO;
import com.bzdata.TataFneBackend.CustomTaxe.CustomTaxe;
import com.bzdata.TataFneBackend.LigneFactureFne.LigneFactureDTO;
import com.bzdata.TataFneBackend.LigneFactureFne.LigneFactureFne;
import com.bzdata.TataFneBackend.Property.FneProperties;

import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE)
@Slf4j
public class FactureFneServiceImpl implements FactureFneService {
    final WebClient fneWebClient;
    final FneProperties props;
    final FactureFneRepository factureFneRepository;

    @Override
    public InvoiceCertificationResponseDTO certifyInvoice(InvoiceDTO invoiceDTO) throws Exception {
        log.info("Certifying invoice: {}", invoiceDTO);
        if (invoiceDTO == null) {
            throw new IllegalArgumentException("invoiceDTO must not be null");
        }
        FneInvoiceRequest request = toFneRequest(invoiceDTO);
        try {
            return fneWebClient.post()
                    .uri(props.getSignPath())
                    .bodyValue(request)
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, resp -> resp.bodyToMono(String.class)
                            .defaultIfEmpty("")
                            .flatMap(body -> Mono
                                    .error(new IllegalArgumentException(
                                            "Failed to certify invoice: " + resp.statusCode() + " " + body))))
                    .onStatus(HttpStatusCode::is5xxServerError, resp -> resp.bodyToMono(String.class)
                            .defaultIfEmpty("")
                            .flatMap(body -> Mono
                                    .error(new Exception("Failed to certify invoice: " + resp.statusCode() + " " + body))))
                    .bodyToMono(InvoiceCertificationResponseDTO.class)
                    .block();
        } catch (IllegalArgumentException e) {
log.error("Client error while certifying invoice: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            throw new Exception("Error certifying invoice: " + e.getMessage(), e);
        }
        // TODO Auto-generated method stub

    }

    @Override
    public List<InvoiceCertificationResponseDTO> certifyEnMasseInvoice(List<InvoiceDTO> invoiceDTOs) throws Exception {
        if (invoiceDTOs == null) {
            throw new IllegalArgumentException("invoiceDTOs must not be null");
        }
        List<InvoiceCertificationResponseDTO> responses = new ArrayList<>();
        for (InvoiceDTO invoiceDTO : invoiceDTOs) {
            responses.add(certifyInvoice(invoiceDTO));
        }
        return responses;
    }

    @Override
    @Transactional(readOnly = true)
    public List<InvoiceCertificationResponseDTO> certifyEnMasseByIds(List<Long> invoiceIds) throws Exception {
        if (invoiceIds == null) {
            throw new IllegalArgumentException("invoiceIds must not be null");
        }
        if (invoiceIds.isEmpty()) {
            throw new IllegalArgumentException("invoiceIds must not be empty");
        }

        List<FactureNonCertifier> factures = factureFneRepository.findAllById(invoiceIds);
        Set<Long> foundIds = factures.stream()
                .map(FactureNonCertifier::getId)
                .collect(Collectors.toSet());
        List<Long> missingIds = invoiceIds.stream()
                .filter(id -> !foundIds.contains(id))
                .collect(Collectors.toList());
        if (!missingIds.isEmpty()) {
            throw new IllegalArgumentException("Missing invoices for ids: " + missingIds);
        }
        List<Long> emptyItemsIds = factures.stream()
                .filter(facture -> facture.getItems() == null || facture.getItems().isEmpty())
                .map(FactureNonCertifier::getId)
                .collect(Collectors.toList());
        if (!emptyItemsIds.isEmpty()) {
            throw new IllegalArgumentException("Invoices missing items: " + emptyItemsIds);
        }

        List<InvoiceDTO> invoiceDTOs = factures.stream()
                .map(this::mapToInvoiceDto)
                .collect(Collectors.toList());
        return certifyEnMasseInvoice(invoiceDTOs);
    }

    @Override
    public InvoiceDTO saveInvoiceDTO(InvoiceDTO invoiceDTO) throws Exception {
        if (invoiceDTO == null) {
            throw new IllegalArgumentException("invoiceDTO must not be null");
        }
        FactureNonCertifier facture = mapToEntity(invoiceDTO);
        factureFneRepository.save(facture);
        return invoiceDTO;
    }

    @Override
    public ExcelImportResult importInvoices(List<Map<String, String>> rows) {
        if (rows == null) {
            throw new IllegalArgumentException("rows must not be null");
        }
        int processed = 0;
        int inserted = 0;
        int updated = 0;
        int skipped = 0;
        List<String> errors = new ArrayList<>();

        int rowNumber = 2;
        for (Map<String, String> row : rows) {
            processed++;
            Map<String, String> normalizedRow = normalizeRow(row);
            String invoiceNumberRaw = getFirstValue(normalizedRow, INVOICE_NUMBER_KEYS);
            if (invoiceNumberRaw == null || invoiceNumberRaw.isBlank()) {
                skipped++;
                errors.add("Row " + rowNumber + ": invoiceNumber is missing");
                rowNumber++;
                continue;
            }
            String invoiceNumber = invoiceNumberRaw.trim();

            Optional<FactureNonCertifier> existing = factureFneRepository.findByInvoiceNumber(invoiceNumber);
            FactureNonCertifier facture = existing.orElseGet(() -> FactureNonCertifier.builder()
                    .invoiceNumber(invoiceNumber)
                    .build());

            applyRowToEntity(facture, normalizedRow, errors, rowNumber);

            if (existing.isPresent()) {
                facture.setDateDeModification(Instant.now());
                updated++;
            } else {
                inserted++;
            }

            factureFneRepository.save(facture);
            log.info(
                    "Import row {} ({}) invoiceNumber={}, clientNcc={}, clientCompanyName={}, invoiceType={}, paymentMethod={}",
                    rowNumber,
                    existing.isPresent() ? "update" : "insert",
                    facture.getInvoiceNumber(),
                    facture.getClientNcc(),
                    facture.getClientCompanyName(),
                    facture.getInvoiceType(),
                    facture.getPaymentMethod()
            );
            rowNumber++;
        }

        return new ExcelImportResult(processed, inserted, updated, skipped, errors);
    }

    @Override
    public List<FactureNonCertifierListDTO> getAllInvoices() {
        return factureFneRepository.findAllByOrderByInvoiceDateDesc()
                .stream()
                .map(facture -> new FactureNonCertifierListDTO(
                        facture.getId(),
                        facture.getInvoiceNumber(),
                        facture.getInvoiceDate(),
                        facture.getClientCompanyName(),
                        facture.getClientNcc(),
                        facture.getTemplate(),
                        facture.getPaymentMethod(),
                        facture.getFactureCertifStatus(),
                        facture.getDateDeModification()
                ))
                .collect(Collectors.toList());
    }

    private FneInvoiceRequest toFneRequest(InvoiceDTO invoiceDTO) {
        boolean isRne = Boolean.TRUE.equals(invoiceDTO.isRne());
        String foreignCurrency = invoiceDTO.foreignCurrency();
        double foreignCurrencyRate = invoiceDTO.foreignCurrencyRate();
        if (foreignCurrency == null || foreignCurrency.isBlank()) {
            foreignCurrencyRate = 0;
        }
        List<CustomTaxDTO> customTaxes = invoiceDTO.customTaxes();
        if (customTaxes != null && customTaxes.isEmpty()) {
            customTaxes = null;
        }
        return new FneInvoiceRequest(
                normalizeInvoiceType(invoiceDTO.invoiceType()),
                invoiceDTO.paymentMethod(),
                normalizeTemplate(invoiceDTO.template()),
                invoiceDTO.clientNcc(),
                invoiceDTO.clientCompanyName(),
                invoiceDTO.clientPhone(),
                invoiceDTO.clientEmail(),
                invoiceDTO.clientSellerName(),
                invoiceDTO.pointOfSale(),
                invoiceDTO.establishment(),
                invoiceDTO.commercialMessage(),
                invoiceDTO.footer(),
                foreignCurrency,
                foreignCurrencyRate,
                invoiceDTO.items(),
                customTaxes,
                invoiceDTO.discount(),
                isRne,
                isRne ? invoiceDTO.rne() : null
        );
    }

    private String normalizeInvoiceType(String invoiceType) {
        if (invoiceType == null) {
            return null;
        }
        String normalized = invoiceType.trim().toLowerCase();
        if (normalized.equals("vente")) {
            return "sale";
        }
        if (normalized.equals("bordereau d'achat") || normalized.equals("bordereau d’achat")) {
            return "purchase";
        }
        return normalized;
    }

    private String normalizeTemplate(String template) {
        if (template == null) {
            return null;
        }
        return template.trim().toUpperCase();
    }

    private FactureNonCertifier mapToEntity(InvoiceDTO invoiceDTO) {
        FactureNonCertifier facture = FactureNonCertifier.builder()
                .invoiceType(invoiceDTO.invoiceType())
                .paymentMethod(invoiceDTO.paymentMethod())
                .template(invoiceDTO.template())
                .clientNcc(invoiceDTO.clientNcc())
                .clientCompanyName(invoiceDTO.clientCompanyName())
                .clientPhone(invoiceDTO.clientPhone())
                .clientEmail(invoiceDTO.clientEmail())
                .clientSellerName(invoiceDTO.clientSellerName())
                .pointOfSale(invoiceDTO.pointOfSale())
                .establishment(invoiceDTO.establishment())
                .commercialMessage(invoiceDTO.commercialMessage())
                .footer(invoiceDTO.footer())
                .foreignCurrency(invoiceDTO.foreignCurrency())
                .foreignCurrencyRate(BigDecimal.valueOf(invoiceDTO.foreignCurrencyRate()))
                .discount(BigDecimal.valueOf(invoiceDTO.discount()))
                .rneFlag(Boolean.TRUE.equals(invoiceDTO.isRne()))
                .rne(invoiceDTO.rne())
                .build();

        if (invoiceDTO.items() == null) {
            return facture;
        }

        for (LigneFactureDTO itemDTO : invoiceDTO.items()) {
            LigneFactureFne item = LigneFactureFne.builder()
                    .reference(itemDTO.reference())
                    .description(itemDTO.description())
                    .quantity(BigDecimal.valueOf(itemDTO.quantity()))
                    .amount(BigDecimal.valueOf(itemDTO.amount()))
                    .discount(BigDecimal.valueOf(itemDTO.discount()))
                    .measurementUnit(itemDTO.measurementUnit())
                    .taxes(itemDTO.taxes() == null ? new ArrayList<>() : new ArrayList<>(itemDTO.taxes()))
                    .build();

            if (itemDTO.customTaxes() != null) {
                for (CustomTaxDTO customTaxDTO : itemDTO.customTaxes()) {
                    CustomTaxe customTaxe = CustomTaxe.builder()
                            .name(customTaxDTO.name())
                            .amount(BigDecimal.valueOf(customTaxDTO.amount()))
                            .build();
                    item.addCustomTax(customTaxe);
                }
            }

            facture.addItem(item);
        }

        return facture;
    }

    private InvoiceDTO mapToInvoiceDto(FactureNonCertifier facture) {
        List<LigneFactureDTO> items = facture.getItems() == null
                ? new ArrayList<>()
                : facture.getItems().stream()
                        .map(this::mapToItemDto)
                        .collect(Collectors.toList());

        List<CustomTaxDTO> customTaxes = new ArrayList<>();
        if (facture.getItems() != null) {
            Set<CustomTaxDTO> seen = new HashSet<>();
            for (LigneFactureFne item : facture.getItems()) {
                if (item.getCustomTaxes() == null) {
                    continue;
                }
                for (CustomTaxe tax : item.getCustomTaxes()) {
                    CustomTaxDTO dto = new CustomTaxDTO(tax.getName(), tax.getAmount().doubleValue());
                    if (seen.add(dto)) {
                        customTaxes.add(dto);
                    }
                }
            }
        }
        if (customTaxes.isEmpty()) {
            customTaxes = null;
        }

        return new InvoiceDTO(
                facture.getInvoiceType(),
                facture.getPaymentMethod(),
                facture.getTemplate(),
                facture.getClientNcc(),
                facture.getClientCompanyName(),
                facture.getClientPhone(),
                facture.getClientEmail(),
                facture.getClientSellerName(),
                facture.getPointOfSale(),
                facture.getEstablishment(),
                facture.getCommercialMessage(),
                facture.getFooter(),
                facture.getForeignCurrency(),
                facture.getForeignCurrencyRate() == null ? 0 : facture.getForeignCurrencyRate().doubleValue(),
                items,
                customTaxes,
                facture.getDiscount() == null ? 0 : facture.getDiscount().doubleValue(),
                facture.isRneFlag(),
                facture.getRne()
        );
    }

    private LigneFactureDTO mapToItemDto(LigneFactureFne item) {
        List<CustomTaxDTO> customTaxes = item.getCustomTaxes() == null
                ? new ArrayList<>()
                : item.getCustomTaxes().stream()
                        .map(tax -> new CustomTaxDTO(tax.getName(), tax.getAmount().doubleValue()))
                        .collect(Collectors.toList());
        if (customTaxes.isEmpty()) {
            customTaxes = null;
        }

        List<String> taxes = item.getTaxes() == null ? new ArrayList<>() : new ArrayList<>(item.getTaxes());

        return new LigneFactureDTO(
                taxes,
                customTaxes,
                item.getReference(),
                item.getDescription(),
                item.getQuantity() == null ? 0 : item.getQuantity().doubleValue(),
                item.getAmount() == null ? 0 : item.getAmount().doubleValue(),
                item.getDiscount() == null ? 0 : item.getDiscount().doubleValue(),
                item.getMeasurementUnit()
        );
    }

    private static final String[] INVOICE_NUMBER_KEYS = {"invoicenumber", "invoiceid", "numerofacture", "numfacture", "numfact", "facturenumber"};
    private static final String[] INVOICE_TYPE_KEYS = {"invoicetype", "typefacture", "type"};
    private static final String[] PAYMENT_METHOD_KEYS = {"paymentmethod", "modepaiement", "moyenpaiement", "paiement"};
    private static final String[] TEMPLATE_KEYS = {"template", "modele", "typeclient"};
    private static final String[] CLIENT_NCC_KEYS = {"clientncc", "ncc", "clientnif", "nif", "nccclient"};
    private static final String[] CLIENT_COMPANY_NAME_KEYS = {"clientcompanyname", "clientcompagnyname", "client", "raisonsociale", "societe", "nomclient"};
    private static final String[] CLIENT_PHONE_KEYS = {"clientphone", "telephone", "tel", "phone", "telephoneclient"};
    private static final String[] CLIENT_EMAIL_KEYS = {"clientemail", "email", "mail", "emailclient"};
    private static final String[] CLIENT_SELLER_NAME_KEYS = {"clientsellername", "vendeur", "commercial"};
    private static final String[] POINT_OF_SALE_KEYS = {"pointofsale", "pointvente", "pointdevente"};
    private static final String[] ESTABLISHMENT_KEYS = {"establishment", "etablissement"};
    private static final String[] COMMERCIAL_MESSAGE_KEYS = {"commercialmessage", "messagecommercial"};
    private static final String[] FOOTER_KEYS = {"footer", "pieddepage"};
    private static final String[] FOREIGN_CURRENCY_KEYS = {"foreigncurrency", "devise"};
    private static final String[] FOREIGN_CURRENCY_RATE_KEYS = {"foreigncurrencyrate", "tauxdevise", "taux"};
    private static final String[] DISCOUNT_KEYS = {"discount", "remise", "remiseglobale"};
    private static final String[] IS_RNE_KEYS = {"isrne", "rneflag"};
    private static final String[] RNE_KEYS = {"rne"};
    private static final String[] ITEM_REFERENCE_KEYS = {"itemreference", "reference", "refarticle", "ref"};
    private static final String[] ITEM_DESCRIPTION_KEYS = {"itemdescription", "description", "designation", "libelle"};
    private static final String[] ITEM_QUANTITY_KEYS = {"itemquantity", "quantity", "quantite", "qte"};
    private static final String[] ITEM_AMOUNT_KEYS = {"itemamount", "amount", "prixunitaire", "prix", "montant"};
    private static final String[] ITEM_DISCOUNT_KEYS = {"itemdiscount", "discountligne", "remiseligne", "remiseitem"};
    private static final String[] ITEM_MEASUREMENT_UNIT_KEYS = {"itemmeasurementunit", "measurementunit", "unite", "unitemesure"};
    private static final String[] ITEM_TAXES_KEYS = {"itemtaxes", "taxes", "taxe", "taxesligne"};

    private void applyRowToEntity(FactureNonCertifier facture, Map<String, String> row, List<String> errors, int rowNumber) {
        String invoiceType = getFirstValue(row, INVOICE_TYPE_KEYS);
        if (invoiceType != null) {
            facture.setInvoiceType(invoiceType.trim());
        }
        String paymentMethod = getFirstValue(row, PAYMENT_METHOD_KEYS);
        if (paymentMethod != null) {
            facture.setPaymentMethod(paymentMethod.trim());
        }
        String template = getFirstValue(row, TEMPLATE_KEYS);
        if (template != null) {
            facture.setTemplate(template.trim());
        }
        String clientNcc = getFirstValue(row, CLIENT_NCC_KEYS);
        if (clientNcc != null) {
            facture.setClientNcc(clientNcc.trim());
        }
        String clientCompanyName = getFirstValue(row, CLIENT_COMPANY_NAME_KEYS);
        if (clientCompanyName != null) {
            facture.setClientCompanyName(clientCompanyName.trim());
        }
        String clientPhone = getFirstValue(row, CLIENT_PHONE_KEYS);
        if (clientPhone != null) {
            facture.setClientPhone(clientPhone.trim());
        }
        String clientEmail = getFirstValue(row, CLIENT_EMAIL_KEYS);
        if (clientEmail != null) {
            facture.setClientEmail(clientEmail.trim());
        }
        String clientSellerName = getFirstValue(row, CLIENT_SELLER_NAME_KEYS);
        if (clientSellerName != null) {
            facture.setClientSellerName(clientSellerName.trim());
        }
        String pointOfSale = getFirstValue(row, POINT_OF_SALE_KEYS);
        if (pointOfSale != null) {
            facture.setPointOfSale(pointOfSale.trim());
        }
        String establishment = getFirstValue(row, ESTABLISHMENT_KEYS);
        if (establishment != null) {
            facture.setEstablishment(establishment.trim());
        }
        String commercialMessage = getFirstValue(row, COMMERCIAL_MESSAGE_KEYS);
        if (commercialMessage != null) {
            facture.setCommercialMessage(commercialMessage.trim());
        }
        String footer = getFirstValue(row, FOOTER_KEYS);
        if (footer != null) {
            facture.setFooter(footer.trim());
        }
        String foreignCurrency = getFirstValue(row, FOREIGN_CURRENCY_KEYS);
        if (foreignCurrency != null) {
            facture.setForeignCurrency(foreignCurrency.trim());
        }

        BigDecimal foreignCurrencyRate = parseBigDecimal(getFirstValue(row, FOREIGN_CURRENCY_RATE_KEYS), errors, rowNumber, "foreignCurrencyRate");
        if (foreignCurrencyRate != null) {
            facture.setForeignCurrencyRate(foreignCurrencyRate);
        }

        BigDecimal discount = parseBigDecimal(getFirstValue(row, DISCOUNT_KEYS), errors, rowNumber, "discount");
        if (discount != null) {
            facture.setDiscount(discount);
        }

        Boolean isRne = parseBoolean(getFirstValue(row, IS_RNE_KEYS));
        String rne = getFirstValue(row, RNE_KEYS);
        if (rne != null) {
            facture.setRne(rne.trim());
            if (isRne == null) {
                facture.setRneFlag(true);
            }
        }
        if (isRne != null) {
            facture.setRneFlag(isRne);
        }

        applyRowToItems(facture, row, errors, rowNumber);
    }

    private void applyRowToItems(FactureNonCertifier facture, Map<String, String> row, List<String> errors, int rowNumber) {
        String reference = getFirstValue(row, ITEM_REFERENCE_KEYS);
        String description = getFirstValue(row, ITEM_DESCRIPTION_KEYS);
        BigDecimal quantity = parseBigDecimal(getFirstValue(row, ITEM_QUANTITY_KEYS), errors, rowNumber, "itemQuantity");
        BigDecimal amount = parseBigDecimal(getFirstValue(row, ITEM_AMOUNT_KEYS), errors, rowNumber, "itemAmount");
        BigDecimal discount = parseBigDecimal(getFirstValue(row, ITEM_DISCOUNT_KEYS), errors, rowNumber, "itemDiscount");
        String measurementUnit = getFirstValue(row, ITEM_MEASUREMENT_UNIT_KEYS);
        List<String> taxes = parseDelimitedList(getFirstValue(row, ITEM_TAXES_KEYS));

        boolean hasItemData = (reference != null && !reference.isBlank())
                || (description != null && !description.isBlank())
                || quantity != null
                || amount != null
                || discount != null
                || (measurementUnit != null && !measurementUnit.isBlank())
                || !taxes.isEmpty();

        if (!hasItemData) {
            return;
        }

        LigneFactureFne item = LigneFactureFne.builder()
                .reference(reference == null ? null : reference.trim())
                .description(description == null ? null : description.trim())
                .quantity(quantity == null ? BigDecimal.ZERO : quantity)
                .amount(amount == null ? BigDecimal.ZERO : amount)
                .discount(discount == null ? BigDecimal.ZERO : discount)
                .measurementUnit(measurementUnit == null ? null : measurementUnit.trim())
                .taxes(taxes)
                .build();

        facture.addItem(item);
    }

    private Map<String, String> normalizeRow(Map<String, String> row) {
        Map<String, String> normalized = new HashMap<>();
        if (row == null) {
            return normalized;
        }
        for (Map.Entry<String, String> entry : row.entrySet()) {
            String key = entry.getKey();
            if (key == null || key.isBlank()) {
                continue;
            }
            normalized.put(normalizeKey(key), entry.getValue());
        }
        return normalized;
    }

    private String getFirstValue(Map<String, String> row, String... keys) {
        for (String key : keys) {
            String value = row.get(key);
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private String normalizeKey(String key) {
        String normalized = Normalizer.normalize(key, Normalizer.Form.NFD);
        normalized = normalized.replaceAll("\\p{M}", "");
        normalized = normalized.replaceAll("[^A-Za-z0-9]", "");
        return normalized.toLowerCase(Locale.ROOT);
    }

    private List<String> parseDelimitedList(String value) {
        if (value == null || value.isBlank()) {
            return new ArrayList<>();
        }
        String[] parts = value.split("[,;]");
        List<String> values = new ArrayList<>();
        for (String part : parts) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) {
                values.add(trimmed);
            }
        }
        return values;
    }

    private BigDecimal parseBigDecimal(String value, List<String> errors, int rowNumber, String fieldName) {
        if (value == null) {
            return null;
        }
        String cleaned = value.trim();
        if (cleaned.isEmpty()) {
            return null;
        }
        cleaned = cleaned.replace("\u00A0", "");
        cleaned = cleaned.replace(" ", "");
        if (cleaned.contains(",") && !cleaned.contains(".")) {
            cleaned = cleaned.replace(",", ".");
        } else if (cleaned.contains(",") && cleaned.contains(".")) {
            cleaned = cleaned.replace(",", "");
        }
        try {
            return new BigDecimal(cleaned);
        } catch (NumberFormatException e) {
            errors.add("Row " + rowNumber + ": invalid number for " + fieldName + " -> " + value);
            return null;
        }
    }

    private Boolean parseBoolean(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        if (normalized.isEmpty()) {
            return null;
        }
        if (normalized.equals("true") || normalized.equals("1") || normalized.equals("yes") || normalized.equals("oui") || normalized.equals("y")) {
            return true;
        }
        if (normalized.equals("false") || normalized.equals("0") || normalized.equals("no") || normalized.equals("non") || normalized.equals("n")) {
            return false;
        }
        return null;
    }
}
