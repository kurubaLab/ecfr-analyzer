// app/admin/page.tsx
'use client';

import { useState } from 'react';

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  // Configuration State
  const [mode, setMode] = useState<'demo' | 'custom'>('demo');
  const [customTitles, setCustomTitles] = useState("1, 14, 40");
  const [customLimit, setCustomLimit] = useState(3);

  const handleInitialize = async () => {
    if(!confirm("⚠️ This will WIPE the database and start a new scrape. Continue?")) return;

    setLoading(true);
    setMessage("Starting process... (Fetching global metadata + analyzing selection)...");

    try {
      // Send the configuration to the API
      const res = await fetch('/api/seed', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            mode: mode,
            titles: customTitles,
            limit: customLimit
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setMessage("✅ Success! " + data.message);
      } else {
        setMessage(`❌ Error: ${data.message}`);
      }
    } catch (err) {
      setMessage("❌ Network Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-extrabold mb-8 text-black uppercase">System Administration</h1>
        
        <div className="bg-white p-8 rounded-none border-4 border-black shadow-lg">
          <h2 className="text-2xl font-black mb-6 border-b-2 border-black pb-2 uppercase">Database Initialization</h2>
          
          {/* Mode Selection */}
          <div className="mb-8 space-y-4">
            <p className="font-bold text-gray-800 mb-2">Select Loading Strategy:</p>
            
            {/* DEMO MODE OPTION */}
            <div 
                className={`p-4 border-2 cursor-pointer transition-colors ${mode === 'demo' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}
                onClick={() => setMode('demo')}
            >
                <div className="flex items-center mb-2">
                    <input 
                        type="radio" 
                        checked={mode === 'demo'} 
                        onChange={() => setMode('demo')}
                        className="w-5 h-5 text-blue-600"
                    />
                    <span className="ml-3 font-bold text-lg text-black">Demo Mode (Recommended)</span>
                </div>
                <p className="text-sm text-gray-700 ml-8">
                    Loads <strong>ALL</strong> global Agencies and Titles (Metadata). 
                    Restricts deep XML text analysis to <strong>Titles 1-5</strong> (Latest 5 snapshots). 
                    <br/><span className="italic text-gray-500">Fastest setup for assessment review.</span>
                </p>
            </div>

            {/* CUSTOM / SELECT MODE OPTION */}
            <div 
                className={`p-4 border-2 cursor-pointer transition-colors ${mode === 'custom' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}
                onClick={() => setMode('custom')}
            >
                <div className="flex items-center mb-2">
                    <input 
                        type="radio" 
                        checked={mode === 'custom'} 
                        onChange={() => setMode('custom')}
                        className="w-5 h-5 text-blue-600"
                    />
                    <span className="ml-3 font-bold text-lg text-black">Select Mode (Custom Load)</span>
                </div>
                <p className="text-sm text-gray-700 ml-8 mb-4">
                    Loads <strong>ALL</strong> global Metadata, but allows you to specify exactly which Titles to analyze deeply.
                </p>

                {/* Custom Controls (Only visible if Custom is selected) */}
                {mode === 'custom' && (
                    <div className="ml-8 mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-black mb-1">Target Titles (Comma Separated)</label>
                            <input 
                                type="text" 
                                value={customTitles}
                                onChange={(e) => setCustomTitles(e.target.value)}
                                className="w-full p-2 border-2 border-black rounded-none focus:outline-none focus:border-blue-600"
                                placeholder="e.g. 1, 14, 40"
                            />
                            <p className="text-xs text-gray-500 mt-1">Enter numbers 1-50</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-black mb-1">Snapshots per Title</label>
                            <input 
                                type="number" 
                                min="1"
                                max="20"
                                value={customLimit}
                                onChange={(e) => setCustomLimit(parseInt(e.target.value))}
                                className="w-full p-2 border-2 border-black rounded-none focus:outline-none focus:border-blue-600"
                            />
                        </div>
                    </div>
                )}
            </div>
          </div>

          {/* WARNING LABEL (If > 3 snapshots selected) */}
          {(mode === 'demo' && 5 > 3) || (mode === 'custom' && customLimit > 3) ? (
             <div className="mb-6 bg-orange-100 border-l-4 border-orange-500 text-orange-800 p-4 font-bold flex items-start">
                <span className="mr-2">⚠️</span>
                <div>
                    <p>High Load Warning</p>
                    <p className="text-sm font-normal">
                        You have selected more than 3 snapshots per title. 
                        Downloading and parsing XML files is resource-intensive. 
                        Please allow extra time for the process to complete.
                    </p>
                </div>
             </div>
          ) : null}

          {/* Action Button */}
          <button
            onClick={handleInitialize}
            disabled={loading}
            className={`w-full py-4 text-white font-black text-lg uppercase tracking-wider transition-all shadow-md
              ${loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-black hover:bg-gray-800 hover:shadow-lg'
              }`}
          >
            {loading ? 'Initializing Database...' : 'Run Initialization'}
          </button>

          {/* Status Message */}
          {message && (
            <div className={`mt-6 p-4 border-2 font-bold ${message.includes('Error') ? 'border-red-600 bg-red-50 text-red-900' : 'border-green-600 bg-green-50 text-green-900'}`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}