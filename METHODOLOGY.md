# Sales Health Module — Methodology

This document describes how the analyzer ingests two CSV exports and produces the conversion scorecard, pipeline, and data-quality panels for Powerhouse Gym NYC. It reflects the current shipped logic and is meant as a single source of truth for future edits.

---

## 1. Inputs

### 1.1 Leads CSV

One row per lead record. Relevant columns (other columns are ignored):

| Column | Meaning |
|---|---|
| `id` | Unique row identifier |
| `first_name`, `last_name` | Name |
| `email` | Email (normalized: lowercased + trimmed, must contain `@`) |
| `phone_mobile` (fallbacks: `phone`, `mobile`) | Phone (normalized: last 10 digits only) |
| `source` | Where the lead came from — see §3.1 |
| `contact` | For iPad-created leads: `"Walk In"` (interested in joining) or `"Guest Visit"` (here to work out). **Not used as a filter** — see §13 |
| `status` | Lifecycle stage: `enquiry`, `guest`, `tour`, `trial`, `sale`, `not_interested` |
| `tags` | Comma-separated tags. The two that matter: `"Online Join"` and `"Unfinished Online Join"` |
| `created_at` | Lead creation timestamp (MM/DD/YYYY) |
| `sale_at` | Sale timestamp if the lead converted |
| `guest_waiver_signed` | `"Yes"` / `"No"`. `Yes` = physically visited and signed the iPad waiver |
| `created_by` | Who/what created the record. `"Visitor App"` = iPad registration |
| `opted_out_of_sms`, `opted_out_of_email` | `"Yes"` / `"No"` — used in the Pipeline reachability calc |

### 1.2 Member report CSV

One row per **currently active** member (already-cancelled members are NOT in this file). Relevant columns:

| Column | Meaning |
|---|---|
| `Member Name (last, first)` | Full name, comma-separated |
| `Email` | Email |
| `Primary Phone` | Phone |
| `Begin Date` | When they became a member |
| `Member Status` | Active / Pending Cancel / etc. |
| `Membership Type` | Agreement name — used to detect short-term passes |
| `Agreement Payment Plan` | Used to detect short-term passes |
| `Check In Count`, `Last Visit Date` | Engagement metrics |

---

## 2. Normalization helpers

- **Email** — lowercased + trimmed
- **Phone** — last 10 digits of the stripped-digits string
- **Date parsing** — explicit `MM/DD/YYYY` parser to avoid locale drift
- **Month key** — `YYYY-MM` for all monthly grouping; displayed as `"March 2026"` in the UI

---

## 3. Lead classification

Each raw lead is assigned exactly one `_category` by applying these rules in order and stopping at the first match:

| # | Test | Category |
|---|---|---|
| 1 | `tags` contains `"unfinished online join"` | `EXCLUDE` — removed from all counts |
| 2 | `status == "guest"` | `GUEST` — day-pass visitor, reported separately |
| 3 | `tags` contains `"online join"` | `ONLINE_SALE` |
| 4 | `created_by == "Visitor App"` (case-insensitive) | `PROSPECT_WALK_IN` |
| 5 | `isWebSource(source)` AND `guest_waiver_signed == "Yes"` | `WEB_LEAD_CAME_IN` |
| 6 | `isWebSource(source)` AND waiver != Yes | `WEB_LEAD_NEVER_CAME_IN` |
| 7 | anything else | `UNKNOWN` |

### 3.1 `isWebSource()` — broad web-source check

Used by the legacy member-side classification (rules 5 and 6 above). Returns true for:
- `website`, `powerhouse website`, `*powerhousegymnyc.com*`
- `google`
- `instagram`, `facebook`, `facebook post`

### 3.2 `isLiteralWebsite()` — strict web-source check

Used by **all the new lead-side conversion buckets** (Try Us, Promo, Online Join, Web No Visit) per spec. Returns true only if `source == "website"` (case-insensitive). This intentionally excludes Google, Instagram, and Facebook because those source values on POS-created records are not meaningful attribution data (see §13.2).

### 3.3 `_webOrigin`

A boolean flag set on every raw lead = `isWebSource(source)`. Preserved through dedupe as a **union** across the dedup group so that the "originally a web lead" signal is never lost when an online-join record supersedes a prior web form.

---

## 4. Dedupe

Raw leads are grouped by:
- `email` if present, otherwise
- normalized `phone` if ≥10 digits, otherwise
- a synthetic unique key (never merges)

**⚠️ Known gap:** records with email-only vs. phone-only are not grouped, even if the same person. Compensated for elsewhere in the Walk-up Signups re-credit logic (§7.3).

