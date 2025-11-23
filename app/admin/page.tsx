// app/admin/page.tsx
'use client'; // This is a Client Component because it has buttons/interaction

import { useState } from 'react';

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleInitialize = async () => {
    if(!confirm("⚠️ This will DELETE all current data and rescrape from the eCFR API. Are you sure?")) return;

    setLoading(true);
    setMessage("Starting scrape process... this may take 1-2 minutes...");

    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      
      if (res.ok) {
        setMessage("✅ Success! Database populated.");
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
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Admin Console</h1>
      
      <div className="bg-white p-6 rounded shadow border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Data Management</h2>
        <p className="text-gray-600 mb-6">
          Use this section to reset the database and fetch fresh data from the eCFR API.
          This process fetches the global agency list and processes the first 5 Titles (3 snapshots each).
        </p>

        <button
          onClick={handleInitialize}
          disabled={loading}
          className={`px-6 py-3 rounded-lg text-white font-medium transition-colors
            ${loading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
            }`}
        >
          {loading ? 'Processing...' : 'Initialize Database'}
        </button>

        {/* Status Message Area */}
        {message && (
          <div className={`mt-6 p-4 rounded ${message.includes('Error') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}