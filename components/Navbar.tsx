'use client';

import React from 'react';
import {
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
import type { Relatorio } from '@/lib/relatorio';
import type { Unidade } from '@/lib/unidades';
import { SUPERUSER_EMAIL } from '@/lib/services/authService';
import { MarcaAcai } from '@/components/vivo/MarcaAcai';
import { Avatar } from '@/components/vivo/Avatar';

interface NavbarProps {
  unidade: Unidade;
  currentCycle: number;
  records: RotationRecord[];
  relatorios: Relatorio[];
  onOpenManualCreate: () => void;
  onOpenInfo: () => void;
  currentUser?: AuthUser | null;
  onSignOut?: () => void;
  onOpenManageUsers?: () => void;
  onOpenPerfil?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  unidade,
  currentCycle,
  records,
  relatorios,
  onOpenManualCreate,
  onOpenInfo,
  currentUser,
  onSignOut,
  onOpenManageUsers,
  onOpenPerfil,
}) => {
  const [exportOpen, setExportOpen] = React.useState(false);

  const isSuperuser = currentUser && (
    currentUser.role === 'superuser' ||
    currentUser.email.toLowerCase() === SUPERUSER_EMAIL.toLowerCase()
  );

  return (
    <header className="grao sticky top-0 z-40 print:hidden bg-acai-950/95 backdrop-blur text-acai-100 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Project Info */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <MarcaAcai className="h-8 w-7 shrink-0 sm:h-9 sm:w-8" />
            <div className="flex items-center gap-2.5">
              <span className="font-display text-lg sm:text-xl font-semibold tracking-tight text-white">MonitorAçaí</span>
              <span
                className="hidden sm:inline-flex items-center whitespace-nowrap rounded-md border border-dashed border-broto-400/60 px-2 py-0.5 text-xs font-semibold text-broto-400 tabular-nums"
                title={`Ciclo de amostragem em andamento em ${unidade.nome}`}
              >
                {unidade.nome} · Ciclo {currentCycle}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-0.5 sm:gap-2">
            {/* Superuser Manage Team Button */}
            {isSuperuser && onOpenManageUsers && (
              <button
                id="btn-manage-users"
                onClick={onOpenManageUsers}
                className="inline-flex min-h-10 min-w-10 justify-center items-center gap-1.5 px-2 sm:px-3 py-2 text-sm font-medium rounded-full text-acai-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Gerenciar pesquisadores autorizados no sistema"
              >
                <Users className="w-4 h-4" />
                <span className="hidden xl:inline">Pesquisadores</span>
              </button>
            )}

            <button
              id="btn-manual-record"
              onClick={onOpenManualCreate}
              className="inline-flex min-h-10 min-w-10 justify-center items-center gap-1.5 px-2.5 sm:px-3.5 py-2 text-sm font-semibold rounded-full text-acai-950 bg-broto-400 hover:bg-broto-500 transition-colors active:scale-[0.97] cursor-pointer"
              title="Adicionar registro de rodízio manualmente"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden lg:inline whitespace-nowrap">Lançar manual</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                id="btn-export-dropdown"
                onClick={() => setExportOpen(!exportOpen)}
                aria-expanded={exportOpen}
                aria-haspopup="menu"
                className="inline-flex min-h-10 min-w-10 justify-center items-center gap-1.5 px-2 sm:px-3 py-2 text-sm font-medium rounded-full text-acai-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span className="hidden lg:inline">Exportar</span>
              </button>

              {exportOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setExportOpen(false)}
                  />
                  <div role="menu" className="fixed left-4 right-4 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-auto mt-2 sm:w-52 bg-white text-grafite rounded-2xl shadow-xl ring-1 ring-black/5 p-1.5 z-20 animate-in fade-in zoom-in-95 slide-in-from-top-1 duration-200">
                    <button
                      id="btn-export-excel"
                      onClick={() => {
                        exportRecordsToExcel(records, currentCycle, unidade, relatorios);
                        setExportOpen(false);
                      }}
                      role="menuitem"
                      className="w-full text-left px-3 py-2.5 text-sm rounded-xl text-grafite hover:bg-folha-50 hover:text-folha-800 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-folha-600" />
                      Planilha Excel (.xlsx)
                    </button>
                    <button
                      id="btn-export-csv"
                      onClick={() => {
                        exportRecordsToCSV(records, currentCycle, unidade, relatorios);
                        setExportOpen(false);
                      }}
                      role="menuitem"
                      className="w-full text-left px-3 py-2.5 text-sm rounded-xl text-grafite hover:bg-folha-50 hover:text-folha-800 flex items-center gap-2 transition-colors cursor-pointer"
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
              className="w-10 h-10 flex items-center justify-center text-acai-100 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              title="Sobre o projeto"
              aria-label="Sobre o projeto"
            >
              <Info className="w-5 h-5" />
            </button>

            {/* User Profile & Sign Out */}
            {currentUser && (
              <div className="flex items-center pl-1 ml-0.5 sm:pl-2 sm:ml-1 border-l border-white/10 gap-2">
                <div className="hidden xl:flex flex-col text-right">
                  <div className="flex items-center justify-end gap-1">
                    {isSuperuser && (
                      <span title="Superusuário Coordenador">
                        <ShieldCheck className="w-3.5 h-3.5 text-broto-400" />
                      </span>
                    )}
                    <span className="text-sm font-semibold text-white leading-tight truncate max-w-[150px]">
                      {currentUser.fullName || currentUser.email.split('@')[0]}
                    </span>
                  </div>
                  <span className="text-xs text-acai-300 leading-tight truncate max-w-[150px]">
                    {currentUser.email}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onOpenPerfil}
                  className="inline-flex rounded-full transition-transform hover:scale-105 cursor-pointer"
                  title="Minha foto"
                  aria-label="Minha foto"
                >
                  <Avatar nome={currentUser.fullName || currentUser.email} url={currentUser.avatarUrl} destaque={!!isSuperuser} />
                </button>

                {onSignOut && (
                  <button
                    id="btn-sign-out"
                    onClick={onSignOut}
                    className="group min-h-10 min-w-10 justify-center px-2 sm:px-3 flex items-center gap-1.5 text-acai-100 hover:text-white hover:bg-rose-500/20 rounded-full transition-colors cursor-pointer text-sm font-medium"
                    title="Encerrar sessão"
                    aria-label="Encerrar sessão"
                  >
                    <LogOut className="w-4 h-4 text-acai-300 group-hover:text-rose-300" />
                    <span className="hidden sm:inline">Sair</span>
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
