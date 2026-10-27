/**
 * Relatório de Execução de Rodízio e Manutenção de Sensores (versão digital do formulário de campo).
 *
 * Cada rodízio (registro de instalação) tem no máximo um relatório. Os dados que já existem no
 * registro (data, ciclo, posição de destino, unidade) não são repetidos aqui; a posição de origem
 * é o rodízio anterior do mesmo ciclo. Este módulo não depende de React nem do banco: é usado
 * tanto no navegador (formulário e impressão) quanto no servidor (validação).
 */
import { RotationRecord } from './types';
import { Unidade } from './unidades';

export type Tratamento = 'T1' | 'T2';
export type StatusRelatorio = 'rascunho' | 'concluido';

export interface LadoPosicao {
  tratamento: Tratamento | null;
  latitude: string;
  longitude: string;
  raioM: number | null;
  especies: string;
}

export interface TelemetriaDatalogger {
  status: 'ok' | 'falha' | null;
  tensaoMv: number | null;
  sinalFraco: boolean;
  primeiroPacote: string;
}

export interface DadosRelatorio {
  responsavelTecnico: string;
  equipeApoio: string;
  horaDesconexao: string;
  horaRestabelecimento: string;
  origem: LadoPosicao;
  destino: LadoPosicao;
  desinstalacao: {
    inspecao: boolean;
    extracaoSolo: boolean;
    remocaoFylloclips: boolean;
    hasteDeslizante: boolean;
    limpeza: boolean;
  };
  estrutura: {
    fixacao: boolean;
    altura: boolean;
    alturaM: number | null;
    nivelamento: boolean;
    nivelamentoGraus: number | null;
    orientacaoNorte: boolean;
  };
  solo: {
    teros10: boolean;
    teros10Cm: number | null;
    teros21: boolean;
    teros21Cm: number | null;
    protecaoCabos: boolean;
  };
  planta: {
    fylloclips: boolean;
    radiometro: boolean;
    radiometroGraus: number | null;
    dendrometro: 'caule' | 'suspenso' | null;
    dendrometroDiametroCm: number | null;
  };
  telemetria: {
    zl6: TelemetriaDatalogger;
    umetos: TelemetriaDatalogger;
  };
  fotos: boolean[];
  ocorrencias: string;
}

export interface Relatorio {
  recordId: string;
  status: StatusRelatorio;
  /** Data da assinatura digital (gov.br), quando o PDF já foi assinado. */
  assinadoEm: string | null;
  dados: DadosRelatorio;
  atualizadoEm: string;
  atualizadoPor: string | null;
}

// ---------------------------------------------------------------------------
// Textos do formulário (iguais aos do relatório em papel)
// ---------------------------------------------------------------------------

export const CABECALHO_RELATORIO = {
  titulo: 'Relatório de execução de rodízio e manutenção de sensores',
  projeto: 'Projeto de Manejo Sustentável do Açaí no Marajó (Processo CNPq 445629/2024-0)',
  area: 'Área de TIC — IFPA Campus Belém / Muaná / Breves',
};

export const ITENS_DESINSTALACAO: { chave: keyof DadosRelatorio['desinstalacao']; titulo: string; texto: string }[] = [
  { chave: 'inspecao', titulo: 'Inspeção física pré-remoção', texto: 'Cabos, conduítes e carcaças íntegros, sem mordeduras de roedores ou insetos.' },
  { chave: 'extracaoSolo', titulo: 'Extração dos sensores de solo', texto: 'TEROS 10 e TEROS 21 retirados puxando pelo corpo rígido (nunca pelo cabo).' },
  { chave: 'remocaoFylloclips', titulo: 'Remoção dos FylloClips', texto: 'Desacoplamento cuidadoso das folhas sem rasgar o limbo foliar.' },
  { chave: 'hasteDeslizante', titulo: 'Estado da haste deslizante', texto: 'Mecanismo deslizante destravado e desacoplado da haste base com facilidade.' },
  { chave: 'limpeza', titulo: 'Limpeza de transição', texto: 'Sensores limpos apenas com água destilada/pano úmido antes do novo reenterro.' },
];

