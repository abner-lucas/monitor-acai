'use client';

import React, { useState } from 'react';
import { Calendar, Check, FileText, Loader2, UserCheck } from 'lucide-react';
import { RotationRecord } from '@/lib/types';
import { CELLS_METADATA, POSITIONS_DATA } from '@/lib/constants';
import { addDaysToDate, getTodayLocalDateStr } from '@/lib/storage';
import { Janela, estilos } from '@/components/vivo/Janela';

type Status = 'active' | 'completed' | 'scheduled';

interface RecordFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordToEdit: RotationRecord | null;
  currentCycle: number;
  nomeUnidade: string;
  onSaveRecord: (data: {
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
    status: Status;
  }) => Promise<void>;
}

export const RecordFormModal: React.FC<RecordFormModalProps> = ({ isOpen, recordToEdit, currentCycle, ...resto }) => {
  if (!isOpen) return null;
  return (
    <Conteudo
      key={recordToEdit ? recordToEdit.id : `new-${currentCycle}`}
      recordToEdit={recordToEdit}
      currentCycle={currentCycle}
      {...resto}
    />
  );
};

const STATUS: { valor: Status; texto: string; ponto: string }[] = [
  { valor: 'active', texto: 'Ativo em campo', ponto: 'bg-broto-500' },
  { valor: 'completed', texto: 'Concluído', ponto: 'bg-agua-600' },
  { valor: 'scheduled', texto: 'Sorteado (agendado)', ponto: 'border-2 border-dashed border-acai-700' },
];

function Erro({ texto }: { texto?: string }) {
  return texto ? <p className="mt-1 text-xs text-rose-700">{texto}</p> : null;
}

