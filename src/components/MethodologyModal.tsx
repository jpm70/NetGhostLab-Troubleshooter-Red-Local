import React from 'react';
import { BookOpen, CheckCircle2, Layers, Terminal, X } from 'lucide-react';

interface MethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MethodologyModal: React.FC<MethodologyModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full max-h-[88vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-semibold text-slate-100">
              Metodología Profesional de Diagnóstico de Red Local (TCP/IP)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Cerrar guía"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300">
          {/* 5 Step Protocol */}
          <section>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-sky-400" />
              01. El Protocolo de Aislamiento en 5 Pasos
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Cuando un equipo «no navega» o «no ve a la red», nunca cambies
              parámetros al azar. Sigue esta secuencia desde el propio equipo
              hasta Internet:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-xs font-mono text-sky-400 font-semibold mb-1">
                  Paso 1 · Auditoría Local
                </div>
                <code className="text-xs font-mono text-white block mb-1.5">
                  ipconfig /all
                </code>
                <p className="text-xs text-slate-400">
                  Verifica IP, máscara, puerta de enlace y servidor DNS.
                  Comprueba el cálculo de red y broadcast.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-xs font-mono text-sky-400 font-semibold mb-1">
                  Paso 2 · Enlace LAN
                </div>
                <code className="text-xs font-mono text-white block mb-1.5">
                  ping &lt;IP_Vecino&gt;
                </code>
                <p className="text-xs text-slate-400">
                  Si falla hacia otros PCs del mismo switch, revisa IP en otra
                  subred, máscara errónea o IP duplicada (
                  <code className="font-mono">arp -a</code>).
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-xs font-mono text-sky-400 font-semibold mb-1">
                  Paso 3 · Puerta Enlace
                </div>
                <code className="text-xs font-mono text-white block mb-1.5">
                  ping &lt;IP_Router&gt;
                </code>
                <p className="text-xs text-slate-400">
                  Comprueba que llegas al Router y que la Puerta de Enlace del
                  equipo coincide con la IP LAN del Router.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-xs font-mono text-sky-400 font-semibold mb-1">
                  Paso 4 · Salida WAN IP
                </div>
                <code className="text-xs font-mono text-white block mb-1.5">
                  ping 8.8.8.8
                </code>
                <p className="text-xs text-slate-400">
                  Prueba enrutamiento puro sin DNS. Si llega a la LAN pero no a
                  8.8.8.8, el fallo está en el Default Gateway.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-xs font-mono text-sky-400 font-semibold mb-1">
                  Paso 5 · Resolución DNS
                </div>
                <code className="text-xs font-mono text-white block mb-1.5">
                  nslookup &lt;dominio&gt;
                </code>
                <p className="text-xs text-slate-400">
                  Si <code className="font-mono">ping 8.8.8.8</code> responde
                  pero no navega por nombre, el servidor DNS configurado es
                  inexistente o caído.
                </p>
              </div>
            </div>
          </section>

          {/* Table of Silent Faults */}
          <section>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              02. Tabla de Síntomas y Fallos Silenciosos
            </h3>
            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-300 border-b border-slate-800">
                    <th className="py-2.5 px-3 font-semibold">Fallo Silencioso</th>
                    <th className="py-2.5 px-3 font-semibold">Ping a LAN</th>
                    <th className="py-2.5 px-3 font-semibold">Ping a 8.8.8.8</th>
                    <th className="py-2.5 px-3 font-semibold">nslookup / Web</th>
                    <th className="py-2.5 px-3 font-semibold">Pista Clave en Consola</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono tabular-nums">
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-200">
                      Puerta de Enlace (Gateway) incorrecta
                    </td>
                    <td className="py-2.5 px-3 text-emerald-400">OK</td>
                    <td className="py-2.5 px-3 text-rose-400">FALLA</td>
                    <td className="py-2.5 px-3 text-rose-400">FALLA</td>
                    <td className="py-2.5 px-3 font-sans text-slate-400">
                      <code className="font-mono text-slate-200">tracert 8.8.8.8</code> muere en el salto 1.
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-200">
                      Servidor DNS inexistente
                    </td>
                    <td className="py-2.5 px-3 text-emerald-400">OK</td>
                    <td className="py-2.5 px-3 text-emerald-400">OK</td>
                    <td className="py-2.5 px-3 text-rose-400">Timeout DNS</td>
                    <td className="py-2.5 px-3 font-sans text-slate-400">
                      Hay ping a IPs externas pero no a nombres de dominio.
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-200">
                      Dirección IP duplicada
                    </td>
                    <td className="py-2.5 px-3 text-amber-400">Colisión</td>
                    <td className="py-2.5 px-3 text-amber-400">Colisión</td>
                    <td className="py-2.5 px-3 text-rose-400">Inestable</td>
                    <td className="py-2.5 px-3 font-sans text-slate-400">
                      <code className="font-mono text-slate-200">arp -a</code> muestra alerta de dos MACs con igual IP.
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-200">
                      Máscara de subred incorrecta (/25 vs /24)
                    </td>
                    <td className="py-2.5 px-3 text-amber-400">Parcial</td>
                    <td className="py-2.5 px-3 text-emerald-400">OK (si ve GW)</td>
                    <td className="py-2.5 px-3 text-emerald-400">OK</td>
                    <td className="py-2.5 px-3 font-sans text-slate-400">
                      Ve IPs bajas (.10) pero no alcanza IPs altas (.200).
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-200">
                      IP del equipo en otra subred
                    </td>
                    <td className="py-2.5 px-3 text-rose-400">FALLA</td>
                    <td className="py-2.5 px-3 text-rose-400">FALLA</td>
                    <td className="py-2.5 px-3 text-rose-400">FALLA</td>
                    <td className="py-2.5 px-3 font-sans text-slate-400">
                      La red calculada en <code className="font-mono text-slate-200">ipconfig /all</code> difiere del resto.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Quick CIDR Reference */}
          <section className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs tabular-nums">
              <div className="text-sky-400 font-semibold">/24 · 255.255.255.0</div>
              <div className="text-slate-400 mt-1">256 dirs (254 útiles)</div>
              <div className="text-slate-300">.1 a .254 (Bcast .255)</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs tabular-nums">
              <div className="text-sky-400 font-semibold">/25 · 255.255.255.128</div>
              <div className="text-slate-400 mt-1">128 dirs (126 útiles)</div>
              <div className="text-slate-300">.1 a .126 (Bcast .127)</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs tabular-nums">
              <div className="text-sky-400 font-semibold">/26 · 255.255.255.192</div>
              <div className="text-slate-400 mt-1">64 dirs (62 útiles)</div>
              <div className="text-slate-300">.1 a .62 (Bcast .63)</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs tabular-nums">
              <div className="text-sky-400 font-semibold">/28 · 255.255.255.240</div>
              <div className="text-slate-400 mt-1">16 dirs (14 útiles)</div>
              <div className="text-slate-300">.1 a .14 (Bcast .15)</div>
            </div>
          </section>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Material didáctico interactivo — Un Fantasma en el Sistema
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-colors"
          >
            Entendido, volver al laboratorio
          </button>
        </div>
      </div>
    </div>
  );
};
