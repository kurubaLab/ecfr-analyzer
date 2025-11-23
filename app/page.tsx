// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface AgencyMetric {
  id: number;
  name: string;
  totalTitles: number;
  totalWordCount: string;
  avgRestrictionScore: string;
  lastUpdated: string;
}

export default function Dashboard() {
  const [data, setData] = useState<AgencyMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-black">Federal Regulations Analyzer</h1>
          <p className="text-gray-800 font-medium">Insights into government regulatory burden</p>
        </div>
        <Link 
          href="/admin" 
          className="bg-blue-900 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-800 transition shadow-sm"
        >
          Go to Admin Console
        </Link>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto">
        
        {loading && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-800 font-semibold">Loading metrics...</p>
          </div>
        )}

        {!loading && data.length === 0 && (
          <div className="bg-white p-12 rounded-lg shadow border border-gray-300 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Data Found</h3>
            <p className="text-gray-800 mb-6">The database appears to be empty.</p>
            <Link 
              href="/admin"
              className="text-blue-700 font-bold hover:underline text-lg"
            >
              Initialize Database in Admin Console &rarr;
            </Link>
          </div>
        )}

        {/* Agency Summary Table */}
        {!loading && data.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg border border-gray-300 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-300 bg-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Agency Summary</h2>
            </div>
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Agency Name</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-900 uppercase tracking-wider">Titles Managed</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-900 uppercase tracking-wider">Total Word Count</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-900 uppercase tracking-wider">Avg Restriction Score</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-900 uppercase tracking-wider">Last Updated</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((agency) => (
                  <tr key={agency.id} className="hover:bg-blue-50 transition duration-150">
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                      {agency.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-right font-medium">
                      {agency.totalTitles}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-right font-mono font-medium">
                      {agency.totalWordCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border
                        ${parseFloat(agency.avgRestrictionScore) > 50 
                          ? 'bg-red-100 text-red-900 border-red-200' 
                          : 'bg-green-100 text-green-900 border-green-200'}
                      `}>
                        {agency.avgRestrictionScore}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-right">
                      {agency.lastUpdated}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}