// app/admin/page.tsx
'use client';

import { useState } from 'react';
import Navigation from '@/components/Navigation';

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  // Configuration State
  const [mode, setMode] = useState<'demo' | 'custom'>('demo');
  const [customTitles, setCustomTitles] = useState("1, 14, 40");
  const [customLimit, setCustomLimit] = useState(3);

  const handleInitialize = async () => {
    if(!confirm("⚠️ WARNING: This will WIPE the database and start a new scrape. Are you sure?")) return;

    setLoading(true);
    setMessage("Starting process... (Fetching global metadata + analyzing selection)...");

    try {
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
    <div className="min-h-screen bg-gray-50 font-sans text-black">
      
      {/* 1. NEW NAVIGATION COMPONENT */}
      <Navigation />

      <div className="p-8 pt-0">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-8 border-4 border-black shadow-xl">
            <h2 className="text-2xl font-black mb-6 border-b-4 border-black pb-2 uppercase">
              Database Initialization Strategy
            </h2>
            
            {/* Mode Selection */}
            <div className="mb-8 space-y-6">
              
              {/* DEMO MODE OPTION */}
              <div 
                  className={`p-6 border-4 cursor-pointer transition-all ${
                      mode === 'demo' 
                      ? 'border-blue-700 bg-blue-50 relative' 
                      : 'border-gray-300 hover:border-gray-500'
                  }`}
                  onClick={() => setMode('demo')}
              >
                  {mode === 'demo' && (
                      <div className="absolute top-0 right-0 bg-blue-700 text-white font-bold px-3 py-1 text-xs uppercase">
                          Selected
                      </div>
                  )}
                  <div className="flex items-center mb-2">
                      <div className={`w-6 h-6 border-2 border-black rounded-full flex items-center justify-center mr-4 ${mode === 'demo' ? 'bg-black' : 'bg-white'}`}>
                          {mode === 'demo' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                      </div>
                      <span className="font-black text-xl text-black uppercase">Demo Mode (Recommended)</span>
                  </div>
                  <p className="text-base font-medium text-gray-800 ml-10">
                      Loads <strong>ALL</strong> global Agencies/Titles. Restricts deep analysis to <span className="bg-black text-white px-1">Titles 1-5</span> (Latest 5 snapshots).
                      <br/><span className="italic text-gray-600 font-normal">Fastest setup for assessment review (approx 60s).</span>
                  </p>
              </div>

              {/* CUSTOM / SELECT MODE OPTION */}
              <div 
                  className={`p-6 border-4 cursor-pointer transition-all ${
                      mode === 'custom' 
                      ? 'border-blue-700 bg-blue-50 relative' 
                      : 'border-gray-300 hover:border-gray-500'
                  }`}
                  onClick={() => setMode('custom')}
              >
                  {mode === 'custom' && (
                      <div className="absolute top-0 right-0 bg-blue-700 text-white font-bold px-3 py-1 text-xs uppercase">
                          Selected
                      </div>
                  )}
                  <div className="flex items-center mb-2">
                      <div className={`w-6 h-6 border-2 border-black rounded-full flex items-center justify-center mr-4 ${mode === 'custom' ? 'bg-black' : 'bg-white'}`}>
                          {mode === 'custom' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                      </div>
                      <span className="font-black text-xl text-black uppercase">Select Mode (Custom Load)</span>
                  </div>
                  <p className="text-base font-medium text-gray-800 ml-10 mb-6">
                      Loads global Metadata, but allows you to specify exactly which Titles to analyze deeply.
                  </p>

                  {/* Custom Controls */}
                  {mode === 'custom' && (
                      <div className="ml-10 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-white border-2 border-black">
                          <div>
                              <label className="block text-sm font-black text-black mb-2 uppercase">Target Titles (Comma Separated)</label>
                              <input 
                                  type="text" 
                                  value={customTitles}
                                  onChange={(e) => setCustomTitles(e.target.value)}
                                  className="w-full p-3 border-2 border-black font-mono font-bold focus:outline-none focus:bg-yellow-50"
                                  placeholder="e.g. 1, 14, 40"
                              />
                              <p className="text-xs font-bold text-gray-500 mt-2">Enter numbers 1-50</p>
                          </div>
                          <div>
                              <label className="block text-sm font-black text-black mb-2 uppercase">Snapshots per Title</label>
                              <input 
                                  type="number" 
                                  min="1"
                                  max="20"
                                  value={customLimit}
                                  onChange={(e) => setCustomLimit(parseInt(e.target.value))}
                                  className="w-full p-3 border-2 border-black font-mono font-bold focus:outline-none focus:bg-yellow-50"
                              />
                          </div>
                      </div>
                  )}
              </div>
            </div>

            {/* WARNING LABEL */}
            {(mode === 'demo' && 5 > 3) || (mode === 'custom' && customLimit > 3) ? (
              <div className="mb-8 bg-yellow-100 border-4 border-yellow-600 text-yellow-900 p-4 flex items-start shadow-sm">
                  <span className="text-2xl mr-4">⚠️</span>
                  <div>
                      <p className="font-black uppercase text-lg">High Load Warning</p>
                      <p className="font-medium">
                          You have selected more than 3 snapshots per title. 
                          Downloading and parsing XML files is resource-intensive. 
                          <span className="underline">Please allow 1-2 minutes for completion.</span>
                      </p>
                  </div>
              </div>
            ) : null}

            {/* Action Button */}
            <button
              onClick={handleInitialize}
              disabled={loading}
              className={`w-full py-5 text-white font-black text-xl uppercase tracking-widest transition-all shadow-lg border-4 border-black
                ${loading 
                  ? 'bg-gray-400 cursor-not-allowed border-gray-500' 
                  : 'bg-black hover:bg-gray-800 hover:translate-y-1 hover:shadow-none'
                }`}
            >
              {loading ? 'Initializing Database...' : 'Run Initialization'}
            </button>

            {/* Status Message */}
            {message && (
              <div className={`mt-8 p-6 border-4 font-bold text-lg shadow-md ${
                  message.includes('Error') 
                  ? 'border-red-700 bg-red-100 text-red-900' 
                  : 'border-green-700 bg-green-100 text-green-900'
              }`}>
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}