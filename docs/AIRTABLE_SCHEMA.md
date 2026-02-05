# Airtable Database Schema

**Last Updated**: 2026-02-04T14:48:10.193Z

**Base ID**: app359c17lK0Ta8Ws

---

## Table of Contents

- [Leads](#leads)
- [Activities](#activities)
- [Orders](#orders)
- [Products](#products)
- [Users](#users)
- [Marketing_Sources](#marketing-sources)

---

## Leads

**Table ID**: `tblKIZ9CDjcQorONA`

**Record Count** (sample): 5

### Fields

| Field Name | Type | Sample Value | Notes |
|------------|------|--------------|-------|
| ID | string | "rec039vazreIiJi0M" | - |
| Nome | string | "Dina Garofani" | - |
| Telefono | string | "3470445373" | - |
| Città | string | "Ravenna" | - |
| Esigenza | string | "Cerco un materasso perchè devo semplicemente sosti..." | - |
| Stato | string | "Contattato" | - |
| Fonte | array<linked_record> | ["recrNSAeonF59Gn2S"] | Unknown (linked record) |
| Data | string | "2025-06-17T22:00:00.000Z" | - |
| Conversations | string | "Unnamed record, Unnamed record, Unnamed record" | - |
| Gender | string | "female" | - |
| Notes | array<linked_record> | ["recom2dQ0N9ptXnuP"] | Unknown (linked record) |

### Sample Record

```json
{
  "id": "rec039vazreIiJi0M",
  "fields": {
    "ID": "rec039vazreIiJi0M",
    "Nome": "Dina Garofani",
    "Telefono": "3470445373",
    "Città": "Ravenna",
    "Esigenza": "Cerco un materasso perchè devo semplicemente sostituire il mio materasso attuale",
    "Stato": "Contattato",
    "Fonte": [
      "recrNSAeonF59Gn2S"
    ],
    "Data": "2025-06-17T22:00:00.000Z",
    "Conversations": "Unnamed record, Unnamed record, Unnamed record",
    "Gender": "female",
    "Notes": [
      "recom2dQ0N9ptXnuP"
    ]
  }
}
```

---

## Activities

**Table ID**: `tblbcuRXKrWvne0Wy`

**Record Count** (sample): 5

### Fields

| Field Name | Type | Sample Value | Notes |
|------------|------|--------------|-------|
| ID | string | "rec0ALVA5rdxOEo0u" | - |
| Note | string | "Ci siamo sentiti telefonicamente. È interessata, m..." | - |
| Tipo | string | "Chiamata" | - |
| Data | string | "2026-01-12T15:30:00.000Z" | - |
| Stato | string | "Completata" | - |
| ID Lead | array<linked_record> | ["rec9vtRHJIAknRo0V"] | Unknown (linked record) |
| Assegnatario | array<linked_record> | ["recty6UazKOy4y1Fu"] | Unknown (linked record) |
| Titolo | string | "Chiamata - Alessandra Morri" | - |
| Obiettivo | string | "Qualificazione lead" | - |
| Priorità | string | "Media" | - |
| Esito | string | "Interessato" | - |
| Prossima azione | string | "Follow-up" | - |
| Data prossima azione | string | "2026-01-19T14:00:00.000Z" | - |
| Creato il  | string | "2026-01-14T10:53:21.000Z" | - |
| Ultima modifica | string | "2026-01-14T10:53:21.000Z" | - |
| Nome Lead | array<string> | ["Alessandra Morri"] | - |
| Nome Assegnatario | array<string> | ["Matteo Eusebi"] | - |

### Sample Record

```json
{
  "id": "rec0ALVA5rdxOEo0u",
  "fields": {
    "ID": "rec0ALVA5rdxOEo0u",
    "Note": "Ci siamo sentiti telefonicamente. È interessata, ma preferisce passare senza appuntamento. Le ho inviato un messaggio WhatsApp con indirizzo e orari.",
    "Tipo": "Chiamata",
    "Data": "2026-01-12T15:30:00.000Z",
    "Stato": "Completata",
    "ID Lead": [
      "rec9vtRHJIAknRo0V"
    ],
    "Assegnatario": [
      "recty6UazKOy4y1Fu"
    ],
    "Titolo": "Chiamata - Alessandra Morri",
    "Obiettivo": "Qualificazione lead",
    "Priorità": "Media",
    "Esito": "Interessato",
    "Prossima azione": "Follow-up",
    "Data prossima azione": "2026-01-19T14:00:00.000Z",
    "Creato il ": "2026-01-14T10:53:21.000Z",
    "Ultima modifica": "2026-01-14T10:53:21.000Z",
    "Nome Lead": [
      "Alessandra Morri"
    ],
    "Nome Assegnatario": [
      "Matteo Eusebi"
    ]
  }
}
```

---

## Orders

**Table ID**: `tblkqfCMabBpVD1fP`

**Record Count** (sample): 2

### Fields

| Field Name | Type | Sample Value | Notes |
|------------|------|--------------|-------|
| ID_Ordine | string | "recv7J2u06xUYYCWP" | - |
| ID_Lead | array<linked_record> | ["recvYLVWpBUdfdrcf","rec7OKBsrQqemyFjK"] | Unknown (linked record) |
| ID_Venditore | array<linked_record> | ["recty6UazKOy4y1Fu"] | Unknown (linked record) |
| Data_Ordine | string | "2026-01-17" | - |
| Data_Consegna_Richiesta | string | "2025-11-15" | - |
| Stato_Ordine | string | "Consegnato" | - |
| Stato_Pagamento | string | "Pagato" | - |
| Modalita_Pagamento | string | "Assegno" | - |
| Totale_Lordo | number | 2400 | - |
| Totale_Sconto | number | 0 | - |
| Totale_Netto | number | 2400 | - |
| Totale_IVA | number | 0 | - |
| Totale_Finale | number | 2400 | - |
| Indirizzo_Consegna | string | "Via Ca' dei Lunghi, 64, 47890 San Marino" | - |
| Data_Creazione | string | "2026-01-17T11:08:32.252Z" | - |
| Ultima_Modifica | string | "2026-01-17T14:14:02.090Z" | - |
| Order_Items | array<linked_record> | ["reccKfDvuA1cGZWIs"] | Unknown (linked record) |
| URL_Contratto | string | "[{\"url\":\"https://rwuyz7sohysfo8fr.public.blob.verc..." | - |
| URL_Schede_Cliente | string | "[{\"url\":\"https://rwuyz7sohysfo8fr.public.blob.verc..." | - |

### Sample Record

```json
{
  "id": "recv7J2u06xUYYCWP",
  "fields": {
    "ID_Ordine": "recv7J2u06xUYYCWP",
    "ID_Lead": [
      "recvYLVWpBUdfdrcf",
      "rec7OKBsrQqemyFjK"
    ],
    "ID_Venditore": [
      "recty6UazKOy4y1Fu"
    ],
    "Data_Ordine": "2026-01-17",
    "Data_Consegna_Richiesta": "2025-11-15",
    "Stato_Ordine": "Consegnato",
    "Stato_Pagamento": "Pagato",
    "Modalita_Pagamento": "Assegno",
    "Totale_Lordo": 2400,
    "Totale_Sconto": 0,
    "Totale_Netto": 2400,
    "Totale_IVA": 0,
    "Totale_Finale": 2400,
    "Indirizzo_Consegna": "Via Ca' dei Lunghi, 64, 47890 San Marino",
    "Data_Creazione": "2026-01-17T11:08:32.252Z",
    "Ultima_Modifica": "2026-01-17T14:14:02.090Z",
    "Order_Items": [
      "reccKfDvuA1cGZWIs"
    ],
    "URL_Contratto": "[{\"url\":\"https://rwuyz7sohysfo8fr.public.blob.vercel-storage.com/orders/2026-01-17T11-08-33-221Z-ROSSI_DAVIDE_-_CTR.pdf\",\"filename\":\"ROSSI DAVIDE - CTR.pdf\",\"isExisting\":true}]",
    "URL_Schede_Cliente": "[{\"url\":\"https://rwuyz7sohysfo8fr.public.blob.vercel-storage.com/orders/2026-01-17T11-08-34-677Z-ROSSI_DAVIDE_-_SX.pdf\",\"filename\":\"ROSSI DAVIDE - SX.pdf\",\"isExisting\":true},{\"url\":\"https://rwuyz7sohysfo8fr.public.blob.vercel-storage.com/orders/2026-01-17T11-08-34-698Z-ROSSI_DAVIDE_-_DX.pdf\",\"filename\":\"ROSSI DAVIDE - DX.pdf\",\"isExisting\":true}]"
  }
}
```

---

## Products

**Table ID**: `tblEFvr3aT2jQdYUL`

**Record Count** (sample): 4

### Fields

| Field Name | Type | Sample Value | Notes |
|------------|------|--------------|-------|
| Codice_Matrice | string | "M41702000L0XT5T6C4" | - |
| Nome_Prodotto | string | "Materasso Modular Pro 170x200" | - |
| Descrizione | string | "Materasso strutturato con configurazione:\n- Modell..." | - |
| Categoria | string | "Materassi" | - |
| Prezzo_Listino_Attuale | number | 2400 | - |
| Costo_Attuale | number | 352.67 | - |
| Margine_Standard | number | 0.8530541666666668 | - |
| Attivo | boolean | true | - |
| Order_Items | array<linked_record> | ["recXBqVb0YmoDdakP"] | Unknown (linked record) |
| Metadata | string | "{\n  \"configurazione\": {\n    \"structure_name\": \"Mat..." | - |

### Sample Record

```json
{
  "id": "recOV2z8inlWYJj7i",
  "fields": {
    "Codice_Matrice": "M41702000L0XT5T6C4",
    "Nome_Prodotto": "Materasso Modular Pro 170x200",
    "Descrizione": "Materasso strutturato con configurazione:\n- Modello: Modular Pro\n- Taglie: Taglia L, Taglia XL\n- Topper: Topper hard 8 cm\n- Topper: Topper extra hard 8 cm\n- Cover: Cover a fascia 22 cm",
    "Categoria": "Materassi",
    "Prezzo_Listino_Attuale": 2400,
    "Costo_Attuale": 352.67,
    "Margine_Standard": 0.8530541666666668,
    "Attivo": true,
    "Order_Items": [
      "recXBqVb0YmoDdakP"
    ],
    "Metadata": "{\n  \"configurazione\": {\n    \"structure_name\": \"Materasso\",\n    \"selected_variants\": {\n      \"modello\": \"M4\",\n      \"larghezza\": \"170\",\n      \"lunghezza\": \"200\",\n      \"taglia_sx\": \"0L\",\n      \"taglia_dx\": \"0X\",\n      \"topper_sx\": \"T5\",\n      \"topper_dx\": \"T6\",\n      \"cover\": \"C4\"\n    },\n    \"generated_code\": \"M41702000L0XT5T6C4\",\n    \"generated_name\": \"Materasso Modular Pro 170x200\",\n    \"generated_description\": \"Materasso strutturato con configurazione:\\n- Modello: Modular Pro\\n- Taglie: Taglia L, Taglia XL\\n- Topper: Topper hard 8 cm\\n- Topper: Topper extra hard 8 cm\\n- Cover: Cover a fascia 22 cm\",\n    \"final_pricing\": {\n      \"totalPrice\": 2400,\n      \"totalCost\": 352.67,\n      \"margin\": 85.30541666666667\n    },\n    \"configuration_timestamp\": \"2025-10-04T09:10:12.895Z\"\n  },\n  \"descrizione_utente\": \"\",\n  \"creato_il\": \"2025-10-04T09:10:12.895Z\",\n  \"tipo\": \"prodotto_strutturato\"\n}"
  }
}
```

---

## Users

**Table ID**: `tbl141xF7ZQskCqGh`

**Record Count** (sample): 2

### Fields

| Field Name | Type | Sample Value | Notes |
|------------|------|--------------|-------|
| ID | string | "rectC3zHsHEX4FqxA" | - |
| Nome | string | "Ambra Ugulini" | - |
| Ruolo | string | "Sales" | - |
| Email | string | "ambra@materassidoctorbed.com" | - |
| Attivo | boolean | true | - |
| Telefono | string | "3347713654" | - |
| Password | string | "$2b$12$190U.nai1T8PMAR4HfEPuu3KI8dZW/qwYjaIOdZ8Pgz..." | - |
| Avatar_URL | string | "https://rwuyz7sohysfo8fr.public.blob.vercel-storag..." | - |

### Sample Record

```json
{
  "id": "rectC3zHsHEX4FqxA",
  "fields": {
    "ID": "rectC3zHsHEX4FqxA",
    "Nome": "Ambra Ugulini",
    "Ruolo": "Sales",
    "Email": "ambra@materassidoctorbed.com",
    "Attivo": true,
    "Telefono": "3347713654",
    "Password": "$2b$12$190U.nai1T8PMAR4HfEPuu3KI8dZW/qwYjaIOdZ8PgzgGaXKEFeMa",
    "Avatar_URL": "https://rwuyz7sohysfo8fr.public.blob.vercel-storage.com/avatars/rectC3zHsHEX4FqxA-1757971539611.jpg"
  }
}
```

---

## Marketing_Sources

**Table ID**: `tblXyEscyPcP8TMLG`

**Record Count** (sample): 5

### Fields

| Field Name | Type | Sample Value | Notes |
|------------|------|--------------|-------|
| Name | string | "Sito" | - |
| Description | string | "Lead organici dal sito web" | - |
| Active | boolean | true | - |
| Color | string | "#10B981" | - |
| Lead | array<linked_record> | ["recPmRZBjkBAeYzRU","recPvhczL57JLvnkZ","recbqggVCmYjrrqbC","... +14 more"] | Unknown (linked record) |
| ID | string | "rec4MswhV1QidOGMn" | - |

### Sample Record

```json
{
  "id": "rec4MswhV1QidOGMn",
  "fields": {
    "Name": "Sito",
    "Description": "Lead organici dal sito web",
    "Active": true,
    "Color": "#10B981",
    "Lead": [
      "recPmRZBjkBAeYzRU",
      "recPvhczL57JLvnkZ",
      "recbqggVCmYjrrqbC",
      "reczEZluoKnIfrcQh",
      "recDS6CzR95EuC4Tt",
      "rec51K9ckQIkMQM3G",
      "recSoCXK61J9kCgtb",
      "reckU884T02GzI6IO",
      "rec2ZXndbJIr3qBFN",
      "receDCuyEw9y7lgPB",
      "rec4DTxjeXO9T131O",
      "recZwlfdkZqcxHidw",
      "recZ3uFiBKvq4AJIa",
      "recx68E5qflw69iqh",
      "recYBk7hCdrcbXFEz",
      "rec5657ZwNfVVlUqb",
      "recFZ1vptjIwPqGFG"
    ],
    "ID": "rec4MswhV1QidOGMn"
  }
}
```

---

