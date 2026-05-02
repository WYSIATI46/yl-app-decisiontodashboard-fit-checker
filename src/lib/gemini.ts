import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function extractDiagnosticFromProse(prose: string) {
  const prompt = `
You are an expert in behavioral data science and Stephen Few's principles of data visualization. 
A user has provided a unstructured description of a dashboard or report.
Your task is to analyze this description and extract answers to the following 6 diagnostic questions.
If a question cannot be answered from the description, explicitly mark it as "Not specified" and create an actionable finding.

The 6 questions are:
1. What specific decision does this dashboard support?
2. Who makes that decision, and on what cadence?
3. What action changes if the key metric moves up? Moves down? (CRITICAL)
4. What threshold or signal would trigger an intervention?
5. Is there a counter-metric that could reverse this interpretation?
6. What is the cost of acting on a false signal in either direction?

Return the result as a JSON object with the following structure:
{
  "answers": [
    { "question": "What specific decision does this dashboard support?", "answer": "...", "hasGap": boolean },
    { "question": "Who makes that decision, and on what cadence?", "answer": "...", "hasGap": boolean },
    { "question": "What action changes if the key metric moves up or down?", "answer": "...", "hasGap": boolean },
    { "question": "What threshold or signal would trigger an intervention?", "answer": "...", "hasGap": boolean },
    { "question": "Is there a counter-metric that could reverse this interpretation?", "answer": "...", "hasGap": boolean },
    { "question": "What is the cost of acting on a false signal?", "answer": "...", "hasGap": boolean }
  ],
  "gaps": [
    {
      "type": "Missing decision owner" | "Threshold void" | "Action ambiguity" | "Counter-metric absence" | "Cadence mismatch" | "Unclear decision",
      "description": "Short, plain-language explanation of why this gap prevents action."
    }
  ],
  "score": number, // 0-100 indicating decision-readiness (0-25: Decorative, 26-50: Informative, 51-75: Functional, 76-100: Decision-Ready)
  "brief": [
    "Requirement 1",
    "Requirement 2",
    "Requirement 3"
  ] // 3-5 specific recommendations written as design requirements (e.g., "Add a threshold line at [X] that triggers...")
}

Dashboard Description:
"${prose}"
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    throw new Error("No response from AI");
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
}

export async function generateAnalysisFromAnswers(answers: {question: string, answer: string}[]) {
  const prompt = `
You are an expert in behavioral data science and Stephen Few's principles of data visualization. 
A user has answered 6 diagnostic questions about a dashboard.
Your task is to analyze these answers, identify the design gaps, score the dashboard, and generate a redesign brief.

The questions are:
1. Decision: What specific decision does this dashboard support?
2. Owner/Cadence: Who makes that decision, and on what cadence?
3. Action: What action changes if the key metric moves up? Moves down? 
4. Threshold: What threshold or signal would trigger an intervention?
5. Counter-metric: Is there a counter-metric that could reverse this interpretation?
6. Cost: What is the cost of acting on a false signal in either direction?

User's Answers:
${JSON.stringify(answers, null, 2)}

Return the result as a JSON object with the following structure:
{
  "gaps": [
    {
      "type": "Missing decision owner" | "Threshold void" | "Action ambiguity" | "Counter-metric absence" | "Cadence mismatch" | "Unclear decision",
      "description": "Short, plain-language explanation of why this gap prevents action. For example: 'The metric is tracked but no trigger threshold is defined, leaving it up to interpretation when to act.'"
    }
  ],
  "score": number, // 0-100 indicating decision-readiness (0-25: Decorative, 26-50: Informative, 51-75: Functional, 76-100: Decision-Ready). Be realistic. Most dashboards are informative (26-50).
  "brief": [
    "Requirement 1",
    "Requirement 2",
    "Requirement 3"
  ] // 3-5 specific recommendations written as design requirements (e.g., "Add a threshold line at [X] that triggers...")
}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    throw new Error("No response from AI");
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
}
