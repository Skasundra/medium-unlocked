import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, title } = await req.json();
    
    if (!content) {
      return new Response(
        JSON.stringify({ error: "Content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert article summarizer. Your task is to create a clear, concise summary of articles in bullet point format.

Guidelines:
- Extract 5-8 key points from the article
- Each point should be a complete, standalone insight
- Use clear, simple language
- Focus on the main ideas, arguments, and conclusions
- Keep each bullet point to 1-2 sentences maximum
- Start each point with a relevant emoji for visual appeal

Format your response as a JSON array of strings, where each string is a bullet point.
Example: ["📌 Main point one here", "💡 Key insight two here", "🎯 Important conclusion three"]`
          },
          {
            role: "user",
            content: `Please summarize the following article titled "${title}":\n\n${content}`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add more credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate summary");
    }

    const data = await response.json();
    const summaryText = data.choices?.[0]?.message?.content || "";
    
    // Parse the JSON array from the response
    let summaryPoints: string[] = [];
    try {
      // Try to extract JSON array from the response
      const jsonMatch = summaryText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        summaryPoints = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: split by newlines and filter empty lines
        summaryPoints = summaryText
          .split('\n')
          .filter((line: string) => line.trim())
          .map((line: string) => line.replace(/^[-•*]\s*/, '').trim());
      }
    } catch {
      // If parsing fails, use the raw text split by lines
      summaryPoints = summaryText
        .split('\n')
        .filter((line: string) => line.trim())
        .map((line: string) => line.replace(/^[-•*]\s*/, '').trim());
    }

    return new Response(
      JSON.stringify({ summary: summaryPoints }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Summarization error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
