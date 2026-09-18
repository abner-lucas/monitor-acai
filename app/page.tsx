'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  MapPin, 
  Layers, 
  Database, 
  Sparkles, 
  RefreshCw,
  LayoutDashboard,
  Map,
  Table as TableIcon
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { DashboardCards } from '@/components/DashboardCards';
import { SafVisualMap } from '@/components/SafVisualMap';
import { HistoryCrud } from '@/components/HistoryCrud';
import { RaffleModal } from '@/components/RaffleModal';
import { RecordFormModal } from '@/components/RecordFormModal';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { CycleCompletedModal } from '@/components/CycleCompletedModal';
import { ProjectInfoModal } from '@/components/ProjectInfoModal';
import { ToastContainer, ToastMessage } from '@/components/Toast';
import { RotationRecord } from '@/lib/types';
import { rotationService } from '@/lib/services';
import { 
  computeCycleStats,
  getAvailablePositionsForCycle
} from '@/lib/storage';
import { POSITIONS_DATA } from '@/lib/constants';

type ActiveViewTab = 'all' | 'map' | 'history';

export default function HomePage() {
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Core Data State from Service Layer
  const [records, setRecords] = useState<RotationRecord[]>([]);
  const [currentCycle, setCurrentCycle] = useState<number>(1);
  const [selectedPositionId, setSelectedPositionId] = useState<number | null>(8); // Default to active position 08 (Célula 2 - Planta 2)
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Navigation View Tab
  const [activeTab, setActiveTab] = useState<ActiveViewTab>('all');

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Modals state
  const [isRaffleOpen, setIsRaffleOpen] = useState(false);
  const [isRecordFormOpen, setIsRecordFormOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<RotationRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<RotationRecord | null>(null);
  const [isCycleCompleteOpen, setIsCycleCompleteOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  // Fetch initial data from Service Layer
  const loadData = useCallback(async (showLoader = false) => {
    if (showLoader) setIsLoading(true);
    try {
      const [fetchedRecords, fetchedCycle] = await Promise.all([
        rotationService.getRecords(),
        rotationService.getCurrentCycle(),
      ]);
      setRecords(fetchedRecords);
      setCurrentCycle(fetchedCycle);

      // Find active record in fetched data
      const active = fetchedRecords.find(
        (r) => r.cycleNumber === fetchedCycle && r.status === 'active'
      );
      if (active) {
        setSelectedPositionId(active.positionId);
      }
    } catch (err: any) {
      addToast('error', 'Erro ao carregar dados', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    let isCancelled = false;
    async function init() {
      try {
        const [fetchedRecords, fetchedCycle] = await Promise.all([
          rotationService.getRecords(),
          rotationService.getCurrentCycle(),
        ]);
        if (!isCancelled) {
          setRecords(fetchedRecords);
          setCurrentCycle(fetchedCycle);
          const active = fetchedRecords.find(
            (r) => r.cycleNumber === fetchedCycle && r.status === 'active'
          );
          if (active) {
            setSelectedPositionId(active.positionId);
          }
          setIsLoading(false);
        }
      } catch (err: any) {
        if (!isCancelled) {
          addToast('error', 'Erro ao carregar dados', err.message);
          setIsLoading(false);
        }
      }
    }
    init();
    return () => {
      isCancelled = true;
    };
  }, [addToast]);

  // Derived statistics
  const stats = computeCycleStats(records, currentCycle);
  const availablePositions = getAvailablePositionsForCycle(records, currentCycle);
  const activeRecord = records.find(
    (r) => r.cycleNumber === currentCycle && r.status === 'active'
  ) || null;

  // Handle raffle confirmation (Create through Service)
  const handleConfirmDraw = async (data: {
    positionId: number;
    installedAt: string;
    scheduledNextChange: string;
    responsible: string;
    notes: string;
    batteryLevel: number;
    signalQuality: 'Excelente' | 'Bom' | 'Regular';
  }) => {
    const pos = POSITIONS_DATA.find((p) => p.id === data.positionId);
    if (!pos) return;

    try {
      await rotationService.createRecord({
        cycleNumber: currentCycle,
        positionId: pos.id,
        cellId: pos.cellId,
        plantIndex: pos.plantIndex,
        installedAt: data.installedAt,
        scheduledNextChange: data.scheduledNextChange,
        removedAt: null,
        responsible: data.responsible,
        notes: data.notes,
        status: 'active',
        batteryLevel: data.batteryLevel,
        signalQuality: data.signalQuality,
      });

      // Reload state from service
      const updated = await rotationService.getRecords();
      setRecords(updated);
      setSelectedPositionId(pos.id);

      addToast(
        'success',
        'Novo Rodízio Ativado!',
        `Sensor instalado na Célula ${pos.cellId} - Planta ${pos.plantIndex} (#${pos.formattedId}).`
      );

      // Check if cycle completed
      const newStats = computeCycleStats(updated, currentCycle);
      if (newStats.completedCount >= 18) {
        setTimeout(() => setIsCycleCompleteOpen(true), 800);
      }
    } catch (err: any) {
      addToast('error', 'Falha ao registrar sorteio', err.message);
    }
  };

  // Handle Create or Update from Modal
  const handleSaveRecord = async (formData: {
    id?: string;
    cycleNumber: number;
    positionId: number;
    cellId: number;
    plantIndex: number;
    installedAt: string;
    scheduledNextChange: string;
    removedAt: string | null;
    responsible: string;
    notes: string;
    status: 'active' | 'completed' | 'scheduled';
    batteryLevel: number;
    signalQuality: 'Excelente' | 'Bom' | 'Regular';
  }) => {
    try {
      if (formData.id) {
        // Update existing record
        await rotationService.updateRecord(formData.id, formData);
        addToast('success', 'Registro Atualizado', `ID ${formData.id} alterado com sucesso.`);
      } else {
        // Create new record
        const created = await rotationService.createRecord(formData);
        addToast('success', 'Registro Cadastrado', `ID ${created.id} lançado com sucesso.`);
      }

      const updated = await rotationService.getRecords();
      setRecords(updated);
      setSelectedPositionId(formData.positionId);
    } catch (err: any) {
      addToast('error', 'Erro ao salvar', err.message);
      throw err;
    }
  };

  // Handle Delete Record
  const handleDeleteRecord = async (recordId: string, _revertAvailability: boolean) => {
    try {
      await rotationService.deleteRecord(recordId);
      const updated = await rotationService.getRecords();
      setRecords(updated);
      addToast('success', 'Registro Excluído', `O registro ${recordId} foi removido com sucesso.`);
    } catch (err: any) {
      addToast('error', 'Erro ao excluir', err.message);
      throw err;
    }
  };

  // Start new cycle
  const handleStartNewCycle = async () => {
    try {
      const nextCycle = currentCycle + 1;
      await rotationService.setCycle(nextCycle);
      setCurrentCycle(nextCycle);
      addToast('success', `Ciclo ${nextCycle} Iniciado!`, 'O rodízio foi reiniciado para as 18 posições.');
    } catch (err: any) {
      addToast('error', 'Erro ao iniciar novo ciclo', err.message);
    }
  };

  // Reset to default seed
  const handleResetDefaults = async () => {
    if (window.confirm('Deseja restaurar os dados de rodízio para o padrão inicial do projeto IFPA Breves?')) {
      try {
        const seeded = await rotationService.resetToSeed();
        setRecords(seeded);
        setCurrentCycle(1);
        setSelectedPositionId(8);
        addToast('info', 'Dados Restaurados', 'Registros redefinidos para a semente inicial de monitoramento.');
      } catch (err: any) {
        addToast('error', 'Erro ao restaurar dados', err.message);
      }
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-600">Carregando MonitorAçaí...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Top Navigation */}
      <Navbar
        currentCycle={currentCycle}
        records={records}
        onOpenManualCreate={() => {
          setRecordToEdit(null);
          setIsRecordFormOpen(true);
        }}
        onOpenInfo={() => setIsInfoOpen(true)}
        onResetDefaults={handleResetDefaults}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        {/* Header with Navigation Views */}
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3.5">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Gestão de Rodízio de Sensores
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Amostragem aleatória sem reposição • SAF de Açaí • IFPA Campus Breves (Marajó/PA)
            </p>
          </div>

          {/* View Tabs */}
          <div className="flex items-center bg-slate-200/80 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-emerald-700" />
              <span>Geral</span>
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'map'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Map className="w-3.5 h-3.5 text-emerald-700" />
              <span>Mapa SAF</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5 text-emerald-700" />
              <span>Histórico (CRUD)</span>
            </button>
          </div>
        </div>

        {/* 1. Dashboard Highlight Cards */}
        <DashboardCards
          stats={stats}
          activeRecord={activeRecord}
          availablePositions={availablePositions}
          onOpenRaffle={() => setIsRaffleOpen(true)}
          onSelectPosition={(posId) => {
            setSelectedPositionId(posId);
            if (activeTab === 'history') setActiveTab('all');
          }}
          onOpenCycleComplete={() => setIsCycleCompleteOpen(true)}
        />

        {/* 2. Visual Monitoring Matrix (SAF Breves Map) */}
        {(activeTab === 'all' || activeTab === 'map') && (
          <SafVisualMap
            records={records}
            currentCycle={currentCycle}
            selectedPositionId={selectedPositionId}
            onSelectPosition={(posId) => setSelectedPositionId(posId === selectedPositionId ? null : posId)}
            onOpenRaffle={() => setIsRaffleOpen(true)}
          />
        )}

        {/* 3. History Management Module (Full CRUD) */}
        {(activeTab === 'all' || activeTab === 'history') && (
          <HistoryCrud
            records={records}
            currentCycle={currentCycle}
            onOpenCreate={() => {
              setRecordToEdit(null);
              setIsRecordFormOpen(true);
            }}
            onEditRecord={(record) => {
              setRecordToEdit(record);
              setIsRecordFormOpen(true);
            }}
            onDeleteRecord={(record) => setRecordToDelete(record)}
            onSelectPosition={(posId) => {
              setSelectedPositionId(posId);
              setActiveTab('all');
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-8 bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>MonitorAçaí</strong> • Rodízio de Sensores IoT no SAF de Açaí do IFPA Campus Breves
          </span>
          <span className="text-[11px] text-slate-400">
            Conectado ao Supabase Cloud • PostgreSQL
          </span>
        </div>
      </footer>

      {/* Modals */}
      <RaffleModal
        isOpen={isRaffleOpen}
        onClose={() => setIsRaffleOpen(false)}
        availablePositions={availablePositions}
        currentActiveRecord={activeRecord}
        currentCycle={currentCycle}
        onConfirmDraw={handleConfirmDraw}
      />

      <RecordFormModal
        isOpen={isRecordFormOpen}
        onClose={() => {
          setIsRecordFormOpen(false);
          setRecordToEdit(null);
        }}
        recordToEdit={recordToEdit}
        currentCycle={currentCycle}
        onSaveRecord={handleSaveRecord}
      />

      <DeleteConfirmModal
        isOpen={!!recordToDelete}
        onClose={() => setRecordToDelete(null)}
        record={recordToDelete}
        onConfirmDelete={handleDeleteRecord}
      />

      <CycleCompletedModal
        isOpen={isCycleCompleteOpen}
        onClose={() => setIsCycleCompleteOpen(false)}
        currentCycle={currentCycle}
        onStartNewCycle={handleStartNewCycle}
      />

      <ProjectInfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
      />
    </div>
  );
}
