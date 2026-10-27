'use client';

import React, { useEffect, useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AlertCircle, ArrowLeft, ArrowRight, Check, Copy, Loader2, Save } from 'lucide-react';
import {
  DATALOGGERS,
  FOTOS_RELATORIO,
  ITENS_DESINSTALACAO,
  doisDigitos,
  nomeFoto,
  pendenciasRelatorio,
  type DadosRelatorio,
  type LadoPosicao,
  type Rodizio,
  type StatusRelatorio,
  type TelemetriaDatalogger,
} from '@/lib/relatorio';
import type { Unidade } from '@/lib/unidades';
import { formatDateBR } from '@/lib/storage';
import { descricaoPosicao } from './comum';

export interface EstadoRelatorio {
  status: StatusRelatorio;
  assinadoEm: string | null;
  dados: DadosRelatorio;
}

const PASSOS = ['Identificação', 'Posições', 'Procedimentos', 'Telemetria', 'Fotos e conclusão'] as const;

// ---------------------------------------------------------------------------
// Campos
// ---------------------------------------------------------------------------

const estiloCampo =
  'w-full min-h-11 rounded-2xl border border-transparent bg-papel/70 px-3.5 py-2.5 text-sm text-grafite outline-hidden transition-colors focus:bg-white focus:ring-2 focus:ring-folha-600 disabled:opacity-60';

function Campo({ rotulo, dica, children, id }: { rotulo: string; dica?: string; children: React.ReactNode; id: string }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-800">
        {rotulo}
      </label>
      {children}
      {dica && <p className="mt-1 text-xs text-slate-600">{dica}</p>}
    </div>
  );
}

function CampoTexto(props: { rotulo: string; valor: string; onMudar: (v: string) => void; dica?: string; placeholder?: string; modo?: 'decimal' }) {
  const id = useId();
  return (
    <Campo rotulo={props.rotulo} dica={props.dica} id={id}>
      <input
        id={id}
        type="text"
        inputMode={props.modo}
        value={props.valor}
        placeholder={props.placeholder}
        onChange={(e) => props.onMudar(e.target.value)}
        className={estiloCampo}
      />
    </Campo>
  );
}

function CampoHora(props: { rotulo: string; valor: string; onMudar: (v: string) => void; dica?: string }) {
  const id = useId();
  return (
    <Campo rotulo={props.rotulo} dica={props.dica} id={id}>
      <input id={id} type="time" value={props.valor} onChange={(e) => props.onMudar(e.target.value)} className={`${estiloCampo} tabular-nums`} />
    </Campo>
  );
}

function CampoNumero(props: {
  rotulo: string;
  valor: number | null;
  onMudar: (v: number | null) => void;
  unidade: string;
  passo?: string;
  dica?: string;
}) {
  const id = useId();
  return (
    <Campo rotulo={props.rotulo} dica={props.dica} id={id}>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={props.passo ?? 'any'}
          value={props.valor ?? ''}
          onChange={(e) => props.onMudar(e.target.value === '' ? null : Number(e.target.value))}
          className={`${estiloCampo} pr-12 tabular-nums`}
        />
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-500">{props.unidade}</span>
      </div>
    </Campo>
  );
}

