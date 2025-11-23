// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
  const [agencies, setAgencies] = useState<any[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<number | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Load Agency Summary on Mount
  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(data => {
        setAgencies(data);
        setLoading(false);
      });
  }, []);

  // 2. Load Chart Data when a user selects a Title (Hardcoded Title 1 default for demo if needed)
  const loadHistory = async (titleNum: number) => {
    setSelectedTitle(titleNum);
    const res = await fetch(`/api/history?title=${titleNum}`);
    const data = await res.json();
    setChartData(data);
  };

  if (loading) return <div className="p-8">Loading Dashboard...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Regulatory Analysis Dashboard</h1>

      {/* CHART SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2 bg-white p-6 rounded shadow border">
          <h2 className="text-xl font-semibold mb-4">
            {selectedTitle ? `History for Title ${selectedTitle}` : 'Select a Title to View History'}
          </h2>
          
          <div className="h-80 w-full">
            {selectedTitle && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="effectiveDate" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="wordCount" stroke="#2563eb" name="Word Count" />
                  <Line yAxisId="right" type="monotone" dataKey="restrictionDensityScore" stroke="#dc2626" name="Restriction Density" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 border-2 border-dashed rounded">
                Click a "View History" button below
              </div>
            )}
          </div>
        </div>

        {/* METRIC EXPLANATION CARD */}
        <div className="bg-blue-50 p-6 rounded border border-blue-100">
          <h3 className="font-bold text-blue-900 mb-2">Metrics Guide</h3>
          <ul className="space-y-3 text-sm text-blue-800">
            <li>
              <strong>Word Count:</strong> Total volume of text. High volume often correlates with complexity.
            </li>
            <li>
              <strong>Restriction Density:</strong> (Custom Metric)
              <br/>
              Counts words like "shall", "must", "prohibited" per 1,000 words.
              <br/>
              <em>Higher score = More binding/restrictive.</em>
            </li>
            <li>
              <strong>Checksum:</strong> Used internally to verify data integrity between snapshots.
            </li>
          </ul>
        </div>
      </div>

      {/* AGENCY TABLE */}
      <div className="bg-white rounded shadow border overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold">Agency Summary</h2>
        </div>
        <table className="w-full text-left">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
            <tr>
              <th className="p-4">Agency Name</th>
              <th className="p-4">Total Titles</th>
              <th className="p-4">Total Word Count</th>
              <th className="p-4">Avg. Restriction Density</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {agencies.map((agency) => (
              <tr key={agency.id} className="hover:bg-gray-50">
                <td className="p-4 font-medium">{agency.name}</td>
                <td className="p-4">{agency.titleCount}</td>
                <td className="p-4">{agency.totalWordCount.toLocaleString()}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold 
                    ${agency.avgRestrictionDensity > 20 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {agency.avgRestrictionDensity}
                  </span>
                </td>
                <td className="p-4">
                   {/* In a real app, we'd list specific titles. For this demo, we assume Agency 1 -> Title 1 */}
                   {/* We will just create a button that loads Title 1 for demonstration since our seed data is limited */}
                   <button 
                     onClick={() => loadHistory(1)} 
                     className="text-blue-600 hover:underline text-sm"
                   >
                     View History (Title 1)
                   </button>
                </td>
              </tr>
            ))}
            {agencies.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  No data found. Please go to Admin Console and initialize the database.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}