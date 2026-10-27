'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { RotationRecord, PositionInfo, CycleStats } from '@/lib/types';
import { DadosRelatorio, Relatorio, StatusRelatorio } from '@/lib/relatorio';
import { UNIDADES, Unidade, UnidadeId } from '@/lib/unidades';
import { computeCycleStats, getAvailablePositionsForCycle } from '@/lib/storage';
import { rotationServiceDa, reportService, campoService } from '@/lib/services';
import { useSessao } from '@/components/app/Sessao';
import { CabecalhoUnidade } from '@/components/app/CabecalhoUnidade';
import { Navbar } from '@/components/Navbar';
import { RegistrarRodizioModal, type DadosRegistroCampo, type ModoCampo } from '@/components/RegistrarRodizioModal';
import { RecordFormModal } from '@/components/RecordFormModal';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { CycleCompletedModal } from '@/components/CycleCompletedModal';
import { ProjectInfoModal } from '@/components/ProjectInfoModal';
import { ManageUsersModal } from '@/components/ManageUsersModal';

type DadosRegistro = {
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
};

interface ContextoUnidade {
  unidade: Unidade;
  records: RotationRecord[];
  relatorios: Map<string, Relatorio>;
  currentCycle: number;
  stats: CycleStats;
  availablePositions: PositionInfo[];
  /** Posição já sorteada para a próxima troca, ainda sem sensor. */
  scheduledRecord: RotationRecord | null;
  activeRecord: RotationRecord | null;
  selectedPositionId: number | null;
  selecionarPosicao: (posId: number | null) => void;
  /** Seleciona a planta e leva até o mapa (troca para o painel se preciso). */
  focarNoMapa: (posId: number) => void;
  /** true quando outra página pediu para rolar até o mapa ao abrir o painel. */
  consumirPedidoDeMapa: () => boolean;
  /** Dia de campo: conclui a posição atual, ativa a próxima e já sorteia a seguinte. */
  abrirRegistro: () => void;
  /** Sorteio antecipado da próxima posição, sem mexer no sensor em campo. */
  abrirAgendamento: () => void;
  abrirNovoRegistro: () => void;
  editarRegistro: (record: RotationRecord) => void;
  excluirRegistro: (record: RotationRecord) => void;
  abrirCicloCompleto: () => void;
  salvarRelatorio: (
    recordId: string,
    dados: { status: StatusRelatorio; assinadoEm: string | null; dados: DadosRelatorio }
  ) => Promise<Relatorio>;
  hrefRelatorio: (recordId: string, editar?: boolean) => string;
}

const Contexto = createContext<ContextoUnidade | null>(null);

export function useUnidade(): ContextoUnidade {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useUnidade fora de <PainelUnidade>');
  return ctx;
}

/**
 * Dados, menu e janelas de uma unidade piloto. Todas as páginas da unidade
 * (painel, histórico e relatórios) compartilham este estado.
 */
