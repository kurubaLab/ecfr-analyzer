// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DashboardData {
  agencies: any[];
  history: any[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch the data
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((fetchedData) => {
        // SAFETY CHECK: Ensure we have the right structure
        // If the API sends an array (old version), wrap it. If it sends object (new version), use it.
        if (Array.isArray(fetchedData)) {
            setData({ agencies: fetchedData, history: [] });
        } else {
             // Sort history if it exists
            if(fetchedData.history) {
                fetchedData.history.sort((a:any, b:any) => new Date(a.date).getTime() - new Date(b.date).getTime());
            }
            setData(fetchedData);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Dashboard Fetch Error:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-12 text-center text-xl font-bold text-black">Loading Dashboard...</div>;
  if (!data || !data.agencies) return <div className="p-12 text-center text-red-600 font-bold">Error loading data.</div>;

  return (
    <div className="min-h-screen bg-white p-8 font-sans text-black">
      <h1 className="text-3xl font-extrabold mb-8 uppercase">Agency Dashboard</h1>
      
      {/* 1. CHART SECTION (Only shows if history data exists) */}
      {data.history && data.history.length > 0 && (
        <div className="mb-12 border-4 border-black p-6">
            <h2 className="text-xl font-black uppercase mb-4">Historical Trend: Word Count</h2>
            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.history}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="totalWords" stroke="#000" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
      )}

      {/* 2. TABLE SECTION */}
      <div className="border-4 border-black">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-100 uppercase font-black border-b-2 border-black">
            <tr>
              <th className="px-6 py-4 border-r-2 border-black">Agency Name</th>
              <th className="px-6 py-4 border-r-2 border-black text-right">Titles</th>
              <th className="px-6 py-4 border-r-2 border-black text-right">Word Count</th>
              <th className="px-6 py-4 text-right">Restriction Score</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-black">
            {/* THIS IS THE FIX: We map over data.agencies, not data itself */}
            {data.agencies.map((agency) => (
              <tr key={agency.id} className="hover:bg-yellow-50">
                <td className="px-6 py-4 font-bold border-r-2 border-black">{agency.name}</td>
                <td className="px-6 py-4 text-right border-r-2 border-black">{agency.totalTitles}</td>
                <td className="px-6 py-4 text-right font-mono border-r-2 border-black">{agency.totalWordCount}</td>
                <td className="px-6 py-4 text-right">
                    <span className={`px-2 py-1 border border-black ${parseFloat(agency.avgRestrictionScore) > 50 ? 'bg-black text-white' : 'bg-white'}`}>
                        {agency.avgRestrictionScore}
                    </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}