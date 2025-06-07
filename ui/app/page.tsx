"use client"

import type React from "react"

import { useState } from "react"
import { Upload, Camera, Zap, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"

export default function ChessVisionHome() {
  const router = useRouter()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [turn, setTurn] = useState<string>("White")
  const [dragActive, setDragActive] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleAnalyze = async () => {
    if (!selectedFile) return

    setIsAnalyzing(true)
    setError(null)

    try {
      console.log("Starting analysis...")

      // Create form data to send to our Next.js API route (which will proxy to Flask)
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("turn", turn)

      console.log("Sending request to /api/analyze...")

      // Send to our Next.js API route instead of directly to Flask
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      })

      console.log("Response received:", response.status, response.statusText)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Error response:", errorData)
        throw new Error(errorData.error || `Server responded with status: ${response.status}`)
      }

      console.log("Parsing response JSON...")
      const result = await response.json()
      console.log("Analysis result:", result)

      // Validate that we have the required data
      if (!result.fen || !result.suggestions || !result.explanations) {
        console.error("Invalid response structure:", result)
        throw new Error("Invalid response from server - missing required data")
      }

      console.log("Storing results in sessionStorage...")
      // Store the analysis results in sessionStorage
      sessionStorage.setItem("chessAnalysisResults", JSON.stringify(result))
      sessionStorage.setItem("chessAnalysisFile", selectedFile.name)
      sessionStorage.setItem("chessAnalysisTurn", turn)

      console.log("Navigating to results page...")
      // Redirect to results page
      router.push("/results")
    } catch (err) {
      console.error("Error analyzing image:", err)
      setError(
        err instanceof Error
          ? err.message
          : "Failed to analyze image. Please check if the Flask server is running on http://localhost:5000",
      )
    } finally {
      console.log("Setting isAnalyzing to false")
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl">♟️</div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Chess Vision</h1>
              <p className="text-sm text-slate-600">AI-Powered Strategy Coach</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Analyze Your Chess Position</h2>
            <p className="text-xl text-slate-600 mb-8">
              Upload a photo of your chess board and get expert move suggestions with detailed explanations
            </p>
          </div>

          {/* Main Upload Card */}
          <Card className="mb-8 shadow-lg border-0 bg-white">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Upload Area */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-4">Chess Board Image</label>
                  <div
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                      dragActive
                        ? "border-blue-500 bg-blue-50"
                        : selectedFile
                          ? "border-green-500 bg-green-50"
                          : "border-slate-300 hover:border-slate-400"
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />

                    {selectedFile ? (
                      <div className="space-y-3">
                        <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                          <Camera className="w-8 h-8 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-green-700">{selectedFile.name}</p>
                          <p className="text-sm text-green-600">Ready to analyze</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center">
                          <Upload className="w-8 h-8 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-700">Drop your chess board image here</p>
                          <p className="text-sm text-slate-500">or click to browse files</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Settings */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">Whose Turn?</label>
                    <Select value={turn} onValueChange={setTurn}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="White">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-white border-2 border-slate-300 rounded-full"></div>
                            White to move
                          </div>
                        </SelectItem>
                        <SelectItem value="Black">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-slate-800 rounded-full"></div>
                            Black to move
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4">
                    <h3 className="font-medium text-slate-900 mb-2">What happens next?</h3>
                    <ul className="text-sm text-slate-600 space-y-1">
                      <li>• AI converts your image to chess notation</li>
                      <li>• Stockfish engine analyzes the position</li>
                      <li>• Get top move suggestions with explanations</li>
                      <li>• See visual board representations</li>
                    </ul>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                      <strong>Error:</strong> {error}
                    </div>
                  )}

                  <Button
                    onClick={handleAnalyze}
                    disabled={!selectedFile || isAnalyzing}
                    className="w-full h-12 text-lg font-medium"
                    size="lg"
                  >
                    {isAnalyzing ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Analyzing Position...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        Analyze Position
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="text-center p-6 border-0 shadow-sm">
              <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <Camera className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Image Recognition</h3>
              <p className="text-sm text-slate-600">
                Advanced AI converts your chess board photos to precise FEN notation
              </p>
            </Card>

            <Card className="text-center p-6 border-0 shadow-sm">
              <div className="w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Engine Analysis</h3>
              <p className="text-sm text-slate-600">Powered by Stockfish, the world's strongest chess engine</p>
            </Card>

            <Card className="text-center p-6 border-0 shadow-sm">
              <div className="w-12 h-12 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                <div className="text-xl">🧠</div>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">AI Explanations</h3>
              <p className="text-sm text-slate-600">Get detailed explanations for every suggested move</p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