export const FOTOS_RELATORIO: { numero: number; bloco: 'anterior' | 'posterior'; titulo: string; texto: string; tipo: string }[] = [
  { numero: 1, bloco: 'anterior', titulo: 'Visão panorâmica da posição antiga', texto: 'Enquadramento amplo mostrando o mastro, as 3 touceiras e as condições gerais de vegetação ao redor.', tipo: 'PanoramicaAntiga' },
  { numero: 2, bloco: 'anterior', titulo: 'Estado dos sensores na planta', texto: 'Detalhe dos FylloClips fixados na folha e estado sanitário da planta antes da retirada.', tipo: 'SensoresPlanta' },
  { numero: 3, bloco: 'anterior', titulo: 'Solo no ponto antigo', texto: 'Registro do ponto onde TEROS 10 e 21 estavam enterrados.', tipo: 'SoloAntigo' },
  { numero: 4, bloco: 'posterior', titulo: 'Visão panorâmica da nova posição', texto: 'Enquadramento amplo mostrando o mastro central instalado no triângulo de plantas.', tipo: 'PanoramicaNova' },
  { numero: 5, bloco: 'posterior', titulo: 'Alinhamento e nível', texto: 'Foto de cima para baixo mostrando o nível de bolha do ATMOS 41 e a bússola marcando o Norte.', tipo: 'AlinhamentoNivel' },
  { numero: 6, bloco: 'posterior', titulo: 'Instalação subterrânea', texto: 'Trincheira aberta exibindo a inserção dos sensores TEROS 10 e 21 antes de tampar o solo.', tipo: 'InstalacaoSubterranea' },
  { numero: 7, bloco: 'posterior', titulo: 'Acoplamento dos FylloClips', texto: 'Detalhe macro do clipe na nova folha selecionada e posicionamento da proteção 3D.', tipo: 'Fylloclips' },
  { numero: 8, bloco: 'posterior', titulo: 'Fechamento da caixa e dataloggers', texto: 'Detalhe das conexões, painel solar e estado dos cabos no mastro deslizante.', tipo: 'CaixaDataloggers' },
];

export const DATALOGGERS = {
  zl6: { nome: 'Datalogger ZL6', nuvem: 'Zentra Cloud', sinal: '4G' },
  umetos: { nome: 'Datalogger μMETOS', nuvem: 'FieldClimate', sinal: 'NB-IoT' },
} as const;

// ---------------------------------------------------------------------------
// Valores iniciais
// ---------------------------------------------------------------------------

const ladoVazio = (): LadoPosicao => ({ tratamento: null, latitude: '', longitude: '', raioM: null, especies: '' });
const telemetriaVazia = (): TelemetriaDatalogger => ({ status: null, tensaoMv: null, sinalFraco: false, primeiroPacote: '' });

/** Formulário em branco: nenhuma medição é preenchida por padrão. */
export function relatorioVazio(): DadosRelatorio {
  return {
    responsavelTecnico: '',
    equipeApoio: '',
    horaDesconexao: '',
    horaRestabelecimento: '',
    origem: ladoVazio(),
    destino: ladoVazio(),
    desinstalacao: { inspecao: false, extracaoSolo: false, remocaoFylloclips: false, hasteDeslizante: false, limpeza: false },
    estrutura: { fixacao: false, altura: false, alturaM: null, nivelamento: false, nivelamentoGraus: null, orientacaoNorte: false },
    solo: { teros10: false, teros10Cm: null, teros21: false, teros21Cm: null, protecaoCabos: false },
    planta: { fylloclips: false, radiometro: false, radiometroGraus: null, dendrometro: null, dendrometroDiametroCm: null },
    telemetria: { zl6: telemetriaVazia(), umetos: telemetriaVazia() },
    fotos: FOTOS_RELATORIO.map(() => false),
    ocorrencias: '',
  };
}

// ---------------------------------------------------------------------------
// Ordem dos rodízios (R1, R2...) e posição de origem
// ---------------------------------------------------------------------------

export interface Rodizio {
  record: RotationRecord;
  /** Número do rodízio dentro do ciclo, começando em 1. */
  numero: number;
  /** Registro da posição de onde o conjunto saiu; null na primeira instalação do ciclo. */
  origem: RotationRecord | null;
}

