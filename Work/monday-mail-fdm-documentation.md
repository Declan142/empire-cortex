# Monday Mail — FDM Budget Load Documentation + Technical Spec Proposal

**To:** D'Angelo, Antonino; Yamauti, Claudio
**Cc:** Bansal, Keshav; P, Gokul; Kataria, Ritika; A, Kalaivani; Eswarappa, Gorava; Makaraju, Ramasubra; Jain, Raunak; XL-UG XLRE RDW Datawarehouse Operations
**Subject:** RB26/SP26 Budget Load — Documentation of Manual Changes + Technical Spec Proposal

---

Hi Nino, Claudio,

Now that the RB26 FDM load is complete, I wanted to document all the manual data and view-level changes that were made on our side during this cycle, and propose a path forward to avoid repeating this in future loads.

## Manual Changes Made During RB26 / SP26 Budget Load

### 1. Ceded Overrider & FET Merge (March 16-18)
With the new Anaplan Ceded model, ceded acquisition was split into 3 components (Ceded Commission, CEAC Overrider, Ceded FET). The FDM/RDW load expects a single ceded acquisition line item. 
**Change:** Updated SQL views to merge all 3 components into a single `[amt_expense_written]` / `[amt_expense_earned]` / `[Acquisition_Cost]` field across both income statement and loss ratio views.

### 2. Planning LOB Code Format Change (March 20)
Anaplan restructured PLOB codes from a standard 4-digit integer (e.g., `2047`) to a concatenated format (e.g., `2047_10011_116613`). The RDW target column expects `int`.
**Change:** Updated `[v_ADHOC_XLRE_loss_ratio_and_drivers_V2_DIP]` and `[v_ADHOC_XLRE_income_statement_DIP_v2]` to extract the 4-digit code from the new concatenated format.

### 3. Symposium Class Code Handling
Source data contained decimal values (e.g., `1013.0`). Target expects integer.
**Change:** Applied `Cast(Cast([Symposium Class_Code] as float) as int)` conversion and exclusion filters for specific codes.

### 4. Cover Basis NULL Handling
Source data had NULL values in `[Cover Basis]` causing downstream failures.
**Change:** Applied `COALESCE([Cover Basis], '')` to handle NULLs.

### 5. Written vs Earned Loss Methodology (Nov 2022 — Steve Zhao / Keshav Bansal changes, maintained through RB26)
Multiple loss calculation fields were updated to use Written basis instead of Earned basis.
**Change:** Maintained and verified all written loss fields (`[Mean Cat Written Selected LR Amount - Ext]`, `[Attritional Written Selected LR Amount - Ext]`, `[Large Written Selected LR Amount - Ext]`) plus ULAE and Discount Unwind adjustments across all CASE statements.

### 6. Source Table Updates Per Planning Season
Each planning season requires pointing views to the correct source tables.
**Change:** Updated FROM clause in all views:
- Income Statement DIP → `[t_XLRE_FinalReport_ByMonth_AllProjYears_AllCurrencies_RB26_topside]`
- Income Statement DIP v2 → `[XLRE_FinalReport_ByMonth_SP26]`
- Loss Ratio v2 DIP → `[t_XLRE_FinalReport_ByMonth_AllProjYears_AllCurrencies_RB26_topside]`

### 7. Planning Season Parameters
Hardcoded values updated for RB26 cycle.
**Change:** `planningseason_key = 63`, `planningseason_description = 'Budget 2026 - 2027'`, `plan_ver_id = 2026`, `version = 2026`.

### 8. UNION Part — Tail Year Projection (Year 2029)
The UNION portion of the income statement views computes tail-year reserve movements with zeroed-out premium/expense fields and Written−Earned loss differentials.
**Change:** Verified all loss fields use `(Written − Earned)` methodology for the tail portion, zeroed out premium/expense/acquisition fields as not applicable.

---

## Impact

These changes were made ad-hoc over the course of the RB26 cycle, often under time pressure with production loads blocked. While we were happy to accommodate, this approach is **not sustainable** for future loads:

- **No formal spec exists** defining what format/structure our views should output
- **Anaplan structure changes** (PLOB codes, ceded split) propagate to us without prior notice
- **Each change requires view ALTER → DBA ticket → prod deployment** — adding hours/days of delay
- **Risk of regression** — with 6+ manual changes per cycle, one missed update breaks the entire load

---

## Proposal: Technical Specification Document

As discussed, I'd like to propose we create a formal **Technical Spec** that defines:

1. **Exact column list, data types, and constraints** expected by the RDW target tables
2. **Source-to-target mapping** — which Anaplan field maps to which RDW column
3. **Transformation rules** — any conversions, merges, or calculations applied at the view layer
4. **Change management process** — if Anaplan structure changes, who notifies whom and what's the lead time?
5. **Testing/validation criteria** — what reconciliation checks must pass before production release

Once signed off, this becomes the contract: if we comply with the spec, downstream should not break. Any Anaplan changes that impact the spec need to go through a change request with adequate lead time.

I'm happy to draft the initial version of this document based on the current view definitions. Would appreciate if the RDW/DW Ops team can provide the target table DDLs so we can align both sides.

Let me know if we can set up a call next week to kick this off.

Thanks,
Aditya
