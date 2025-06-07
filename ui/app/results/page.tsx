"use client"

import { useState, useEffect } from "react"
import {
  ArrowLeft,
  Copy,
  Download,
  Share2,
  RotateCcw,
  Crown,
  Target,
  AlertCircle,
  Lightbulb,
  Zap,
  Shield,
  BarChart3,
  Brain,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"

interface ParsedExplanation {
  best_move_explanation: string
  strategic_idea: string
  tactical_motif: string
}

interface AdvancedMoveData {
  move: string
  engine_eval: number
  pv_length: number
  tactical_complexity: number
  king_safety: number
  positional_score: number
  norm_engine_eval: number
  norm_pv_length: number
  norm_tactical_complexity: number
  norm_king_safety: number
  norm_positional_score: number
  total_score: number
}

interface AdvancedAnalysis {
  best_move: AdvancedMoveData
  all_moves: AdvancedMoveData[]
  reasoning: string
}

interface ChessAnalysisResult {
  fen: string
  rendered_images: string[]
  explanations: [string, ParsedExplanation | string][]
  suggestions: [string, string, number | string][]
  advanced_analysis?: AdvancedAnalysis
}

interface SequenceData {
  move_id: number
  move_uci: string
  sequence_images: string[]
  folder_name: string
}

export default function ChessResults() {
  const [copiedFen, setCopiedFen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<ChessAnalysisResult | null>(null)
  const [selectedMove, setSelectedMove] = useState<string | null>(null)
  const [selectedMoveIndex, setSelectedMoveIndex] = useState<number | null>(null)
  const [sequenceData, setSequenceData] = useState<SequenceData | null>(null)
  const [currentSequenceStep, setCurrentSequenceStep] = useState<number>(0)
  const [loadingSequence, setLoadingSequence] = useState(false)

  useEffect(() => {
    const resultsData = sessionStorage.getItem("chessAnalysisResults")
    const fileName = sessionStorage.getItem("chessAnalysisFile")
    const turn = sessionStorage.getItem("chessAnalysisTurn")

    if (!resultsData || !fileName || !turn) {
      setError("No analysis data found. Please upload an image first.")
      setLoading(false)
      return
    }

    try {
      const parsedResults = JSON.parse(resultsData)
      console.log("Parsed results:", parsedResults)
      setResults(parsedResults)
      setLoading(false)
    } catch (err) {
      console.error("Error parsing results:", err)
      setError("Failed to parse analysis results.")
      setLoading(false)
    }
  }, [])

  const copyFen = () => {
    if (!results) return
    navigator.clipboard.writeText(results.fen)
    setCopiedFen(true)
    setTimeout(() => setCopiedFen(false), 2000)
  }

  const getScoreColor = (score: number | string) => {
    if (typeof score === "string" && score.includes("Mate")) {
      return "text-purple-600 bg-purple-50"
    }
    if (typeof score === "number") {
      if (score > 0) return "text-green-600 bg-green-50"
      if (score < 0) return "text-red-600 bg-red-50"
    }
    return "text-slate-600 bg-slate-50"
  }

  const formatScore = (score: number | string) => {
    if (typeof score === "string" && score.includes("Mate")) {
      return score.replace("Mate", "Mate in ")
    }
    if (typeof score === "number") {
      return score > 0 ? `+${score}` : `${score}`
    }
    return String(score)
  }

  const formatPrincipalVariation = (pvLine: string) => {
    const pvString = String(pvLine || "")
    const moves = pvString.split(" ").filter((move) => move.length > 0)

    if (moves.length === 0) {
      return "No variation available"
    }

    const formattedMoves = []
    for (let i = 0; i < moves.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1
      const whiteMove = moves[i]
      const blackMove = moves[i + 1]

      if (blackMove) {
        formattedMoves.push(`${moveNumber}. ${whiteMove} ${blackMove}`)
      } else {
        formattedMoves.push(`${moveNumber}. ${whiteMove}`)
      }
    }

    return formattedMoves.join(" ")
  }

  const getExplanationObject = (explanation: ParsedExplanation | string): ParsedExplanation => {
    if (typeof explanation === "string") {
      return {
        best_move_explanation: explanation,
        strategic_idea: "",
        tactical_motif: "",
      }
    }

    return {
      best_move_explanation: explanation.best_move_explanation || "",
      strategic_idea: explanation.strategic_idea || "",
      tactical_motif: explanation.tactical_motif || "",
    }
  }

  const getMetricColor = (value: number) => {
    if (value >= 0.8) return "bg-green-500"
    if (value >= 0.6) return "bg-yellow-500"
    if (value >= 0.4) return "bg-orange-500"
    return "bg-red-500"
  }

  const handleMoveClick = async (move: string, moveIndex: number) => {
    setSelectedMove(move)
    setSelectedMoveIndex(moveIndex)
    setCurrentSequenceStep(0)
    setLoadingSequence(true)

    try {
      console.log(`Fetching sequence for move ${moveIndex + 1}`)
      // Fetch the sequence images for this move
      const response = await fetch(`http://localhost:5000/api/sequence/${moveIndex + 1}`)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Error fetching sequence:", errorData)
        throw new Error(errorData.error || `Failed to fetch sequence: ${response.statusText}`)
      }

      const data: SequenceData = await response.json()
      console.log("Sequence data received:", data)
      setSequenceData(data)
    } catch (error) {
      console.error("Error fetching sequence:", error)
      setSequenceData(null)
      // You might want to show an error message to the user here
    } finally {
      setLoadingSequence(false)
    }
  }

  const nextSequenceStep = () => {
    if (sequenceData && currentSequenceStep < sequenceData.sequence_images.length - 1) {
      setCurrentSequenceStep(currentSequenceStep + 1)
    }
  }

  const prevSequenceStep = () => {
    if (currentSequenceStep > 0) {
      setCurrentSequenceStep(currentSequenceStep - 1)
    }
  }

  const renderVariationMoves = (pvLine: string, moveIndex: number) => {
    const pvString = String(pvLine || "")
    const moves = pvString.split(" ").filter((move) => move.length > 0)

    if (moves.length === 0) {
      return <p className="text-slate-500 italic">No variation available</p>
    }

    return (
      <div className="flex flex-wrap gap-2">
        {moves.map((move, idx) => (
          <button
            key={idx}
            onClick={() => handleMoveClick(move, moveIndex)}
            className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
              selectedMove === move && selectedMoveIndex === moveIndex
                ? "bg-blue-600 text-white"
                : "bg-slate-100 hover:bg-slate-200 text-slate-800"
            }`}
          >
            {move}
          </button>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-medium text-slate-900">Loading Analysis Results</h2>
          <p className="text-slate-600 mt-2">This may take a moment...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-0 shadow-lg">
          <CardHeader className="bg-red-50 border-b border-red-100">
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              Error Loading Results
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-slate-700 mb-6">{error}</p>
            <Link href="/">
              <Button className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to Upload Page
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!results) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">♟️</div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Chess Vision</h1>
                <p className="text-sm text-slate-600">Analysis Results</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <Link href="/">
            <Button variant="ghost" className="mb-6 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Analyze Another Position
            </Button>
          </Link>

          {/* FEN Display */}
          <Card className="mb-8 border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Position Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700 mb-1">FEN Notation:</p>
                  <code className="text-sm text-slate-900 font-mono break-all">{results.fen}</code>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyFen}
                  className={copiedFen ? "bg-green-50 border-green-200" : ""}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {copiedFen ? "Copied!" : "Copy"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Analysis Section */}
          {results.advanced_analysis && (
            <Card className="mb-8 border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Brain className="w-6 h-6 text-purple-600" />
                  Advanced Engine Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Best Move Metrics */}
                  <div>
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      Best Move: {results.advanced_analysis.best_move.move}
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Engine Evaluation</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-200 rounded-full">
                            <div
                              className={`h-2 rounded-full ${getMetricColor(
                                results.advanced_analysis.best_move.norm_engine_eval,
                              )}`}
                              style={{
                                width: `${results.advanced_analysis.best_move.norm_engine_eval * 100}%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600">
                            {(results.advanced_analysis.best_move.norm_engine_eval * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">King Safety</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-200 rounded-full">
                            <div
                              className={`h-2 rounded-full ${getMetricColor(
                                results.advanced_analysis.best_move.norm_king_safety,
                              )}`}
                              style={{
                                width: `${results.advanced_analysis.best_move.norm_king_safety * 100}%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600">
                            {(results.advanced_analysis.best_move.norm_king_safety * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Positional Score</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-200 rounded-full">
                            <div
                              className={`h-2 rounded-full ${getMetricColor(
                                results.advanced_analysis.best_move.norm_positional_score,
                              )}`}
                              style={{
                                width: `${results.advanced_analysis.best_move.norm_positional_score * 100}%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600">
                            {(results.advanced_analysis.best_move.norm_positional_score * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Tactical Complexity</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-200 rounded-full">
                            <div
                              className={`h-2 rounded-full ${getMetricColor(
                                results.advanced_analysis.best_move.norm_tactical_complexity,
                              )}`}
                              style={{
                                width: `${results.advanced_analysis.best_move.norm_tactical_complexity * 100}%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600">
                            {(results.advanced_analysis.best_move.norm_tactical_complexity * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reasoning */}
                  <div>
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                      Analysis Reasoning
                    </h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-blue-800 text-sm leading-relaxed">{results.advanced_analysis.reasoning}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Move Suggestions */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
              <Crown className="w-6 h-6 text-yellow-600" />
              <h2 className="text-2xl font-bold text-slate-900">Top Move Suggestions</h2>
            </div>

            {results.explanations.map((explanation, idx) => {
              const moveUci = explanation[0]
              const explanationData = getExplanationObject(explanation[1])

              return (
                <Card key={idx} className="border-0 shadow-lg overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                          {idx + 1}
                        </div>
                        Move: <code className="bg-white px-3 py-1 rounded text-blue-700">{moveUci}</code>
                      </CardTitle>
                      <Badge className={`px-3 py-1 font-mono ${getScoreColor(results.suggestions[idx][2])}`}>
                        {formatScore(results.suggestions[idx][2])}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="grid lg:grid-cols-2 gap-0">
                      {/* Board Image */}
                      <div className="p-6 bg-slate-50 flex items-center justify-center">
                        <div className="relative">
                          {selectedMove && selectedMoveIndex === idx && sequenceData ? (
                            <div className="space-y-4">
                              {loadingSequence ? (
                                <div className="w-full max-w-sm h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                              ) : (
                                <>
                                  <img
                                    src={`http://localhost:5000/static/artifacts/sequences/${sequenceData.folder_name}/${
                                      sequenceData.sequence_images[currentSequenceStep]
                                    }`}
                                    alt={`Sequence step ${currentSequenceStep + 1} for move ${sequenceData.move_uci}`}
                                    className="w-full max-w-sm rounded-lg shadow-md border-2 border-white"
                                    onError={(e) => {
                                      e.currentTarget.src = "/placeholder.svg?height=300&width=300"
                                    }}
                                  />
                                  <div className="flex items-center justify-between">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={prevSequenceStep}
                                      disabled={currentSequenceStep === 0}
                                    >
                                      <ChevronLeft className="w-4 h-4 mr-1" />
                                      Previous
                                    </Button>
                                    <span className="text-sm font-medium">
                                      Step {currentSequenceStep + 1} of {sequenceData.sequence_images.length}
                                    </span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={nextSequenceStep}
                                      disabled={currentSequenceStep === sequenceData.sequence_images.length - 1}
                                    >
                                      Next
                                      <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          ) : (
                            <>
                              <img
                                src={`http://localhost:5000/static/artifacts/${results.rendered_images[idx]}`}
                                alt={`Board position after ${moveUci}`}
                                className="w-full max-w-sm rounded-lg shadow-md border-2 border-white"
                                onError={(e) => {
                                  e.currentTarget.src = "/placeholder.svg?height=300&width=300"
                                }}
                              />
                              <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                                After {moveUci}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Analysis */}
                      <div className="p-6">
                        <Tabs defaultValue="explanation" className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="explanation">Analysis</TabsTrigger>
                            <TabsTrigger value="variation">Variation</TabsTrigger>
                          </TabsList>
                          <TabsContent value="explanation" className="mt-4">
                            <div className="space-y-4">
                              {/* Best Move Explanation */}
                              {explanationData.best_move_explanation && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Lightbulb className="w-4 h-4 text-blue-600" />
                                    <h4 className="font-semibold text-blue-900">Best Move Explanation</h4>
                                  </div>
                                  <p className="text-blue-800 text-sm leading-relaxed">
                                    {explanationData.best_move_explanation}
                                  </p>
                                </div>
                              )}

                              {/* Strategic Idea */}
                              {explanationData.strategic_idea && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Shield className="w-4 h-4 text-green-600" />
                                    <h4 className="font-semibold text-green-900">Strategic Idea</h4>
                                  </div>
                                  <p className="text-green-800 text-sm leading-relaxed">
                                    {explanationData.strategic_idea}
                                  </p>
                                </div>
                              )}

                              {/* Tactical Motif */}
                              {explanationData.tactical_motif && (
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Zap className="w-4 h-4 text-orange-600" />
                                    <h4 className="font-semibold text-orange-900">Tactical Motif</h4>
                                  </div>
                                  <p className="text-orange-800 text-sm leading-relaxed">
                                    {explanationData.tactical_motif}
                                  </p>
                                </div>
                              )}

                              {/* Fallback if no structured data */}
                              {!explanationData.best_move_explanation &&
                                !explanationData.strategic_idea &&
                                !explanationData.tactical_motif && (
                                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                    <p className="text-slate-700 text-sm leading-relaxed">
                                      No detailed analysis available for this move.
                                    </p>
                                  </div>
                                )}
                            </div>
                          </TabsContent>
                          <TabsContent value="variation" className="mt-4">
                            <div className="space-y-4">
                              <div>
                                <p className="text-sm font-medium text-slate-700 mb-2">Principal Variation:</p>
                                <div className="bg-slate-50 p-4 rounded-lg">
                                  <code className="text-slate-900 font-mono text-sm leading-relaxed">
                                    {formatPrincipalVariation(results.suggestions[idx][1])}
                                  </code>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                  This shows the expected continuation if both players play optimally.
                                </p>
                              </div>

                              <div>
                                <p className="text-sm font-medium text-slate-700 mb-2">Interactive Moves:</p>
                                <p className="text-xs text-slate-500 mb-2">
                                  Click on a move to see the board position after that move.
                                </p>
                                <div className="bg-slate-50 p-4 rounded-lg">
                                  {renderVariationMoves(results.suggestions[idx][1], idx)}
                                </div>
                              </div>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 mt-12 pt-8 border-t">
            <Link href="/" className="flex-1 min-w-48">
              <Button variant="outline" className="w-full">
                <RotateCcw className="w-4 h-4 mr-2" />
                Analyze Different Turn
              </Button>
            </Link>
            <Link href="/" className="flex-1 min-w-48">
              <Button className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Try Another Position
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
