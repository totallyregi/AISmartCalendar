import { GoogleGenerativeAI } from "@google/generative-ai";
import { CALENDAR_INSIGHTS_SYSTEM, calendarInsightsUserPrompt } from "@/lib/calendarInsights/prompts";

const DEFAULT_MODEL = "gemini-2.0-flash";

function clampInsights(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const strings = raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((s) => s.trim());
  return strings.slice(0, 5);
}

function parseInsightsJson(text: string): string[] {
  const trimmed = text.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        parsed = JSON.parse(trimmed.slice(start, end + 1)) as unknown;
      } catch {
        return [];
      }
    } else {
      return [];
    }
  }
  if (!parsed || typeof parsed !== "object" || !("insights" in parsed)) return [];
  return clampInsights((parsed as { insights: unknown }).insights);
}

/**
 * Calls Gemini with generation stats and optional calendar week snapshot
 * ({ generationSummary, calendarWeek }) or legacy summary-only object. Returns [] if no API key or on failure.
 */
export async function generateCalendarInsightsFromSummary(summary: unknown): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return [];

  const modelId = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelId,
    systemInstruction: CALENDAR_INSIGHTS_SYSTEM,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.6,
      maxOutputTokens: 1024,
    },
  });

  let summaryJson: string;
  try {
    summaryJson = JSON.stringify(summary, null, 0);
  } catch {
    summaryJson = "{}";
  }

  try {
    const result = await model.generateContent(calendarInsightsUserPrompt(summaryJson));
    const text = result.response.text();
    return parseInsightsJson(text);
  } catch {
    return [];
  }
}
