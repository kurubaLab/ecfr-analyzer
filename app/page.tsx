// app/page.tsx
'use client';

import { useEffect, useState, useMemo, Fragment } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Navigation from '@/components/Navigation';

// --- TYPES ---
interface Snapshot {
  date: string;
  isLoaded: boolean;
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
  
  // STATE: Expansion
  const [expandedId, setExpandedId] = useState<number | null>(null); // For Title Table
  const [expandedAgency, setExpandedAgency] = useState<string | null>(null); // For Agency Table
  
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

  // --- HELPER: CALCULATE CHURN ---
  const getChurn = (history: Snapshot[]): number => {
    if (!history || history.length < 2) return 0;
    // Filter only loaded snapshots for math
    const loadedHistory = history.filter(h => h.isLoaded);
    if(loadedHistory.length < 2) return 0;

    const sorted = [...loadedHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const current = sorted[0].wordCount;
    const previous = sorted[1].wordCount;
    
    if (previous === 0) return 0;
    
    const diff = Math.abs(current - previous);
    return (diff / previous) * 100;
  };

  // --- AGGREGATION LOGIC ---
  const agencyMetrics = useMemo(() => {
    const map = new Map<string, { count: number, words: number, scoreSum: number, churnSum: number, titleList: RegulationTitle[] }>();

    titles.forEach(t => {
        const churnVal = getChurn(t.history);
        
        t.agencies.forEach(agencyName => {
            if (!map.has(agencyName)) {
                map.set(agencyName, { count: 0, words: 0, scoreSum: 0, churnSum: 0, titleList: [] });
            }
            const entry = map.get(agencyName)!;
            
            entry.titleList.push(t);
            entry.count += 1;
            
            if (t.isAnalyzed) {
                entry.words += t.currentWordCount;
                entry.scoreSum += t.currentRestrictionScore;
                entry.churnSum += churnVal;
            }
        });
    });

    return Array.from(map.entries()).map(([name, stats]) => ({
        name,
        titles: stats.count,
        titleList: stats.titleList.sort((a,b) => a.number - b.number),
        words: stats.words,
        avgScore: stats.count > 0 ? (stats.scoreSum / stats.count).toFixed(2) : "0.00",
        avgChurn: stats.count > 0 ? (stats.churnSum / stats.count).toFixed(2) : "0.00"
    })).sort((a, b) => b.words - a.words); 

  }, [titles]);

  const getSortedHistory = (history: Snapshot[]) => {
    return [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  if (loading) return <div className="p-12 text-center text-xl font-bold text-black">Loading Regulatory Data...</div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-black relative">
      
      {/* 1. NAVIGATION COMPONENT */}
      <Navigation />

      <div className="p-8 pt-0">
        
        {/* --- NEW: DATA DISCLAIMER BANNER --- */}
        <div className="max-w-7xl mx-auto mb-8 bg-yellow-100 border-4 border-black p-4 flex items-start shadow-sm">
            <span className="text-3xl mr-4">⚠️</span>
            <div>
                <h3 className="font-black uppercase text-lg">Data Completeness Disclaimer</h3>
                <p className="font-medium text-gray-900">
                    The analysis below is based on a <strong>partial subset</strong> of Federal Regulations. 
                    Only Titles and Snapshots explicitly loaded via the Admin Console are included in the calculations. 
                    This data does not represent the entirety of the US Code of Federal Regulations.
                </p>
            </div>
        </div>
        
        {/* METRIC DEFINITION CARDS */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {/* Card 1: Word Count */}
            <div className="bg-white border-2 border-black p-5 shadow-md">
                <h3 className="font-black text-lg uppercase mb-2 text-gray-900 border-b-2 border-black pb-2">
                    Metric: Word Count
                </h3>
                <p className="text-sm font-medium text-gray-700">
                    Total volume of regulation text. Higher counts indicate larger, more complex regulations.
                </p>
            </div>

            {/* Card 2: Restriction Score */}
            <div className="bg-white border-2 border-green-700 p-5 shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-4 h-4 bg-green-100 border-l border-b border-green-700"></div>
                <h3 className="font-black text-lg uppercase mb-2 text-green-900 border-b-2 border-green-700 pb-2">
                    Metric: Restriction Score
                </h3>
                <p className="text-sm font-medium text-green-800 mb-2">
                    Measures regulatory burden density.
                </p>
                <div className="bg-green-50 p-2 border border-green-200 text-xs font-mono text-green-900">
                    Formula: (Restrictions / Words) * 1000
                </div>
            </div>

            {/* Card 3: Churn Score */}
            <div className="bg-white border-2 border-yellow-600 p-5 shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-4 h-4 bg-yellow-100 border-l border-b border-yellow-600"></div>
                <h3 className="font-black text-lg uppercase mb-2 text-yellow-900 border-b-2 border-yellow-600 pb-2">
                    Metric: Churn Score
                </h3>
                <p className="text-sm font-medium text-yellow-800 mb-2">
                    Measures instability or volatility.
                </p>
                <div className="bg-yellow-50 p-2 border border-yellow-200 text-xs font-mono text-yellow-900">
                    Formula: |Current - Previous| / Previous
                </div>
            </div>
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
                    <th className="px-6 py-4">Regulation Name</th>
                    <th className="px-6 py-4 text-right">Words</th>
                    <th className="px-6 py-4 text-right">Restrict. Score</th>
                    <th className="px-6 py-4 text-right">Last Updated</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y-2 divide-gray-200">
                    {titles.map((title) => {
                        const churn = getChurn(title.history);
                        return (
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
                            
                            {/* EXPANDED TITLE ROW (SNAPSHOTS) */}
                            {expandedId === title.id && (
                                <tr className="bg-gray-50 shadow-inner">
                                    <td colSpan={7} className="p-6">
                                        <h4 className="font-black text-sm uppercase text-gray-500 mb-4">
                                            Full Timeline: Title {title.number}
                                        </h4>
                                        <div className="bg-white border-2 border-gray-300 max-h-96 overflow-y-auto">
                                            <div className="grid grid-cols-5 gap-4 font-bold text-sm border-b-2 border-black p-4 bg-gray-100 sticky top-0">
                                                <div>Effective Date</div>
                                                <div>Status</div>
                                                <div className="text-right">Word Count</div>
                                                <div className="text-right">Score</div>
                                                <div>Checksum</div>
                                            </div>

                                            {title.history.length === 0 ? (
                                                <div className="p-4 text-gray-500 italic">No timeline metadata available.</div>
                                            ) : (
                                                title.history.map((h, i) => (
                                                    <div key={i} className={`grid grid-cols-5 gap-4 text-sm py-2 px-4 border-b border-gray-100 items-center ${h.isLoaded ? 'bg-white' : 'bg-gray-50 text-gray-400'}`}>
                                                        <div className={`font-mono ${h.isLoaded ? 'text-blue-800 font-bold' : ''}`}>{h.date}</div>
                                                        <div>
                                                            {h.isLoaded ? (
                                                                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-bold border border-green-200">ANALYZED</span>
                                                            ) : (
                                                                <span className="bg-gray-200 text-gray-500 text-xs px-2 py-1 rounded font-bold">NOT LOADED</span>
                                                            )}
                                                        </div>
                                                        <div className="text-right font-mono">{h.isLoaded ? h.wordCount.toLocaleString() : "—"}</div>
                                                        <div className="text-right">{h.restrictionScore}</div>
                                                        <div className="font-mono text-xs truncate" title={h.checksum}>{h.checksum}</div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </Fragment>
                        );
                    })}
                </tbody>
                </table>
            )}

            {/* VIEW 2: AGENCY TABLE (UPDATED WITH EXPAND) */}
            {activeTab === 'agencies' && (
                <table className="min-w-full text-left">
                    <thead className="bg-black text-white uppercase font-black">
                        <tr>
                        <th className="px-6 py-4">Agency Name</th>
                        <th className="px-6 py-4 text-right">Titles Managed</th>
                        <th className="px-6 py-4 text-right">Total Words</th>
                        <th className="px-6 py-4 text-right">Avg. Restrict</th>
                        <th className="px-6 py-4 text-right">Avg. Churn</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-gray-200">
                        {agencyMetrics.map((agency, idx) => (
                            <Fragment key={idx}>
                                <tr 
                                    className={`transition-colors cursor-pointer ${expandedAgency === agency.name ? 'bg-blue-50' : 'hover:bg-yellow-50'}`}
                                    onClick={() => setExpandedAgency(expandedAgency === agency.name ? null : agency.name)}
                                >
                                    <td className="px-6 py-4 font-black text-lg border-r border-gray-200">{agency.name}</td>
                                    <td className="px-6 py-4 text-right font-bold border-r border-gray-200">{agency.titles}</td>
                                    <td className="px-6 py-4 text-right font-mono font-bold border-r border-gray-200">
                                        {agency.words > 0 ? agency.words.toLocaleString() : <span className="text-gray-400">—</span>}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold border-r border-gray-200">
                                        {agency.words > 0 ? (
                                            <span className={`px-2 py-1 text-xs font-bold border ${parseFloat(agency.avgScore) > 50 ? 'bg-black text-white' : 'bg-white text-black border-black'}`}>
                                                {agency.avgScore}
                                            </span>
                                        ) : <span className="text-gray-400 text-xs">N/A</span>}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold">
                                        {agency.words > 0 ? (
                                            <span className={`px-2 py-1 text-xs font-bold border ${parseFloat(agency.avgChurn) > 0 ? 'bg-yellow-100 text-yellow-900 border-yellow-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                                                {agency.avgChurn}%
                                            </span>
                                        ) : <span className="text-gray-400 text-xs">N/A</span>}
                                    </td>
                                </tr>

                                {/* EXPANDED AGENCY ROW (TITLES TABLE) */}
                                {expandedAgency === agency.name && (
                                    <tr className="bg-gray-50 shadow-inner">
                                        <td colSpan={5} className="p-6">
                                            <h4 className="font-black text-sm uppercase text-gray-500 mb-4">
                                                Titles Managed by: {agency.name}
                                            </h4>
                                            
                                            {/* Nested Scrollable Table */}
                                            <div className="bg-white border-2 border-gray-300 max-h-80 overflow-y-auto">
                                                <div className="grid grid-cols-5 gap-4 font-bold text-sm border-b-2 border-black p-4 bg-gray-100 sticky top-0">
                                                    <div>Title #</div>
                                                    <div className="col-span-2">Regulation Name</div>
                                                    <div>Status</div>
                                                    <div className="text-right">Word Count</div>
                                                </div>

                                                {agency.titleList.length === 0 ? (
                                                    <div className="p-4 text-gray-500 italic">No associated titles found.</div>
                                                ) : (
                                                    agency.titleList.map((t, i) => (
                                                        <div key={i} className="grid grid-cols-5 gap-4 text-sm py-3 px-4 border-b border-gray-100 hover:bg-blue-50 items-center">
                                                            <div className="font-black text-lg">Title {t.number}</div>
                                                            <div className="col-span-2 font-medium text-gray-800 truncate" title={t.name}>
                                                                {t.name}
                                                            </div>
                                                            <div>
                                                                {t.isAnalyzed ? (
                                                                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-bold border border-green-200">
                                                                        LOADED
                                                                    </span>
                                                                ) : (
                                                                    <span className="bg-gray-200 text-gray-500 text-xs px-2 py-1 rounded font-bold">
                                                                        METADATA
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-right font-mono font-bold">
                                                                {t.isAnalyzed ? t.currentWordCount.toLocaleString() : "—"}
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
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
                            <LineChart data={getSortedHistory(chartData.history.filter(h => h.isLoaded))}>
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
    </div>
  );
}