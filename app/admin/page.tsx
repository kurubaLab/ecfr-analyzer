// app/admin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';

// Types
interface TitleMeta {
  number: number;
  name: string;
  allDates: string[];
  loadedDates: string[];
}

export default function AdminPage() {
  // --- STATE ---
  const [initLoading, setInitLoading] = useState(false);
  const [initMessage, setInitMessage] = useState("");
  
  const [titles, setTitles] = useState<TitleMeta[]>([]);
  const [loadingTitles, setLoadingTitles] = useState(true);
  const [mode, setMode] = useState<'demo' | 'user'>('user');
  
  const [selectedTitleNum, setSelectedTitleNum] = useState<number | null>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [scrapeMessage, setScrapeMessage] = useState("");

  const fetchTitles = async () => {
    setLoadingTitles(true);
    try {
      const res = await fetch('/api/admin/titles');
      const data = await res.json();
      setTitles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTitles(false);
    }
  };

  useEffect(() => {
    fetchTitles(); 
  }, []);

  // --- HANDLER: GLOBAL INIT (REFRESH vs RESET) ---
  const handleInit = async (reset: boolean) => {
    const action = reset ? "FACTORY RESET" : "Refresh Metadata";
    const warning = reset 
        ? "⚠️ DANGER: This will DELETE ALL loaded regulation text and metrics. The database will be reset to Metadata Only. Continue?" 
        : "Refresh global metadata (Agencies/Titles)? Existing text analysis will be preserved.";
    
    if(!confirm(warning)) return;
    
    setInitLoading(true);
    setInitMessage(`${action} in progress... (this takes ~30-60s)`);
    
    try {
        await fetch('/api/admin/init', { 
            method: 'POST',
            body: JSON.stringify({ reset: reset })
        });
        setInitMessage(`✅ ${reset ? "Database Reset & Re-initialized" : "Metadata Refreshed"}`);
        fetchTitles(); 
    } catch(err) {
        setInitMessage("❌ Error during initialization");
    } finally {
        setInitLoading(false);
    }
  };

  const getSelectedTitleData = () => titles.find(t => t.number === selectedTitleNum);

  const toggleDate = (date: string) => {
    if (selectedDates.includes(date)) {
        setSelectedDates(selectedDates.filter(d => d !== date));
    } else {
        if (selectedDates.length >= 5) {
            alert("You can only select up to 5 snapshots at a time.");
            return;
        }
        setSelectedDates([...selectedDates, date]);
    }
  };

  const handleScrape = async () => {
    // ... (Keep existing scrape logic from previous steps) ...
    // Note: Pasting the exact logic here for completeness
    
    if (mode === 'demo') {
        if(!confirm("Run Demo Load? This will sequentially load Titles 1-5 (3 snapshots each).")) return;
        setScrapeLoading(true);
        const targetTitles = [1, 2, 3, 4, 5];
        let errorCount = 0;
        for (const tNum of targetTitles) {
            const meta = titles.find(t => t.number === tNum);
            if (!meta) continue;
            const datesToLoad = meta.allDates.slice(0, 3);
            if (datesToLoad.length === 0) continue;
            setScrapeMessage(`Demo Mode: Processing Title ${tNum}...`);
            try {
                const res = await fetch('/api/admin/scrape', { 
                    method: 'POST',
                    body: JSON.stringify({ titleNumber: tNum, dates: datesToLoad })
                });
                if (!res.ok) errorCount++;
            } catch (err) { errorCount++; }
        }
        setScrapeLoading(false);
        setScrapeMessage(errorCount === 0 ? "✅ Demo Load Complete" : "⚠️ Demo Complete with errors");
        fetchTitles();
        return;
    } else {
        if (!selectedTitleNum || selectedDates.length === 0) {
            alert("Please select a title and at least one date.");
            return;
        }
        setScrapeLoading(true);
        setScrapeMessage(`Loading text for ${selectedDates.length} snapshot(s)...`);
        try {
            const res = await fetch('/api/admin/scrape', { 
                method: 'POST',
                body: JSON.stringify({ titleNumber: selectedTitleNum, dates: selectedDates })
            });
            if(res.ok) {
                setScrapeMessage("✅ Text Loaded Successfully!");
                setSelectedDates([]); 
                fetchTitles();
            } else { setScrapeMessage("❌ Error loading text."); }
        } catch(err) { setScrapeMessage("❌ Network Error"); }
        finally { setScrapeLoading(false); }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-black">
      <Navigation />

      <div className="max-w-5xl mx-auto p-8 pt-0">
        
        {/* SECTION 1: GLOBAL METADATA */}
        <div className="bg-white p-8 border-4 border-black mb-8 shadow-lg">
            <h2 className="text-2xl font-black uppercase mb-4 border-b-4 border-black pb-2">1. System Initialization</h2>
            <p className="mb-6 text-gray-700 font-medium">
                Manage the core database structure (Agencies, Titles, Version Dates).
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* REFRESH BUTTON */}
                <div>
                    <button 
                        onClick={() => handleInit(false)} // reset = false
                        disabled={initLoading}
                        className={`w-full py-4 font-black uppercase tracking-widest border-4 border-black ${initLoading ? 'bg-gray-300' : 'bg-white hover:bg-gray-100'}`}
                    >
                        Refresh Metadata
                    </button>
                    <p className="text-xs text-gray-500 mt-2 text-center">Updates lists. Keeps existing regulatory text.</p>
                </div>

                {/* RESET BUTTON */}
                <div>
                    <button 
                        onClick={() => handleInit(true)} // reset = true
                        disabled={initLoading}
                        className={`w-full py-4 font-black uppercase tracking-widest border-4 border-black text-white ${initLoading ? 'bg-gray-300' : 'bg-red-700 hover:bg-red-800'}`}
                    >
                        Factory Reset
                    </button>
                    <p className="text-xs text-red-700 mt-2 text-center font-bold">⚠️ DELETES ALL REGULATORY TEXT DATA</p>
                </div>
            </div>
            
            {initMessage && <div className={`mt-6 p-4 border-2 text-center font-bold ${initMessage.includes('Error') ? 'bg-red-100 border-red-600' : 'bg-green-100 border-green-600'}`}>{initMessage}</div>}
        </div>

        {/* SECTION 2: LOAD REGULATION TEXT */}
        <div className="bg-white p-8 border-4 border-black shadow-lg">
            <h2 className="text-2xl font-black uppercase mb-6 border-b-4 border-black pb-2">2. Load Regulation Text</h2>
            
            {/* Mode Toggle */}
            <div className="flex space-x-4 mb-8">
                <button 
                    onClick={() => setMode('user')}
                    className={`flex-1 py-3 font-black uppercase border-4 ${mode === 'user' ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-200'}`}
                >
                    User Select Mode
                </button>
                <button 
                    onClick={() => setMode('demo')}
                    className={`flex-1 py-3 font-black uppercase border-4 ${mode === 'demo' ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-200'}`}
                >
                    Demo Mode
                </button>
            </div>

            {/* DEMO MODE UI */}
            {mode === 'demo' && (
                <div className="bg-gray-100 p-6 border-2 border-gray-300">
                    <p className="font-bold mb-4">Demo Mode will sequentially load <span className="text-blue-700">Titles 1 through 5</span> with the latest <span className="text-blue-700">3 snapshots</span> for each.</p>
                    <button 
                        onClick={handleScrape}
                        disabled={scrapeLoading}
                        className="bg-black text-white px-6 py-3 font-bold uppercase hover:bg-gray-800"
                    >
                        {scrapeLoading ? 'Running Demo Sequence...' : 'Run Demo Load'}
                    </button>
                </div>
            )}

            {/* USER SELECT MODE UI */}
            {mode === 'user' && (
                <div>
                    {/* A. Dropdown */}
                    <div className="mb-6">
                        <label className="block font-black uppercase mb-2">Select Regulation Title</label>
                        <select 
                            className="w-full p-4 border-4 border-black font-bold text-lg bg-white"
                            onChange={(e) => {
                                setSelectedTitleNum(parseInt(e.target.value));
                                setSelectedDates([]); 
                            }}
                            value={selectedTitleNum || ""}
                        >
                            <option value="">-- Choose a Title --</option>
                            {titles.map(t => (
                                <option key={t.number} value={t.number}>
                                    Title {t.number}: {t.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* B. Date Selection Grid */}
                    {selectedTitleNum && (
                        <div className="mb-6">
                            <div className="flex justify-between items-end mb-2">
                                <label className="block font-black uppercase">Select Snapshots (Max 5)</label>
                                <span className="font-bold text-blue-600">{selectedDates.length} / 5 Selected</span>
                            </div>
                            
                            <div className="border-4 border-black p-4 max-h-60 overflow-y-auto bg-gray-50 grid grid-cols-2 md:grid-cols-4 gap-2">
                                {getSelectedTitleData()?.allDates.map(date => {
                                    const isLoaded = getSelectedTitleData()?.loadedDates.includes(date);
                                    const isSelected = selectedDates.includes(date);

                                    return (
                                        <div 
                                            key={date}
                                            onClick={() => !isLoaded && toggleDate(date)}
                                            className={`
                                                p-2 text-center text-sm font-bold border-2 cursor-pointer transition-all
                                                ${isLoaded 
                                                    ? 'bg-green-100 border-green-500 text-green-900 cursor-default opacity-60' 
                                                    : isSelected 
                                                        ? 'bg-blue-600 border-blue-600 text-white' 
                                                        : 'bg-white border-gray-300 hover:border-black text-gray-700'
                                                }
                                            `}
                                        >
                                            {date}
                                            {isLoaded && <div className="text-[10px] uppercase">Loaded</div>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* C. Action Button */}
                    <button 
                        onClick={handleScrape}
                        disabled={scrapeLoading || !selectedTitleNum || selectedDates.length === 0}
                        className={`w-full py-4 font-black uppercase tracking-widest border-4 border-black
                            ${(scrapeLoading || !selectedTitleNum || selectedDates.length === 0)
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                : 'bg-black text-white hover:bg-gray-800'
                            }`}
                    >
                        {scrapeLoading ? 'Loading Text Data...' : 'Load Selected Snapshots'}
                    </button>
                </div>
            )}
            
            {/* Status Message */}
            {scrapeMessage && (
                <div className={`mt-6 p-4 border-4 font-bold text-center ${scrapeMessage.includes('Error') || scrapeMessage.includes('errors') ? 'border-red-600 bg-red-100' : 'border-green-600 bg-green-100'}`}>
                    {scrapeMessage}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}