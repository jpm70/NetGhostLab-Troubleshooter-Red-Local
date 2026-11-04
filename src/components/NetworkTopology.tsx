import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  HardDrive,
  Laptop,
  Monitor,
  Network,
  Printer,
  Router as RouterIcon,
  ShieldAlert,
  Terminal,
  XCircle,
} from 'lucide-react';
import {
  HostHealthReport,
  HostNode,
  PacketTrace,
  RouterConfig,
} from '../types/network';
import { getNetworkAddress, maskToCidr } from '../utils/networkEngine';

interface NetworkTopologyProps {
  router: RouterConfig;
  hosts: HostNode[];
  selectedHostId: string;
  onSelectHost: (hostId: string) => void;
  healthMap: Record<string, HostHealthReport>;
  blindMode: boolean;
  onToggleBlindMode: () => void;
  revealedHostIds: Set<string>;
  lastTrace: PacketTrace | null;
  onQuickPingFromActive: (targetIp: string) => void;
}

export const NetworkTopology: React.FC<NetworkTopologyProps> = ({
  router,
  hosts,
  selectedHostId,
  onSelectHost,
  healthMap,
  blindMode,
  onToggleBlindMode,
  revealedHostIds,
  lastTrace,
  onQuickPingFromActive,
}) => {
  const routerCidr = maskToCidr(router.lanMask);
  const canonicalNetwork = getNetworkAddress(router.lanIp, router.lanMask);

  const renderDeviceIcon = (role: HostNode['role'], isSelected: boolean) => {
    const cls = `w-5 h-5 ${
      isSelected ? 'text-sky-400' : 'text-slate-300'
    } transition-colors`;
    switch (role) {
      case 'laptop':
        return <Laptop className={cls} />;
      case 'server':
        return <HardDrive className={cls} />;
      case 'printer':
        return <Printer className={cls} />;
      default:
        return <Monitor className={cls} />;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-5">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Topología Lógica Ethernet</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-slate-300">
              Segmento LAN {canonicalNetwork}/{routerCidr}
            </span>
          </div>
          <h2 className="text-lg font-semibold text-slate-100">
            Mapa de Red y Estado de Nodos
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleBlindMode}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
              blindMode
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
                : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
            }`}
            title="En Modo Examen las IPs se ocultan hasta que ejecutes ipconfig en el equipo"
          >
            {blindMode ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                <span>Modo Examen: IPs Ocultas</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-sky-400" />
                <span>Vista Docente: IPs Visibles</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Upper Infrastructure Tier: Internet / DNS <-> Router Gateway <-> L2 Switch */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        {/* Router / Default Gateway Card */}
        <div
          className={`p-4 rounded-lg border transition-colors flex flex-col justify-between ${
            lastTrace?.failedAtNodeId === router.id
              ? 'bg-rose-950/25 border-rose-500/50'
              : lastTrace?.pathNodeIds.includes(router.id)
              ? 'bg-sky-950/20 border-sky-500/40'
              : 'bg-slate-950/60 border-slate-800'
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <RouterIcon className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-100">
                  {router.name}
                </div>
                <div className="text-xs text-slate-400">
                  Puerta de Enlace (Gateway)
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onQuickPingFromActive(router.lanIp)}
              className="px-2.5 py-1 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-sky-300 rounded border border-slate-700 transition-colors whitespace-nowrap shrink-0"
              title="Hacer ping al Router desde el equipo seleccionado"
            >
              ping {router.lanIp}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-xs border-t border-slate-800/80 pt-2.5 font-mono tabular-nums">
            <div className="text-slate-400">IP Interfaz LAN:</div>
            <div className="text-slate-100 font-medium text-right">
              {router.lanIp}
            </div>
            <div className="text-slate-400">Máscara LAN:</div>
            <div className="text-slate-200 text-right">
              {router.lanMask} (/{routerCidr})
            </div>
            <div className="text-slate-400">IP Pública WAN:</div>
            <div className="text-slate-300 text-right">{router.wanIp}</div>
            <div className="text-slate-400">MAC Router:</div>
            <div className="text-slate-400 text-right">{router.mac}</div>
          </div>
        </div>

        {/* Central L2 Ethernet Switch */}
        <div
          className={`p-4 rounded-lg border flex flex-col justify-between ${
            lastTrace?.failedAtNodeId === 'SWITCH'
              ? 'bg-rose-950/25 border-rose-500/50'
              : lastTrace?.pathNodeIds.includes('SWITCH')
              ? 'bg-sky-950/20 border-sky-500/40'
              : 'bg-slate-950/60 border-slate-800'
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <Network className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-100">
                  Switch-Core L2
                </div>
                <div className="text-xs text-slate-400">
                  Conmutador Ethernet 8 Puertos
                </div>
              </div>
            </div>
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 whitespace-nowrap shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Capa 2 Activa
            </span>
          </div>

          {/* Visual Switch Ports */}
          <div className="my-2 py-2 px-3 rounded bg-slate-900/90 border border-slate-800/90 flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {hosts.map((h, idx) => {
                const isSelected = h.id === selectedHostId;
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => onSelectHost(h.id)}
                    className={`px-2 py-1 rounded text-[11px] font-mono tabular-nums border transition-colors ${
                      isSelected
                        ? 'bg-sky-500/20 border-sky-400 text-sky-200 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                    title={`Puerto Gi0/${idx + 1}: Conectado a ${h.name}`}
                  >
                    P{idx + 1}:{h.name}
                  </button>
                );
              })}
            </div>
            <span className="text-[11px] font-mono text-sky-400 px-1.5 py-0.5 bg-sky-950/50 border border-sky-800/50 rounded">
              Uplink:GW
            </span>
          </div>

          <div className="text-xs text-slate-400 flex items-center justify-between pt-1">
            <span>Reenvío por tabla MAC (ARP)</span>
            <span className="font-mono text-slate-300">VLAN 1 (Nativa)</span>
          </div>
        </div>

        {/* External WAN & Public DNS Servers */}
        <div
          className={`p-4 rounded-lg border flex flex-col justify-between ${
            lastTrace?.failedAtNodeId === 'INTERNET' ||
            lastTrace?.status === 'dns_error'
              ? 'bg-amber-950/20 border-amber-500/40'
              : lastTrace?.pathNodeIds.includes('INTERNET')
              ? 'bg-emerald-950/20 border-emerald-500/40'
              : 'bg-slate-950/60 border-slate-800'
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <Globe className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-100">
                  Internet WAN y DNS
                </div>
                <div className="text-xs text-slate-400">
                  Servicios Externos de Prueba
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onQuickPingFromActive('8.8.8.8')}
              className="px-2.5 py-1 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded border border-slate-700 transition-colors whitespace-nowrap shrink-0"
              title="Probar ping a 8.8.8.8 desde el equipo activo"
            >
              ping 8.8.8.8
            </button>
          </div>

          <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-xs border-t border-slate-800/80 pt-2.5 font-mono tabular-nums">
            <div className="text-slate-400">DNS Públicos OK:</div>
            <div className="text-emerald-300 text-right">8.8.8.8 · 1.1.1.1</div>
            <div className="text-slate-400">DNS Secundarios:</div>
            <div className="text-slate-300 text-right">8.8.4.4 · 9.9.9.9</div>
            <div className="text-slate-400">Web Test:</div>
            <div className="text-sky-300 text-right truncate">
              unfantasmaenelsistema.com
            </div>
            <div className="text-slate-400">IP Web Destino:</div>
            <div className="text-slate-300 text-right">185.199.108.153</div>
          </div>
        </div>
      </div>

      {/* Live Packet Trace Banner (when a command was recently executed) */}
      {lastTrace && (
        <div
          className={`px-4 py-2.5 rounded-lg border text-xs flex flex-wrap items-center justify-between gap-3 ${
            lastTrace.status === 'success'
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
              : lastTrace.status === 'conflict'
              ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
              : 'bg-amber-950/35 border-amber-500/40 text-amber-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {lastTrace.status === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span className="font-semibold">
              Traza {lastTrace.protocol} ({lastTrace.sourceId} →{' '}
              {lastTrace.targetInput}):
            </span>
            <span>{lastTrace.summary}</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            {lastTrace.pathNodeIds.map((node, index) => (
              <React.Fragment key={`${node}-${index}`}>
                {index > 0 && <span className="text-slate-500">→</span>}
                <span
                  className={`px-1.5 py-0.5 rounded ${
                    lastTrace.failedAtNodeId === node
                      ? 'bg-rose-500/30 text-rose-200 border border-rose-500/50'
                      : 'bg-slate-900/90 text-slate-200 border border-slate-700'
                  }`}
                >
                  {node}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Lower Tier: 4 LAN Equipment Nodes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-400">
            Equipos de la Red Local (Haz clic en un equipo para abrir su consola
            y auditar su configuración)
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Equipo activo en terminal:{' '}
            <strong className="text-sky-400 font-mono">{selectedHostId}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {hosts.map((host) => {
            const isSelected = host.id === selectedHostId;
            const health = healthMap[host.id];
            const isRevealed = !blindMode || revealedHostIds.has(host.id);
            const allHealthy =
              health.canReachLanPeers &&
              health.canReachGateway &&
              health.canReachInternetIp &&
              health.canResolveDns;

            return (
              <div
                key={host.id}
                onClick={() => onSelectHost(host.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectHost(host.id);
                  }
                }}
                className={`group rounded-xl p-4 border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-900 border-sky-500 ring-1 ring-sky-500/40'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div>
                  {/* Card Top Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-2 rounded-lg border transition-colors ${
                          isSelected
                            ? 'bg-sky-500/15 border-sky-500/40'
                            : 'bg-slate-900 border-slate-800'
                        }`}
                      >
                        {renderDeviceIcon(host.role, isSelected)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-100 font-mono">
                            {host.name}
                          </span>
                          {isSelected && (
                            <span className="text-[11px] font-medium text-sky-400 flex items-center gap-1">
                              <Terminal className="w-3 h-3" />
                              Activo
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 truncate max-w-[140px]">
                          {host.userLabel}
                        </div>
                      </div>
                    </div>

                    {/* Overall Status Indicator (Icon + Explicit Label, No Hue-Only) */}
                    {allHealthy ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Operativo</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 shrink-0">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Incidencia</span>
                      </span>
                    )}
                  </div>

                  {/* TCP/IP Parameters Table */}
                  {isRevealed ? (
                    <div className="space-y-1.5 text-xs font-mono tabular-nums border-t border-slate-800/90 pt-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400">IPv4:</span>
                        <span className="text-slate-100 font-medium">
                          {host.ip}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Máscara:</span>
                        <span className="text-slate-200">{host.mask}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Gateway:</span>
                        <span className="text-slate-200">{host.gateway}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">DNS:</span>
                        <span className="text-slate-200">{host.dns}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-slate-800/90 pt-3 pb-2 text-center">
                      <p className="text-xs text-amber-300/90 font-medium mb-1">
                        Configuración oculta (Modo Examen)
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Selecciona {host.name} y ejecuta{' '}
                        <code className="text-sky-300 font-mono">ipconfig</code>{' '}
                        en la consola para descubrir sus parámetros.
                      </p>
                    </div>
                  )}
                </div>

                {/* Connectivity Matrix Footer */}
                <div className="mt-3.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span
                      className={`inline-flex items-center gap-1 ${
                        health.canReachLanPeers
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                      title="Conectividad con otros equipos de la LAN"
                    >
                      {health.canReachLanPeers ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      LAN
                    </span>
                    <span aria-hidden="true" className="text-slate-700">
                      ·
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 ${
                        health.canReachGateway
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                      title="Conectividad con la Puerta de Enlace (Router)"
                    >
                      {health.canReachGateway ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      GW
                    </span>
                    <span aria-hidden="true" className="text-slate-700">
                      ·
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 ${
                        health.canReachInternetIp
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                      title="Salida a IP externa (8.8.8.8)"
                    >
                      {health.canReachInternetIp ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      WAN
                    </span>
                    <span aria-hidden="true" className="text-slate-700">
                      ·
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 ${
                        health.canResolveDns
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                      title="Resolución de nombres de dominio (DNS)"
                    >
                      {health.canResolveDns ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      DNS
                    </span>
                  </div>

                  {!isSelected && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickPingFromActive(host.ip);
                      }}
                      className="font-mono text-sky-400 hover:text-sky-300 underline-offset-2 hover:underline"
                      title={`Hacer ping a ${host.name} desde ${selectedHostId}`}
                    >
                      ping
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