Within each group:
1. Sort by `created_at` ascending (earliest first)
2. Same-day ties broken by `CATEGORY_PRIORITY`: `ONLINE_SALE < WEB_LEAD_CAME_IN < WEB_LEAD_NEVER_CAME_IN < PROSPECT_WALK_IN < UNKNOWN < GUEST < EXCLUDE`
3. Keep the earliest record; union `_webOrigin` across the group so any later-dropped web record still leaves a trace

---

## 5. Short-term agreement exclusion

Members are filtered OUT if their `Agreement Payment Plan` contains any of:
- `1 month pif`
- `2 mo  pif`
- `3 mo  pif`

These are short-term PIF passes, not durable memberships. The count of short-term signups in the period is surfaced as a data-quality line.

---

## 6. Member → Lead matching

Priority order:
1. **Normalized email** — both sides lowercased + trimmed, must contain `@`
2. **Normalized phone** — both sides last-10-digits

Name-only matching is never used (too many false positives).

`leadByEmail` and `leadByPhone` maps are built from the deduped leads, keyed to the first lead per contact. A member matches to at most one lead.

`leadMatchesAnyMember(lead)` — reverse check: does this lead's email or phone appear in the member report?

---

## 7. Member entry-point classification

Every new long-term member in the period is placed into exactly one `membersByEntry` bucket, using this logic:

```
matchedLead = matchLead(member)

if no matchedLead OR matchedLead is GUEST/EXCLUDE
    → WALK_UP_SIGNUP

else if matchedLead is ONLINE_SALE OR WEB_LEAD_NEVER_CAME_IN
    → REMOTE_SALE

else if matchedLead is UNKNOWN
    priorFunnelLead = findPriorFunnelLead(member, matchedLead)
    if priorFunnelLead is PROSPECT_WALK_IN       → PROSPECT_WALK_IN  (re-credited)
    else if priorFunnelLead is WEB_LEAD_CAME_IN  → WEB_LEAD_CAME_IN  (re-credited)
    else if priorFunnelLead exists at all        → REMOTE_SALE       (re-credited)
    else                                         → WALK_UP_SIGNUP

else
    → matchedLead._category  (PROSPECT_WALK_IN or WEB_LEAD_CAME_IN)
```

### 7.1 `findPriorFunnelLead(member, matchedLead)`

Scans all deduped leads for one that:
- Is **not** the matched lead
- Has `_createdAt` strictly earlier than the matched lead's `_createdAt`
- Has `_category` in `{PROSPECT_WALK_IN, WEB_LEAD_CAME_IN, WEB_LEAD_NEVER_CAME_IN, ONLINE_SALE}`
- Shares email OR phone with the member

Returns the first match (or null).

### 7.2 Why re-credit

POS-created records with throwaway source values (Instagram, Member Referral, etc.) were inflating Unknown. ~84% of those records are genuine same-day walk-ups with no prior funnel activity — those fold into **Walk-up Signups**. The other ~16% had a real iPad or web lead earlier that was accidentally not updated at sale — those should count for whichever funnel actually sourced them.

### 7.3 Why this catches dedupe gaps

