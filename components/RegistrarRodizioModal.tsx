'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Calendar, Check, Dices, FileText, Loader2, RotateCw } from 'lucide-react';
import { Janela } from '@/components/vivo/Janela';
import confetti from 'canvas-confetti';
import { PositionInfo, RotationRecord } from '@/lib/types';
import { DAYS_PER_ROTATION, getPositionById } from '@/lib/constants';
import { addDaysToDate, formatDateBR, getTodayLocalDateStr } from '@/lib/storage';

export type ModoCampo = 'registrar' | 'agendar';

export interface DadosRegistroCampo {
  data: string;
  responsavel: string;
  observacoes: string;
  posicaoDestino?: number;
  proximaPosicao?: number;
}

const doisDigitos = (n: number) => String(n).padStart(2, '0');

/** Sorteio aleatório entre os candidatos, com a "roleta" visual (instantâneo com movimento reduzido). */
function useSorteio(candidatos: PositionInfo[], reduzir: boolean) {
  const [exibido, setExibido] = useState<PositionInfo | null>(null);
  const [escolhido, setEscolhido] = useState<PositionInfo | null>(null);
  const [sorteando, setSorteando] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const sortear = useCallback(() => {
    if (candidatos.length === 0) return;
    if (timer.current) clearInterval(timer.current);
    const final = candidatos[Math.floor(Math.random() * candidatos.length)];
    if (reduzir) {
      setExibido(final);
      setEscolhido(final);
      return;
    }
    setSorteando(true);
    setEscolhido(null);
    let passos = 0;
    timer.current = setInterval(() => {
      passos++;
      setExibido(candidatos[Math.floor(Math.random() * candidatos.length)]);
      if (passos >= 16) {
        clearInterval(timer.current!);
        timer.current = null;
        setExibido(final);
        setEscolhido(final);
        setSorteando(false);
        try {
          confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 }, colors: ['#1f5e45', '#6cc36a', '#523159', '#c9a9cf'] });
        } catch {
          // Animação opcional.
        }
      }
    }, 60);
  }, [candidatos, reduzir]);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  return { exibido, escolhido, sorteando, sortear };
}

function CartaoPosicao({
  rotulo,
  posicao,
  destaque = false,
  vazio,
}: {
  rotulo: string;
  posicao: PositionInfo | null | undefined;
  destaque?: boolean;
  vazio?: string;
}) {
  return (
    <div className={`min-w-0 flex-1 rounded-2xl p-3 text-center ${destaque ? 'bg-broto-100 ring-1 ring-folha-600/40' : 'bg-papel/70'}`}>
      <p className="text-xs text-slate-600">{rotulo}</p>
      {posicao ? (
        <>
          <p className="font-display text-3xl font-semibold leading-tight text-grafite tabular-nums">{posicao.formattedId}</p>
          <p className="text-xs text-slate-600">
            Célula {posicao.cellId}, planta {posicao.plantIndex}
          </p>
        </>
      ) : (
        <p className="py-2 text-sm text-slate-600">{vazio}</p>
      )}
    </div>
  );
}

