const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic();

const ENTRY_LABELS = {
  PROSPECT_WALK_IN: 'Prospect Walk-in',
  WEB_LEAD_CAME_IN: 'Web Lead — Came In',
  REMOTE_SALE: 'Remote Sale',
  UNKNOWN: 'Unknown',
  DIRECT_WALK_IN: 'Direct Walk-in',
};

function buildFallback(s) {
  const periodSummary = `During this window, ${s.totalNonGuestLeads.toLocaleString()} prospects and ${s.totalGuests.toLocaleString()} guests came through the club's system — not all of them signed a waiver or physically visited. These figures exclude short-term memberships and pending cancels. Anyone who joined during the period and has already cancelled by today isn't reflected in the numbers either.`;

  const topEntry = ['PROSPECT_WALK_IN', 'WEB_LEAD_CAME_IN', 'REMOTE_SALE', 'UNKNOWN', 'DIRECT_WALK_IN']
    .map(k => ({ k, n: s.acquisitionByEntry[k] || 0, p: s.acquisitionByEntryPct[k] || 0 }))
    .sort((a, b) => b.n - a.n)
    .filter(x => x.n > 0);
  const dominant = topEntry[0] ? `${ENTRY_LABELS[topEntry[0].k]} at ${topEntry[0].p}% of new members` : 'no dominant source';
  const trend = s.monthlyMemberTrend || [];
  const trendDir = trend.length >= 2
    ? (trend[trend.length - 1].count > trend[0].count ? 'rising' : trend[trend.length - 1].count < trend[0].count ? 'declining' : 'flat')
    : 'flat';
  const blendedVsBench = s.blended.rate >= 20
    ? `at or above the 20% benchmark`
    : `${(20 - s.blended.rate).toFixed(1)}pp below the 20% benchmark`;
  const acquisitionHappened = `The club added ${s.totalNewLongTermMembers} new long-term members in the period. ${dominant.charAt(0).toUpperCase() + dominant.slice(1)} was the dominant entry point. The blended close rate was ${s.blended.rate}%, ${blendedVsBench}. The monthly trend was ${trendDir} across the period.`;

  const gaps = [];
  if (s.blended.rate < 20) {
    gaps.push({
      severity: 20 - s.blended.rate,
      title: 'Blended Close Rate',
      current: `${s.blended.rate}%`,
      target: '20%',
      gap: `−${(20 - s.blended.rate).toFixed(1)}pp`,
      action: 'Audit top-of-funnel handoffs and tighten pipeline follow-up on open enquiries.',
    });
  }
  if (s.prospectWalkIn.leads > 0 && s.prospectWalkIn.rate < 40) {
    gaps.push({
      severity: 40 - s.prospectWalkIn.rate,
      title: 'Prospect Walk-in Close Rate',
      current: `${s.prospectWalkIn.rate}%`,
      target: '40%',
      gap: `−${(40 - s.prospectWalkIn.rate).toFixed(1)}pp`,
      action: 'Retrain the floor team on the iPad-to-tour-to-close flow so cold walk-ins convert at a higher rate.',
    });
  }
  if (s.webCameIn.leads > 0 && s.webCameIn.rate < 20) {
    gaps.push({
      severity: 20 - s.webCameIn.rate,
      title: 'Web Lead — Came In Close Rate',
      current: `${s.webCameIn.rate}%`,
      target: '20%',
      gap: `−${(20 - s.webCameIn.rate).toFixed(1)}pp`,
      action: 'Strengthen the in-person close when web prospects arrive — tighten scripts and handoff after they sign the iPad.',
    });
  }
  const directPct = s.acquisitionByEntryPct.DIRECT_WALK_IN || 0;
  if (directPct > 25) {
    gaps.push({
      severity: directPct - 25,
      title: 'Direct Walk-in Share',
      current: `${directPct}%`,
      target: 'tracked',
      gap: `${s.acquisitionByEntry.DIRECT_WALK_IN} members off-funnel`,
      action: 'Enforce GymSales/iPad entry at point of sale so fewer members slip through without a lead record.',
    });
  }
  const unknownLeads = s.unknown.leads || 0;
  if (unknownLeads > 0) {
    gaps.push({
      severity: Math.min(unknownLeads / 10, 20),
      title: 'Unknown-Entry-Point Leads',
      current: `${unknownLeads} leads`,
      target: 'classified',
      gap: 'no web/iPad signal',
      action: 'Review the source values staff are picking and retrain on consistent lead-entry tagging.',
    });
  }
  gaps.sort((a, b) => b.severity - a.severity);
  const acquisitionImprovements = gaps.slice(0, 3);
  while (acquisitionImprovements.length < 3) {
    acquisitionImprovements.push({
      title: 'No additional material gap',
      current: '',
      target: '',
      gap: '',
      action: 'Maintain current execution and watch the monthly trend for early signal.',
    });
  }

  const scorecardSummary = `Blended close rate is ${s.blended.rate}% (${s.blended.members} of ${s.blended.leads} non-guest non-excluded leads) against the 20% benchmark — ${s.blended.rate >= 20 ? 'meeting' : 'below'}. Prospect Walk-in at ${s.prospectWalkIn.rate}% vs the 40% bar (${s.prospectWalkIn.rate >= 40 ? 'meeting' : 'below'}). Web Lead — Came In at ${s.webCameIn.rate}% vs 20% (${s.webCameIn.rate >= 20 ? 'meeting' : 'below'}). Remote Sale conversion is ${s.remoteSale.rate}% (${s.remoteSale.members} members / ${s.remoteSale.leads} combined online-join and web-no-visit leads) — reported for reference, no traditional benchmark. Unknown (${s.unknown.rate}%) is mixed — directional only. Direct Walk-in: ${s.directWalkInCount} members, volume only.`;

  const pipelineAnalysis = `The open pipeline holds ${s.openPipelineTotal} non-guest non-excluded leads with enquiry status and no matching member record: ${s.warmPipeline} warm (signed the iPad, haven't joined — prioritize for personal follow-up) and ${s.coldPipeline} cold (web source, waiver = No, no online-join tag — automated email/SMS nurture). Velocity on closed sales: ${s.velocitySameDayPct}% signed same or next day, ${s.velocityWithin7Pct}% within 7 days, ${s.velocityWithin30Pct}% within 30, and ${s.velocityOver30Pct}% after 30 days.`;

  const guestNote = `${s.guestCount} guests (day pass visitors) came through during the period. ${s.guestConverted} converted to long-term members (${s.guestConvRate}%), and ${s.repeatGuests} guests appeared more than once — these repeat visitors are likely local residents and the most realistic conversion targets. Near-zero guest conversion is expected for a Manhattan location with heavy tourist volume; report without alarm.`;

  return {
    periodSummary,
    acquisitionHappened,
    acquisitionImprovements,
    scorecardSummary,
    pipelineAnalysis,
    guestNote,
    dataCaveats: [],
  };
}

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { stats } = JSON.parse(event.body);

    if (!stats) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "No stats provided" }),
      };
    }

    const s = stats;
    const prompt = `You are a gym business analyst for Powerhouse Gym NYC — a single-location Manhattan gym in its first year. Reporting period: ${s.periodStart} to ${s.periodEnd}.

FIVE MEMBER ENTRY POINTS (how each new long-term member got here — every member is in exactly one):
- PROSPECT WALK-IN — lead's created_by = "Visitor App". Walked in cold and signed the iPad (day pass, week pass, tour, or trial pass conversions). No prior web form. Benchmark 40%.
- WEB LEAD — CAME IN — lead source is a web source (Website / powerhousegymnyc.com / Powerhouse Website / Google / Instagram / Facebook / Facebook Post) AND guest_waiver_signed = "Yes". Submitted a form, then visited. Benchmark 20%.
- REMOTE SALE — joined without visiting, any digital source. Combines two sub-groups reported together:
    (a) leads with tags containing "online join" — completed the online join flow directly
    (b) web-source leads with guest_waiver_signed = "No" who matched to a member
  The "online join" tag was applied inconsistently in early months, which is why both sub-groups are captured. Conversion rate = Remote Sale members / (online-join period leads + web-no-visit period leads). Report as a reference rate — no traditional benchmark.
- UNKNOWN — lead record exists but no web, iPad, or online-join signal. Mixed population — directional only, no benchmark.
- DIRECT WALK-IN — no matching lead record (or matched to a GUEST/EXCLUDE row). Signed in person or by phone without filling out the iPad — sight-unseen buyers. Volume only, no close rate.

OTHER LEAD-SIDE CATEGORIES (not member entry points):
- EXCLUDE — tags contain "Unfinished Online Join". Removed from all counts.
- GUEST — status = "guest". Day pass visitors. Separate guest summary only.

BLENDED CLOSE RATE:
Numerator = ALL new long-term members (every entry point, including Remote Sale and Direct Walk-in).
Denominator = ALL non-guest, non-excluded period leads.
Benchmark 20%.

BENCHMARKS (apply only where defined):
- Blended — 20%.
- Prospect Walk-in — 40%.
- Web Lead — Came In — 20%.
- Remote Sale — no benchmark. Report as reference conversion rate.
- Unknown — no benchmark.
- Direct Walk-in — no close rate, volume only.

PIPELINE:
- Warm (D1) — any non-guest non-excluded enquiry with waiver = Yes and no member match. Personal follow-up.
- Cold (D2) — WEB-SOURCE enquiries with waiver = No, no member match, no "online join" tag. Automated email/SMS nurture.

IMPORTANT:
- All counts below are filtered to ${s.periodStart} to ${s.periodEnd} unless labeled "current snapshot" or "all time".
- The members report only contains currently active members. Anyone who joined in the period and already cancelled is NOT in the data — acquisition figures are a FLOOR. Mention this in the period summary.
- Make confident statements. Do not over-qualify clear findings. Do not invent benchmarks for channels without one.

DATA SUMMARY
Period totals:
- Leads after dedup: ${s.totalLeadRecords} (raw ${s.totalLeadRecordsRaw}; ${s.duplicatesRemoved} duplicates removed)
- Non-guest non-excluded leads in period: ${s.totalNonGuestLeads}
- Guests in period: ${s.totalGuests}
- Excluded (unfinished online join) in period: ${s.totalExcluded}
- Short-term PIF agreements backed out in period: ${s.shortTermBackedOut}
- Active member count — CURRENT SNAPSHOT: ${s.activeMemberCount}

Acquisition (period):
- New long-term members: ${s.totalNewLongTermMembers}
- By entry point (count, % of total):
  · Prospect Walk-in: ${s.acquisitionByEntry.PROSPECT_WALK_IN} (${s.acquisitionByEntryPct.PROSPECT_WALK_IN}%)
  · Web Lead — Came In: ${s.acquisitionByEntry.WEB_LEAD_CAME_IN} (${s.acquisitionByEntryPct.WEB_LEAD_CAME_IN}%)
  · Remote Sale: ${s.acquisitionByEntry.REMOTE_SALE} (${s.acquisitionByEntryPct.REMOTE_SALE}%)
  · Unknown: ${s.acquisitionByEntry.UNKNOWN} (${s.acquisitionByEntryPct.UNKNOWN}%)
  · Direct Walk-in: ${s.acquisitionByEntry.DIRECT_WALK_IN} (${s.acquisitionByEntryPct.DIRECT_WALK_IN}%)
- Monthly new members: ${JSON.stringify(s.monthlyMemberTrend)}

Conversion rates (period):
- Blended: ${s.blended.rate}% (${s.blended.members}/${s.blended.leads})
- Prospect Walk-in: ${s.prospectWalkIn.rate}% (${s.prospectWalkIn.members}/${s.prospectWalkIn.leads})
- Web Lead — Came In: ${s.webCameIn.rate}% (${s.webCameIn.members}/${s.webCameIn.leads})
- Remote Sale: ${s.remoteSale.rate}% (${s.remoteSale.members}/${s.remoteSale.leads})
    · Online-join sub-group: ${s.remoteSale.onlineJoinMembers} members / ${s.remoteSale.onlineJoinLeads} leads
    · Web-no-visit sub-group: ${s.remoteSale.webNoVisitMembers} members / ${s.remoteSale.webNoVisitLeads} leads
    · Unfinished online joins excluded: ${s.remoteSale.unfinishedCount}
- Unknown: ${s.unknown.rate}% (${s.unknown.members}/${s.unknown.leads})
- Direct Walk-in members (volume only): ${s.directWalkInCount}

Pipeline (period):
- Warm (came in, enquiry, no member): ${s.warmPipeline}
- Cold (web source, waiver=No, enquiry, no member, no online-join tag): ${s.coldPipeline}
- Total open: ${s.openPipelineTotal}
- Velocity — same/next day ${s.velocitySameDayPct}%, within 7d ${s.velocityWithin7Pct}%, within 30d ${s.velocityWithin30Pct}%, after 30d ${s.velocityOver30Pct}%

Guests (period):
- Total: ${s.guestCount}
- Converted to long-term member: ${s.guestConverted} (${s.guestConvRate}%)
- Repeat visitors: ${s.repeatGuests}

Data quality:
- Duplicates removed: ${s.duplicatesRemoved}
- Unknown-entry-point leads: ${s.unknown.leads}
- Unrecognized source values: ${(s.unrecognizedSources || []).join(', ') || 'none'}
- Partial months: ${(s.partialMonths || []).join(', ') || 'none'}
- Members with no phone on file: ${s.noPhoneMembers}

RULES FOR acquisitionImprovements:
- Return EXACTLY 3 objects, ordered by severity (biggest gap first).
- Only use benchmarked channels (Blended 20%, Prospect Walk-in 40%, Web Lead — Came In 20%) or operational issues (Direct Walk-in share too high, Unknown volume, tagging hygiene).
- Never invent a benchmark for channels that don't have one.
- If fewer than 3 real gaps exist, fill remaining slots with an operational improvement (tagging, process) or "Maintain current execution" as the action.
- Keep "gap" field short (~15 chars, e.g., "−3.7pp" or "88 off-funnel"). Keep "action" to ONE concrete sentence.

Respond with ONLY this JSON (no markdown, no prose outside JSON). Plain language for a gym owner who understands the business but is not a data analyst:

{
  "periodSummary": "This is the OPENING section of the report — it's the first thing the reader sees, so do not reference anything 'above'. 3 short, plain-English sentences for a gym owner. Cover exactly these points in your own natural phrasing (don't copy a template): (1) how many prospects and guests came through the CLUB'S SYSTEM during the period — note that not all of them signed a waiver or physically visited (many are web leads who never came in); (2) these figures exclude short-term memberships and pending cancels; (3) anyone who joined during the period and already cancelled by today isn't reflected either. Use comma-formatted integers (e.g., 2,012). Never say 'came through the club' — always say 'came through the club's system' or similar. No jargon ('PIF', 'dedup', 'non-guest non-excluded', 'floor/ceiling', 'figures above').",
  "acquisitionHappened": "PARAGRAPH 1 — 'What happened' — 3-4 factual sentences, no editorializing. Cover in one sentence each: (a) total new long-term members, (b) the dominant entry point, (c) blended close rate vs 20% benchmark, (d) the monthly new-member trend. State facts only — no recommendations in this paragraph.",
  "acquisitionImprovements": [
    {
      "title": "Short name of the gap (e.g., 'Web Lead — Came In Close Rate' or 'Direct Walk-in Share')",
      "current": "Current value with unit (e.g., '16.3%' or '113 members')",
      "target": "Benchmark or target value (e.g., '20%' or 'tracked') — omit with empty string if not applicable",
      "gap": "Short delta tag (e.g., '−3.7pp' or '88 off-funnel') — keep to ~15 characters",
      "action": "One sentence, specific and actionable — the concrete next step."
    },
    { "title": "...", "current": "...", "target": "...", "gap": "...", "action": "..." },
    { "title": "...", "current": "...", "target": "...", "gap": "...", "action": "..." }
  ],
  "scorecardSummary": "3-4 sentences summarizing the conversion scorecard. Apply benchmarks only where defined (Blended 20%, Prospect Walk-in 40%, Web Came In 20%). Treat Remote Sale as a reference conversion rate, not a benchmarked one. Do NOT benchmark Unknown or Direct Walk-in.",
  "pipelineAnalysis": "3-4 sentences on the open pipeline and velocity. Warm (iPad signed) needs personal follow-up; cold (web-source, never visited) needs automated nurture. Comment on velocity bucket concentration.",
  "guestNote": "2-3 sentences on guest volume, near-zero conversion expectation given Manhattan, and repeat visitors as realistic targets.",
  "dataCaveats": ["additional data-quality notes beyond the standard ones already surfaced by the app — only add if something notable"]
}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const message = await client.messages.create(
        {
          model: "claude-haiku-4-5-20251001",
          max_tokens: 2000,
          messages: [{ role: "user", content: prompt }],
        },
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      const responseText = message.content[0].text.trim();
      let aiResult;
      try {
        aiResult = JSON.parse(responseText);
      } catch {
        const cleaned = responseText
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/, "")
          .trim();
        aiResult = JSON.parse(cleaned);
      }

      return { statusCode: 200, headers, body: JSON.stringify(aiResult) };
    } catch (abortErr) {
      clearTimeout(timeout);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(buildFallback(s)),
      };
    }
  } catch (err) {
    console.error("Analysis error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Analysis failed: " + (err.message || "Unknown error"),
      }),
    };
  }
};
