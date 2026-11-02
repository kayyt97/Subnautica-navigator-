export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }
  const { type, message, contact } = req.body || {};
  if (typeof message !== "string" || message.trim().length < 5 || message.length > 3000) {
    return res.status(400).json({ error: "Please enter a suggestion between 5 and 3000 characters." });
  }
  const safeType = typeof type === "string" ? type.slice(0, 80) : "Suggestion";
  const safeContact = typeof contact === "string" ? contact.slice(0, 254) : "";
  if (safeContact && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeContact)) {
    return res.status(400).json({ error: "Please enter a valid email address or leave it blank." });
  }
  if (!process.env.RESEND_API_KEY || !process.env.FEEDBACK_TO_EMAIL) {
    return res.status(503).json({ error: "Suggestions are not available yet. Please try again soon." });
  }
  const text = [
    "New Subnautica Navigator suggestion",
    "",
    "Category: " + safeType,
    "Reply address: " + (safeContact || "Not provided"),
    "",
    message.trim()
  ].join("\n");
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + process.env.RESEND_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Subnautica Navigator <onboarding@resend.dev>",
        to: [process.env.FEEDBACK_TO_EMAIL],
        subject: "Navigator suggestion: " + safeType,
        text
      })
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error("Resend error:", detail);
      return res.status(502).json({ error: "The email service could not send this yet. Please try again later." });
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Feedback email failed:", error);
    return res.status(500).json({ error: "Something went wrong while sending. Please try again." });
  }
}
