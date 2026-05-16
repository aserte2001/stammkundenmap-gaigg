# AVV-Anfrage-Template — World Labs

E-Mail-Vorlage für die DSGVO-konforme Auftragsverarbeitungs-Vereinbarung mit World Labs Inc. (San Francisco, USA), wenn personenbezogene Daten in den 3D-Welten enthalten sind (Garten-Fotos können z.B. erkennbare Hausnummern, Personen, KFZ-Kennzeichen zeigen).

---

**An:** legal@worldlabs.ai
**Betreff:** Request for Data Processing Agreement (DPA) — German GDPR / EU customers

Dear World Labs Legal Team,

We are Gartengestaltung Gaigg, a landscape design company based in Linz, Austria. We use the Marble World API (multi-image input → SPZ Gaussian splat output) to create 3D representations of our clients' gardens for internal documentation and customer presentation.

Because some of these images may contain personal data under the EU General Data Protection Regulation (GDPR), Article 28 obliges us to enter into a written Data Processing Agreement (DPA / *Auftragsverarbeitungsvertrag*) with you as our processor.

**Could you please:**
1. Confirm whether World Labs Inc. provides a standard DPA for API customers
2. Send us your current DPA template (English or German)
3. Confirm the data-transfer mechanism for personal data leaving the EU (Standard Contractual Clauses, EU–US Data Privacy Framework certification, etc.)
4. Provide your contact for ongoing data-protection inquiries

For our internal documentation we will need to know:
- **Sub-processors** you use (CDN providers, AI-model hosts, etc.)
- **Data retention period** for uploaded images and generated worlds
- **Deletion process** when we close our account or delete a world
- **Security certifications** (SOC 2, ISO 27001, etc.) if available

Our Marble account email: **<account-email-here>**
Our company contact for DPA matters: **Gartengestaltung Gaigg, Simon Geig, <admin-email-here>**

Thank you very much. We look forward to your response.

Best regards
Simon Geig
Gartengestaltung Gaigg

---

## What we'll do once we have the DPA

1. Sign and counter-sign
2. Add a sub-processor list to `app/datenschutz/page.tsx`
3. Update the privacy notice with the data-transfer mechanism (e.g. "World Labs is certified under the EU-US Data Privacy Framework")
4. Document the retention period in `docs/capture-workflow.md`

## Status (this file is meant to be edited)

- [ ] Initial inquiry sent: `<date>`
- [ ] DPA template received: `<date>`
- [ ] Reviewed by legal: `<date>`
- [ ] Signed and filed: `<date>`
- [ ] Privacy notice updated: `<date>`
