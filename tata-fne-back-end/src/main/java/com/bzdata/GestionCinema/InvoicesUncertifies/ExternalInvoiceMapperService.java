package com.bzdata.GestionCinema.InvoicesUncertifies;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.stereotype.Service;

@Service
public class ExternalInvoiceMapperService {

    public InvoiceDto mapExternalFinanceJsonToInvoiceDto(String rawJson) {
        // Selon l’API, ça peut être un objet {} ou une liste []
        // On gère les 2 cas
        JSONObject rootObj = null;
        JSONArray rootArr = null;

        String trimmed = rawJson == null ? "" : rawJson.trim();
        if (trimmed.startsWith("{")) {
            rootObj = new JSONObject(trimmed);
        } else if (trimmed.startsWith("[")) {
            rootArr = new JSONArray(trimmed);
        } else {
            throw new IllegalArgumentException("Réponse JSON invalide: ni objet ni tableau");
        }

        InvoiceDto dto = new InvoiceDto();

        // Valeurs "fixes" pour simuler facture (car ton API externe n’est pas une API d’invoice)
        dto.invoiceType = "sale";
        dto.paymentMethod = "mobile-money";
        dto.template = "B2B";

        dto.clientNcc = "0000000D";
        dto.clientCompanyName = "CLIENT TEST";
        dto.clientPhone = "0700000000";
        dto.clientEmail = "test@client.ci";
        dto.clientSellerName = "Vendeur Test";

        dto.pointOfSale = "1";
        dto.establishment = "Abidjan";
        dto.commercialMessage = "Soyez les bienvenus";
        dto.footer = "Merci pour votre confiance";

        dto.foreignCurrency = "";
        dto.foreignCurrencyRate = BigDecimal.ZERO;
        dto.discount = new BigDecimal("0");

        dto.customTaxes = new ArrayList<>();
        dto.items = new ArrayList<>();

        // === Exemple d’adaptation: prendre des valeurs "amount" depuis l’API finance ===
        // Tu dois adapter ces clés à ce que renvoie réellement /categories/finance.
        // Ci-dessous : on cherche des champs "amount", "name", "description" etc.

        if (rootObj != null) {
            // Cas objet unique
            InvoiceItemDto item = buildItemFromObject(rootObj);
            dto.items.add(item);

        } else {
            // Cas tableau : créer plusieurs items
            int max = Math.min(rootArr.length(), 5); // limiter si énorme
            for (int i = 0; i < max; i++) {
                JSONObject o = rootArr.getJSONObject(i);
                dto.items.add(buildItemFromObject(o));
            }
        }

        // Si aucun item trouvé, on force un item par défaut (pour éviter facture vide)
        if (dto.items.isEmpty()) {
            InvoiceItemDto fallback = new InvoiceItemDto();
            fallback.reference = "ref001";
            fallback.description = "Produit test";
            fallback.quantity = new BigDecimal("1");
            fallback.amount = new BigDecimal("1000");
            fallback.discount = BigDecimal.ZERO;
            fallback.measurementUnit = "pcs";
            fallback.taxes = List.of("TVA");
            fallback.customTaxes = new ArrayList<>();
            dto.items.add(fallback);
        }

        return dto;
    }

    private InvoiceItemDto buildItemFromObject(JSONObject o) {
        InvoiceItemDto it = new InvoiceItemDto();

        it.reference = o.optString("id", "ref" + System.currentTimeMillis());
        it.description = o.optString("description", o.optString("name", "Article externe"));
        it.quantity = new BigDecimal(String.valueOf(o.optInt("quantity", 1)));

        // Essayer plusieurs clés possibles: amount, price, total, value...
        BigDecimal amount = firstBigDecimal(o, "amount", "price", "total", "value");
        it.amount = amount != null ? amount : new BigDecimal("1000");

        it.discount = BigDecimal.ZERO;
        it.measurementUnit = "pcs";

        it.taxes = List.of("TVA");
        it.customTaxes = new ArrayList<>();

        return it;
    }

    private BigDecimal firstBigDecimal(JSONObject o, String... keys) {
        for (String k : keys) {
            if (o.has(k) && !o.isNull(k)) {
                try {
                    return new BigDecimal(String.valueOf(o.get(k)));
                } catch (Exception ignored) {}
            }
        }
        return null;
    }
}

