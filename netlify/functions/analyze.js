const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic();

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
    const { rows } = JSON.parse(event.body);

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "No data rows provided" }),
      };
    }

    const csvSample = JSON.stringify(rows.slice(0, 3), null, 2);
    const totalRows = rows.length;

    const prompt = `You are a gym sales data analyst. Analyze the following CRM lead data from Powerhouse Gym NYC and return ONLY a valid JSON object — no markdown, no code fences, no explanation.

The dataset contains ${totalRows} lead records. Here is a sample of the first 3 rows for column reference:
${csvSample}

Here is the FULL dataset as JSON:
${JSON.stringify(rows)}

Analyze every record and return a JSON object with these exact keys:

1. "totalLeads" — total records analyzed
2. "totalSales" — count of records where sale_at is populated (not empty/null)
3. "conversionRate" — (totalSales / totalLeads) * 100, rounded to 1 decimal
4. "medianDaysToClose" — median number of days from created_at to sale_at for records that have both dates. If no sales, return null.
5. "sameDayClosePct" — percentage of sales where created_at and sale_at are the same day, rounded to 1 decimal
6. "within7DaysPct" — percentage of sales closed within 7 days of created_at, rounded to 1 decimal
7. "sourceBreakdown" — array of objects {source, leads, sales, convRate} for each source that has 5 or more leads, sorted by leads descending. convRate is a percentage rounded to 1 decimal.
8. "statusBreakdown" — object with count of each status value in the dataset (e.g. {"enquiry": 50, "sale": 30, ...})
9. "hotLeads" — count of records with status "enquiry" where created_at is less than 30 days ago from today (${new Date().toISOString().split("T")[0]})
10. "warmLeads" — count of records with status "enquiry" where created_at is 30–90 days ago
11. "coldLeads" — count of records with status "enquiry" where created_at is more than 90 days ago
12. "grade" — letter grade A through F based on the scoring rubric below
13. "gradeScore" — numeric score out of 100
14. "gradeRationale" — exactly 2 sentences explaining the grade
15. "insights" — array of exactly 5 objects {type, text} where type is "good", "warn", or "bad". Each text should be a specific, actionable observation about THIS data — reference actual numbers, sources, or patterns you see.
16. "promoSales" — count of sales where sale_at falls on known promo dates: Black Friday (Nov 24–25), Cyber Monday (Dec 1), New Years (Dec 31–Jan 6), Valentines (Feb 13–14), Price Increase (Feb 27–28), Paddys Day (Mar 16–17). Check across all years present in the data.
17. "nonPromoSales" — totalSales minus promoSales
18. "referralLeads" — count of leads where source contains "Member Referral" or "Referred by Friend" (case insensitive)
19. "referralConvRate" — conversion rate for referral leads only, rounded to 1 decimal. If no referral leads, return 0.

GRADING RUBRIC (sum the points from each category):
- Conversion rate: 30%+ = 40pts, 25–30% = 35pts, 20–25% = 28pts, 15–20% = 20pts, below 15% = 10pts
- Median days to close: 1 day or less = 30pts, 2–3 days = 24pts, 4–7 days = 16pts, 8+ days = 8pts
- Hot lead ratio (hot leads as % of all open enquiries): 30%+ = 20pts, 20–30% = 15pts, 10–20% = 10pts, below 10% = 5pts
- Referral leads count: 50+ = 10pts, 20–50 = 7pts, 10–20 = 4pts, below 10 = 2pts
- Grade thresholds: A = 88+, B = 76–87, C = 64–75, D = 52–63, F = below 52

Return ONLY the JSON object. No markdown. No code fences. No extra text.`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText = message.content[0].text.trim();

    // Try to parse the response as JSON, stripping code fences if present
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const cleaned = responseText
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
      parsed = JSON.parse(cleaned);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(parsed),
    };
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
