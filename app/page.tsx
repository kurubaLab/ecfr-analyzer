// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- TYPES ---
interface Snapshot {
  date: string;
  wordCount: number;
  restrictionScore: string;
  checksum: string;
}

interface RegulationTitle {
  id: number;
  number: number;
  name: string;
  agencies: string;
  isAnalyzed: boolean;
  currentWordCount: string;
  currentRestrictionScore: string;
  lastUpdated: string;
  history: Snapshot[];
}

export default function DashboardPage() {
  const [titles, setTitles] = useState<RegulationTitle[]>([]);
  const [loading, setLoading] = useState(true);
  
  // STATE: Which row is expanded?
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  // STATE: Which title is being charted? (If null, modal is closed)
  const [chartData, setChartData] = useState<RegulationTitle | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((data) => {
        setTitles(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // HELPER: Sort history for the chart (Oldest -> Newest)
  const getSortedHistory = (history: Snapshot[]) => {
    return [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  if (loading) return <div className="p-12 text-center text-xl font-bold text-black">Loading Regulatory Data...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-black relative">
      
      {/* 1. HEADER */}
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-10 border-b-4 border-black pb-4">
        <div>
          <h1 className="text-4xl font-extrabold text-black uppercase tracking-tight">eCFR Explorer</h1>
          <p className="text-lg font-bold text-gray-700 mt-1">Federal Regulations Analysis System</p>
        </div>
        <Link 
          href="/admin" 
          className="bg-black text-white px-6 py-3 font-bold text-lg hover:bg-gray-800 transition shadow-lg"
        >
          ADMIN CONSOLE &rarr;
        </Link>
      </div>

      {/* 2. MAIN TABLE */}
      <div className="max-w-7xl mx-auto border-4 border-black bg-white shadow-xl">
        <table className="min-w-full text-left">
          <thead className="bg-black text-white uppercase font-black">
            <tr>
              <th className="px-6 py-4">Title</th>
              <th className="px-6 py-4">Agency / Description</th>
              <th className="px-6 py-4 text-right">Words</th>
              <th className="px-6 py-4 text-right">Restrict. Score</th>
              <th className="px-6 py-4 text-right">Last Updated</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-gray-200">
            {titles.map((title) => (
              <>
                {/* PARENT ROW */}
                <tr 
                    key={title.id} 
                    className={`transition-colors cursor-pointer ${expandedId === title.id ? 'bg-blue-50' : 'hover:bg-gray-100'}`}
                    onClick={() => setExpandedId(expandedId === title.id ? null : title.id)}
                >
                  <td className="px-6 py-4 font-black text-lg border-r border-gray-200">
                    Title {title.number}
                  </td>
                  <td className="px-6 py-4 font-medium border-r border-gray-200">
                    <div className="font-bold text-gray-900">{title.name}</div>
                    <div className="text-sm text-gray-600 truncate max-w-xs">{title.agencies}</div>
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-bold border-r border-gray-200">
                    {title.currentWordCount}
                  </td>
                  <td className="px-6 py-4 text-right border-r border-gray-200">
                    {title.isAnalyzed ? (
                       <span className={`px-2 py-1 text-xs font-bold border ${parseFloat(title.currentRestrictionScore) > 50 ? 'bg-red-100 text-red-900 border-red-300' : 'bg-green-100 text-green-900 border-green-300'}`}>
                         {title.currentRestrictionScore}
                       </span>
                    ) : (
                       <span className="text-gray-400 text-xs font-bold">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-700 border-r border-gray-200">
                     {title.isAnalyzed ? title.lastUpdated : <span className="bg-gray-200 text-gray-600 px-2 py-1 text-xs font-bold rounded">METADATA ONLY</span>}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {/* CHART BUTTON (Only if analyzed) */}
                    {title.isAnalyzed && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation(); // Don't trigger row expand
                                setChartData(title);
                            }}
                            className="bg-blue-600 text-white p-2 rounded hover:bg-blue-800 transition"
                            title="View Historical Chart"
                        >
                           📈 Chart
                        </button>
                    )}
                  </td>
                </tr>

                {/* CHILD ROW (EXPANDED SNAPSHOTS) */}
                {expandedId === title.id && (
                    <tr className="bg-gray-50 shadow-inner">
                        <td colSpan={6} className="p-0">
                            <div className="p-6 border-b-2 border-black">
                                <h4 className="font-black text-sm uppercase text-gray-500 mb-4">
                                    Historical Snapshots for Title {title.number}
                                </h4>
                                {title.history.length === 0 ? (
                                    <div className="text-gray-500 italic">No historical text analysis available. Run "Select Mode" in Admin to analyze this Title.</div>
                                ) : (
                                    <table className="w-full text-sm border-2 border-gray-300 bg-white">
                                        <thead className="bg-gray-200 font-bold text-gray-700">
                                            <tr>
                                                <th className="p-2 border border-gray-300">Effective Date</th>
                                                <th className="p-2 border border-gray-300 text-right">Word Count</th>
                                                <th className="p-2 border border-gray-300 text-right">Restriction Score</th>
                                                <th className="p-2 border border-gray-300">Checksum (SHA-256)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {title.history.map((snap, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="p-2 border border-gray-300 font-bold text-blue-800">{snap.date}</td>
                                                    <td className="p-2 border border-gray-300 text-right font-mono">{snap.wordCount.toLocaleString()}</td>
                                                    <td className="p-2 border border-gray-300 text-right">{snap.restrictionScore}</td>
                                                    <td className="p-2 border border-gray-300 font-mono text-xs text-gray-500 truncate max-w-xs" title={snap.checksum}>
                                                        {snap.checksum.substring(0, 20)}...
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </td>
                    </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* 3. CHART MODAL (Overlay) */}
      {chartData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-8 w-full max-w-4xl border-4 border-black shadow-2xl relative">
                <button 
                    onClick={() => setChartData(null)}
                    className="absolute top-4 right-4 text-3xl font-bold hover:text-red-600"
                >
                    &times;
                </button>

                <h2 className="text-2xl font-black uppercase mb-2">Historical Analysis: Title {chartData.number}</h2>
                <p className="text-gray-600 mb-8 font-medium">{chartData.name}</p>

                <div className="h-96 w-full bg-gray-50 border-2 border-gray-200 p-4">
                     <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={getSortedHistory(chartData.history)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                            <XAxis dataKey="date" tick={{fontWeight: 'bold'}} />
                            <YAxis tick={{fontWeight: 'bold'}} />
                            <Tooltip 
                                contentStyle={{ border: '2px solid black', fontWeight: 'bold' }} 
                            />
                            <Legend />
                            <Line 
                                type="monotone" 
                                dataKey="wordCount" 
                                name="Word Count" 
                                stroke="#000" 
                                strokeWidth={3} 
                                activeDot={{ r: 8 }} 
                            />
                             <Line 
                                type="monotone" 
                                dataKey="restrictionScore" 
                                name="Restriction Score" 
                                stroke="#2563eb" 
                                strokeWidth={3} 
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                
                <div className="mt-6 flex justify-end">
                    <button 
                        onClick={() => setChartData(null)}
                        className="bg-black text-white px-6 py-2 font-bold uppercase hover:bg-gray-800"
                    >
                        Close Chart
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}