/** Rodízios de um ciclo em ordem de instalação, cada um com a posição de origem. */
export function rodiziosDoCiclo(records: RotationRecord[], ciclo: number): Rodizio[] {
  const doCiclo = records
    .filter((r) => r.cycleNumber === ciclo)
    .sort((a, b) => a.installedAt.localeCompare(b.installedAt) || a.createdAt.localeCompare(b.createdAt));
  return doCiclo.map((record, i) => ({ record, numero: i + 1, origem: i > 0 ? doCiclo[i - 1] : null }));
}

export function rodizioDoRegistro(records: RotationRecord[], recordId: string): Rodizio | null {
  const record = records.find((r) => r.id === recordId);
  if (!record) return null;
  return rodiziosDoCiclo(records, record.cycleNumber).find((r) => r.record.id === recordId) ?? null;
}

/** Código usado nos arquivos do projeto, ex.: BrevesC1R2. */
export function codigoRelatorio(unidade: Unidade, ciclo: number, numero: number): string {
  const nome = unidade.nome.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return `${nome}C${ciclo}R${numero}`;
}

export const doisDigitos = (n: number) => String(n).padStart(2, '0');

/** Nome sugerido para cada foto, no padrão DATA_LOCAL_POSICAO_TIPO.jpg. */
export function nomeFoto(unidade: Unidade, data: string, posicao: number, tipo: string): string {
  const nome = unidade.nome.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return `${data.replace(/-/g, '')}_${nome}_${doisDigitos(posicao)}_${tipo}.jpg`;
}

// ---------------------------------------------------------------------------
// Pendências para concluir o relatório
// ---------------------------------------------------------------------------

export function pendenciasRelatorio(d: DadosRelatorio, primeiraInstalacao: boolean): string[] {
  const faltando: string[] = [];
  if (!d.responsavelTecnico.trim()) faltando.push('Responsável técnico local');
  if (!primeiraInstalacao && !d.horaDesconexao) faltando.push('Horário de desconexão da célula anterior');
  if (!d.horaRestabelecimento) faltando.push('Horário de restabelecimento na nova célula');
  if (!primeiraInstalacao && !d.origem.tratamento) faltando.push('Tratamento da posição de origem');
  if (!d.destino.tratamento) faltando.push('Tratamento da posição de destino');
  if (!d.destino.latitude || !d.destino.longitude) faltando.push('Coordenadas GPS do mastro na nova posição');
  if (!d.telemetria.zl6.status) faltando.push('Status do datalogger ZL6');
  if (!d.telemetria.umetos.status) faltando.push('Status do datalogger μMETOS');
  return faltando;
}

// ---------------------------------------------------------------------------
// Validação (servidor): aceita só os campos conhecidos, com tipos e limites
// ---------------------------------------------------------------------------

export class RelatorioInvalido extends Error {}

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const COORDENADA = /^-?\d{1,3}(\.\d{1,8})?$/;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function texto(v: unknown, campo: string, max: number): string {
  if (v === undefined || v === null) return '';
  if (typeof v !== 'string') throw new RelatorioInvalido(`Campo "${campo}" inválido.`);
  if (v.length > max) throw new RelatorioInvalido(`Campo "${campo}" excede ${max} caracteres.`);
  return v.trim();
}

function hora(v: unknown, campo: string): string {
  const s = texto(v, campo, 5);
  if (s && !HORA.test(s)) throw new RelatorioInvalido(`Campo "${campo}" deve estar no formato HH:MM.`);
  return s;
}

function coordenada(v: unknown, campo: string): string {
  const s = texto(v, campo, 14).replace(',', '.');
  if (s && !COORDENADA.test(s)) throw new RelatorioInvalido(`Campo "${campo}" deve ser uma coordenada decimal, ex.: -1.68960.`);
  return s;
}

function numero(v: unknown, campo: string, min: number, max: number): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : v;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max) {
    throw new RelatorioInvalido(`Campo "${campo}" deve ser um número entre ${min} e ${max}.`);
  }
  return n;
}

const bool = (v: unknown) => v === true;

