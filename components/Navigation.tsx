// components/Navigation.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="bg-white border-b-4 border-black py-4 mb-8">
      <div className="max-w-7xl mx-auto px-8 flex justify-between items-center">
        
        {/* Logo / Home Link */}
        <Link href="/" className="group">
          <h1 className="text-2xl font-black uppercase tracking-tighter group-hover:text-blue-700 transition-colors">
            🏛️  eCFR Analyzer
          </h1>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest group-hover:text-blue-600">
            Federal Regulation Analysis
          </p>
        </Link>

        {/* Menu Links */}
        <div className="flex space-x-6">
          <Link 
            href="/" 
            className={`text-lg font-black uppercase px-2 py-1 border-b-4 transition-all ${
              isActive('/') 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-400 hover:text-black hover:border-black'
            }`}
          >
            Dashboard
          </Link>

          <Link 
            href="/admin" 
            className={`text-lg font-black uppercase px-2 py-1 border-b-4 transition-all ${
              isActive('/admin') 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-400 hover:text-black hover:border-black'
            }`}
          >
            Admin Console
          </Link>
        </div>
      </div>
    </nav>
  );
}