If the raw dataset has an email-only iPad lead and a phone-only POS lead (dedupe wouldn't merge them), `findPriorFunnelLead` still finds the iPad lead by checking email-or-phone against the member directly.

---

## 8. Lead-side conversion buckets (the scorecard)

These are the conversion rates shown on the dashboard. Each has a specific lead filter (denominator) and conversion predicate (numerator) independent of §7.

### 8.1 Prospect Walk-in

- **Denominator:** period leads where `_category == PROSPECT_WALK_IN` (i.e., `created_by == "Visitor App"`)
- **Numerator:** leads that appear in `matchedLeadSet` — a set of leads that any new long-term member matched to
- **Benchmark:** 40%
- **Filter note:** the denominator uses `created_by`, not `contact == "Walk In"`. The broader filter includes anyone the floor team registered on the iPad regardless of whether they tapped "interested in joining" or "here to work out". A strict `contact == "Walk In"` filter would drop the rate by roughly 10pp but is NOT what this bucket currently measures. See §13.1.

### 8.2 Web Lead Came In — Try Us

- **Base filter:** `isLiteralWebsite(source) AND guest_waiver_signed == "Yes"` (submitted via Website, physically visited)
- **Regime split:** `created_at` is **outside** every active `PROMO_WINDOWS` entry
- **Numerator:** lead is in `matchedLeadSet`
- **Benchmark:** 20%
- **Interpretation:** the everyday web-to-club close rate

### 8.3 Web Lead Came In — Promo

- **Base filter:** `isLiteralWebsite(source) AND guest_waiver_signed == "Yes"`
- **Regime split:** `created_at` **is inside** an active promo window
- **Numerator:** lead is in `matchedLeadSet`
- **Benchmark:** none (reference only). Promo traffic is colder and converts lower — blending with Try Us hides both signals.
- **Display:** the card header shows the active promo label(s)

### 8.4 Online Join

- **Filter:** period leads with `_category == ONLINE_SALE` (tags contain "online join", NOT "unfinished online join")
- **Numerator:** leads where `status == "sale"` — the same record updates in place when payment lands
- **Benchmark:** none. Converts at near 100% by definition (these are completed checkouts).

### 8.5 Web Lead — No Visit

- **Filter:** `isLiteralWebsite(source) AND guest_waiver_signed != "Yes" AND status != "sale"` — inquired online, never came in, never closed on the lead record
- **Numerator:** `leadMatchesAnyMember(lead) == true` — joined through another path later
- **Benchmark:** none. Reference metric for "off-funnel rescue" — people who inquired online and bought through a later walk-in or phone sale.
- **Why `waiver != Yes`:** prevents double-counting with the Came In buckets. Anyone who came in is captured there, not here.

### 8.6 Promo windows configuration

```js
const PROMO_WINDOWS = [
  { start: '2026-03-11', end: '2026-03-23', label: 'Free Pass March 2026' },
];
```

Add entries as new promos run. Dates are inclusive. Labels appear in the Promo card header.

---

## 9. Walk-up Signups bucket

Single volume-only bucket (no rate) replacing what was previously shown as two separate buckets (Unknown and Direct Walk-in). Per §7 classification, the bucket includes:

1. **No-lead-record signups** — member with no email/phone match in the lead system. Walked up cold, signed up same day, staff never logged a lead.
2. **POS-only signups** — member matched to a single UNKNOWN-category lead with no prior funnel record. The lead was manually created at point of sale with a throwaway source (Instagram, Member Referral, Google, etc.) because the system requires a source field.

Both populations represent the same operational reality: same-day walk-ups with no meaningful funnel activity.

**Display:**
- Total count + monthly breakdown (member count per month by `Begin Date`)
- Header note splits the total into "N with no lead record + M POS-only records"
- When re-credits happened, a caveat line reports how many records were moved out to their prior funnel source

**No conversion rate is shown** because there is no coherent denominator — by definition these members were never in any funnel.

---

## 10. Members With No Lead Record (data-quality metric)

Subset of Walk-up Signups: members whose email AND phone fail to match any lead in the system.

Presented as a **standalone** panel with:
- Total count
- Monthly breakdown with count + `% of that month's total sales`

Purpose: measure lead-entry hygiene at point of sale. Trend down = staff are logging more walk-up signups as leads before they become members.

---

## 11. Blended close rate

- **Numerator:** all new long-term members in the period
- **Denominator:** all period leads that are NOT `EXCLUDE` and NOT `GUEST`
- **Benchmark:** 20%

Includes every entry point (Prospect Walk-in, Web Came In, Remote Sale, Walk-up Signups). Walk-up Signups contribute to the numerator but also to the denominator via any matched POS leads — members with no lead record do NOT inflate the denominator (since there's no lead for them).

---

## 12. Other panels

### 12.1 Pipeline

- **Warm (D1):** non-guest non-excluded enquiries with `waiver == Yes` and no member match. "Signed the iPad, haven't joined" — personal follow-up.
- **Cold (D2):** non-guest non-excluded enquiries where `_category == WEB_LEAD_NEVER_CAME_IN` (web source, waiver = No, no online-join tag, no member match). Automated nurture.
- **Reachability:** each bucket split by whether both SMS and email channels are open. Potential-member estimates use only the reachable count (40% close on warm, 10% conservative on cold).
- **Period scope:** only leads created within the reporting period. Older leads are stale and handled separately.

### 12.2 Velocity

Days between matched-lead `_createdAt` and member `_beginDate`, bucketed:
- Same/next day (≤1 day)
- Within 7 days
- Within 30 days
- Over 30 days

Computed across all entry points that have a matched lead (Walk-up Signups members with no lead match are naturally excluded).

### 12.3 Guest summary

- Count of `GUEST`-category leads in the period
- Guest → member conversion: guest emails that match any member in the report
- Repeat guests: same email appears >1 time

Near-zero guest conversion is expected for a Manhattan location with heavy tourist volume.

### 12.4 Club grade (three pillars)

Weighted composite scored against benchmarks:
- **Close Rate — 40%.** Blended vs 20%.
- **Floor Conversion — 35%.** Average of Prospect Walk-in (vs 40%) and Web Lead Came In (vs 20%). Note: currently uses the **broad** `webCameIn` (all isWebSource), not the split Try Us. This is preserved for backward compatibility.
- **Pipeline Velocity — 25%.** Within-30-day share vs 80%.

Each pillar scored `min(100, (actual / benchmark) × 85)` — hitting benchmark = 85 (a B).

---

## 13. Interpretation notes / known caveats

### 13.1 Prospect Walk-in filter is `created_by`, not `contact`

Current denominator: `created_by == "Visitor App"` — every lead the floor team registered on the iPad.

Alternate (NOT used): `contact == "Walk In"` — only those who tapped "interested in joining". This alternate definition would:
- Exclude `contact == "Guest Visit"` (day-pass intent) records, even if they later converted
- Shrink both the numerator and denominator
- Drop the displayed rate by ~10pp

The broader `created_by` definition is kept because it better answers the operational question: *how well does the floor team close people they meet in person?*

### 13.2 POS source values are not real attribution

When a customer walks up and signs up same-day without a prior lead record, staff create a lead at point of sale. The system requires a `source` field, so staff pick something: Instagram, Google, Member Referral, etc. These values are **not meaningful** — they're required-field noise.

This is why:
- The Unknown bucket was dropped from funnel display
- `isLiteralWebsite()` uses strict `"website"` only, not the broad set
- The data-quality caveat phrasing calls these "POS-created source values"

### 13.3 Cancelled members are invisible

The member report only contains currently-active members. Anyone who joined during the period and already cancelled by the time the export ran is NOT in the data. All acquisition figures are a **floor**, not a ceiling. A cancelled-members export would be needed for true gross-new-member counts and churn.

### 13.4 Matching limits

- Email + phone only. Name-only matching is not used.
- Members with mismatched contact details across systems default to Walk-up Signups.
- Dedupe groups by email OR phone individually (not both). The §7 re-credit scan compensates for email-only vs phone-only splits, but there's no deeper deduplication.

### 13.5 Re-credited count reporting

When §7 re-credits fire, the displayed Prospect Walk-in and Web Lead Came In member counts can be slightly higher than what a pure matched-lead tally would produce. The re-credited count is surfaced as a data-quality caveat when > 0 so the shift is auditable.

---

## 14. Output field map

What each UI element reads from the computed stats:

| UI element | Data field |
|---|---|
| Hero close rate | `blended.rate` |
| Waffle / distribution | `acquisitionByEntry`, `acquisitionByEntryPct` over `ENTRY_ORDER` |
| Monthly member trend chart | `monthlyMemberTrend` |
| Prospect Walk-in card | `prospectWalkIn` + `prospectWalkInMonthly` |
| Web Lead Came In — Try Us card | `webCameInTryUs` (includes `.monthly`) |
| Web Lead Came In — Promo card | `webCameInPromo` (includes `.monthly` + `.promoLabels`) |
| Online Join card | `onlineJoin` (includes `.monthly`) |
| Web Lead — No Visit card | `webLeadNoVisit` (includes `.monthly`) |
| Walk-up Signups card | `walkUpSignupCount`, `walkUpSignupMonthly`, `walkUpNoLeadCount`, `walkUpPosOnlyCount`, `walkUpRecreditedCount` |
| Members With No Lead Record panel | `membersWithNoLeadRecord.{total, monthly}` |
| Pipeline | `warmPipeline`, `warmReachable`, `warmOptedOut`, `coldPipeline`, `coldReachable`, `coldOptedOut`, `openPipelineTotal` |
| Velocity ribbon | `velocitySameDayPct`, `velocityWithin7Pct`, `velocityWithin30Pct`, `velocityOver30Pct`, `medianDaysToClose` |
| Guest summary | `guestCount`, `guestConverted`, `guestConvRate`, `repeatGuests` |
| Data quality flags | `duplicatesRemoved`, `unrecognizedSources`, `partialMonths`, `noPhoneMembers`, `walkUpRecreditedCount` |

---

## 15. File layout

- `public/index.html` — the entire client app. CSV parsing, `computeStats()`, `renderDashboard()`, `renderPrintView()`. All bucket math lives here.
- `netlify/functions/analyze.js` — a Netlify function that takes the pre-computed stats and calls Claude to produce narrative copy (`periodSummary`, `acquisitionHappened`, `acquisitionImprovements`, `scorecardSummary`, `pipelineAnalysis`, `guestNote`). Ships a deterministic fallback if the API times out.

No stats are computed server-side — the function is narrative-only.