/** Item de checklist com alvo grande, título e o texto do formulário em papel. */
function Marcador({
  marcado,
  onMudar,
  titulo,
  texto,
  children,
}: {
  marcado: boolean;
  onMudar: (v: boolean) => void;
  titulo: string;
  texto?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl p-3.5 transition-colors ${marcado ? 'bg-broto-100/60 ring-1 ring-folha-600/30' : 'bg-papel/50'}`}>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={marcado}
          onChange={(e) => onMudar(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded accent-[var(--color-folha-700)]"
        />
        <span className="text-sm">
          <strong className="block font-semibold text-grafite">{titulo}</strong>
          {texto && <span className="text-slate-600">{texto}</span>}
        </span>
      </label>
      {children && <div className="mt-3 pl-8">{children}</div>}
    </div>
  );
}

/** Escolha única em pílulas (radio). */
function Escolha<T extends string>({
  rotulo,
  opcoes,
  valor,
  onMudar,
}: {
  rotulo: string;
  opcoes: { valor: T; texto: string }[];
  valor: T | null;
  onMudar: (v: T | null) => void;
}) {
  const nome = useId();
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-sm font-medium text-slate-800">{rotulo}</legend>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((o) => {
          const ativo = o.valor === valor;
          return (
            <label
              key={o.valor}
              className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-folha-600 ${
                ativo ? 'bg-folha-700 text-white' : 'bg-papel/70 text-slate-700 hover:bg-folha-50'
              }`}
            >
              <input
                type="radio"
                name={nome}
                className="sr-only"
                checked={ativo}
                onChange={() => onMudar(o.valor)}
                onClick={() => {
                  // Clicar de novo na opção marcada desmarca (o campo pode ficar sem resposta).
                  if (ativo) onMudar(null);
                }}
              />
              {ativo && <Check className="h-3.5 w-3.5" />}
              {o.texto}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function Bloco({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <section className="mt-7 first:mt-0">
      <h3 className="font-display text-lg font-semibold text-grafite">{titulo}</h3>
      {descricao && <p className="mt-0.5 text-sm text-slate-600">{descricao}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Formulário
// ---------------------------------------------------------------------------

export function FormularioRelatorio({
  unidade,
  rodizio,
  codigo,
  inicial,
  existente,
  avisoPreenchimento,
  onSalvar,
  onFinalizado,
}: {
  unidade: Unidade;
  rodizio: Rodizio;
  codigo: string;
  inicial: EstadoRelatorio;
  existente: boolean;
  /** Explica de onde vieram valores já preenchidos (ex.: destino do relatório anterior). */
  avisoPreenchimento?: string;
  onSalvar: (estado: EstadoRelatorio) => Promise<void>;
  onFinalizado: () => void;
}) {
  const reduzir = useReducedMotion();
  const { record, origem } = rodizio;
  const primeira = !origem;

  const [dados, setDados] = useState(inicial.dados);
  const [status, setStatus] = useState<StatusRelatorio>(inicial.status);
  const [assinadoEm, setAssinadoEm] = useState(inicial.assinadoEm ?? '');
  const [passo, setPasso] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [sujo, setSujo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  const pendencias = pendenciasRelatorio(dados, primeira);
  const concluindo = status === 'concluido' || !!assinadoEm;

  // Avisa antes de sair da página com alterações não salvas.
  useEffect(() => {
    if (!sujo) return;
    const aoSair = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', aoSair);
    return () => window.removeEventListener('beforeunload', aoSair);
  }, [sujo]);

  const alterar = (fn: (d: DadosRelatorio) => DadosRelatorio) => {
    setDados((d) => fn(d));
    setSujo(true);
  };
  const lado = (qual: 'origem' | 'destino', patch: Partial<LadoPosicao>) =>
    alterar((d) => ({ ...d, [qual]: { ...d[qual], ...patch } }));
  const telemetria = (qual: 'zl6' | 'umetos', patch: Partial<TelemetriaDatalogger>) =>
    alterar((d) => ({ ...d, telemetria: { ...d.telemetria, [qual]: { ...d.telemetria[qual], ...patch } } }));
  function grupo<K extends 'desinstalacao' | 'estrutura' | 'solo' | 'planta'>(chave: K, patch: Partial<DadosRelatorio[K]>) {
    alterar((d) => ({ ...d, [chave]: { ...d[chave], ...patch } }));
  }

  const salvar = async (estado: EstadoRelatorio) => {
    setSalvando(true);
    setErro(null);
    try {
      await onSalvar(estado);
      setSujo(false);
      return true;
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar o relatório.');
      return false;
    } finally {
      setSalvando(false);
    }
  };

  // Rascunho automático ao trocar de etapa; com pendências, o relatório continua como rascunho.
  const salvarRascunho = () =>
    salvar({
      status: pendencias.length ? 'rascunho' : status,
      assinadoEm: pendencias.length ? null : assinadoEm || null,
      dados,
    });

  const irPara = async (destino: number) => {
    if (destino === passo) return;
    if (sujo && !(await salvarRascunho())) return;
    setPasso(destino);
    document.getElementById('formulario-relatorio')?.scrollIntoView({ behavior: reduzir ? 'auto' : 'smooth', block: 'start' });
  };

  const finalizar = async () => {
    const ok = await salvar({ status: concluindo ? 'concluido' : 'rascunho', assinadoEm: assinadoEm || null, dados });
    if (ok) onFinalizado();
  };

  const copiarNome = async (nome: string) => {
    try {
      await navigator.clipboard.writeText(nome);
      setCopiado(nome);
      setTimeout(() => setCopiado((c) => (c === nome ? null : c)), 1500);
    } catch {
      setCopiado(null);
    }
  };

  // ------------------------------------------------------------------ etapas
  const etapas: React.ReactNode[] = [
    // 1. Identificação
    <div key="identificacao">
      <dl className="mb-6 grid grid-cols-2 gap-3 rounded-2xl bg-papel/60 p-4 text-sm sm:grid-cols-4">
        {[
          ['Unidade piloto', unidade.rotuloRelatorio],
          ['Data da movimentação', formatDateBR(record.installedAt)],
          ['Ciclo do rodízio', String(record.cycleNumber)],
          ['Rodízio', codigo],
        ].map(([rotulo, valor]) => (
          <div key={rotulo} className="min-w-0">
            <dt className="text-xs text-slate-600">{rotulo}</dt>
            <dd className="truncate font-semibold text-grafite tabular-nums">{valor}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoTexto rotulo="Responsável técnico local" valor={dados.responsavelTecnico} onMudar={(v) => alterar((d) => ({ ...d, responsavelTecnico: v }))} />
        <CampoTexto
          rotulo="Equipe de apoio / bolsistas"
          valor={dados.equipeApoio}
          onMudar={(v) => alterar((d) => ({ ...d, equipeApoio: v }))}
          dica="Separe os nomes por vírgula."
        />
        {primeira ? (
          <div className="rounded-2xl bg-papel/60 p-4 text-sm text-slate-700">
            <span className="block font-medium text-slate-800">Horário de desconexão (célula anterior)</span>
            1ª instalação do ciclo: não há célula anterior.
          </div>
        ) : (
          <CampoHora
            rotulo="Horário de desconexão (célula anterior)"
            valor={dados.horaDesconexao}
            onMudar={(v) => alterar((d) => ({ ...d, horaDesconexao: v }))}
          />
        )}
        <CampoHora
          rotulo="Horário de restabelecimento (nova célula)"
          valor={dados.horaRestabelecimento}
          onMudar={(v) => alterar((d) => ({ ...d, horaRestabelecimento: v }))}
        />
      </div>
    </div>,

    // 2. Posições
    <div key="posicoes">
      {avisoPreenchimento && (
        <p className="mb-5 rounded-2xl bg-agua-100/70 px-4 py-3 text-sm text-agua-700">{avisoPreenchimento}</p>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        {(['origem', 'destino'] as const).map((qual) => {
          const reg = qual === 'origem' ? origem : record;
          const l = dados[qual];
          return (
            <section key={qual} className="rounded-[20px] p-4 ring-1 ring-papel-linha sm:p-5">
              <h3 className="flex flex-wrap items-baseline gap-2 font-display text-lg font-semibold text-grafite">
                {qual === 'origem' ? 'Posição anterior (origem)' : 'Posição atual (destino)'}
                <span className="text-sm font-normal text-slate-600 tabular-nums">
                  {reg ? `Nº ${doisDigitos(reg.positionId)} · ${descricaoPosicao(reg.positionId)}` : 'Nº 00'}
                </span>
              </h3>
              {!reg ? (
                <p className="mt-3 text-sm text-slate-600">1ª instalação do ciclo: sem posição de origem.</p>
              ) : (
                <div className="mt-4 grid gap-4">
                  <Escolha
                    rotulo="Tratamento hídrico / plantio"
                    valor={l.tratamento}
                    onMudar={(v) => lado(qual, { tratamento: v })}
                    opcoes={[
                      { valor: 'T1', texto: 'T1 (1 pé/cova)' },
                      { valor: 'T2', texto: 'T2 (2 pés/cova)' },
                    ]}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <CampoTexto rotulo="Latitude do mastro" modo="decimal" placeholder="ex.: -1.68960" valor={l.latitude} onMudar={(v) => lado(qual, { latitude: v })} />
                    <CampoTexto rotulo="Longitude do mastro" modo="decimal" placeholder="ex.: -50.46357" valor={l.longitude} onMudar={(v) => lado(qual, { longitude: v })} />
                  </div>
                  <CampoNumero
                    rotulo="Raio medido (mastro → touceiras)"
                    unidade="m"
                    passo="0.1"
                    valor={l.raioM}
                    onMudar={(v) => lado(qual, { raioM: v })}
                    dica="Padrão: ~2,8 m"
                  />
                  <CampoTexto
                    rotulo={`Espécies vizinhas (SAF ${unidade.nome})`}
                    placeholder="ex.: Açaí, Cupuaçu, Andiroba"
                    valor={l.especies}
                    onMudar={(v) => lado(qual, { especies: v })}
                  />
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>,

    // 3. Procedimentos
    <div key="procedimentos">
      <Bloco
        titulo="Desinstalação na posição de origem"
        descricao={primeira ? 'Não se aplica: primeira instalação do ciclo.' : undefined}
      >
        {!primeira && (
          <div className="grid gap-2.5 md:grid-cols-2">
            {ITENS_DESINSTALACAO.map((item) => (
              <Marcador
                key={item.chave}
                titulo={item.titulo}
                texto={item.texto}
                marcado={dados.desinstalacao[item.chave]}
                onMudar={(v) => grupo('desinstalacao', { [item.chave]: v })}
              />
            ))}
          </div>
        )}
      </Bloco>

      <Bloco titulo="A. Estrutura e estação meteorológica">
        <div className="grid gap-2.5 md:grid-cols-2">
          <Marcador titulo="Fixação mecânica" texto="Conjunto prolongador acoplado e travado na haste metálica concretada." marcado={dados.estrutura.fixacao} onMudar={(v) => grupo('estrutura', { fixacao: v })} />
          <Marcador titulo="Orientação azimutal" texto="ATMOS 41 e painel fotovoltaico alinhados ao Norte Verdadeiro." marcado={dados.estrutura.orientacaoNorte} onMudar={(v) => grupo('estrutura', { orientacaoNorte: v })} />
          <Marcador titulo="Altura regulamentar" texto="Altura do ATMOS 41 Gen 2 conferida em relação ao solo." marcado={dados.estrutura.altura} onMudar={(v) => grupo('estrutura', { altura: v })}>
            <CampoNumero rotulo="Altura medida" unidade="m" passo="0.1" valor={dados.estrutura.alturaM} onMudar={(v) => grupo('estrutura', { alturaM: v })} dica="Regulamentar: 2,0 m" />
          </Marcador>
          <Marcador titulo="Nivelamento bolha" texto="Nível de bolha centralizado." marcado={dados.estrutura.nivelamento} onMudar={(v) => grupo('estrutura', { nivelamento: v })}>
            <CampoNumero rotulo="Ângulo de inclinação" unidade="°" passo="0.1" valor={dados.estrutura.nivelamentoGraus} onMudar={(v) => grupo('estrutura', { nivelamentoGraus: v })} dica="Tolerância ±2°" />
          </Marcador>
        </div>
      </Bloco>

      <Bloco titulo="B. Sensores de solo">
        <div className="grid gap-2.5 md:grid-cols-2">
          <Marcador titulo="TEROS 10 (umidade)" texto="Inserido horizontalmente no perfil não perturbado do solo." marcado={dados.solo.teros10} onMudar={(v) => grupo('solo', { teros10: v })}>
            <CampoNumero rotulo="Profundidade" unidade="cm" valor={dados.solo.teros10Cm} onMudar={(v) => grupo('solo', { teros10Cm: v })} />
          </Marcador>
          <Marcador titulo="TEROS 21 (potencial mátrico)" texto="Cavidade preenchida com pasta de solo nativo, sem bolhas de ar." marcado={dados.solo.teros21} onMudar={(v) => grupo('solo', { teros21: v })}>
            <CampoNumero rotulo="Profundidade" unidade="cm" valor={dados.solo.teros21Cm} onMudar={(v) => grupo('solo', { teros21Cm: v })} />
          </Marcador>
          <Marcador titulo="Proteção mecânica de cabos" texto="Fiação subterrânea em eletroduto/conduíte contra enxadas e animais." marcado={dados.solo.protecaoCabos} onMudar={(v) => grupo('solo', { protecaoCabos: v })} />
        </div>
      </Bloco>

      <Bloco titulo="C. Sensores de planta">
        <div className="grid gap-2.5 md:grid-cols-2">
          <Marcador titulo="FylloClips (StremoClip)" texto="Folha sadia do estrato médio, fotodiodo para o Norte, proteção 3D ajustada." marcado={dados.planta.fylloclips} onMudar={(v) => grupo('planta', { fylloclips: v })} />
          <Marcador titulo="Radiômetro infravermelho (Apogee SIL-411)" texto="Montado no mastro com visada no dossel das plantas da célula." marcado={dados.planta.radiometro} onMudar={(v) => grupo('planta', { radiometro: v })}>
            <CampoNumero rotulo="Inclinação" unidade="°" valor={dados.planta.radiometroGraus} onMudar={(v) => grupo('planta', { radiometroGraus: v })} />
          </Marcador>
          <div className="rounded-2xl bg-papel/50 p-3.5 md:col-span-2">
            <Escolha
              rotulo="Dendrômetro DD-L"
              valor={dados.planta.dendrometro}
              onMudar={(v) => grupo('planta', { dendrometro: v })}
              opcoes={[
                { valor: 'caule', texto: 'Instalado no caule' },
                { valor: 'suspenso', texto: 'Suspenso (planta muito jovem)' },
              ]}
            />
            {dados.planta.dendrometro === 'caule' && (
              <div className="mt-3 max-w-xs">
                <CampoNumero rotulo="Diâmetro do caule" unidade="cm" valor={dados.planta.dendrometroDiametroCm} onMudar={(v) => grupo('planta', { dendrometroDiametroCm: v })} />
              </div>
            )}
          </div>
        </div>
      </Bloco>
    </div>,

    // 4. Telemetria
    <div key="telemetria">
      <div className="grid gap-5 lg:grid-cols-2">
        {(['zl6', 'umetos'] as const).map((qual) => {
          const info = DATALOGGERS[qual];
          const t = dados.telemetria[qual];
          return (
            <section key={qual} className="rounded-[20px] p-4 ring-1 ring-papel-linha sm:p-5">
              <h3 className="font-display text-lg font-semibold text-grafite">
                {info.nome} <span className="text-sm font-normal text-slate-600">({info.nuvem})</span>
              </h3>
              <div className="mt-4 grid gap-4">
                <Escolha
                  rotulo="Status operacional"
                  valor={t.status}
                  onMudar={(v) => telemetria(qual, { status: v })}
                  opcoes={[
                    { valor: 'ok', texto: 'OK' },
                    { valor: 'falha', texto: 'Falha' },
                  ]}
                />
                <div className="grid grid-cols-2 gap-3">
                  <CampoNumero rotulo="Tensão da bateria" unidade="mV" valor={t.tensaoMv} onMudar={(v) => telemetria(qual, { tensaoMv: v })} />
                  <CampoHora rotulo="Primeiro pacote na nuvem" valor={t.primeiroPacote} onMudar={(v) => telemetria(qual, { primeiroPacote: v })} />
                </div>
                <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={t.sinalFraco}
                    onChange={(e) => telemetria(qual, { sinalFraco: e.target.checked })}
                    className="h-5 w-5 cursor-pointer accent-[var(--color-folha-700)]"
                  />
                  Sinal {info.sinal} fraco
                </label>
              </div>
            </section>
          );
        })}
      </div>
      <p className="mt-4 text-sm text-slate-600">
        Antes de deixar o local, confira no Zentra Cloud e no FieldClimate se todas as portas estão plotando curvas normais.
      </p>
    </div>,

    // 5. Fotos e conclusão
    <div key="fotos">
      <Bloco titulo="Relatório fotográfico" descricao="Marque as fotos já registradas. O nome sugerido segue o padrão DATA_LOCAL_POSICAO_TIPO.jpg.">
        <ul className="grid gap-2.5 md:grid-cols-2">
          {FOTOS_RELATORIO.map((f, i) => {
            const anterior = f.bloco === 'anterior';
            if (anterior && primeira) return null;
            const posicao = anterior ? origem!.positionId : record.positionId;
            const nome = nomeFoto(unidade, record.installedAt, posicao, f.tipo);
            return (
              <li key={f.numero}>
                <Marcador
                  titulo={`Foto ${doisDigitos(f.numero)}: ${f.titulo}`}
                  texto={anterior ? 'Antes da desinstalação, na célula de origem.' : 'Instalação concluída, na célula de destino.'}
                  marcado={dados.fotos[i]}
                  onMudar={(v) => alterar((d) => ({ ...d, fotos: d.fotos.map((x, j) => (j === i ? v : x)) }))}
                >
                  <button
                    type="button"
                    onClick={() => copiarNome(nome)}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-white px-2 py-1 font-mono text-xs text-slate-700 ring-1 ring-papel-linha hover:ring-folha-600 cursor-pointer"
                    title="Copiar nome do arquivo"
                  >
                    <span className="truncate">{nome}</span>
                    {copiado === nome ? <Check className="h-3.5 w-3.5 shrink-0 text-folha-700" /> : <Copy className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                </Marcador>
              </li>
            );
          })}
        </ul>
      </Bloco>

      <Bloco titulo="Ocorrências de campo e notas fenológicas" descricao="Irrigação durante a troca, chuva recente, plantas invasoras, sombreamento, pragas nas folhas monitoradas...">
        <textarea
          aria-label="Ocorrências de campo e notas fenológicas"
          rows={5}
          value={dados.ocorrencias}
          onChange={(e) => alterar((d) => ({ ...d, ocorrencias: e.target.value }))}
          className={`${estiloCampo} resize-y leading-relaxed`}
        />
      </Bloco>

      <Bloco titulo="Situação do relatório">
        <div className="grid gap-4 sm:grid-cols-2">
          <Escolha
            rotulo="O relatório está"
            valor={concluindo ? 'concluido' : 'rascunho'}
            onMudar={(v) => {
              setStatus(v ?? 'rascunho');
              if (v !== 'concluido') setAssinadoEm('');
              setSujo(true);
            }}
            opcoes={[
              { valor: 'rascunho', texto: 'Em rascunho' },
              { valor: 'concluido', texto: 'Concluído' },
            ]}
          />
          <div>
            <label htmlFor="data-assinatura" className="mb-1.5 block text-sm font-medium text-slate-800">
              Assinado no gov.br em
            </label>
            <input
              id="data-assinatura"
              type="date"
              value={assinadoEm}
              onChange={(e) => {
                setAssinadoEm(e.target.value);
                if (e.target.value) setStatus('concluido');
                setSujo(true);
              }}
              className={`${estiloCampo} tabular-nums`}
            />
            <p className="mt-1 text-xs text-slate-600">Preencha depois de assinar o PDF.</p>
          </div>
        </div>
        {concluindo && pendencias.length > 0 && (
          <div role="alert" className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">Para concluir, falta preencher:</p>
            <ul className="mt-1 list-disc pl-5">
              {pendencias.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        )}
      </Bloco>
    </div>,
  ];

  const ultimo = passo === PASSOS.length - 1;

  return (
    <div id="formulario-relatorio" className="scroll-mt-24 rounded-[28px] bg-white ring-1 ring-folha-100">
      {/* Etapas: é uma sequência real, então leva número */}
      <nav aria-label="Etapas do relatório" className="border-b border-folha-100 px-4 py-4 sm:px-7">
        <ol className="flex items-center gap-1.5 sm:gap-2">
          {PASSOS.map((titulo, i) => {
            const atual = i === passo;
            const feito = i < passo;
            return (
              <li key={titulo} className={`flex items-center gap-1.5 sm:gap-2 ${i < PASSOS.length - 1 ? 'flex-1' : ''}`}>
                <button
                  type="button"
                  onClick={() => irPara(i)}
                  disabled={salvando}
                  aria-current={atual ? 'step' : undefined}
                  className="group flex min-h-10 items-center gap-2 rounded-full pr-1 cursor-pointer disabled:cursor-wait"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums transition-colors ${
                      atual ? 'bg-acai-900 text-white' : feito ? 'bg-folha-700 text-white' : 'bg-papel text-slate-600 group-hover:bg-folha-100'
                    }`}
                  >
                    {feito ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className={`text-sm ${atual ? 'hidden font-semibold text-grafite sm:inline' : 'hidden text-slate-600 lg:inline'}`}>{titulo}</span>
                </button>
                {i < PASSOS.length - 1 && <span aria-hidden="true" className={`h-px flex-1 ${feito ? 'bg-folha-700' : 'bg-papel-linha'}`} />}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="px-4 py-6 sm:px-7 sm:py-7">
        <h2 className="mb-5 font-display text-2xl font-semibold tracking-tight text-grafite">
          {PASSOS[passo]}
          <span className="ml-2 text-base font-normal text-slate-500 tabular-nums">
            {passo + 1} de {PASSOS.length}
          </span>
        </h2>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={passo}
            initial={reduzir ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduzir ? undefined : { opacity: 0, x: -24 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {etapas[passo]}
          </motion.div>
        </AnimatePresence>
      </div>

      {erro && (
        <p role="alert" className="mx-4 mb-4 flex items-start gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:mx-7">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {erro}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-folha-100 px-4 py-4 sm:px-7">
        <button
          type="button"
          onClick={() => irPara(passo - 1)}
          disabled={passo === 0 || salvando}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-slate-700 hover:bg-papel disabled:invisible cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {!ultimo && (
            <button
              type="button"
              onClick={() => salvarRascunho()}
              disabled={salvando || (!sujo && existente)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-folha-800 ring-1 ring-folha-100 hover:bg-folha-50 disabled:opacity-50 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              {sujo || !existente ? 'Salvar rascunho' : 'Salvo'}
            </button>
          )}
          {ultimo ? (
            <button
              type="button"
              onClick={finalizar}
              disabled={salvando || (concluindo && pendencias.length > 0)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-acai-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-acai-800 disabled:opacity-50 cursor-pointer"
            >
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Salvar relatório
            </button>
          ) : (
            <button
              type="button"
              onClick={() => irPara(passo + 1)}
              disabled={salvando}
              className="group inline-flex min-h-11 items-center gap-2 rounded-full bg-folha-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-folha-800 disabled:opacity-60 cursor-pointer"
            >
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Próximo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
