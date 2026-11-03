import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CornerDownLeft,
  Eraser,
  Globe,
  HelpCircle,
  Layers,
  Lock,
  RefreshCw,
  Terminal as TerminalIcon,
  Zap,
} from 'lucide-react';
import {
  CapturedPacket,
  HostNode,
  PacketTrace,
  RouterConfig,
  TerminalEntry,
} from '../types/network';
import { simulateHttpBrowserRequest } from '../utils/networkEngine';

interface VirtualTerminalProps {
  activeHost: HostNode;
  allHosts: HostNode[];
  router: RouterConfig;
  history: TerminalEntry[];
  capturedPackets: CapturedPacket[];
  onRunCommand: (command: string) => void;
  onClearHistory: () => void;
  onClearPackets: () => void;
  onSelectHost: (hostId: string) => void;
  onBrowserTrace: (trace: PacketTrace) => void;
}

export const VirtualTerminal: React.FC<VirtualTerminalProps> = ({
  activeHost,
  allHosts,
  router,
  history,
  capturedPackets,
  onRunCommand,
  onClearHistory,
  onClearPackets,
  onSelectHost,
  onBrowserTrace,
}) => {
  const [workstationTab, setWorkstationTab] = useState<
    'cli' | 'sniffer' | 'browser'
  >('cli');
  const [inputVal, setInputVal] = useState('');
  const [cmdHistoryIndex, setCmdHistoryIndex] = useState<number>(-1);
  const [selectedPacketId, setSelectedPacketId] = useState<string | null>(null);

  // Browser simulation state
  const [browserUrl, setBrowserUrl] = useState<string>(
    'https://www.unfantasmaenelsistema.com'
  );
  const [browserResult, setBrowserResult] = useState<ReturnType<
    typeof simulateHttpBrowserRequest
  > | null>(null);

  const outputEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (workstationTab === 'cli') {
      outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history, workstationTab]);

  // Reset browser result when switching host
  useEffect(() => {
    setBrowserResult(null);
  }, [activeHost.id, activeHost.ip, activeHost.mask, activeHost.gateway, activeHost.dns]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputVal.trim();
    if (!trimmed) return;
    if (trimmed.toLowerCase() === 'cls' || trimmed.toLowerCase() === 'clear') {
      onClearHistory();
      setInputVal('');
      setCmdHistoryIndex(-1);
      return;
    }
    onRunCommand(trimmed);
    setInputVal('');
    setCmdHistoryIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const pastCommands = history.map((h) => h.command);
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (pastCommands.length === 0) return;
      const nextIndex =
        cmdHistoryIndex === -1
          ? pastCommands.length - 1
          : Math.max(0, cmdHistoryIndex - 1);
      setCmdHistoryIndex(nextIndex);
      setInputVal(pastCommands[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (cmdHistoryIndex === -1) return;
      if (cmdHistoryIndex >= pastCommands.length - 1) {
        setCmdHistoryIndex(-1);
        setInputVal('');
      } else {
        const nextIndex = cmdHistoryIndex + 1;
        setCmdHistoryIndex(nextIndex);
        setInputVal(pastCommands[nextIndex]);
      }
    }
  };

  const handleBrowserGo = (targetUrl?: string) => {
    const urlToLoad = targetUrl ?? browserUrl;
    if (targetUrl) setBrowserUrl(targetUrl);
    const res = simulateHttpBrowserRequest(
      urlToLoad,
      activeHost,
      allHosts,
      router
    );
    setBrowserResult(res);
    onBrowserTrace(res.trace);
  };

  const peerHost =
    allHosts.find((h) => h.id !== activeHost.id && h.id === 'PC-04') ||
    allHosts.find((h) => h.id !== activeHost.id) ||
    activeHost;

  const quickCommands = [
    { label: 'ipconfig /all', cmd: 'ipconfig /all' },
    { label: `ping ${router.lanIp} (GW)`, cmd: `ping ${router.lanIp}` },
    {
      label: `ping ${peerHost.ip} (${peerHost.name})`,
      cmd: `ping ${peerHost.ip}`,
    },
    { label: 'ping 8.8.8.8', cmd: 'ping 8.8.8.8' },
    {
      label: 'nslookup unfantasmaenelsistema.com',
      cmd: 'nslookup www.unfantasmaenelsistema.com',
    },
    { label: 'tracert 8.8.8.8', cmd: 'tracert 8.8.8.8' },
    { label: 'arp -a', cmd: 'arp -a' },
    { label: 'route print', cmd: 'route print' },
  ];

  const selectedPacket =
    capturedPackets.find((p) => p.id === selectedPacketId) ||
    capturedPackets[capturedPackets.length - 1] ||
    null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden h-full">
      {/* Workstation Top Bar: Host Selector + Tool Switcher (CLI / Sniffer / Browser) */}
      <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Host Switcher Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            {allHosts.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => onSelectHost(h.id)}
                className={`px-2.5 py-1 text-xs font-mono rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  h.id === activeHost.id
                    ? 'bg-sky-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {h.name}
              </button>
            ))}
          </div>

          {/* Workstation Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setWorkstationTab('cli')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                workstationTab === 'cli'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TerminalIcon className="w-3.5 h-3.5 text-sky-400" />
              <span>Consola CLI</span>
            </button>

            <button
              type="button"
              onClick={() => setWorkstationTab('sniffer')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                workstationTab === 'sniffer'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tramas PDU ({capturedPackets.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setWorkstationTab('browser')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                workstationTab === 'browser'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span>Navegador Web</span>
            </button>
          </div>
        </div>

        {/* Context Action Buttons */}
        <div className="flex items-center gap-2">
          {workstationTab === 'cli' && (
            <>
              <button
                type="button"
                onClick={() => onRunCommand('help')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
                <span>Ayuda</span>
              </button>
              <button
                type="button"
                onClick={onClearHistory}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                <Eraser className="w-3.5 h-3.5 text-slate-400" />
                <span>Limpiar</span>
              </button>
            </>
          )}
          {workstationTab === 'sniffer' && capturedPackets.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onClearPackets();
                setSelectedPacketId(null);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <Eraser className="w-3.5 h-3.5 text-slate-400" />
              <span>Vaciar Captura</span>
            </button>
          )}
        </div>
      </div>

      {/* MODE 1: INTERACTIVE CLI TERMINAL */}
      {workstationTab === 'cli' && (
        <>
          <div className="px-4 py-2 bg-slate-900/80 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[11px] text-slate-400 flex items-center gap-1 mr-1 shrink-0">
              <Zap className="w-3 h-3 text-amber-400" />
              Comandos rápidos:
            </span>
            {quickCommands.map((qc) => (
              <button
                key={qc.cmd}
                type="button"
                onClick={() => {
                  onRunCommand(qc.cmd);
                  inputRef.current?.focus();
                }}
                className="px-2.5 py-1 text-xs font-mono bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-sky-300 border border-slate-800 hover:border-slate-700 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {qc.label}
              </button>
            ))}
          </div>

          <div
            onClick={() => inputRef.current?.focus()}
            className="p-4 font-mono text-xs leading-relaxed bg-slate-950/95 flex-1 min-h-[300px] max-h-[390px] overflow-y-auto space-y-3 cursor-text"
          >
            <div className="text-slate-400 border-b border-slate-900 pb-2">
              NetGhost Network OS [Versión 10.0.22631] — Terminal conectada a{' '}
              <span className="text-sky-400 font-semibold">
                {activeHost.name}
              </span>{' '}
              ({activeHost.userLabel}). Escribe{' '}
              <span className="text-slate-200">help</span> o usa los botones
              superiores para auditar la red.
            </div>

            {history.map((entry) => (
              <div key={entry.id} className="space-y-1">
                <div className="flex items-center gap-2 text-slate-200">
                  <span className="text-sky-400 font-semibold select-none">
                    C:\Users\Admin@{activeHost.name}&gt;
                  </span>
                  <span className="font-semibold text-white">
                    {entry.command}
                  </span>
                  <span className="text-[10px] text-slate-600 ml-auto select-none">
                    {entry.timestamp}
                  </span>
                </div>
                <div
                  className={`pl-3 whitespace-pre-wrap break-words ${
                    entry.status === 'error'
                      ? 'text-rose-300'
                      : entry.status === 'warn'
                      ? 'text-amber-300'
                      : entry.status === 'ok'
                      ? 'text-emerald-300'
                      : 'text-slate-300'
                  }`}
                >
                  {entry.output.map((line, i) => (
                    <div key={i}>{line || '\u00A0'}</div>
                  ))}
                </div>
              </div>
            ))}
            <div ref={outputEndRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center gap-2 font-mono text-xs"
          >
            <label
              htmlFor="cli-command-input"
              className="text-sky-400 font-semibold whitespace-nowrap shrink-0 select-none"
            >
              C:\Users\Admin@{activeHost.name}&gt;
            </label>
            <input
              id="cli-command-input"
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe ipconfig /all, ping, tracert, nslookup, curl, arp -a..."
              autoComplete="off"
              spellCheck={false}
              className="w-full bg-transparent text-slate-100 placeholder-slate-600 focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-sans font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Ejecutar</span>
              <CornerDownLeft className="w-3.5 h-3.5" />
            </button>
          </form>
        </>
      )}

      {/* MODE 2: WIRESHARK-STYLE PACKET SNIFFER (PDU INSPECTOR) */}
      {workstationTab === 'sniffer' && (
        <div className="flex-1 flex flex-col bg-slate-950 min-h-[360px] max-h-[450px] overflow-hidden">
          {capturedPackets.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <Activity className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-sm font-medium text-slate-300 mb-1">
                No hay tramas capturadas todavía en la interfaz Ethernet0
              </p>
              <p className="text-xs text-slate-400 max-w-md mb-4">
                Ejecuta un comando de tráfico en la consola (como{' '}
                <code className="font-mono text-sky-300">ping</code>,{' '}
                <code className="font-mono text-sky-300">nslookup</code> o{' '}
                <code className="font-mono text-sky-300">tracert</code>) para
                inspeccionar aquí las cabeceras Ethernet II (Capa 2), IPv4 (Capa
                3) e ICMP/DNS.
              </p>
              <button
                type="button"
                onClick={() => {
                  onRunCommand('ping 8.8.8.8');
                }}
                className="px-3.5 py-1.5 text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-lg transition-colors"
              >
                Generar Tráfico de Prueba (ping 8.8.8.8)
              </button>
            </div>
          ) : (
            <>
              {/* Packet Table */}
              <div className="overflow-y-auto flex-1 border-b border-slate-800">
                <table className="w-full text-left text-xs font-mono tabular-nums border-collapse">
                  <thead className="bg-slate-900 text-slate-400 sticky top-0">
                    <tr>
                      <th className="py-2 px-3 font-medium">No.</th>
                      <th className="py-2 px-3 font-medium">Origen IP</th>
                      <th className="py-2 px-3 font-medium">Destino IP</th>
                      <th className="py-2 px-3 font-medium">Proto</th>
                      <th className="py-2 px-3 font-medium">Info de Trama</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {capturedPackets.map((pkt, idx) => {
                      const isSel = selectedPacket?.id === pkt.id;
                      return (
                        <tr
                          key={pkt.id}
                          onClick={() => setSelectedPacketId(pkt.id)}
                          className={`cursor-pointer transition-colors ${
                            isSel
                              ? 'bg-sky-500/20 text-white'
                              : pkt.status === 'error'
                              ? 'bg-rose-950/30 text-rose-200 hover:bg-rose-950/50'
                              : pkt.status === 'warn'
                              ? 'bg-amber-950/25 text-amber-200 hover:bg-amber-950/40'
                              : 'text-slate-300 hover:bg-slate-900/70'
                          }`}
                        >
                          <td className="py-1.5 px-3 text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-1.5 px-3">{pkt.srcIp}</td>
                          <td className="py-1.5 px-3">{pkt.dstIp}</td>
                          <td className="py-1.5 px-3 font-semibold text-sky-400">
                            {pkt.protocol}
                          </td>
                          <td className="py-1.5 px-3 font-sans truncate max-w-[260px]">
                            {pkt.info}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Selected Packet OSI Layer Inspector */}
              {selectedPacket && (
                <div className="p-3.5 bg-slate-900/90 space-y-1.5 text-xs font-mono">
                  <div className="text-[11px] font-sans font-semibold text-sky-400 flex items-center gap-1.5 mb-1">
                    <Layers className="w-3.5 h-3.5" />
                    Decodificación de Capas OSI (Trama seleccionada)
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-400">[Capa 2 Ethernet]</span>{' '}
                    {selectedPacket.layer2Detail}
                  </div>
                  <div className="text-slate-200">
                    <span className="text-slate-400">[Capa 3 Red IPv4]</span>{' '}
                    {selectedPacket.layer3Detail}
                  </div>
                  <div className="text-emerald-300">
                    <span className="text-slate-400">[Capa 4/7 Datos] </span>{' '}
                    {selectedPacket.layer4Detail}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* MODE 3: BUILT-IN WEB BROWSER FOR DNS VS IP TESTING */}
      {workstationTab === 'browser' && (
        <div className="flex-1 flex flex-col bg-slate-950 min-h-[360px] p-4 gap-3">
          {/* Address Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleBrowserGo();
            }}
            className="flex items-center gap-2"
          >
            <div className="flex-1 flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono">
              <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <input
                type="text"
                value={browserUrl}
                onChange={(e) => setBrowserUrl(e.target.value)}
                className="w-full bg-transparent text-slate-100 focus:outline-none"
                placeholder="https://www.unfantasmaenelsistema.com o http://185.199.108.153"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Ir / Probar</span>
            </button>
          </form>

          {/* Bookmarks Bar for Pedagogical Comparison */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 text-[11px] mr-1">
              Marcadores de prueba:
            </span>
            <button
              type="button"
              onClick={() =>
                handleBrowserGo('https://www.unfantasmaenelsistema.com')
              }
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-mono text-[11px] cursor-pointer"
            >
              Web por Dominio (Requiere DNS)
            </button>
            <button
              type="button"
              onClick={() => handleBrowserGo('http://185.199.108.153')}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sky-300 font-mono text-[11px] cursor-pointer"
            >
              Web por IP Directa 185.199.108.153 (Sin DNS)
            </button>
            <button
              type="button"
              onClick={() => handleBrowserGo(`http://${router.lanIp}`)}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-emerald-300 font-mono text-[11px] cursor-pointer"
            >
              Admin Router ({router.lanIp})
            </button>
          </div>

          {/* Browser Viewport */}
          <div className="flex-1 rounded-lg bg-slate-900/70 border border-slate-800 p-5 flex flex-col justify-center">
            {!browserResult ? (
              <div className="text-center space-y-2">
                <Globe className="w-8 h-8 text-slate-500 mx-auto" />
                <div className="text-sm font-medium text-slate-200">
                  Navegador de Diagnóstico en {activeHost.name}
                </div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Pulsa <strong>«Ir / Probar»</strong> o elige uno de los
                  marcadores superiores para comprobar si {activeHost.name}{' '}
                  resuelve dominios DNS y alcanza servidores web por IP.
                </p>
              </div>
            ) : browserResult.ok ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    HTTP/1.1 200 OK · Conectado a {browserResult.resolvedIp}
                  </span>
                </div>
                <h4 className="text-base font-bold text-white">
                  {browserResult.title}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {browserResult.subtitle}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{browserResult.errorCode}</span>
                </div>
                <h4 className="text-base font-bold text-slate-100">
                  {browserResult.title}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {browserResult.subtitle}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
