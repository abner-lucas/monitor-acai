'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Calendar,
  Edit3,
  Trash2,
  PlusCircle,
  FileSpreadsheet,
  FileText,
  Radio,
  CheckCircle2,
  Clock,
  ChevronDown,
  Info,
  RefreshCcw,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';
import { RotationRecord } from '@/lib/types';
import Link from 'next/link';
import { formatDateBR, exportRecordsToCSV, exportRecordsToExcel } from '@/lib/storage';
import { situacaoRelatorio, type Relatorio } from '@/lib/relatorio';
import type { Unidade } from '@/lib/unidades';

interface HistoryCrudProps {
  records: RotationRecord[];
  currentCycle: number;
  unidade: Unidade;
  relatorios: Map<string, Relatorio>;
  hrefRelatorio: (recordId: string, editar?: boolean) => string;
  onOpenCreate: () => void;
  onEditRecord: (record: RotationRecord) => void;
  onDeleteRecord: (record: RotationRecord) => void;
  onSelectPosition: (positionId: number) => void;
}

export const HistoryCrud: React.FC<HistoryCrudProps> = ({
  records,
  currentCycle,
  unidade,
  relatorios,
  hrefRelatorio,
  onOpenCreate,
  onEditRecord,
  onDeleteRecord,
  onSelectPosition,
}) => {
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCell, setFilterCell] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCycle, setFilterCycle] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sort State
  const [sortField, setSortField] = useState<'installedAt' | 'cellId' | 'id'>('installedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Available cycles in records
  const availableCycles = useMemo(() => {
    const set = new Set<number>();
    records.forEach((r) => set.add(r.cycleNumber));
    return Array.from(set).sort((a, b) => a - b);
  }, [records]);

  // Filtered & Sorted records
  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => {
        // Text search
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchId = r.id.toLowerCase().includes(term);
          const matchCell = `célula ${r.cellId}`.includes(term) || `celula ${r.cellId}`.includes(term);
          const matchPlant = `planta ${r.plantIndex}`.includes(term) || `posicao ${r.positionId}`.includes(term);
          const matchResp = r.responsible.toLowerCase().includes(term);
          const matchNotes = (r.notes || '').toLowerCase().includes(term);
          if (!matchId && !matchCell && !matchPlant && !matchResp && !matchNotes) {
            return false;
          }
        }

        // Cell filter
        if (filterCell !== 'all' && r.cellId !== Number(filterCell)) {
          return false;
        }

        // Status filter
        if (filterStatus !== 'all' && r.status !== filterStatus) {
          return false;
        }

        // Cycle filter
        if (filterCycle !== 'all' && r.cycleNumber !== Number(filterCycle)) {
          return false;
        }

        // Date range
        if (startDate && r.installedAt < startDate) {
          return false;
        }
        if (endDate && r.installedAt > endDate) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'installedAt') {
          diff = new Date(a.installedAt).getTime() - new Date(b.installedAt).getTime();
        } else if (sortField === 'cellId') {
          diff = a.cellId - b.cellId;
        } else if (sortField === 'id') {
          diff = a.id.localeCompare(b.id);
        }
        return sortDirection === 'asc' ? diff : -diff;
      });
  }, [records, searchTerm, filterCell, filterStatus, filterCycle, startDate, endDate, sortField, sortDirection]);

  const toggleSort = (field: 'installedAt' | 'cellId' | 'id') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterCell('all');
    setFilterStatus('all');
    setFilterCycle('all');
    setStartDate('');
    setEndDate('');
  };

  return (
    <section id="historico-crud-section" aria-labelledby="titulo-historico" className="scroll-mt-24 bg-white rounded-[28px] ring-1 ring-folha-100 overflow-hidden">
      {/* Header bar */}
      <div className="px-5 pt-6 pb-4 sm:px-7 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 id="titulo-historico" className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-grafite">
              Histórico do rodízio
            </h2>
            <span className="text-sm font-semibold px-2.5 py-0.5 rounded-full bg-folha-50 text-folha-800 ring-1 ring-folha-100 tabular-nums">
              {filteredRecords.length} {filteredRecords.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Cada instalação e retirada de sensor, em ordem de campo. Filtre, edite ou exporte.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-adicionar-registro-tabela"
            onClick={onOpenCreate}
            className="inline-flex min-h-10 items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-full text-white bg-folha-700 hover:bg-folha-800 transition-colors active:scale-[0.97] cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Adicionar registro</span>
          </button>

          <button
            id="btn-export-excel-table"
            onClick={() => exportRecordsToExcel(filteredRecords, currentCycle, unidade, Array.from(relatorios.values()))}
            className="inline-flex min-h-10 items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-full text-folha-800 bg-folha-50 hover:bg-folha-100 ring-1 ring-folha-100 transition-colors cursor-pointer"
            title="Exportar registros filtrados para Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden md:inline">Excel</span>
          </button>

          <button
            id="btn-export-csv-table"
            onClick={() => exportRecordsToCSV(filteredRecords, currentCycle, unidade, Array.from(relatorios.values()))}
            className="inline-flex min-h-10 items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-full text-slate-700 bg-white hover:bg-papel ring-1 ring-papel-linha transition-colors cursor-pointer"
            title="Exportar registros filtrados para CSV"
          >
            <FileText className="w-4 h-4 text-slate-600" />
            <span className="hidden md:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="px-5 sm:px-7 pb-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por célula, planta, técnico, nota..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Buscar registros"
              className="w-full min-h-10 pl-9 pr-3 py-2 text-sm bg-papel/60 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-folha-600 focus:border-transparent outline-hidden transition-colors"
            />
          </div>

          {/* Cell Filter */}
          <div>
            <select
              value={filterCell}
              onChange={(e) => setFilterCell(e.target.value)}
              aria-label="Filtrar por célula"
              className="w-full min-h-10 px-3 py-2 text-sm bg-papel/60 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-folha-600 focus:border-transparent outline-hidden transition-colors"
            >
              <option value="all">Todas as células</option>
              <option value="1">Célula 1</option>
              <option value="2">Célula 2</option>
              <option value="3">Célula 3</option>
              <option value="4">Célula 4</option>
              <option value="5">Célula 5</option>
              <option value="6">Célula 6</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              aria-label="Filtrar por status"
              className="w-full min-h-10 px-3 py-2 text-sm bg-papel/60 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-folha-600 focus:border-transparent outline-hidden transition-colors"
            >
              <option value="all">Todos os status</option>
              <option value="active">Apenas ativos</option>
              <option value="completed">Concluídos</option>
              <option value="scheduled">Agendados</option>
            </select>
          </div>

          {/* Cycle Filter */}
          <div>
            <select
              value={filterCycle}
              onChange={(e) => setFilterCycle(e.target.value)}
              aria-label="Filtrar por ciclo"
              className="w-full min-h-10 px-3 py-2 text-sm bg-papel/60 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-folha-600 focus:border-transparent outline-hidden transition-colors"
            >
              <option value="all">Todos os ciclos</option>
              {availableCycles.map((c) => (
                <option key={c} value={c}>
                  Ciclo {c}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          <div>
            <button
              onClick={clearFilters}
              className="group w-full min-h-10 px-3 py-2 text-sm font-medium text-slate-700 hover:text-grafite hover:bg-papel rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCcw className="w-3.5 h-3.5 transition-transform duration-500 group-hover:-rotate-180" />
              Limpar filtros
            </button>
          </div>
        </div>

        {/* Date Interval Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-sm text-slate-600">
          <span className="font-medium flex items-center gap-1.5 text-slate-700">
            <Calendar className="w-4 h-4 text-folha-600" />
            Instalados entre
          </span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              aria-label="Data inicial"
              className="min-h-9 px-2.5 py-1 text-sm tabular-nums bg-papel/60 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-folha-600 focus:border-transparent outline-hidden transition-colors"
            />
            <span>e</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              aria-label="Data final"
              className="min-h-9 px-2.5 py-1 text-sm tabular-nums bg-papel/60 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-folha-600 focus:border-transparent outline-hidden transition-colors"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-sm text-folha-700 underline-offset-2 hover:underline cursor-pointer"
            >
              Remover filtro de data
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border-t border-folha-100">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-folha-50/70 text-folha-800 text-xs font-semibold">
            <tr>
              <th
                onClick={() => toggleSort('id')}
                className="py-3 px-3 cursor-pointer hover:bg-folha-100/60 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Registro</span>
                  <ArrowUpDown className="w-3 h-3 text-folha-600" />
                </div>
              </th>
              <th className="py-3 px-3">Ciclo</th>
              <th
                onClick={() => toggleSort('cellId')}
                className="py-3 px-3 cursor-pointer hover:bg-folha-100/60 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Localização</span>
                  <ArrowUpDown className="w-3 h-3 text-folha-600" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('installedAt')}
                className="py-3 px-3 cursor-pointer hover:bg-folha-100/60 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Instalação</span>
                  <ArrowUpDown className="w-3 h-3 text-folha-600" />
                </div>
              </th>
              <th className="py-3 px-3">Troca / retirada</th>
              <th className="py-3 px-3">Responsável</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Observações</th>
              <th className="py-3 px-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-folha-100/70">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-slate-500">
                  Nenhum registro encontrado para os filtros selecionados.
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => {
                const isCurrentActive = record.status === 'active';

                return (
                  <tr
                    key={record.id}
                    className={`hover:bg-papel/60 transition-colors ${
                      isCurrentActive ? 'bg-broto-100/40' : ''
                    }`}
                  >
                    {/* ID */}
                    <td className="py-3 px-3 font-semibold text-grafite whitespace-nowrap tabular-nums">
                      {record.id}
                    </td>

                    {/* Ciclo */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="text-slate-700 tabular-nums">
                        Ciclo {record.cycleNumber}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2.5 whitespace-nowrap">
                        <button
                          onClick={() => onSelectPosition(record.positionId)}
                          className="w-9 h-9 rounded-xl bg-white ring-1 ring-papel-linha hover:ring-2 hover:ring-folha-600 flex items-center justify-center font-display font-semibold text-sm text-grafite tabular-nums transition-shadow cursor-pointer"
                          title="Inspecionar no mapa"
                          aria-label={`Inspecionar posição ${record.positionId} no mapa`}
                        >
                          {record.positionId < 10 ? `0${record.positionId}` : record.positionId}
                        </button>
                        <div>
                          <strong className="block text-grafite font-semibold text-sm">
                            Célula {record.cellId}
                          </strong>
                          <span className="text-xs text-slate-600 font-medium">
                            Planta {record.plantIndex}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Installation Date */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-sm text-grafite tabular-nums">
                      {formatDateBR(record.installedAt)}
                    </td>

                    {/* Scheduled Change / Retirada */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {record.removedAt ? (
                        <div>
                          <span className="text-sm text-grafite block tabular-nums">
                            {formatDateBR(record.removedAt)}
                          </span>
                          <span className="text-xs text-agua-700 font-semibold block mt-0.5">Recolhido</span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-sm text-folha-700 font-semibold block tabular-nums">
                            {formatDateBR(record.scheduledNextChange)}
                          </span>
                          <span className="text-xs text-slate-600 font-medium block mt-0.5">14 dias de perm.</span>
                        </div>
                      )}
                    </td>

                    {/* Responsible */}
                    <td className="py-3.5 px-3 text-sm text-slate-800 whitespace-nowrap">
                      <span className="truncate max-w-[130px] block" title={record.responsible}>
                        {record.responsible}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {record.status === 'active' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-folha-700 text-white">
                          <Radio className="w-3.5 h-3.5 text-broto-400" />
                          Ativo em Campo
                        </span>
                      )}
                      {record.status === 'completed' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-agua-100 text-agua-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Concluído
                        </span>
                      )}
                      {record.status === 'scheduled' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-acai-800 border border-dashed border-acai-300 bg-acai-100/60">
                          <Clock className="w-3.5 h-3.5" />
                          Agendado
                        </span>
                      )}
                    </td>

                    {/* Observations */}
                    <td className="py-3.5 px-3 max-w-[220px] text-sm text-slate-700">
                      <p className="truncate" title={record.notes}>
                        {record.notes || <span className="text-slate-400 italic">Sem observações</span>}
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {(() => {
                          const situacao = situacaoRelatorio(relatorios.get(record.id));
                          const pendente = situacao === 'pendente';
                          return (
                            <Link
                              href={hrefRelatorio(record.id, pendente)}
                              className={`relative w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                                pendente ? 'text-acai-700 hover:bg-acai-100' : 'text-slate-600 hover:text-folha-700 hover:bg-folha-50'
                              }`}
                              title={pendente ? 'Preencher relatório de campo' : 'Abrir relatório de campo'}
                              aria-label={`${pendente ? 'Preencher' : 'Abrir'} relatório de campo de ${record.id}`}
                            >
                              <FileText className="w-4 h-4" />
                              {pendente && <span aria-hidden="true" className="absolute right-2 top-2 h-2 w-2 rounded-full bg-lapis" />}
                            </Link>
                          );
                        })()}
                        <button
                          id={`btn-edit-${record.id}`}
                          onClick={() => onEditRecord(record)}
                          className="w-10 h-10 flex items-center justify-center text-slate-600 hover:text-folha-700 hover:bg-folha-50 rounded-full transition-colors cursor-pointer"
                          title="Editar registro"
                          aria-label={`Editar registro ${record.id}`}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          id={`btn-delete-${record.id}`}
                          onClick={() => onDeleteRecord(record)}
                          className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
                          title="Excluir registro"
                          aria-label={`Excluir registro ${record.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer info bar */}
      <div className="px-5 sm:px-7 py-3.5 border-t border-folha-100 text-sm text-slate-600 flex items-center justify-end tabular-nums">
        <span>
          Total: <strong>{records.length}</strong> {records.length === 1 ? 'rodízio cadastrado' : 'rodízios cadastrados'}
        </span>
      </div>
    </section>
  );
};