function Conteudo({
  onClose,
  recordToEdit,
  currentCycle,
  nomeUnidade,
  onSaveRecord,
}: Omit<RecordFormModalProps, 'isOpen'>) {
  const isEditing = !!recordToEdit;
  const todayStr = getTodayLocalDateStr();

  const [cycleNumber, setCycleNumber] = useState<number>(() => recordToEdit?.cycleNumber ?? currentCycle);
  const [positionId, setPositionId] = useState<number>(() => recordToEdit?.positionId ?? 1);
  const [installedAt, setInstalledAt] = useState<string>(() => recordToEdit?.installedAt ?? todayStr);
  const [scheduledNextChange, setScheduledNextChange] = useState<string>(
    () => recordToEdit?.scheduledNextChange ?? addDaysToDate(todayStr, 14)
  );
  const [removedAt, setRemovedAt] = useState<string>(() => recordToEdit?.removedAt ?? '');
  const [responsible, setResponsible] = useState<string>(() => recordToEdit?.responsible ?? 'Ábner Lucas / Técnico IFPA');
  const [status, setStatus] = useState<Status>(() => recordToEdit?.status ?? 'active');
  // Sem texto pronto: a observação só existe se alguém escrever.
  const [notes, setNotes] = useState<string>(() => recordToEdit?.notes ?? '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInstalledAtChange = (newDate: string) => {
    setInstalledAt(newDate);
    if (errors.installedAt) setErrors((prev) => ({ ...prev, installedAt: '' }));
    if (!recordToEdit) setScheduledNextChange(addDaysToDate(newDate, 14));
  };

  const validate = (): boolean => {
    const novos: Record<string, string> = {};
    if (!installedAt) novos.installedAt = 'A data de instalação é obrigatória.';
    if (!scheduledNextChange) novos.scheduledNextChange = 'A previsão de troca é obrigatória.';
    else if (installedAt && scheduledNextChange < installedAt) {
      novos.scheduledNextChange = 'A data de troca não pode ser anterior à data de instalação.';
    }
    if (removedAt && installedAt && removedAt < installedAt) {
      novos.removedAt = 'A retirada não pode ser anterior à instalação.';
    }
    if (!responsible || responsible.trim().length < 2) novos.responsible = 'Informe o nome do responsável (mínimo 2 letras).';
    if (cycleNumber < 1) novos.cycleNumber = 'O ciclo deve ser maior ou igual a 1.';
    setErrors(novos);
    return Object.keys(novos).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const pos = POSITIONS_DATA.find((p) => p.id === Number(positionId)) || POSITIONS_DATA[0];
      await onSaveRecord({
        id: recordToEdit?.id,
        cycleNumber: Number(cycleNumber),
        positionId: pos.id,
        cellId: pos.cellId,
        plantIndex: pos.plantIndex,
        installedAt,
        scheduledNextChange,
        removedAt: removedAt || null,
        responsible: responsible.trim(),
        notes: notes.trim(),
        status,
      });
      onClose();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Erro ao salvar registro.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const posAtual = POSITIONS_DATA.find((p) => p.id === Number(positionId));

  return (
    <Janela
      titulo={isEditing ? `Editar ${recordToEdit!.id}` : 'Novo registro de campo'}
      subtitulo={`${nomeUnidade} · lançamento manual`}
      icone={<FileText className="h-5 w-5" />}
      onFechar={onClose}
      bloquearFechar={isSubmitting}
      rodape={
        <>
          <button type="button" onClick={onClose} disabled={isSubmitting} className={estilos.botaoSecundario}>
            Cancelar
          </button>
          <button type="submit" form="form-registro" disabled={isSubmitting} className={estilos.botaoPrincipal}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {isEditing ? 'Salvar alterações' : 'Cadastrar'}
          </button>
        </>
      }
    >
      <form id="form-registro" onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Onde: posição em destaque, como no sorteio */}
        <section aria-label="Posição" className="flex items-stretch gap-3">
          <div className="flex w-24 shrink-0 flex-col items-center justify-center rounded-2xl bg-broto-100 p-3 text-center ring-1 ring-folha-600/40">
            <span className="text-xs text-slate-600">Posição</span>
            <span className="font-display text-3xl font-semibold leading-tight text-grafite tabular-nums">{posAtual?.formattedId}</span>
            <span className="text-xs text-slate-600">
              C{posAtual?.cellId} · P{posAtual?.plantIndex}
            </span>
          </div>
          <div className="grid min-w-0 flex-1 grid-cols-[1fr_5.5rem] gap-3">
            <div className="min-w-0">
              <label htmlFor="reg-posicao" className={estilos.rotulo}>
                Planta
              </label>
              <select
                id="reg-posicao"
                value={positionId}
                disabled={isSubmitting}
                onChange={(e) => setPositionId(Number(e.target.value))}
                className={estilos.campo}
              >
                {CELLS_METADATA.map((cel) => (
                  <optgroup key={cel.id} label={cel.name}>
                    {POSITIONS_DATA.filter((p) => p.cellId === cel.id).map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.formattedId} · planta {p.plantIndex}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="reg-ciclo" className={estilos.rotulo}>
                Ciclo
              </label>
              <input
                id="reg-ciclo"
                type="number"
                min="1"
                value={cycleNumber}
                disabled={isSubmitting}
                onChange={(e) => setCycleNumber(Number(e.target.value))}
                className={`${estilos.campo} tabular-nums`}
              />
              <Erro texto={errors.cycleNumber} />
            </div>
          </div>
        </section>

        <fieldset>
          <legend className={estilos.rotulo}>Status</legend>
          <div className="flex flex-wrap gap-2">
            {STATUS.map((s) => {
              const ativo = s.valor === status;
              return (
                <label
                  key={s.valor}
                  className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-folha-600 ${
                    ativo ? 'bg-folha-700 text-white' : 'bg-papel/70 text-slate-700 hover:bg-folha-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="reg-status"
                    className="sr-only"
                    checked={ativo}
                    disabled={isSubmitting}
                    onChange={() => setStatus(s.valor)}
                  />
                  <span className={`h-2.5 w-2.5 rounded-full ${ativo && s.valor === 'scheduled' ? 'border-2 border-dashed border-white' : s.ponto}`} />
                  {s.texto}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="reg-instalacao" className={estilos.rotulo}>
              <Calendar className="h-4 w-4 text-folha-600" />
              Instalação
            </label>
            <input
              id="reg-instalacao"
              type="date"
              value={installedAt}
              disabled={isSubmitting}
              onChange={(e) => handleInstalledAtChange(e.target.value)}
              className={`${estilos.campo} tabular-nums`}
            />
            <Erro texto={errors.installedAt} />
          </div>
          <div>
            <label htmlFor="reg-troca" className={estilos.rotulo}>
              Próxima troca
            </label>
            <input
              id="reg-troca"
              type="date"
              value={scheduledNextChange}
              disabled={isSubmitting}
              onChange={(e) => setScheduledNextChange(e.target.value)}
              className={`${estilos.campo} tabular-nums`}
            />
            <Erro texto={errors.scheduledNextChange} />
          </div>
          <div>
            <label htmlFor="reg-retirada" className={estilos.rotulo}>
              Retirada
            </label>
            <input
              id="reg-retirada"
              type="date"
              value={removedAt}
              disabled={isSubmitting}
              onChange={(e) => setRemovedAt(e.target.value)}
              className={`${estilos.campo} tabular-nums`}
            />
            <Erro texto={errors.removedAt} />
          </div>
        </div>
        <p className="-mt-3 text-xs text-slate-600">A retirada fica em branco enquanto o sensor estiver em campo.</p>

        <div>
          <label htmlFor="reg-responsavel" className={estilos.rotulo}>
            <UserCheck className="h-4 w-4 text-folha-600" />
            Responsável técnico
          </label>
          <input
            id="reg-responsavel"
            value={responsible}
            disabled={isSubmitting}
            onChange={(e) => {
              setResponsible(e.target.value);
              if (errors.responsible) setErrors((prev) => ({ ...prev, responsible: '' }));
            }}
            className={estilos.campo}
          />
          <Erro texto={errors.responsible} />
        </div>

        <div>
          <label htmlFor="reg-obs" className={estilos.rotulo}>
            Observações de campo <span className="font-normal text-slate-500">(opcional)</span>
          </label>
          <textarea
            id="reg-obs"
            rows={2}
            value={notes}
            disabled={isSubmitting}
            placeholder="Ex.: troca feita após a irrigação, mato roçado no dia anterior..."
            onChange={(e) => setNotes(e.target.value)}
            className={`${estilos.campo} resize-y`}
          />
        </div>

        {errors.form && (
          <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {errors.form}
          </p>
        )}
      </form>
    </Janela>
  );
}
