import { type NextRequest, NextResponse } from "next/server"

// Flask server URL - update this to your Flask server address
const FLASK_SERVER_URL = "http://localhost:5000"

export async function POST(request: NextRequest) {
  try {
    // Forward the request to the Flask server
    const formData = await request.formData()

    const response = await fetch(FLASK_SERVER_URL, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Flask server responded with status: ${response.status}` },
        { status: response.status },
      )
    }

    // Parse the HTML response from Flask
    const htmlText = await response.text()

    // Extract data from HTML (this is a simplified example)
    // In a real implementation, you would need to properly parse the HTML
    // or modify your Flask app to return JSON data

    // For now, we'll return a success message
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error proxying request to Flask:", error)
    return NextResponse.json({ error: "Failed to communicate with Flask server" }, { status: 500 })
  }
}
