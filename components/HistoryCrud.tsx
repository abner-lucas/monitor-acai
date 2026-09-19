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
import { formatDateBR, exportRecordsToCSV, exportRecordsToExcel } from '@/lib/storage';

interface HistoryCrudProps {
  records: RotationRecord[];
  currentCycle: number;
  onOpenCreate: () => void;
  onEditRecord: (record: RotationRecord) => void;
  onDeleteRecord: (record: RotationRecord) => void;
  onSelectPosition: (positionId: number) => void;
}

export const HistoryCrud: React.FC<HistoryCrudProps> = ({
  records,
  currentCycle,
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
    <div id="historico-crud-section" className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Header bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Histórico de Rodízio de Sensores
            </h2>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
              {filteredRecords.length} {filteredRecords.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro de auditoria com operações completas de criação, leitura, alteração e exclusão de pontos amostrais
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-adicionar-registro-tabela"
            onClick={onOpenCreate}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl text-white bg-emerald-700 hover:bg-emerald-800 shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Adicionar Registro Manual</span>
          </button>

          <button
            id="btn-export-excel-table"
            onClick={() => exportRecordsToExcel(filteredRecords, currentCycle)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
            title="Exportar registros filtrados para Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span className="hidden md:inline">Excel</span>
          </button>

          <button
            id="btn-export-csv-table"
            onClick={() => exportRecordsToCSV(filteredRecords, currentCycle)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors"
            title="Exportar registros filtrados para CSV"
          >
            <FileText className="w-4 h-4 text-slate-600" />
            <span className="hidden md:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 border-b border-slate-200 bg-white space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por célula, planta, técnico, nota..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden transition-all"
            />
          </div>

          {/* Cell Filter */}
          <div>
            <select
              value={filterCell}
              onChange={(e) => setFilterCell(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
            >
              <option value="all">Todas as Células (1 a 6)</option>
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
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
            >
              <option value="all">Todos os Status</option>
              <option value="active">🟢 Apenas Ativos</option>
              <option value="completed">🔵 Concluídos</option>
              <option value="scheduled">⚪ Agendados</option>
            </select>
          </div>

          {/* Cycle Filter */}
          <div>
            <select
              value={filterCycle}
              onChange={(e) => setFilterCycle(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
            >
              <option value="all">Todos os Ciclos</option>
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
              className="w-full px-3 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              Limpar Filtros
            </button>
          </div>
        </div>

        {/* Date Interval Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-600">
          <span className="font-semibold flex items-center gap-1 text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Intervalo de Datas:
          </span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-hidden font-mono"
            />
            <span>até</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-hidden font-mono"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-[11px] text-emerald-700 hover:underline"
            >
              Remover filtro de data
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50/80 text-slate-600 uppercase font-semibold border-b border-slate-200">
            <tr>
              <th 
                onClick={() => toggleSort('id')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>#ID</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4">Ciclo</th>
              <th 
                onClick={() => toggleSort('cellId')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Localização</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th 
                onClick={() => toggleSort('installedAt')}
                className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Instalação</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4">Próx. Troca / Retirada</th>
              <th className="py-3 px-4">Responsável</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 max-w-xs">Observações Técnicas</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
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
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isCurrentActive ? 'bg-emerald-50/30' : ''
                    }`}
                  >
                    {/* ID */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                      {record.id}
                    </td>

                    {/* Ciclo */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                        Ciclo {record.cycleNumber}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSelectPosition(record.positionId)}
                          className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:border-emerald-600 flex items-center justify-center font-mono font-bold text-slate-800 shadow-2xs transition-colors"
                          title="Inspecionar no mapa"
                        >
                          {record.positionId < 10 ? `0${record.positionId}` : record.positionId}
                        </button>
                        <div>
                          <strong className="block text-slate-900 font-semibold">
                            Célula {record.cellId}
                          </strong>
                          <span className="text-[11px] text-slate-500">
                            Planta {record.plantIndex}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Installation Date */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-800">
                      {formatDateBR(record.installedAt)}
                    </td>

                    {/* Scheduled Change / Retirada */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {record.removedAt ? (
                        <div>
                          <span className="font-mono text-slate-700 block">
                            {formatDateBR(record.removedAt)}
                          </span>
                          <span className="text-[10px] text-blue-600 font-medium">Recolhido</span>
                        </div>
                      ) : (
                        <div>
                          <span className="font-mono text-emerald-800 font-semibold block">
                            {formatDateBR(record.scheduledNextChange)}
                          </span>
                          <span className="text-[10px] text-slate-500">(14 dias de perm.)</span>
                        </div>
                      )}
                    </td>

                    {/* Responsible */}
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      <span className="font-medium truncate max-w-[140px] block" title={record.responsible}>
                        {record.responsible}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {record.status === 'active' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                          Ativo em Campo
                        </span>
                      )}
                      {record.status === 'completed' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-800 border border-blue-200">
                          <CheckCircle2 className="w-3 h-3 text-blue-600" />
                          Concluído
                        </span>
                      )}
                      {record.status === 'scheduled' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                          <Clock className="w-3 h-3 text-slate-400" />
                          Agendado
                        </span>
                      )}
                    </td>

                    {/* Observations */}
                    <td className="py-3 px-4 max-w-xs text-slate-600">
                      <p className="truncate text-xs" title={record.notes}>
                        {record.notes || <span className="text-slate-400 italic">Sem observações</span>}
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          id={`btn-edit-${record.id}`}
                          onClick={() => onEditRecord(record)}
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Editar registro"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          id={`btn-delete-${record.id}`}
                          onClick={() => onDeleteRecord(record)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Excluir registro"
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
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-end">
        <span>
          Total: <strong>{records.length}</strong> {records.length === 1 ? 'rodízio cadastrado' : 'rodízios cadastrados'}
        </span>
      </div>
    </div>
  );
};
