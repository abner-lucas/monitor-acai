'use client';

import React from 'react';
import { 
  Sprout, 
  Download, 
  PlusCircle, 
  Info, 
  FileSpreadsheet, 
  FileText,
  LogOut,
  Users,
  ShieldCheck
} from 'lucide-react';
import { RotationRecord, AuthUser } from '@/lib/types';
import { exportRecordsToCSV, exportRecordsToExcel } from '@/lib/storage';
import { SUPERUSER_EMAIL } from '@/lib/services/authService';

interface NavbarProps {
  currentCycle: number;
  records: RotationRecord[];
  onOpenManualCreate: () => void;
  onOpenInfo: () => void;
  currentUser?: AuthUser | null;
  onSignOut?: () => void;
  onOpenManageUsers?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentCycle,
  records,
  onOpenManualCreate,
  onOpenInfo,
  currentUser,
  onSignOut,
  onOpenManageUsers,
}) => {
  const [exportOpen, setExportOpen] = React.useState(false);

  const isSuperuser = currentUser && (
    currentUser.role === 'superuser' || 
    currentUser.email.toLowerCase() === SUPERUSER_EMAIL.toLowerCase()
  );

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
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {/* Superuser Manage Team Button */}
            {isSuperuser && onOpenManageUsers && (
              <button
                id="btn-manage-users"
                onClick={onOpenManageUsers}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold rounded-lg text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 transition-colors shadow-2xs cursor-pointer"
                title="Gerenciar pesquisadores autorizados no sistema"
              >
                <Users className="w-4 h-4 text-emerald-800" />
                <span className="hidden lg:inline">Pesquisadores</span>
              </button>
            )}

            <button
              id="btn-manual-record"
              onClick={onOpenManualCreate}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
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
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors cursor-pointer"
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
                      className="w-full text-left px-4 py-2.5 text-xs sm:text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2 transition-colors cursor-pointer"
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
                      className="w-full text-left px-4 py-2.5 text-xs sm:text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2 transition-colors cursor-pointer"
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
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Sobre o Projeto SAF IFPA Breves"
            >
              <Info className="w-5 h-5" />
            </button>

            {/* User Profile & Sign Out */}
            {currentUser && (
              <div className="flex items-center pl-2 ml-1 border-l border-slate-200 gap-2">
                <div className="hidden lg:flex flex-col text-right">
                  <div className="flex items-center justify-end gap-1">
                    {isSuperuser && (
                      <span title="Superusuário Coordenador">
                        <ShieldCheck className="w-3 h-3 text-amber-600" />
                      </span>
                    )}
                    <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[130px]">
                      {currentUser.fullName || currentUser.email.split('@')[0]}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono leading-tight truncate max-w-[130px]">
                    {currentUser.email}
                  </span>
                </div>

                <div 
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border shadow-2xs ${
                    isSuperuser
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}
                  title={`${currentUser.fullName || currentUser.email} (${isSuperuser ? 'Superusuário' : 'Pesquisador'})`}
                >
                  {(currentUser.fullName?.[0] || currentUser.email[0] || 'P').toUpperCase()}
                </div>

                {onSignOut && (
                  <button
                    id="btn-sign-out"
                    onClick={onSignOut}
                    className="p-2 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Encerrar sessão (Sair)"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
