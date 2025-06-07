import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { moveId: string } }) {
  try {
    const moveId = params.moveId

    // This is a proxy to the Flask server's sequence endpoint
    const response = await fetch(`http://localhost:5000/api/sequence/${moveId}`)

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch sequence data: ${response.statusText}` },
        { status: response.status },
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching sequence data:", error)
    return NextResponse.json({ error: "Failed to fetch sequence data" }, { status: 500 })
  }
}
