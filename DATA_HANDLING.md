# How the Dashboard Reads Your Numbers

This is a walkthrough of what the dashboard does with your data, written for a gym owner — not a data analyst. If a number on the report ever looks off, the sections below will tell you exactly what goes into it so you can check it yourself.

**The short version:** the dashboard takes the two reports you export from your systems and lines them up against each other. It counts things. It does not guess, estimate, or make anything up. Every number on the report comes from those two files.

---

## 1. What the Dashboard Looks At

You give it two things:

1. **Your lead list** — every person who ever showed interest: walked in, filled out a web form, signed the iPad, bought online, or was entered by staff.
2. **Your member list** — everyone who is currently an active paying member.

That's it. The dashboard doesn't talk to your payment processor, your website, or your email tool. Every number you see comes from those two files.

---

## 2. The Reporting Period

You pick a start date and an end date. The dashboard includes the full first day and the full last day — nothing gets cut off at the edges.

Anyone whose record falls outside those dates is ignored for the period totals. But they're not thrown away entirely — if a new member joined during the period but their original web inquiry came in before the period, the dashboard can still link them together so you know how that member originally found you.

---

## 3. Sorting Every Lead

Every lead on your list is placed into exactly one group. This is the most important step, so here's what goes where in plain terms:

1. **Unfinished online join** — they started buying online but never finished. These are pulled out of every count. They're not a prospect and not a member, so mixing them into either number would be misleading.
2. **Guest** — a day-pass visitor. Reported separately in the Guests section.
3. **Online sale** — completed the online join and became a member without ever coming in.
4. **Prospect walk-in** — walked in off the street and signed the iPad (day pass, tour, trial). No prior web form.
5. **Web lead who came in** — filled out a web form first, then actually showed up and signed the iPad.
6. **Web lead who never came in** — filled out a web form but never physically visited.

If a lead doesn't match any of these, it's labeled "unknown" and shown on the Data Quality panel along with whatever the source field actually says. This way you can see what staff are typing and correct it at the source.

**Groups are decided in order.** If a lead could fit into two of them, the higher one on the list wins. This is what keeps the same person from being double-counted. Someone who filled out a web form and then finished an online purchase shows up in your acquisition numbers once — as an online sale — not twice.

---

## 4. Removing Duplicates

The same person often shows up as multiple lead records. Before counting anything, the dashboard merges these together:

- Same email address? Treated as the same person.
- No email but same phone number? Treated as the same person.
- The **earliest** record wins — that's the most honest answer to "when did this person first find us."
- On same-day ties, the record with the stronger signal wins, so a walk-in beats a mystery record from the same day.

The count of duplicates merged away is shown on the Data Quality panel so you always know how much cleaning happened.

**The dashboard preserves a person's full journey.** If someone filled out a web form on day 1 and then completed an online purchase on day 30, both records exist in your data. Only one survives the merge, but the "they originally came from the web" signal is **carried forward** onto the surviving record. No web-to-online journey is lost just because one record won the tiebreak.

---

## 5. Cleaning Up the Member List

Two things happen to your member list before acquisition is counted:

- **Short-term memberships are pulled out.** A 1-month, 2-month, or 3-month paid-in-full plan is not counted as a long-term acquisition. Mixing these with real memberships would inflate your numbers. The count of short-term memberships removed is reported on the dashboard so it's never hidden.
- **Pending cancels are flagged.** Members who have already submitted cancellation paperwork are subtracted from the "active members right now" headline. They're still credited as an acquisition in whatever month they originally joined, because they did join.

---

## 6. Matching Members Back to Their Lead Record

For each new member in the period, the dashboard looks up their original lead record. This is how it tells you **how** that member found you.

The lookup uses email first, then phone. If a member has no matching lead record — or the only lead record for them is a guest pass or an unfinished online join — the dashboard labels them a "direct walk-in." That means they bought without going through any trackable funnel.

---

## 7. The Five Ways People Actually Join

Once matching is done, every new member lands in one of five groups. Every new member is in exactly one. No overlaps, no leftovers.

| Group | Who's in it | Target close rate |
|-------|-------------|-------------------|
| **Prospect walk-in** | Walked in cold, signed the iPad, became a member. | 40% |
| **Web lead who came in** | Filled out a web form, physically visited, became a member. | 20% |
| **Remote sale** | Joined without visiting — bought online or bought after a web inquiry without ever coming in. | No industry target — reported for reference |
| **Unknown** | Lead record exists but the source doesn't tell us how they first found you. | No target — informational only |
| **Direct walk-in** | Bought without ever being entered as a lead. Usually sight-unseen buyers. | No close rate — volume only |

**Remote sale is split into two sub-groups so you can see the journey:**

- **Started as a web lead** — at some point in this person's history, they came in through your website, Google, Instagram, or Facebook. Even if they finished the purchase online, the web-form beginning is preserved. This is the important one: it tells you the web side of your funnel is working all the way through to a sale.
- **Sight-unseen** — completed an online sale with no web-form trail anywhere in their history. Truly bought online without you ever seeing them come through a form first.

The split works the way any owner would want it to work: if the same person filled out a web form early on and later completed an online purchase, they are counted as "started as a web lead" — the earlier web signal is not erased by the later online-join record.

**Direct walk-in has no close rate** because if someone bought without ever being entered as a lead, there's no lead count to divide into. Reporting a percentage there would be nonsense. So the dashboard reports the volume only.

---

## 8. How Close Rates Are Calculated

