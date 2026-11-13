'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AlertCircle, Camera, ChevronLeft, ChevronRight, Download, ImageOff, Loader2, RefreshCw, Trash2, Upload, X } from 'lucide-react';
import { useUnidade } from '@/components/app/PainelUnidade';
import { FOTOS_RELATORIO, TIPOS_FOTO, doisDigitos, type FotoRelatorio, type Rodizio } from '@/lib/relatorio';
import { fotoService, urlFoto, type EstadoDrive } from '@/lib/services/fotoService';

/**
 * Fotos do relatório (item 6 do formulário). O original vai direto para o Google Drive;
 * a página mostra só versões reduzidas geradas pelo Drive.
 */

type Foto = (typeof FOTOS_RELATORIO)[number];

/** Fotos que se aplicam a este rodízio: na primeira instalação do ciclo não há posição antiga. */
export function fotosAplicaveis(rodizio: Rodizio): Foto[] {
  return FOTOS_RELATORIO.filter((f) => f.bloco === 'posterior' || rodizio.origem);
}

const BLOCOS = {
  anterior: { titulo: 'Antes', texto: 'Na célula de origem, antes da desinstalação' },
  posterior: { titulo: 'Depois', texto: 'Na célula de destino, instalação concluída' },
} as const;

const megas = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Miniatura com fundo de papel enquanto carrega e aviso se o Drive ainda não gerou a imagem. */
function Miniatura({ foto, tam = 'p', className = '' }: { foto: FotoRelatorio; tam?: 'p' | 'm'; className?: string }) {
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'falhou'>('carregando');
  if (estado === 'falhou') {
    return (
      <span className={`flex flex-col items-center justify-center gap-1 bg-papel text-center text-xs text-slate-500 ${className}`}>
        <ImageOff className="h-5 w-5" aria-hidden="true" />
        Prévia indisponível
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- versão reduzida servida pela própria API a partir do Drive
    <img
      src={urlFoto(foto, tam)}
      alt={FOTOS_RELATORIO[foto.numero - 1]?.titulo ?? ''}
      loading="lazy"
      onLoad={() => setEstado('ok')}
      onError={() => setEstado('falhou')}
      className={`bg-papel object-cover transition-opacity duration-300 ${estado === 'ok' ? 'opacity-100' : 'opacity-0'} ${className}`}
    />
  );
}

// ---------------------------------------------------------------------------
// Envio (formulário)
// ---------------------------------------------------------------------------

function useEstadoDrive() {
  const [drive, setDrive] = useState<EstadoDrive | null>(null);
  useEffect(() => {
    let ativo = true;
    fotoService
      .drive()
      .then((d) => ativo && setDrive(d))
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, []);
  return drive;
}

/** Tipo da foto; alguns celulares não informam o tipo de fotos HEIC, então o nome resolve. */
function comTipo(arquivo: File): File | null {
  const tipo = arquivo.type || (/\.hei[cf]$/i.test(arquivo.name) ? 'image/heic' : '');
  if (!TIPOS_FOTO.includes(tipo)) return null;
  return tipo === arquivo.type ? arquivo : new File([arquivo], arquivo.name, { type: tipo });
}

interface EstadoEnvio {
  progresso: number | null;
  removendo?: boolean;
  erro?: string | null;
}

function CartaoEnvio({
  foto,
  info,
  estado,
  desabilitado,
  onEscolher,
  onRemover,
}: {
  foto: FotoRelatorio | undefined;
  info: Foto;
  estado: EstadoEnvio;
  desabilitado: boolean;
  onEscolher: (arquivo: File) => void;
  onRemover: () => void;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const { progresso, removendo, erro } = estado;
  const ocupado = progresso !== null || !!removendo;

  return (
    <li className="min-w-0">
      <div
        onDragOver={(e) => {
          if (desabilitado) return;
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          const arquivo = e.dataTransfer.files[0];
          if (!desabilitado && !ocupado && arquivo) onEscolher(arquivo);
        }}
        className={`overflow-hidden rounded-2xl ring-1 transition-colors ${
          arrastando ? 'bg-broto-100/70 ring-2 ring-folha-600' : foto ? 'bg-white ring-folha-600/30' : 'bg-papel/50 ring-transparent'
        }`}
      >
        <div className="relative aspect-[4/3] w-full">
          {foto ? (
            <Miniatura foto={foto} className="absolute inset-0 h-full w-full" />
          ) : (
            <button
              type="button"
              disabled={desabilitado || ocupado}
              onClick={() => entrada.current?.click()}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-papel-linha px-4 text-center text-sm text-slate-600 hover:border-folha-600 hover:text-folha-800 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              <Camera className="h-6 w-6" aria-hidden="true" />
              <span>
                <strong className="font-semibold">Tocar para escolher</strong>
                <span className="hidden sm:inline"> ou arrastar a foto aqui</span>
              </span>
            </button>
          )}
          <span className="absolute left-2.5 top-2.5 rounded-full bg-acai-950/75 px-2 py-0.5 text-xs font-semibold tabular-nums text-white">
            {doisDigitos(info.numero)}
          </span>
          {progresso !== null && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-acai-950/70 px-6 text-white" role="status">
              <span className="text-sm font-semibold tabular-nums">
                {progresso < 1 ? `Enviando ao Drive… ${Math.round(progresso * 100)}%` : 'Conferindo no Drive…'}
              </span>
              <span className="h-1.5 w-full overflow-hidden rounded-full bg-white/25">
                <span className="block h-full rounded-full bg-broto-400 transition-[width]" style={{ width: `${Math.round(progresso * 100)}%` }} />
              </span>
            </div>
          )}
        </div>

        <div className="p-3.5">
          <p className="text-sm font-semibold text-grafite">{info.titulo}</p>
          <p className="mt-0.5 text-xs text-slate-600">{info.texto}</p>
          {foto && (
            <p className="mt-2 break-all font-mono text-[11px] text-slate-500">
              {foto.nome} · {megas(foto.tamanho)}
            </p>
          )}
          {erro && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-red-700" role="alert">
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {erro}
            </p>
          )}
          {foto && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={desabilitado || ocupado}
                onClick={() => entrada.current?.click()}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-papel px-3 py-1.5 text-xs font-semibold text-grafite hover:bg-folha-50 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Trocar
              </button>
              <button
                type="button"
                disabled={desabilitado || ocupado}
                onClick={onRemover}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 cursor-pointer"
              >
                {removendo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                Remover
              </button>
            </div>
          )}
        </div>
      </div>
      <input
        ref={entrada}
        type="file"
        accept={`${TIPOS_FOTO.join(',')},.heic,.heif`}
        className="sr-only"
        tabIndex={-1}
        aria-label={`Escolher foto ${doisDigitos(info.numero)}: ${info.titulo}`}
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          if (arquivo) onEscolher(arquivo);
          e.target.value = '';
        }}
      />
    </li>
  );
}

