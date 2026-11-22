import React, { useState } from 'react'
import { getSymptomGuide } from '../api/food'
import { SymptomGuideResult } from '../types/food'
import { toast } from 'sonner'

interface SymptomTriageModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SymptomTriageModal({ isOpen, onClose }: SymptomTriageModalProps) {
  const [symptoms, setSymptoms] = useState('')
  const [duration, setDuration] = useState('1-2')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SymptomGuideResult | null>(null)

  if (!isOpen) return null

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!symptoms.trim()) {
      toast.error('Please describe your symptoms')
      return
    }

    setLoading(true)
    try {
      const data = await getSymptomGuide({
        symptoms_text: symptoms.trim(),
        duration_days: duration,
      })
      setResult(data)
    } catch {
      toast.error('Unable to generate symptom guide. Please check connection.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setSymptoms('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl border border-gray-100 p-5 sm:p-6 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🩺</span>
            <div>
              <h3 className="text-base font-black text-gray-900 tracking-tight">
                Doctor Visit & Symptom Guide
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">
                Safe clinical triage & appointment preparation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-bold transition"
          >
            ✕
          </button>
        </div>

        {!result ? (
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div>
              <label htmlFor="symptoms-input" className="block text-xs font-bold text-gray-700 mb-1.5">
                Describe Your Symptoms
              </label>
              <textarea
                id="symptoms-input"
                rows={3}
                required
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="e.g. Mild fever with dry cough and throat irritation for 2 days..."
                className="w-full rounded-2xl border border-gray-200 bg-gray-50/70 p-3 text-xs font-medium focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label htmlFor="duration-select" className="block text-xs font-bold text-gray-700 mb-1.5">
                How Long Have You Had These Symptoms?
              </label>
              <select
                id="duration-select"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/70 p-2.5 text-xs font-semibold focus:bg-white focus:outline-none"
              >
                <option value="today">Started Today</option>
                <option value="1-2">1 to 2 Days</option>
                <option value="3-5">3 to 5 Days</option>
                <option value="over_a_week">More than a Week</option>
              </select>
            </div>

            <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200/70 text-[11px] text-blue-900 leading-relaxed font-medium">
              💡 <strong>Zero Prescription Guarantee</strong>: FoodAI never auto-diagnoses or prescribes medicine. This tool equips you with smart questions and safety checks for your doctor consultation.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold shadow-md transition disabled:opacity-50"
            >
              {loading ? 'Analyzing Clinical Triage...' : 'Generate Doctor Prep Guide ➔'}
            </button>
          </form>
        ) : (
          <div className="space-y-4 text-xs animate-fade-in-up">
            {/* Triage Level */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 font-bold">
              <span className="text-[10px] uppercase tracking-wider block text-emerald-700 mb-0.5">
                Triage Assessment
              </span>
              <p className="text-sm font-black">{result.triage_level}</p>
              <p className="text-xs font-medium mt-1 text-emerald-900">{result.overview}</p>
            </div>

            {/* Questions to Ask Doctor */}
            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-900 mb-2 flex items-center gap-1.5">
                <span>📋</span> Questions to Ask Your Doctor
              </h4>
              <ul className="space-y-1.5 text-gray-700">
                {(result.questions_for_doctor || []).map((q, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-gray-50 p-2 rounded-xl">
                    <span className="text-emerald-600 font-bold">Q{idx + 1}:</span>
                    <span className="font-medium leading-relaxed">{q}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Home Comfort & Hydration Tips */}
            <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200/80">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-teal-950 mb-2 flex items-center gap-1.5">
                <span>💧</span> Home Comfort & Supportive Care
              </h4>
              <ul className="space-y-1 text-teal-900">
                {(result.home_comfort_measures || []).map((m, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 font-medium">
                    <span>•</span>
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Emergency Red Flags */}
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-950 mb-1.5 flex items-center gap-1.5">
                <span>🚨</span> Seek Emergency Hospital Care If:
              </h4>
              <ul className="space-y-1 text-rose-900 text-[11px] font-medium">
                {(result.red_flag_warnings || []).map((rf, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span>⚠️</span>
                    <span>{rf}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Disclaimer */}
            <p className="text-[10px] text-gray-400 font-medium text-center leading-relaxed">
              {result.disclaimer}
            </p>

            <button
              type="button"
              onClick={handleReset}
              className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition"
            >
              Check Another Symptom
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
