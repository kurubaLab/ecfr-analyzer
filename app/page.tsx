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

  // Fetch data when page loads
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
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header & Navigation */}
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Federal Regulations Analyzer</h1>
          <p className="text-gray-600">Insights into government regulatory burden</p>
        </div>
        <Link 
          href="/admin" 
          className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700 transition"
        >
          Go to Admin Console
        </Link>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto">
        
        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-lg text-gray-500">Loading metrics...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && data.length === 0 && (
          <div className="bg-white p-12 rounded-lg shadow text-center">
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Data Found</h3>
            <p className="text-gray-500 mb-6">The database appears to be empty.</p>
            <Link 
              href="/admin"
              className="text-blue-600 font-medium hover:underline"
            >
              Initialize Database in Admin Console &rarr;
            </Link>
          </div>
        )}

        {/* Agency Summary Table */}
        {!loading && data.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-800">Agency Summary</h2>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agency Name</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Titles Managed</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Word Count</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Restriction Score</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((agency) => (
                  <tr key={agency.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {agency.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {agency.totalTitles}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right font-mono">
                      {agency.totalWordCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      <span className={`px-2 py-1 rounded text-xs font-medium
                        ${parseFloat(agency.avgRestrictionScore) > 50 ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}
                      `}>
                        {agency.avgRestrictionScore}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
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