/** Painel do sorteio: número girando, resultado e o botão de sortear de novo. */
function PainelSorteio({
  titulo,
  sorteio,
  data,
  disponiveis,
}: {
  titulo: string;
  sorteio: ReturnType<typeof useSorteio>;
  data: string;
  disponiveis: number;
}) {
  const { exibido, escolhido, sorteando, sortear } = sorteio;
  return (
    <div className="rounded-2xl bg-acai-900 p-4 text-acai-100">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm">{titulo}</p>
        <span className="text-xs text-acai-300 tabular-nums">{disponiveis} disponíveis</span>
      </div>
      <div className="mt-2 flex items-center gap-4" aria-live="polite">
        <motion.span
          key={exibido?.id ?? 'vazio'}
          initial={{ scale: 0.85, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.12 }}
          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl font-display text-3xl font-semibold tabular-nums ${
            escolhido ? 'bg-broto-400 text-acai-950' : 'bg-white/10 text-white'
          }`}
        >
          {exibido ? exibido.formattedId : '?'}
        </motion.span>
        <div className="min-w-0 text-sm">
          {escolhido ? (
            <>
              <p className="font-semibold text-white">
                Célula {escolhido.cellId}, planta {escolhido.plantIndex}
              </p>
              <p className="text-acai-100/80">Agendada para {formatDateBR(data)}</p>
            </>
          ) : (
            <p className="text-acai-100/80">{sorteando ? 'Sorteando...' : 'Toque em sortear.'}</p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={sortear}
        disabled={sorteando || disponiveis === 0}
        className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-50 cursor-pointer"
      >
        {escolhido ? <RotateCw className="h-4 w-4" /> : <Dices className="h-4 w-4" />}
        {escolhido ? 'Sortear novamente' : 'Sortear'}
      </button>
    </div>
  );
}

export function RegistrarRodizioModal({
  isOpen,
  modo,
  onClose,
  ativo,
  agendado,
  disponiveis,
  currentCycle,
  nomeUnidade,
  responsavelPadrao,
  onRegistrar,
  onAgendar,
}: {
  isOpen: boolean;
  modo: ModoCampo;
  onClose: () => void;
  ativo: RotationRecord | null;
  agendado: RotationRecord | null;
  /** Posições que ainda podem ser sorteadas (exclui a já agendada). */
  disponiveis: PositionInfo[];
  currentCycle: number;
  nomeUnidade: string;
  responsavelPadrao: string;
  onRegistrar: (dados: DadosRegistroCampo) => Promise<void>;
  onAgendar: (dados: { proximaPosicao: number; responsavel: string }) => Promise<void>;
}) {
  if (!isOpen) return null;
  return (
    <Conteudo
      key={`${modo}-${ativo?.id}-${agendado?.id}`}
      modo={modo}
      onClose={onClose}
      ativo={ativo}
      agendado={agendado}
      disponiveis={disponiveis}
      currentCycle={currentCycle}
      nomeUnidade={nomeUnidade}
      responsavelPadrao={responsavelPadrao}
      onRegistrar={onRegistrar}
      onAgendar={onAgendar}
    />
  );
}

function Conteudo({
  modo,
  onClose,
  ativo,
  agendado,
  disponiveis,
  currentCycle,
  nomeUnidade,
  responsavelPadrao,
  onRegistrar,
  onAgendar,
}: Omit<Parameters<typeof RegistrarRodizioModal>[0], 'isOpen'>) {
  const reduzir = !!useReducedMotion();
  const hoje = getTodayLocalDateStr();
  const [data, setData] = useState(hoje);
  const [responsavel, setResponsavel] = useState(responsavelPadrao);
  const [observacoes, setObservacoes] = useState('');
  const [sortearProxima, setSortearProxima] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const posAtivo = ativo ? getPositionById(ativo.positionId) : null;
  const posAgendado = agendado ? getPositionById(agendado.positionId) : null;

  // Sem posição agendada, o destino de hoje é sorteado aqui mesmo.
  const sorteioDestino = useSorteio(disponiveis, reduzir);
  const destino = posAgendado ?? sorteioDestino.escolhido;
  const candidatosProxima = disponiveis.filter((p) => p.id !== destino?.id);
  const sorteioProxima = useSorteio(candidatosProxima, reduzir);

  const dataProxima = modo === 'agendar' ? ativo?.scheduledNextChange ?? addDaysToDate(hoje, DAYS_PER_ROTATION) : addDaysToDate(data, DAYS_PER_ROTATION);
  const precisaSortearDestino = modo === 'registrar' && !posAgendado;
  const vaiSortearProxima = modo === 'agendar' || (sortearProxima && candidatosProxima.length > 0);

  // Abre já sorteando o que for necessário. Sem trava de "já iniciou": se o React desmontar e
  // montar de novo (modo estrito), a limpeza para a roleta e esta chamada começa outra.
  useEffect(() => {
    if (precisaSortearDestino) sorteioDestino.sortear();
    else if (modo === 'agendar') sorteioProxima.sortear();
    // Só na abertura da janela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escolhido o destino (ou ao mudar a opção), sorteia a próxima automaticamente.
  useEffect(() => {
    if (modo === 'registrar' && destino && sortearProxima && !sorteioProxima.escolhido && !sorteioProxima.sorteando && candidatosProxima.length > 0) {
      sorteioProxima.sortear();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destino?.id, sortearProxima, modo]);

  const dataInvalida = !!ativo && data < ativo.installedAt;
  const pronto =
    !enviando &&
    responsavel.trim() !== '' &&
    (modo === 'agendar'
      ? !!sorteioProxima.escolhido
      : !!destino && !dataInvalida && !!data && (!vaiSortearProxima || !!sorteioProxima.escolhido));

  const confirmar = async () => {
    if (!pronto) return;
    setEnviando(true);
    setErro(null);
    try {
      if (modo === 'agendar') {
        await onAgendar({ proximaPosicao: sorteioProxima.escolhido!.id, responsavel: responsavel.trim() });
      } else {
        await onRegistrar({
          data,
          responsavel: responsavel.trim(),
          observacoes: observacoes.trim(),
          posicaoDestino: posAgendado ? undefined : destino!.id,
          proximaPosicao: vaiSortearProxima ? sorteioProxima.escolhido!.id : undefined,
        });
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível registrar.');
      setEnviando(false);
    }
  };

  const campo =
    'w-full min-h-11 rounded-2xl border border-transparent bg-papel/70 px-3.5 py-2.5 text-sm text-grafite outline-hidden focus:bg-white focus:ring-2 focus:ring-folha-600';

  return (
    <Janela
      titulo={modo === 'agendar' ? 'Sortear próxima posição' : 'Registrar rodízio'}
      subtitulo={`${nomeUnidade} · Ciclo ${currentCycle}`}
      onFechar={onClose}
      bloquearFechar={enviando}
      rodape={<>
          <button onClick={onClose} disabled={enviando} className="min-h-10 rounded-full px-4 py-2 text-sm font-medium text-slate-700 hover:bg-papel cursor-pointer">
            Cancelar
          </button>
          <button
            id="btn-confirmar-rodizio"
            onClick={confirmar}
            disabled={!pronto}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-acai-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-acai-800 disabled:opacity-50 cursor-pointer"
          >
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : modo === 'agendar' ? <Check className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            {modo === 'agendar' ? `Agendar #${sorteioProxima.escolhido ? doisDigitos(sorteioProxima.escolhido.id) : '--'}` : 'Registrar e abrir relatório'}
          </button>
</>}
    >
      <div className="space-y-5">
          {modo === 'registrar' && (
            <>
              <section aria-label="Troca de hoje">
                <div className="flex items-stretch gap-2">
                  <CartaoPosicao rotulo="Sai de" posicao={posAtivo} vazio="1ª instalação" />
                  <ArrowRight className="h-5 w-5 shrink-0 self-center text-lapis" aria-label="para" />
                  {precisaSortearDestino ? (
                    <div className="min-w-0 flex-[1.4]">
                      <PainelSorteio titulo="Posição de hoje" sorteio={sorteioDestino} data={data} disponiveis={disponiveis.length} />
                    </div>
                  ) : (
                    <CartaoPosicao rotulo="Vai para (já sorteada)" posicao={posAgendado} destaque />
                  )}
                </div>
              </section>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="campo-data" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-800">
                    <Calendar className="h-4 w-4 text-folha-600" />
                    Data da troca
                  </label>
                  <input
                    id="campo-data"
                    type="date"
                    value={data}
                    max={hoje}
                    min={ativo?.installedAt}
                    onChange={(e) => setData(e.target.value)}
                    className={`${campo} tabular-nums`}
                  />
                </div>
                <div>
                  <label htmlFor="campo-responsavel" className="mb-1.5 block text-sm font-medium text-slate-800">
                    Responsável
                  </label>
                  <input id="campo-responsavel" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className={campo} />
                </div>
              </div>

              <div>
                <label htmlFor="campo-obs" className="mb-1.5 block text-sm font-medium text-slate-800">
                  Observações <span className="font-normal text-slate-500">(opcional)</span>
                </label>
                <textarea id="campo-obs" rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} className={`${campo} resize-y`} />
              </div>

              {candidatosProxima.length > 0 ? (
                <section aria-label="Próxima posição">
                  <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={sortearProxima}
                      onChange={(e) => setSortearProxima(e.target.checked)}
                      className="h-5 w-5 cursor-pointer accent-[var(--color-folha-700)]"
                    />
                    Já sortear a próxima posição
                  </label>
                  {sortearProxima && (
                    <div className="mt-3">
                      <PainelSorteio titulo="Próxima troca" sorteio={sorteioProxima} data={dataProxima} disponiveis={candidatosProxima.length} />
                    </div>
                  )}
                </section>
              ) : (
                <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Esta é a última posição do ciclo: não há próxima para sortear.
                </p>
              )}

              {/* O que vai acontecer, já com as datas calculadas */}
              <ul className="space-y-1.5 rounded-2xl bg-papel/60 px-4 py-3 text-sm text-slate-700" aria-live="polite">
                {posAtivo && (
                  <li>
                    #{posAtivo.formattedId} passa a <strong className="font-semibold text-grafite">concluída</strong> em {formatDateBR(data)}
                  </li>
                )}
                {destino && (
                  <li>
                    #{destino.formattedId} fica <strong className="font-semibold text-grafite">ativa</strong> de {formatDateBR(data)}, troca prevista em{' '}
                    {formatDateBR(addDaysToDate(data, DAYS_PER_ROTATION))}
                  </li>
                )}
                {vaiSortearProxima && sorteioProxima.escolhido && (
                  <li>
                    #{sorteioProxima.escolhido.formattedId} fica <strong className="font-semibold text-grafite">agendada</strong> para {formatDateBR(dataProxima)}
                  </li>
                )}
                {dataInvalida && <li className="text-rose-700">A data não pode ser anterior à instalação atual ({formatDateBR(ativo!.installedAt)}).</li>}
              </ul>
            </>
          )}

          {modo === 'agendar' && (
            <>
              <p className="text-sm text-slate-700">
                O sensor está em #{posAtivo?.formattedId}. A posição sorteada fica agendada para a troca de {formatDateBR(dataProxima)}.
              </p>
              <PainelSorteio titulo="Próxima troca" sorteio={sorteioProxima} data={dataProxima} disponiveis={candidatosProxima.length} />
              <div>
                <label htmlFor="campo-responsavel-ag" className="mb-1.5 block text-sm font-medium text-slate-800">
                  Responsável pelo sorteio
                </label>
                <input id="campo-responsavel-ag" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className={campo} />
              </div>
            </>
          )}

          {erro && (
            <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {erro}
            </p>
          )}
      </div>
    </Janela>
  );
}
