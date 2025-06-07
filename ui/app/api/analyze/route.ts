import { type NextRequest, NextResponse } from "next/server"

const FLASK_SERVER_URL = "http://localhost:5000"

export async function POST(request: NextRequest) {
  try {
    console.log("Next.js API route called")

    const formData = await request.formData()
    console.log("Form data received, forwarding to Flask...")

    const response = await fetch(`${FLASK_SERVER_URL}/api/analyze`, {
      method: "POST",
      body: formData,
    })

    console.log("Flask response status:", response.status)
    console.log("Flask response content-type:", response.headers.get("content-type"))

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Flask error response:", errorText)
      return NextResponse.json(
        { error: `Flask server error: ${response.status} - ${errorText}` },
        { status: response.status },
      )
    }

    const contentType = response.headers.get("content-type")
    if (!contentType?.includes("application/json")) {
      const responseText = await response.text()
      console.error("Non-JSON response from Flask:", responseText.substring(0, 200))
      return NextResponse.json({ error: "Flask server returned HTML instead of JSON" }, { status: 502 })
    }

    const data = await response.json()
    console.log("Successfully received data from Flask")
    console.log("Data structure:", {
      hasFen: !!data.fen,
      hasSuggestions: !!data.suggestions,
      hasExplanations: !!data.explanations,
      hasAdvancedAnalysis: !!data.advanced_analysis,
      suggestionsLength: data.suggestions?.length,
      explanationsLength: data.explanations?.length,
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error("API Error:", error)

    if (error instanceof TypeError && error.message.includes("fetch")) {
      return NextResponse.json(
        { error: "Cannot connect to Flask server. Make sure it's running on http://localhost:5000" },
        { status: 503 },
      )
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Add a GET method for testing
export async function GET() {
  return NextResponse.json({ message: "Chess Vision API route is working" })
}