/**
 * Distribui vários arquivos pelas fotos do relatório: pelo número no nome (…_FOTO03.jpg, foto 3)
 * e, sem número, nas fotos ainda vazias, na ordem.
 */
function distribuir(arquivos: File[], numeros: number[], ocupados: Set<number>): Map<number, File> {
  const destino = new Map<number, File>();
  const semNumero: File[] = [];
  for (const a of arquivos) {
    const n = Number(/FOTO[\s_-]?0?(\d)\b/i.exec(a.name)?.[1]);
    if (numeros.includes(n) && !destino.has(n)) destino.set(n, a);
    else semNumero.push(a);
  }
  for (const n of numeros) {
    if (semNumero.length === 0) break;
    if (!destino.has(n) && !ocupados.has(n)) destino.set(n, semNumero.shift()!);
  }
  return destino;
}

/** Passo "Fotos" do formulário: um cartão por foto, com envio direto ao Google Drive. */
export function EnvioFotos({ rodizio }: { rodizio: Rodizio }) {
  const { fotos, registrarFoto, tirarFoto } = useUnidade();
  const drive = useEstadoDrive();
  const varias = useRef<HTMLInputElement>(null);
  const [estados, setEstados] = useState<Record<number, EstadoEnvio>>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const recordId = rodizio.record.id;
  const doRelatorio = fotos.get(recordId);
  const aplicaveis = fotosAplicaveis(rodizio);
  const semDrive = drive !== null && !drive.conectado;
  const enviando = Object.values(estados).some((e) => e.progresso !== null || e.removendo);

  const mudar = (numero: number, estado: EstadoEnvio) => setEstados((atual) => ({ ...atual, [numero]: estado }));

  const enviar = async (numero: number, original: File) => {
    const arquivo = comTipo(original);
    if (!arquivo) {
      mudar(numero, { progresso: null, erro: 'Envie uma foto JPG, PNG, WebP ou HEIC.' });
      return;
    }
    mudar(numero, { progresso: 0 });
    try {
      const foto = await fotoService.enviar(recordId, numero, arquivo, (p) => mudar(numero, { progresso: p }));
      registrarFoto(foto);
      mudar(numero, { progresso: null });
    } catch (err) {
      mudar(numero, { progresso: null, erro: err instanceof Error ? err.message : 'Não foi possível enviar a foto.' });
    }
  };

  const remover = async (numero: number) => {
    mudar(numero, { progresso: null, removendo: true });
    try {
      await fotoService.remover(recordId, numero);
      tirarFoto(recordId, numero);
      mudar(numero, { progresso: null });
    } catch (err) {
      mudar(numero, { progresso: null, erro: err instanceof Error ? err.message : 'Não foi possível remover a foto.' });
    }
  };

  // Uma de cada vez: com 4G fraco, envios em paralelo competem e todos ficam lentos.
  const enviarVarias = async (lista: File[]) => {
    const numeros = aplicaveis.map((f) => f.numero);
    const destino = distribuir(lista, numeros, new Set(doRelatorio?.keys() ?? []));
    const sobra = lista.length - destino.size;
    setAviso(sobra > 0 ? `${sobra} arquivo(s) ficaram de fora: não havia foto livre para eles.` : null);
    for (const [numero, arquivo] of [...destino].sort((a, b) => a[0] - b[0])) await enviar(numero, arquivo);
  };

  return (
    <div>
      {semDrive && (
        <p className="mb-4 flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {drive.configurado
            ? 'O Google Drive do projeto ainda não foi conectado. O coordenador conecta em Equipe → Fotos; depois disso as fotos podem ser enviadas.'
            : 'O envio de fotos ainda não foi configurado neste servidor.'}
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <button
          type="button"
          disabled={semDrive || enviando}
          onClick={() => varias.current?.click()}
          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-acai-900 px-4 py-2 text-sm font-semibold text-white hover:bg-acai-800 disabled:opacity-50 cursor-pointer"
        >
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
          Enviar várias de uma vez
        </button>
        <span className="text-xs text-slate-600">Arquivos com FOTO01…FOTO08 no nome vão direto para o item certo.</span>
        <input
          ref={varias}
          type="file"
          multiple
          accept={`${TIPOS_FOTO.join(',')},.heic,.heif`}
          className="sr-only"
          tabIndex={-1}
          aria-label="Escolher várias fotos"
          onChange={(e) => {
            const lista = Array.from(e.target.files ?? []);
            e.target.value = '';
            if (lista.length) enviarVarias(lista);
          }}
        />
      </div>
      {aviso && (
        <p className="mb-4 text-sm text-amber-900" role="status">
          {aviso}
        </p>
      )}

      {(['anterior', 'posterior'] as const).map((bloco) => {
        const lista = aplicaveis.filter((f) => f.bloco === bloco);
        if (lista.length === 0) return null;
        return (
          <section key={bloco} className="mt-5 first:mt-0">
            <h4 className="text-sm font-semibold text-grafite">
              {BLOCOS[bloco].titulo} <span className="font-normal text-slate-600">· {BLOCOS[bloco].texto}</span>
            </h4>
            <ul className="mt-2.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {lista.map((info) => (
                <CartaoEnvio
                  key={info.numero}
                  info={info}
                  foto={doRelatorio?.get(info.numero)}
                  estado={estados[info.numero] ?? { progresso: null }}
                  desabilitado={semDrive}
                  onEscolher={(arquivo) => enviar(info.numero, arquivo)}
                  onRemover={() => remover(info.numero)}
                />
              ))}
            </ul>
          </section>
        );
      })}
      {drive?.pastaUrl && (
        <p className="mt-4 text-xs text-slate-600">
          Os originais ficam na{' '}
          <a href={drive.pastaUrl} target="_blank" rel="noreferrer" className="font-medium text-folha-700 underline-offset-2 hover:underline">
            pasta do projeto no Google Drive
          </a>
          , com o nome no padrão DATA_UNIDADE_C1R1_FOTO01.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Visualização (página do relatório)
// ---------------------------------------------------------------------------

function Visualizador({ lista, inicio, onFechar }: { lista: FotoRelatorio[]; inicio: number; onFechar: () => void }) {
  const [i, setI] = useState(inicio);
  const reduzir = useReducedMotion();
  const fechar = useRef<HTMLButtonElement>(null);
  const foto = lista[i];
  const info = FOTOS_RELATORIO[foto.numero - 1];
  const ir = useCallback((passo: number) => setI((atual) => (atual + passo + lista.length) % lista.length), [lista.length]);

  useEffect(() => {
    fechar.current?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
      if (e.key === 'ArrowRight') ir(1);
      if (e.key === 'ArrowLeft') ir(-1);
    };
    window.addEventListener('keydown', tecla);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', tecla);
      document.body.style.overflow = anterior;
    };
  }, [ir, onFechar]);

  const botao = 'flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer';

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ${doisDigitos(foto.numero)}: ${info.titulo}`}
      initial={reduzir ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-acai-950/95 print:hidden"
      onClick={onFechar}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold">
            {doisDigitos(foto.numero)} · {info.titulo}
          </p>
          <p className="truncate text-xs text-white/70">
            {foto.nome}
            {foto.largura && foto.altura ? ` · ${foto.largura} × ${foto.altura} px` : ''} · {megas(foto.tamanho)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={urlFoto(foto, 'original')}
            download={foto.nome}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-acai-900 hover:bg-acai-100"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Baixar original</span>
            <span className="sm:hidden">Baixar</span>
          </a>
          <button ref={fechar} type="button" onClick={onFechar} aria-label="Fechar" className={botao}>
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4 sm:px-16">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${foto.recordId}-${foto.numero}-${foto.versao}`}
            initial={reduzir ? false : { opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduzir ? undefined : { opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex h-full w-full items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Miniatura foto={foto} tam="m" className="max-h-full max-w-full rounded-lg object-contain" />
          </motion.div>
        </AnimatePresence>
        {lista.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Foto anterior"
              onClick={(e) => {
                e.stopPropagation();
                ir(-1);
              }}
              className={`${botao} absolute left-2 top-1/2 -translate-y-1/2 sm:left-4`}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              aria-label="Próxima foto"
              onClick={(e) => {
                e.stopPropagation();
                ir(1);
              }}
              className={`${botao} absolute right-2 top-1/2 -translate-y-1/2 sm:right-4`}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>
      <p className="pb-4 text-center text-xs tabular-nums text-white/70">
        {i + 1} de {lista.length}
      </p>
    </motion.div>
  );
}

/** Galeria "Antes / Depois" na página do relatório; toque abre a foto em tela cheia. */
export function GaleriaFotos({ rodizio }: { rodizio: Rodizio }) {
  const { fotos } = useUnidade();
  const doRelatorio = fotos.get(rodizio.record.id);
  const aplicaveis = fotosAplicaveis(rodizio);
  const lista = aplicaveis.map((f) => doRelatorio?.get(f.numero)).filter((f): f is FotoRelatorio => !!f);
  const [aberta, setAberta] = useState<number | null>(null);

  return (
    <section className="mt-6 rounded-[28px] bg-white p-5 ring-1 ring-folha-100 sm:p-7 print:hidden" aria-labelledby="titulo-fotos">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titulo-fotos" className="font-display text-xl font-semibold text-grafite">
          Registro fotográfico
        </h2>
        <p className="text-sm tabular-nums text-slate-600">
          {lista.length} de {aplicaveis.length} fotos
        </p>
      </div>

      {lista.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">Nenhuma foto enviada ainda. Envie pelo passo “Fotos e conclusão”, em Editar.</p>
      ) : (
        (['anterior', 'posterior'] as const).map((bloco) => {
          const doBloco = aplicaveis.filter((f) => f.bloco === bloco);
          if (doBloco.length === 0) return null;
          return (
            <div key={bloco} className="mt-5">
              <h3 className="text-sm font-semibold text-grafite">
                {BLOCOS[bloco].titulo} <span className="font-normal text-slate-600">· {BLOCOS[bloco].texto}</span>
              </h3>
              <ul className="mt-2.5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                {doBloco.map((info) => {
                  const foto = doRelatorio?.get(info.numero);
                  return (
                    <li key={info.numero} className="min-w-0">
                      {foto ? (
                        <button
                          type="button"
                          onClick={() => setAberta(lista.indexOf(foto))}
                          className="group block w-full text-left cursor-pointer"
                        >
                          <span className="relative block aspect-[4/3] overflow-hidden rounded-2xl ring-1 ring-folha-100">
                            <Miniatura
                              foto={foto}
                              className="absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-[1.04]"
                            />
                            <span className="absolute left-2 top-2 rounded-full bg-acai-950/75 px-2 py-0.5 text-xs font-semibold tabular-nums text-white">
                              {doisDigitos(info.numero)}
                            </span>
                          </span>
                          <span className="mt-1.5 block text-xs font-medium leading-snug text-grafite">{info.titulo}</span>
                        </button>
                      ) : (
                        <div>
                          <span className="flex aspect-[4/3] items-center justify-center rounded-2xl border-2 border-dashed border-papel-linha text-xs text-slate-500">
                            Sem foto
                          </span>
                          <span className="mt-1.5 block text-xs leading-snug text-slate-500">
                            {doisDigitos(info.numero)} · {info.titulo}
                          </span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })
      )}

      <AnimatePresence>
        {aberta !== null && <Visualizador lista={lista} inicio={aberta} onFechar={() => setAberta(null)} />}
      </AnimatePresence>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Anexo fotográfico (só na impressão / PDF)
// ---------------------------------------------------------------------------

/** Página extra no fim do PDF com as fotos em boa resolução (2000 px), duas por linha. */
export function AnexoFotografico({ rodizio, codigo }: { rodizio: Rodizio; codigo: string }) {
  const { fotos } = useUnidade();
  const doRelatorio = fotos.get(rodizio.record.id);
  const lista = fotosAplicaveis(rodizio)
    .map((info) => ({ info, foto: doRelatorio?.get(info.numero) }))
    .filter((x): x is { info: Foto; foto: FotoRelatorio } => !!x.foto);
  if (lista.length === 0) return null;

  return (
    <section data-anexo-fotos className="hidden break-before-page bg-white text-[12.5px] leading-relaxed text-slate-800 print:block">
      <h2 className="font-display text-base font-semibold text-grafite">Anexo fotográfico — {codigo}</h2>
      <p className="text-slate-600">Originais em alta resolução na pasta do projeto no Google Drive.</p>
      <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-6">
        {lista.map(({ info, foto }) => (
          <figure key={info.numero} className="break-inside-avoid">
            {/* eslint-disable-next-line @next/next/no-img-element -- carregada antes de imprimir (aguardarFotosDoAnexo) */}
            <img src={urlFoto(foto, 'g')} alt={info.titulo} className="h-[8.6cm] w-full rounded bg-slate-50 object-contain" />
            <figcaption className="mt-1.5">
              <strong className="font-semibold">
                Foto {doisDigitos(info.numero)} — {info.titulo}
              </strong>
              <span className="block break-all font-mono text-[10.5px] text-slate-500">{foto.nome}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

/** Espera as fotos do anexo terminarem de carregar, para não saírem em branco no PDF. */
export async function aguardarFotosDoAnexo(): Promise<void> {
  const imagens = Array.from(document.querySelectorAll<HTMLImageElement>('[data-anexo-fotos] img'));
  await Promise.all(
    imagens.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((pronto) => {
            img.addEventListener('load', () => pronto(), { once: true });
            img.addEventListener('error', () => pronto(), { once: true });
          })
    )
  );
}
