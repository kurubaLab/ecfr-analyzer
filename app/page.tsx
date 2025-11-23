// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DashboardData {
  agencies: any[];
  history: any[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((fetchedData) => {
        // Sort history by date to ensure chart flows left-to-right
        if(fetchedData.history) {
            fetchedData.history.sort((a:any, b:any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }
        setData(fetchedData);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-12 text-center text-xl font-bold text-black">Loading Dashboard...</div>;
  if (!data) return <div className="p-12 text-center text-red-600 font-bold">Error loading data.</div>;

  return (
    <div className="min-h-screen bg-white p-8 font-sans text-black">
      {/* 1. Header */}
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-10 border-b-4 border-black pb-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-black uppercase">Regulatory Monitor</h1>
          <p className="text-lg font-bold text-gray-800 mt-1">Federal Regulation Analysis System</p>
        </div>
        <Link 
          href="/admin" 
          className="bg-black text-white px-6 py-3 rounded-none font-bold text-lg hover:bg-gray-800 transition border-2 border-black"
        >
          ADMIN CONSOLE &rarr;
        </Link>
      </div>

      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* 2. Metric Guide Cards (High Contrast) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-4 border-black p-6 bg-gray-50">
                <h3 className="text-xl font-black uppercase mb-2 border-b-2 border-black pb-2">Metric: Word Count</h3>
                <p className="font-semibold text-gray-900">
                    Measures the total volume of regulation text. Higher counts indicate larger, potentially more complex regulations.
                </p>
            </div>
            <div className="border-4 border-black p-6 bg-gray-50">
                <h3 className="text-xl font-black uppercase mb-2 border-b-2 border-black pb-2">Metric: Restriction Density</h3>
                <p className="font-semibold text-gray-900">
                    Calculated as <span className="font-mono bg-gray-200 px-1">(Restrictions / Words) * 1000</span>. 
                    Tracks the frequency of binding terms like "shall", "must", and "prohibited".
                </p>
            </div>
        </div>

        {/* 3. Historical Chart */}
        <div className="border-4 border-black p-6 bg-white">
            <h2 className="text-2xl font-black uppercase mb-6">Historical Trend: Word Count (Aggregate)</h2>
            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.history}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#000" />
                        <XAxis dataKey="date" stroke="#000" tick={{fill: 'black', fontWeight: 'bold'}} />
                        <YAxis stroke="#000" tick={{fill: 'black', fontWeight: 'bold'}} />
                        <Tooltip 
                            contentStyle={{ border: '2px solid black', fontWeight: 'bold' }} 
                            itemStyle={{ color: 'black' }}
                        />
                        <Legend wrapperStyle={{ fontWeight: 'bold', color: 'black' }}/>
                        <Line 
                            type="monotone" 
                            dataKey="totalWords" 
                            name="Total Word Count" 
                            stroke="#000000" 
                            strokeWidth={3} 
                            activeDot={{ r: 8 }} 
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* 4. Agency Table */}
        <div className="border-4 border-black">
            <div className="bg-black text-white p-4">
                <h2 className="text-2xl font-bold uppercase">Agency Metrics Summary</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm whitespace-nowrap">
                    <thead className="uppercase tracking-wider border-b-2 border-black bg-gray-100">
                        <tr>
                            <th scope="col" className="px-6 py-4 font-black text-black border-r-2 border-black">Agency Name</th>
                            <th scope="col" className="px-6 py-4 font-black text-black border-r-2 border-black text-right">Titles</th>
                            <th scope="col" className="px-6 py-4 font-black text-black border-r-2 border-black text-right">Word Count</th>
                            <th scope="col" className="px-6 py-4 font-black text-black border-r-2 border-black text-right">Restriction Score</th>
                            <th scope="col" className="px-6 py-4 font-black text-black text-right">Last Updated</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-black">
                        {data.agencies.map((agency: any) => (
                            <tr key={agency.id} className="hover:bg-yellow-50 transition-colors">
                                <td className="px-6 py-4 font-bold text-black border-r-2 border-black">
                                    {agency.name}
                                </td>
                                <td className="px-6 py-4 font-bold text-black border-r-2 border-black text-right">
                                    {agency.totalTitles}
                                </td>
                                <td className="px-6 py-4 font-mono font-bold text-black border-r-2 border-black text-right">
                                    {agency.totalWordCount}
                                </td>
                                <td className="px-6 py-4 font-bold text-black border-r-2 border-black text-right">
                                    <span className={`px-2 py-1 border-2 border-black ${
                                        parseFloat(agency.avgRestrictionScore) > 50 ? 'bg-black text-white' : 'bg-white text-black'
                                    }`}>
                                        {agency.avgRestrictionScore}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-bold text-black text-right">
                                    {agency.lastUpdated}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
}