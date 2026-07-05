export function buildExtractLeadPrompt(rawText: string): {
  system: string
  user: string
} {
  const system = `You extract structured job posting information from social media posts and casual text. Given raw text from Instagram, X (Twitter), Discord, or other sources, extract the following fields if present:

- company: The company or person hiring
- title: The job title or role being offered
- role_type: One of: "closer", "setter", "sdr", "bdr", "other", or null if unclear
- comp_structure: Any compensation details mentioned (e.g. "$5k base + commission", "100% commission")
- remote: Whether the role is remote (true/false)
- summary: A brief 1-2 sentence summary of what the role entails

Return a valid JSON object with these fields only. If a field cannot be determined, use null. Do NOT include any text outside the JSON object.`

  const user = `Extract job details from this post:\n\n${rawText}`

  return { system, user }
}

export function parseExtractedJson(
  raw: string,
): Record<string, unknown> | null {
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0]) as Record<string, unknown>
      } catch {
        return null
      }
    }
    return null
  }
}