function lado(v: unknown, campo: string): LadoPosicao {
  const o = obj(v);
  return {
    tratamento: o.tratamento === 'T1' || o.tratamento === 'T2' ? o.tratamento : null,
    latitude: coordenada(o.latitude, `${campo}: latitude`),
    longitude: coordenada(o.longitude, `${campo}: longitude`),
    raioM: numero(o.raioM, `${campo}: raio`, 0, 50),
    especies: texto(o.especies, `${campo}: espécies vizinhas`, 300),
  };
}

function telemetria(v: unknown, campo: string): TelemetriaDatalogger {
  const o = obj(v);
  return {
    status: o.status === 'ok' || o.status === 'falha' ? o.status : null,
    tensaoMv: numero(o.tensaoMv, `${campo}: tensão`, 0, 30000),
    sinalFraco: bool(o.sinalFraco),
    primeiroPacote: hora(o.primeiroPacote, `${campo}: primeiro pacote`),
  };
}

export function normalizarDados(v: unknown): DadosRelatorio {
  const o = obj(v);
  const des = obj(o.desinstalacao);
  const est = obj(o.estrutura);
  const solo = obj(o.solo);
  const pla = obj(o.planta);
  const tel = obj(o.telemetria);
  const fotos = Array.isArray(o.fotos) ? o.fotos : [];

  return {
    responsavelTecnico: texto(o.responsavelTecnico, 'Responsável técnico', 255),
    equipeApoio: texto(o.equipeApoio, 'Equipe de apoio', 500),
    horaDesconexao: hora(o.horaDesconexao, 'Horário de desconexão'),
    horaRestabelecimento: hora(o.horaRestabelecimento, 'Horário de restabelecimento'),
    origem: lado(o.origem, 'Origem'),
    destino: lado(o.destino, 'Destino'),
    desinstalacao: {
      inspecao: bool(des.inspecao),
      extracaoSolo: bool(des.extracaoSolo),
      remocaoFylloclips: bool(des.remocaoFylloclips),
      hasteDeslizante: bool(des.hasteDeslizante),
      limpeza: bool(des.limpeza),
    },
    estrutura: {
      fixacao: bool(est.fixacao),
      altura: bool(est.altura),
      alturaM: numero(est.alturaM, 'Altura do ATMOS 41', 0, 10),
      nivelamento: bool(est.nivelamento),
      nivelamentoGraus: numero(est.nivelamentoGraus, 'Ângulo de inclinação', 0, 90),
      orientacaoNorte: bool(est.orientacaoNorte),
    },
    solo: {
      teros10: bool(solo.teros10),
      teros10Cm: numero(solo.teros10Cm, 'Profundidade do TEROS 10', 0, 200),
      teros21: bool(solo.teros21),
      teros21Cm: numero(solo.teros21Cm, 'Profundidade do TEROS 21', 0, 200),
      protecaoCabos: bool(solo.protecaoCabos),
    },
    planta: {
      fylloclips: bool(pla.fylloclips),
      radiometro: bool(pla.radiometro),
      radiometroGraus: numero(pla.radiometroGraus, 'Inclinação do radiômetro', 0, 360),
      dendrometro: pla.dendrometro === 'caule' || pla.dendrometro === 'suspenso' ? pla.dendrometro : null,
      dendrometroDiametroCm: numero(pla.dendrometroDiametroCm, 'Diâmetro do caule', 0, 200),
    },
    telemetria: {
      zl6: telemetria(tel.zl6, 'ZL6'),
      umetos: telemetria(tel.umetos, 'μMETOS'),
    },
    fotos: FOTOS_RELATORIO.map((_, i) => bool(fotos[i])),
    ocorrencias: texto(o.ocorrencias, 'Ocorrências de campo', 5000),
  };
}

export function normalizarAssinatura(v: unknown): string | null {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string' || !DATA.test(v)) throw new RelatorioInvalido('Data de assinatura deve ser AAAA-MM-DD.');
  return v;
}

/** Situação mostrada nas listas. */
export function situacaoRelatorio(relatorio: Relatorio | undefined): 'pendente' | 'rascunho' | 'concluido' | 'assinado' {
  if (!relatorio) return 'pendente';
  if (relatorio.assinadoEm) return 'assinado';
  return relatorio.status;
}