Every close rate is a simple fraction: **members of a certain type, divided by leads of that same type**, shown as a percentage.

- **Blended close rate** — every new long-term member divided by every lead in the period (minus guests and unfinished online joins). Target: 20%.
- **Prospect walk-in close rate** — prospects who walked in and became members, divided by total prospect walk-ins. Target: 40%.
- **Web lead who came in close rate** — web leads who visited and became members, divided by total web leads who visited. Target: 20%.
- **Remote sale close rate** — remote sale members divided by the combined pool of online-sale leads and web leads who never visited. Reported for reference, no industry target.
- **Unknown** — informational only.

One thing worth knowing: the **blended** rate is a total-over-total calculation. It is not the average of the individual channel rates. Averaging channels together would make a small channel punch way above its weight and the number would lie. Total-over-total is the honest answer.

---

## 9. The Open Pipeline (People Worth Chasing Right Now)

The pipeline section looks only at leads **created during the reporting period** that have **not** become members yet. Older leads that never converted are considered cold and stale — they're not mixed into this list.

Those open leads are split two ways:

- **Warm** — they came in and signed the iPad but haven't bought yet. These are worth a personal phone call or text from the sales floor.
- **Cold** — they filled out a web form but never actually walked in, and didn't start an online purchase. These are the right audience for an automated email or text nurture.

Each bucket is also split into **reachable** (you're allowed to contact them) vs. **opted out** (they've said no to texts or emails, so you legally can't automate a reach-out). Opted-outs are shown separately so you're not chasing impossible numbers.

A lead can only be in one of warm or cold. The definitions don't overlap.

---

## 10. Velocity — How Fast Leads Close

For every new member who had a matching lead record, the dashboard counts the number of days between their first contact and their membership start date. It then shows what share closed:

- On the same day or the day after
- Within a week
- Within a month
- After a month

Direct walk-ins aren't included here — they have no lead record, so there's nothing to measure the days from.

The median number of days to close is also shown.

---

## 11. Guests

Guest passes are kept in their own section. They are **not** included in acquisition or close-rate math — counting them there would dilute every number on the report.

The guest section shows:

- How many guests came through during the period.
- How many of those guest emails match a current member (your conversion count).
- How many guests visited more than once during the period (the realistic conversion targets — locals, not tourists).

Near-zero guest conversion is expected for a Manhattan location with heavy tourist volume. The dashboard reports the number without alarm.

---

## 12. The Trend Charts

- **Monthly new members** — new long-term members grouped by the month they joined. If any month drops more than 10% compared to the one before, that month gets a warning flag.
- **Monthly leads (web vs. walk-in)** — overlaid on the same chart so you can see whether your lead sources are rising or falling alongside your sales.
- **Day-of-week signups** — which days of the week people tend to join on.

---

## 13. What Leaves Your Browser

The heavy lifting — every number on the dashboard — happens in your browser. Your lead list and your member list never leave your machine.

After the numbers are calculated, the dashboard sends **only the finished totals and percentages** to the service that writes the plain-English paragraphs you see on the report. No names, no emails, no phone numbers, no individual records of any kind — just the counts and rates you can already see on the screen.

If that narrative service is slow or unavailable, the dashboard falls back to writing the paragraphs itself from the same numbers. Either way, the numbers on the report are always the numbers your browser calculated.

---

## 14. What the Dashboard Admits It Can't See

All of this is surfaced on the Data Quality panel, not hidden:

- **The active member list is a snapshot of today.** Anyone who joined during the reporting period and has already cancelled by the time you run the report does not appear in the member file. So acquisition figures are a **floor**, not a ceiling. The report says this out loud in the opening paragraph.
- **How many duplicate lead records were merged away.**
- **How many leads fell into "unknown"** because the source field didn't match anything known. The actual source text is shown so you can see what staff are typing.
- **Partial months.** If your reporting period starts or ends mid-month, those months are flagged by name so you don't compare them unfairly against full months.
- **Members with no phone on file.** These members can only be matched to a lead by email. If they have neither, they'll be labeled "direct walk-in" even if they really did come through a funnel.
- **How many short-term memberships were removed** from the long-term acquisition totals.

---

## 15. How to Verify Any Number by Hand

If you want to spot-check the dashboard, here's a recipe anyone with Excel can run in under an hour:

1. **New members.** Open your member export. Filter to members whose begin date falls in your reporting period. Remove anyone on a 1-month, 2-month, or 3-month paid-in-full plan. The row count should match "new long-term members" on the dashboard.
2. **Lead count.** Open your lead export. Filter to leads created in the period. Remove guests and unfinished online joins. Remove duplicates by email, falling back to phone where email is missing. The row count should match the blended rate's lead count.
3. **Blended close rate.** Divide step 1 by step 2. It should match the dashboard to one decimal place.
4. **Channel check.** Pick any one new member. Find them in the lead list by email. The sorting rules in Section 3 tell you exactly which group their lead belongs in, which maps to one of the five join groups in Section 7.
5. **Remote sale check.** Pick a member counted as a remote sale. Look at every record for them in the lead list. If any of those records has a web source (Website, Google, Instagram, Facebook), they should be in the "Started as a web lead" sub-group. If none do, they should be in "Sight-unseen."
6. **Warm pipeline check.** Pick any lead in the warm pipeline and confirm three things: they were created in your reporting period, they signed the iPad, and they don't appear in the member list.

If any of these disagree with the dashboard, that's a real problem worth reporting — send the specific name or ID and it can be traced back through every step above.
