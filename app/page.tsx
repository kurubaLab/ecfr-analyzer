// app/page.tsx
'use client';

import { useEffect, useState, useMemo, Fragment } from 'react';
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
  agencies: string[];
  isAnalyzed: boolean;
  currentWordCount: number;
  currentRestrictionScore: number;
  lastUpdated: string;
  history: Snapshot[];
}

export default function DashboardPage() {
  const [titles, setTitles] = useState<RegulationTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'titles' | 'agencies'>('titles');
  
  const [expandedId, setExpandedId] = useState<number | null>(null);
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

  // --- AGGREGATION LOGIC ---
  const agencyMetrics = useMemo(() => {
    const map = new Map<string, { count: number, words: number, scoreSum: number }>();

    titles.forEach(t => {
        t.agencies.forEach(agencyName => {
            if (!map.has(agencyName)) {
                map.set(agencyName, { count: 0, words: 0, scoreSum: 0 });
            }
            const entry = map.get(agencyName)!;
            entry.count += 1;
            if (t.isAnalyzed) {
                entry.words += t.currentWordCount;
                entry.scoreSum += t.currentRestrictionScore;
            }
        });
    });

    return Array.from(map.entries()).map(([name, stats]) => ({
        name,
        titles: stats.count,
        words: stats.words,
        avgScore: stats.count > 0 ? (stats.scoreSum / stats.count).toFixed(2) : "0.00"
    })).sort((a, b) => b.words - a.words); 

  }, [titles]);

  const getSortedHistory = (history: Snapshot[]) => {
    return [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  if (loading) return <div className="p-12 text-center text-xl font-bold text-black">Loading Regulatory Data...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-black relative">
      
      {/* HEADER */}
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-8 border-b-4 border-black pb-4">
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

      {/* TAB CONTROLS */}
      <div className="max-w-7xl mx-auto mb-6 flex space-x-4">
        <button 
            onClick={() => setActiveTab('titles')}
            className={`px-6 py-3 font-black uppercase text-lg border-2 transition-all ${
                activeTab === 'titles' 
                ? 'bg-blue-600 text-white border-blue-600 shadow-md transform -translate-y-1' 
                : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
            }`}
        >
            By Title (Detail)
        </button>
        <button 
            onClick={() => setActiveTab('agencies')}
            className={`px-6 py-3 font-black uppercase text-lg border-2 transition-all ${
                activeTab === 'agencies' 
                ? 'bg-blue-600 text-white border-blue-600 shadow-md transform -translate-y-1' 
                : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
            }`}
        >
            By Agency (Summary)
        </button>
      </div>

      {/* CONTENT AREA */}
      <div className="max-w-7xl mx-auto border-4 border-black bg-white shadow-xl min-h-[500px]">
        
        {/* VIEW 1: TITLES TABLE */}
        {activeTab === 'titles' && (
            <table className="min-w-full text-left">
            <thead className="bg-black text-white uppercase font-black">
                <tr>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Agencies</th>
                <th className="px-6 py-4 text-right">Words</th>
                <th className="px-6 py-4 text-right">Restrict. Score</th>
                <th className="px-6 py-4 text-right">Last Updated</th>
                <th className="px-6 py-4 text-center">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y-2 divide-gray-200">
                {titles.map((title) => (
                <Fragment key={title.id}>
                    <tr 
                        className={`transition-colors cursor-pointer ${expandedId === title.id ? 'bg-blue-50' : 'hover:bg-gray-100'}`}
                        onClick={() => setExpandedId(expandedId === title.id ? null : title.id)}
                    >
                    <td className="px-6 py-4 font-black text-lg border-r border-gray-200">Title {title.number}</td>
                    <td className="px-6 py-4 font-medium border-r border-gray-200">
                        <div className="text-sm text-gray-900 truncate max-w-xs" title={title.agencies.join(', ')}>
                            {title.name}
                        </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold border-r border-gray-200">
                        {title.currentWordCount > 0 ? title.currentWordCount.toLocaleString() : "—"}
                    </td>
                    <td className="px-6 py-4 text-right border-r border-gray-200">
                        {title.isAnalyzed ? (
                        <span className={`px-2 py-1 text-xs font-bold border ${title.currentRestrictionScore > 50 ? 'bg-red-100 text-red-900 border-red-300' : 'bg-green-100 text-green-900 border-green-300'}`}>
                            {title.currentRestrictionScore.toFixed(2)}
                        </span>
                        ) : <span className="text-gray-400 text-xs font-bold">N/A</span>}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-700 border-r border-gray-200">
                        {title.isAnalyzed ? title.lastUpdated : <span className="bg-gray-200 text-gray-600 px-2 py-1 text-xs font-bold rounded">METADATA</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                        {title.isAnalyzed && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setChartData(title); }}
                                className="bg-blue-600 text-white p-2 rounded hover:bg-blue-800 transition"
                            >
                            📈 Chart
                            </button>
                        )}
                    </td>
                    </tr>
                    {expandedId === title.id && (
                        <tr className="bg-gray-50 shadow-inner">
                            <td colSpan={6} className="p-6">
                                <h4 className="font-black text-sm uppercase text-gray-500 mb-4">Snapshot History (Title {title.number})</h4>
                                <div className="bg-white border-2 border-gray-300 p-4">
                                    {title.history.length === 0 ? "No history available." : (
                                        <div className="grid grid-cols-4 gap-4 font-bold text-sm border-b-2 border-black pb-2 mb-2">
                                            <div>Date</div>
                                            <div className="text-right">Words</div>
                                            <div className="text-right">Score</div>
                                            <div>Checksum</div>
                                        </div>
                                    )}
                                    {title.history.map((h, i) => (
                                        <div key={i} className="grid grid-cols-4 gap-4 text-sm py-1 border-b border-gray-100">
                                            <div className="text-blue-800">{h.date}</div>
                                            <div className="text-right font-mono">{h.wordCount.toLocaleString()}</div>
                                            <div className="text-right">{h.restrictionScore}</div>
                                            <div className="font-mono text-xs text-gray-400 truncate">{h.checksum}</div>
                                        </div>
                                    ))}
                                </div>
                            </td>
                        </tr>
                    )}
                </Fragment>
                ))}
            </tbody>
            </table>
        )}

        {/* VIEW 2: AGENCY TABLE */}
        {activeTab === 'agencies' && (
            <table className="min-w-full text-left">
                <thead className="bg-black text-white uppercase font-black">
                    <tr>
                    <th className="px-6 py-4">Agency Name</th>
                    <th className="px-6 py-4 text-right">Titles Managed</th>
                    <th className="px-6 py-4 text-right">Total Analyzed Words</th>
                    <th className="px-6 py-4 text-right">Avg. Restriction Score</th>
                    </tr>
                </thead>
                <tbody className="divide-y-2 divide-gray-200">
                    {agencyMetrics.map((agency, idx) => (
                        <tr key={idx} className="hover:bg-yellow-50 transition-colors">
                            <td className="px-6 py-4 font-black text-lg border-r border-gray-200">{agency.name}</td>
                            <td className="px-6 py-4 text-right font-bold border-r border-gray-200">{agency.titles}</td>
                            <td className="px-6 py-4 text-right font-mono font-bold border-r border-gray-200">
                                {agency.words > 0 ? agency.words.toLocaleString() : <span className="text-gray-400">—</span>}
                            </td>
                            <td className="px-6 py-4 text-right font-bold">
                                {agency.words > 0 ? (
                                    <span className={`px-2 py-1 text-xs font-bold border ${parseFloat(agency.avgScore) > 50 ? 'bg-black text-white' : 'bg-white text-black border-black'}`}>
                                        {agency.avgScore}
                                    </span>
                                ) : <span className="text-gray-400 text-xs">N/A</span>}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
      </div>

      {/* CHART MODAL */}
      {chartData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-8 w-full max-w-4xl border-4 border-black shadow-2xl relative">
                <button 
                    onClick={() => setChartData(null)}
                    className="absolute top-4 right-4 text-3xl font-bold hover:text-red-600"
                >
                    &times;
                </button>
                <h2 className="text-2xl font-black uppercase mb-2">Analysis: Title {chartData.number}</h2>
                <div className="h-80 w-full mt-8">
                     <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={getSortedHistory(chartData.history)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="wordCount" stroke="#000" strokeWidth={3} />
                            <Line type="monotone" dataKey="restrictionScore" stroke="blue" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}