export function PainelUnidade({ unidadeId, children }: { unidadeId: UnidadeId; children: React.ReactNode }) {
  const { usuario, sair, aviso } = useSessao();
  const router = useRouter();
  const pathname = usePathname();
  const unidade = UNIDADES[unidadeId];
  const servico = rotationServiceDa(unidadeId);

  const [records, setRecords] = useState<RotationRecord[]>([]);
  const [listaRelatorios, setListaRelatorios] = useState<Relatorio[]>([]);
  const [currentCycle, setCurrentCycle] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [selectedPositionId, setSelectedPositionId] = useState<number | null>(null);
  const pedidoDeMapa = useRef(false);

  const [modoCampo, setModoCampo] = useState<ModoCampo | null>(null);
  const [isRecordFormOpen, setIsRecordFormOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<RotationRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<RotationRecord | null>(null);
  const [isCycleCompleteOpen, setIsCycleCompleteOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isManageUsersOpen, setIsManageUsersOpen] = useState(false);

  // Carga inicial da unidade: o estado só muda quando as respostas chegam (e só se o painel
  // ainda estiver aberto, para não misturar unidades ao trocar rápido entre Breves e Muaná).
  useEffect(() => {
    let ativo = true;
    Promise.all([servico.getRecords(), servico.getCurrentCycle(), reportService.listar(unidadeId)])
      .then(([registros, ciclo, relatorios]) => {
        if (!ativo) return;
        setRecords(registros);
        setCurrentCycle(ciclo);
        setListaRelatorios(relatorios);
        const emCampo = registros.find((r) => r.cycleNumber === ciclo && r.status === 'active');
        setSelectedPositionId((atual) => atual ?? emCampo?.positionId ?? null);
      })
      .catch((err) => {
        if (ativo) aviso('error', 'Erro ao carregar dados', err instanceof Error ? err.message : undefined);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [servico, unidadeId, aviso]);

  const relatorios = useMemo(() => new Map(listaRelatorios.map((r) => [r.recordId, r])), [listaRelatorios]);
  const stats = computeCycleStats(records, currentCycle);
  const availablePositions = getAvailablePositionsForCycle(records, currentCycle);
  const scheduledRecord = records.find((r) => r.cycleNumber === currentCycle && r.status === 'scheduled') || null;
  const activeRecord = records.find((r) => r.cycleNumber === currentCycle && r.status === 'active') || null;

  const hrefRelatorio = useCallback(
    (recordId: string, editar = false) =>
      `/${unidadeId}/relatorios/${encodeURIComponent(recordId)}${editar ? '/editar' : ''}`,
    [unidadeId]
  );

  const focarNoMapa = useCallback(
    (posId: number) => {
      setSelectedPositionId(posId);
      if (pathname === `/${unidadeId}`) {
        setTimeout(() => {
          document.getElementById('saf-visual-matrix')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
      } else {
        pedidoDeMapa.current = true;
        router.push(`/${unidadeId}`);
      }
    },
    [pathname, router, unidadeId]
  );

  const consumirPedidoDeMapa = useCallback(() => {
    const pedido = pedidoDeMapa.current;
    pedidoDeMapa.current = false;
    return pedido;
  }, []);

  const recarregarTudo = async () => {
    const [registros, relatoriosAtualizados] = await Promise.all([servico.getRecords(), reportService.listar(unidadeId)]);
    setRecords(registros);
    setListaRelatorios(relatoriosAtualizados);
    return registros;
  };

  // Dia de campo: tudo numa transação no servidor; depois abre o relatório da nova posição.
  const handleRegistrar = async (dados: DadosRegistroCampo) => {
    const { executadoId, agendadoId } = await campoService.registrar(unidadeId, dados);
    const registros = await recarregarTudo();
    const executado = registros.find((r) => r.id === executadoId);
    const agendado = registros.find((r) => r.id === agendadoId);
    setModoCampo(null);
    if (executado) setSelectedPositionId(executado.positionId);
    aviso(
      'success',
      'Rodízio registrado',
      `Sensor na posição #${String(executado?.positionId ?? '').padStart(2, '0')}${
        agendado ? `; próxima: #${String(agendado.positionId).padStart(2, '0')} em ${agendado.installedAt.split('-').reverse().join('/')}` : ''
      }. Preencha o relatório.`
    );
    router.push(hrefRelatorio(executadoId, true));
    if (computeCycleStats(registros, currentCycle).completedCount >= 18) {
      setTimeout(() => setIsCycleCompleteOpen(true), 800);
    }
  };

  const handleAgendar = async (dados: { proximaPosicao: number; responsavel: string }) => {
    await campoService.agendar(unidadeId, dados);
    await recarregarTudo();
    setModoCampo(null);
    setSelectedPositionId(dados.proximaPosicao);
    aviso('success', 'Próxima posição sorteada', `Posição #${String(dados.proximaPosicao).padStart(2, '0')} agendada.`);
  };

  const handleSaveRecord = async (formData: DadosRegistro) => {
    try {
      if (formData.id) {
        await servico.updateRecord(formData.id, formData);
        aviso('success', 'Registro Atualizado', `ID ${formData.id} alterado com sucesso.`);
      } else {
        const created = await servico.createRecord(formData);
        aviso('success', 'Registro Cadastrado', `ID ${created.id} lançado com sucesso.`);
      }
      setRecords(await servico.getRecords());
      setSelectedPositionId(formData.positionId);
    } catch (err) {
      aviso('error', 'Erro ao salvar', err instanceof Error ? err.message : undefined);
      throw err;
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    try {
      await servico.deleteRecord(recordId);
      setRecords(await servico.getRecords());
      // O relatório do rodízio é apagado junto no banco.
      setListaRelatorios((prev) => prev.filter((r) => r.recordId !== recordId));
      aviso('success', 'Registro Excluído', `O registro ${recordId} foi removido com sucesso.`);
    } catch (err) {
      aviso('error', 'Erro ao excluir', err instanceof Error ? err.message : undefined);
      throw err;
    }
  };

  const handleStartNewCycle = async () => {
    try {
      const nextCycle = currentCycle + 1;
      await servico.setCycle(nextCycle);
      setCurrentCycle(nextCycle);
      aviso('success', `Ciclo ${nextCycle} Iniciado!`, 'O rodízio foi reiniciado para as 18 posições.');
    } catch (err) {
      aviso('error', 'Erro ao iniciar novo ciclo', err instanceof Error ? err.message : undefined);
    }
  };

  const salvarRelatorio = useCallback<ContextoUnidade['salvarRelatorio']>(async (recordId, dados) => {
    const salvo = await reportService.salvar(recordId, dados);
    setListaRelatorios((prev) => [...prev.filter((r) => r.recordId !== recordId), salvo]);
    return salvo;
  }, []);

  const contexto: ContextoUnidade = {
    unidade,
    records,
    relatorios,
    currentCycle,
    stats,
    availablePositions,
    scheduledRecord,
    activeRecord,
    selectedPositionId,
    selecionarPosicao: setSelectedPositionId,
    focarNoMapa,
    consumirPedidoDeMapa,
    abrirRegistro: () => setModoCampo('registrar'),
    abrirAgendamento: () => setModoCampo('agendar'),
    abrirNovoRegistro: () => {
      setRecordToEdit(null);
      setIsRecordFormOpen(true);
    },
    editarRegistro: (record) => {
      setRecordToEdit(record);
      setIsRecordFormOpen(true);
    },
    excluirRegistro: setRecordToDelete,
    abrirCicloCompleto: () => setIsCycleCompleteOpen(true),
    salvarRelatorio,
    hrefRelatorio,
  };

  return (
    <Contexto.Provider value={contexto}>
      <div className="min-h-screen bg-papel flex flex-col font-sans print:bg-white">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-folha-800 focus:shadow-lg"
        >
          Pular para o conteúdo
        </a>

        <Navbar
          unidade={unidade}
          currentCycle={currentCycle}
          records={records}
          relatorios={listaRelatorios}
          onOpenManualCreate={contexto.abrirNovoRegistro}
          onOpenInfo={() => setIsInfoOpen(true)}
          currentUser={usuario}
          onSignOut={sair}
          onOpenManageUsers={() => setIsManageUsersOpen(true)}
        />

        <main
          id="conteudo"
          className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-10 print:max-w-none print:p-0"
        >
          <CabecalhoUnidade unidade={unidade} currentCycle={currentCycle} />
          {carregando ? (
            <div className="flex items-center justify-center py-24" role="status">
              <div className="w-8 h-8 border-[3px] border-folha-600 border-t-transparent rounded-full animate-spin" />
              <span className="sr-only">Carregando dados de {unidade.nome}</span>
            </div>
          ) : (
            children
          )}
        </main>

        <footer className="mt-4 py-8 text-center text-sm text-slate-600 print:hidden">
          <p>
            <strong className="font-display font-semibold text-grafite">MonitorAçaí</strong>, rodízio de sensores do
            Projeto de Manejo Sustentável do Açaí no Marajó
          </p>
        </footer>

        <RegistrarRodizioModal
          isOpen={modoCampo !== null}
          modo={modoCampo ?? 'registrar'}
          onClose={() => setModoCampo(null)}
          ativo={activeRecord}
          agendado={scheduledRecord}
          disponiveis={availablePositions}
          currentCycle={currentCycle}
          nomeUnidade={unidade.nome}
          responsavelPadrao={activeRecord?.responsible || usuario.fullName || ''}
          onRegistrar={handleRegistrar}
          onAgendar={handleAgendar}
        />

        <RecordFormModal
          isOpen={isRecordFormOpen}
          onClose={() => {
            setIsRecordFormOpen(false);
            setRecordToEdit(null);
          }}
          recordToEdit={recordToEdit}
          currentCycle={currentCycle}
          nomeUnidade={unidade.nome}
          onSaveRecord={handleSaveRecord}
        />

        <DeleteConfirmModal
          isOpen={!!recordToDelete}
          onClose={() => setRecordToDelete(null)}
          record={recordToDelete}
          temRelatorio={!!recordToDelete && relatorios.has(recordToDelete.id)}
          onConfirmDelete={handleDeleteRecord}
        />

        <CycleCompletedModal
          isOpen={isCycleCompleteOpen}
          onClose={() => setIsCycleCompleteOpen(false)}
          currentCycle={currentCycle}
          nomeUnidade={unidade.nome}
          onStartNewCycle={handleStartNewCycle}
        />

        <ProjectInfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />

        <ManageUsersModal isOpen={isManageUsersOpen} onClose={() => setIsManageUsersOpen(false)} onShowToast={aviso} />
      </div>
    </Contexto.Provider>
  );
}
