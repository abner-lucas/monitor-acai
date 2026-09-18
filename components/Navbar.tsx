'use client';

import React from 'react';
import { 
  Sprout, 
  RotateCcw, 
  Download, 
  PlusCircle, 
  Info, 
  RefreshCw, 
  FileSpreadsheet, 
  FileText,
  Radio,
  MapPin,
  Database
} from 'lucide-react';
import { RotationRecord } from '@/lib/types';
import { exportRecordsToCSV, exportRecordsToExcel } from '@/lib/storage';

interface NavbarProps {
  currentCycle: number;
  records: RotationRecord[];
  onOpenManualCreate: () => void;
  onOpenInfo: () => void;
  onResetDefaults: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentCycle,
  records,
  onOpenManualCreate,
  onOpenInfo,
  onResetDefaults,
}) => {
  const [exportOpen, setExportOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Project Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-xs">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">MonitorAçaí</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Ciclo {currentCycle}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                  <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                  IoT Breves
                </span>
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <Database className="w-3 h-3 text-emerald-600" />
                  Supabase Nuvem
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                SAF Açaí • IFPA Campus Breves (Marajó/PA)
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              id="btn-manual-record"
              onClick={onOpenManualCreate}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              title="Adicionar registro de rodízio manualmente"
            >
              <PlusCircle className="w-4 h-4 text-emerald-700" />
              <span className="hidden md:inline">Lançar Manual</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                id="btn-export-dropdown"
                onClick={() => setExportOpen(!exportOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span className="hidden md:inline">Exportar</span>
              </button>

              {exportOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setExportOpen(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20">
                    <button
                      id="btn-export-excel"
                      onClick={() => {
                        exportRecordsToExcel(records, currentCycle);
                        setExportOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs sm:text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2 transition-colors"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      Planilha Excel (.xlsx)
                    </button>
                    <button
                      id="btn-export-csv"
                      onClick={() => {
                        exportRecordsToCSV(records, currentCycle);
                        setExportOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs sm:text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2 transition-colors"
                    >
                      <FileText className="w-4 h-4 text-slate-600" />
                      Arquivo CSV (.csv)
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Project Info */}
            <button
              id="btn-project-info"
              onClick={onOpenInfo}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Sobre o Projeto SAF IFPA Breves"
            >
              <Info className="w-5 h-5" />
            </button>

            {/* Reset Defaults */}
            <button
              id="btn-reset-data"
              onClick={onResetDefaults}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Restaurar dados iniciais do projeto"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
