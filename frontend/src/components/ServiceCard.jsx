import React from 'react';
import { Link } from 'react-router-dom';

export default function ServiceCard({ title, desc, icon: Icon, path, hasStatus }) {
  return (
    <Link 
      to={path}
      className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col h-full group relative"
    >
      {/* Indicador visual de notificação (ponto verde) se houver status ativo */}
      {hasStatus && (
        <span className="absolute top-4 right-4 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gov-green opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-gov-green"></span>
        </span>
      )}

      <div className="bg-orange-50 w-12 h-12 rounded-lg flex items-center justify-center text-gov-orange mb-4 group-hover:bg-gov-orange group-hover:text-white transition-colors">
        <Icon size={24} />
      </div>
      
      <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 flex-1">{desc}</p>
    </Link>
  );
}