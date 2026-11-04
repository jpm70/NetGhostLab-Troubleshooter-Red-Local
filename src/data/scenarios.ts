import { FaultType, HostNode, RouterConfig, Scenario } from '../types/network';

export const SCENARIOS: Scenario[] = [
  {
    id: 'case-1-gateway',
    number: 1,
    title: 'Aislado del Exterior',
    subtitle: 'Puerta de enlace en otra subred',
    difficulty: 'Básico',
    ticketSender: 'Marta G. (Contabilidad — PC-02)',
    symptomReport:
      '«Puedo abrir las carpetas compartidas del servidor NAS y ver a mis compañeros de oficina sin problema, pero no me carga ninguna página web ni tengo conexión al exterior.»',
    learningObjective:
      'Comprender la función de la Puerta de Enlace Predeterminada (Default Gateway) y verificar que debe pertenecer a la misma subred que el equipo y coincidir con la IP LAN del router.',
    router: {
      id: 'ROUTER',
      name: 'Router-GW',
      lanIp: '192.168.1.1',
      lanMask: '255.255.255.0',
      wanIp: '83.44.192.14',
      ispGateway: '83.44.192.1',
      dnsForwarder: '8.8.8.8',
      mac: '00:1A:2B:00:01:01',
    },
    hosts: [
      {
        id: 'PC-01',
        name: 'PC-01',
        role: 'workstation',
        userLabel: 'Recepción',
        mac: '00:1A:2B:AA:10:01',
        ip: '192.168.1.10',
        mask: '255.255.255.0',
        gateway: '192.168.1.1',
        dns: '8.8.8.8',
      },
      {
        id: 'PC-02',
        name: 'PC-02',
        role: 'workstation',
        userLabel: 'Contabilidad (Marta)',
        mac: '00:1A:2B:AA:10:02',
        ip: '192.168.1.11',
        mask: '255.255.255.0',
        gateway: '192.168.2.1', // SILENT FAULT: Gateway in 192.168.2.0/24
        dns: '8.8.8.8',
      },
      {
        id: 'PC-03',
        name: 'PC-03',
        role: 'laptop',
        userLabel: 'Diseño',
        mac: '00:1A:2B:AA:10:03',
        ip: '192.168.1.12',
        mask: '255.255.255.0',
        gateway: '192.168.1.1',
        dns: '8.8.8.8',
      },
      {
        id: 'PC-04',
        name: 'SRV-NAS',
        role: 'server',
        userLabel: 'Archivos Locales',
        mac: '00:1A:2B:AA:10:50',
        ip: '192.168.1.50',
        mask: '255.255.255.0',
        gateway: '192.168.1.1',
        dns: '8.8.8.8',
      },
    ],
    expectedFaults: [
      {
        hostId: 'PC-02',
        faultType: 'WRONG_GATEWAY',
        explanation:
          'PC-02 tiene configurada la puerta de enlace 192.168.2.1, que pertenece a otra subred distinta de 192.168.1.0/24. Debe cambiarse a 192.168.1.1.',
      },
    ],
    hints: [
      'Selecciona PC-02 y ejecuta "ipconfig" para revisar sus parámetros básicos.',
      'Prueba "ping 192.168.1.50" (verás que la red local funciona) y luego "ping 8.8.8.8" o "tracert 8.8.8.8".',
      'Fíjate en el tercer octeto de la Puerta de enlace predeterminada de PC-02 en comparación con la IP del Router (192.168.1.1).',
    ],
  },
  {
    id: 'case-2-dns',
    number: 2,
    title: 'El Falso Corte de Internet',
    subtitle: 'Servidor DNS inexistente o caído',
    difficulty: 'Básico',
    ticketSender: 'Carlos R. (Soporte — PC-03)',
    symptomReport:
      '«El navegador dice ERR_NAME_NOT_RESOLVED en cualquier web, pero el icono de red no muestra desconexión física. Creo que se ha caído la fibra de la oficina.»',
    learningObjective:
      'Distinguir entre un fallo de conectividad IP (Capa 3) y un fallo de resolución de nombres (DNS) combinando ping a una IP pública (8.8.8.8), navegador por IP directa y nslookup.',
    router: {
      id: 'ROUTER',
      name: 'Router-GW',
      lanIp: '192.168.10.1',
      lanMask: '255.255.255.0',
      wanIp: '81.33.120.99',
      ispGateway: '81.33.120.1',
      dnsForwarder: '1.1.1.1',
      mac: '00:1A:2B:00:10:01',
    },
    hosts: [
      {
        id: 'PC-01',
        name: 'PC-01',
        role: 'workstation',
        userLabel: 'Dirección',
        mac: '00:1A:2B:BB:20:01',
        ip: '192.168.10.20',
        mask: '255.255.255.0',
        gateway: '192.168.10.1',
        dns: '1.1.1.1',
      },
      {
        id: 'PC-02',
        name: 'PC-02',
        role: 'workstation',
        userLabel: 'Recursos Humanos',
        mac: '00:1A:2B:BB:20:02',
        ip: '192.168.10.21',
        mask: '255.255.255.0',
        gateway: '192.168.10.1',
        dns: '1.1.1.1',
      },
      {
        id: 'PC-03',
        name: 'PC-03',
        role: 'laptop',
        userLabel: 'Soporte (Carlos)',
        mac: '00:1A:2B:BB:20:03',
        ip: '192.168.10.22',
        mask: '255.255.255.0',
        gateway: '192.168.10.1',
        dns: '192.168.10.250', // SILENT FAULT: Non-existent internal DNS server
      },
      {
        id: 'PC-04',
        name: 'SRV-NAS',
        role: 'server',
        userLabel: 'Backup LAN',
        mac: '00:1A:2B:BB:20:90',
        ip: '192.168.10.90',
        mask: '255.255.255.0',
        gateway: '192.168.10.1',
        dns: '8.8.8.8',
      },
    ],
    expectedFaults: [
      {
        hostId: 'PC-03',
        faultType: 'INVALID_DNS',
        explanation:
          'PC-03 apunta al servidor DNS 192.168.10.250, que no existe en la red local. Tiene salida IP a Internet (ping 8.8.8.8 responde), pero no puede traducir nombres de dominio.',
      },
    ],
    hints: [
      'Desde PC-03, ejecuta "ping 8.8.8.8". ¿Responde? Si responde, el router y la salida a Internet funcionan perfectamente.',
      'Abre la pestaña "Navegador Web" o ejecuta "nslookup www.unfantasmaenelsistema.com" en PC-03 para ver qué servidor DNS está intentando consultar.',
      'Configura un DNS válido en PC-03 (por ejemplo 1.1.1.1, 8.8.8.8 o la IP del router 192.168.10.1).',
    ],
  },
  {
    id: 'case-3-duplicate-ip',
    number: 3,
    title: 'Fantasmas en el Switch',
    subtitle: 'Conflicto de dirección IP duplicada',
    difficulty: 'Intermedio',
    ticketSender: 'Laboratorio Aula 4 (PC-01 e IMP-RED)',
    symptomReport:
      '«Desde que instalamos la impresora de red esta mañana, el equipo PC-01 pierde la conexión constantemente y da errores de colisión al hacer ping incluso al router.»',
    learningObjective:
      'Identificar colisiones de direcciones IPv4 en un dominio de difusión Ethernet usando ipconfig, arp -a y el analizador de tramas PDU.',
    router: {
      id: 'ROUTER',
      name: 'Router-GW',
      lanIp: '10.0.0.1',
      lanMask: '255.255.255.0',
      wanIp: '95.18.40.210',
      ispGateway: '95.18.40.1',
      dnsForwarder: '8.8.8.8',
      mac: '00:1A:2B:00:0A:01',
    },
    hosts: [
      {
        id: 'PC-01',
        name: 'PC-01',
        role: 'workstation',
        userLabel: 'Puesto Profesor',
        mac: '00:1A:2B:CC:01:15',
        ip: '10.0.0.15', // DUPLICATE IP with PC-04
        mask: '255.255.255.0',
        gateway: '10.0.0.1',
        dns: '8.8.8.8',
      },
      {
        id: 'PC-02',
        name: 'PC-02',
        role: 'workstation',
        userLabel: 'Alumno A',
        mac: '00:1A:2B:CC:01:16',
        ip: '10.0.0.16',
        mask: '255.255.255.0',
        gateway: '10.0.0.1',
        dns: '8.8.8.8',
      },
      {
        id: 'PC-03',
        name: 'PC-03',
        role: 'laptop',
        userLabel: 'Alumno B',
        mac: '00:1A:2B:CC:01:17',
        ip: '10.0.0.17',
        mask: '255.255.255.0',
        gateway: '10.0.0.1',
        dns: '8.8.8.8',
      },
      {
        id: 'PC-04',
        name: 'IMP-RED',
        role: 'printer',
        userLabel: 'Impresora Nueva',
        mac: '00:1A:2B:CC:01:99',
        ip: '10.0.0.15', // DUPLICATE IP with PC-01
        mask: '255.255.255.0',
        gateway: '10.0.0.1',
        dns: '8.8.8.8',
      },
    ],
    expectedFaults: [
      {
        hostId: 'PC-04',
        faultType: 'DUPLICATE_IP',
        explanation:
          'Tanto PC-01 como IMP-RED (PC-04) tienen asignada estáticamente la IP 10.0.0.15, provocando una colisión ARP en la red local.',
      },
    ],
    hints: [
      'Ejecuta "arp -a" o "ipconfig /all" en PC-01 y en IMP-RED para comparar sus direcciones IP y MAC.',
      'Asigna a IMP-RED una dirección IP libre dentro de la subred 10.0.0.0/24 (por ejemplo, 10.0.0.50).',
    ],
  },
  {
    id: 'case-4-subnet-mask',
    number: 4,
    title: 'El Muro Invisible de la Máscara',
    subtitle: 'Máscara de subred /25 asimétrica',
    difficulty: 'Intermedio',
    ticketSender: 'Elena V. (Desarrollo — PC-03)',
    symptomReport:
      '«Desde mi equipo (PC-03) entro sin problemas en el servidor SRV-NAS (192.168.50.200), pero no navego por Internet, no llego al router y no veo los equipos de mis compañeros. Ellos tampoco me ven a mí.»',
    learningObjective:
      'Analizar en binario cómo una máscara de subred demasiado restrictiva (255.255.255.128 /25) divide una red /24 en dos mitades (.1-.126 y .129-.254): el equipo solo considera locales a los de su mitad y su puerta de enlace (.1) queda fuera de su subred.',
    router: {
      id: 'ROUTER',
      name: 'Router-GW',
      lanIp: '192.168.50.1',
      lanMask: '255.255.255.0',
      wanIp: '212.106.33.18',
      ispGateway: '212.106.33.1',
      dnsForwarder: '8.8.8.8',
      mac: '00:1A:2B:00:50:01',
    },
    hosts: [
      {
        id: 'PC-01',
        name: 'PC-01',
        role: 'workstation',
        userLabel: 'DevOps 1',
        mac: '00:1A:2B:DD:50:10',
        ip: '192.168.50.10',
        mask: '255.255.255.0',
        gateway: '192.168.50.1',
        dns: '8.8.8.8',
      },
      {
        id: 'PC-02',
        name: 'PC-02',
        role: 'workstation',
        userLabel: 'DevOps 2',
        mac: '00:1A:2B:DD:50:20',
        ip: '192.168.50.20',
        mask: '255.255.255.0',
        gateway: '192.168.50.1',
        dns: '8.8.8.8',
      },
      {
        id: 'PC-03',
        name: 'PC-03',
        role: 'laptop',
        userLabel: 'Desarrollo (Elena)',
        mac: '00:1A:2B:DD:50:30',
        ip: '192.168.50.140',
        mask: '255.255.255.128', // FALLO: con /25 su subred es .128/25 (.129-.254) y el router .1 queda fuera
        gateway: '192.168.50.1',
        dns: '8.8.8.8',
      },
      {
        id: 'PC-04',
        name: 'SRV-NAS',
        role: 'server',
        userLabel: 'Repositorio Git (.200)',
        mac: '00:1A:2B:DD:50:C8',
        ip: '192.168.50.200',
        mask: '255.255.255.0',
        gateway: '192.168.50.1',
        dns: '8.8.8.8',
      },
    ],
    expectedFaults: [
      {
        hostId: 'PC-03',
        faultType: 'WRONG_SUBNET_MASK',
        explanation:
          'PC-03 (192.168.50.140) tiene máscara 255.255.255.128 (/25): para él su red es 192.168.50.128/25 (.129-.254). Llega directamente a SRV-NAS (.200), que está en esa mitad, pero el router (.1) y PC-01/02 (.10, .20) quedan en la otra, y su puerta de enlace está fuera de su subred, así que no puede salir de ella.',
      },
    ],
    hints: [
      'Desde PC-03, prueba "ping 192.168.50.200" (funciona) y luego "ping 192.168.50.1" (falla). Mira también "route print": la puerta de enlace sale como inalcanzable.',
      'Abre la pestaña "3. Binario" con PC-03 seleccionado y compara su IP con la del router (192.168.50.1): el bit 25 es distinto.',
      'Corrige la máscara de PC-03 a 255.255.255.0 (/24) para igualarla con el resto de la LAN.',
    ],
  },
  {
    id: 'case-5-wrong-subnet-ip',
    number: 5,
    title: 'Baile de Octetos',
    subtitle: 'Equipo configurado en otra subred lógica',
    difficulty: 'Básico',
    ticketSender: 'Javier M. (Ventas — PC-01)',
    symptomReport:
      '«Acabo de configurar manualmente la IP siguiendo una nota en papel, pero estoy totalmente incomunicado: no veo ni a los compañeros, ni al router, ni tengo Internet.»',
    learningObjective:
      'Detectar errores tipográficos en la porción de red de una dirección IPv4 bajo máscara /24.',
    router: {
      id: 'ROUTER',
      name: 'Router-GW',
      lanIp: '172.16.10.1',
      lanMask: '255.255.255.0',
      wanIp: '185.22.90.4',
      ispGateway: '185.22.90.1',
      dnsForwarder: '1.1.1.1',
      mac: '00:1A:2B:10:01:01',
    },
    hosts: [
      {
        id: 'PC-01',
        name: 'PC-01',
        role: 'workstation',
        userLabel: 'Ventas (Javier)',
        mac: '00:1A:2B:EE:10:11',
        ip: '172.16.100.11', // SILENT FAULT: .100.11 instead of .10.11
        mask: '255.255.255.0',
        gateway: '172.16.10.1',
        dns: '1.1.1.1',
      },
      {
        id: 'PC-02',
        name: 'PC-02',
        role: 'workstation',
        userLabel: 'Ventas 2',
        mac: '00:1A:2B:EE:10:12',
        ip: '172.16.10.12',
        mask: '255.255.255.0',
        gateway: '172.16.10.1',
        dns: '1.1.1.1',
      },
      {
        id: 'PC-03',
        name: 'PC-03',
        role: 'laptop',
        userLabel: 'Marketing',
        mac: '00:1A:2B:EE:10:13',
        ip: '172.16.10.13',
        mask: '255.255.255.0',
        gateway: '172.16.10.1',
        dns: '1.1.1.1',
      },
      {
        id: 'PC-04',
        name: 'SRV-CRM',
        role: 'server',
        userLabel: 'Servidor CRM',
        mac: '00:1A:2B:EE:10:50',
        ip: '172.16.10.50',
        mask: '255.255.255.0',
        gateway: '172.16.10.1',
        dns: '1.1.1.1',
      },
    ],
    expectedFaults: [
      {
        hostId: 'PC-01',
        faultType: 'WRONG_SUBNET_IP',
        explanation:
          'PC-01 tiene la IP 172.16.100.11/24 mientras que toda la red local y el router operan en 172.16.10.0/24.',
      },
    ],
    hints: [
      'Compara la salida de "ipconfig" en PC-01 con la de PC-02.',
      'Ejecuta "route print" en PC-01 para ver por qué su propia puerta de enlace (172.16.10.1) resulta inalcanzable desde 172.16.100.0/24.',
    ],
  },
  {
    id: 'case-6-cidr-28',
    number: 6,
    title: 'Subredes Corporativas /28',
    subtitle: 'Equipo fuera del bloque CIDR /28',
    difficulty: 'Avanzado',
    ticketSender: 'Departamento de Seguridad (PC-02)',
    symptomReport:
      '«Hemos segmentado la oficina con máscara 255.255.255.240 (/28). Todos los equipos trabajan bien excepto PC-02, que no logra comunicarse ni con el router ni con sus compañeros.»',
    learningObjective:
      'Calcular subredes VLSM/CIDR con máscara /28 (bloques de 16 direcciones: .0 a .15, donde .15 es Broadcast y .16 ya pertenece a otra subred).',
    router: {
      id: 'ROUTER',
      name: 'Router-SecGW',
      lanIp: '192.168.99.1',
      lanMask: '255.255.255.240',
      wanIp: '195.55.10.2',
      ispGateway: '195.55.10.1',
      dnsForwarder: '9.9.9.9',
      mac: '00:1A:2B:99:01:01',
    },
    hosts: [
      {
        id: 'PC-01',
        name: 'PC-01',
        role: 'workstation',
        userLabel: 'Analista SOC 1',
        mac: '00:1A:2B:99:10:02',
        ip: '192.168.99.2',
        mask: '255.255.255.240',
        gateway: '192.168.99.1',
        dns: '9.9.9.9',
      },
      {
        id: 'PC-02',
        name: 'PC-02',
        role: 'workstation',
        userLabel: 'Analista SOC 2',
        mac: '00:1A:2B:99:10:18',
        ip: '192.168.99.18', // SILENT FAULT: .18 is in the SECOND /28 block (192.168.99.16/28)!
        mask: '255.255.255.240',
        gateway: '192.168.99.1',
        dns: '9.9.9.9',
      },
      {
        id: 'PC-03',
        name: 'PC-03',
        role: 'laptop',
        userLabel: 'Auditoría',
        mac: '00:1A:2B:99:10:06',
        ip: '192.168.99.6',
        mask: '255.255.255.240',
        gateway: '192.168.99.1',
        dns: '9.9.9.9',
      },
      {
        id: 'PC-04',
        name: 'SRV-SIEM',
        role: 'server',
        userLabel: 'Recolector SIEM',
        mac: '00:1A:2B:99:10:0E',
        ip: '192.168.99.14',
        mask: '255.255.255.240',
        gateway: '192.168.99.1',
        dns: '9.9.9.9',
      },
    ],
    expectedFaults: [
      {
        hostId: 'PC-02',
        faultType: 'WRONG_SUBNET_IP',
        explanation:
          'Con máscara 255.255.255.240 (/28), la primera subred va de 192.168.99.0 a .15 (rango útil .1 a .14). La IP 192.168.99.18 pertenece a la subred siguiente (192.168.99.16/28).',
      },
    ],
    hints: [
      'Ejecuta "ipconfig /all" en PC-01 y en PC-02. Observa la "Red calculada por el host" en ambos.',
      'Con máscara 255.255.255.240 (/28), cada subred tiene 16 direcciones (256 - 240 = 16). El bloque del router (192.168.99.1) admite hosts desde .1 hasta .14.',
      'Cambia la IP de PC-02 a una dirección libre entre 192.168.99.3 y 192.168.99.13.',
    ],
  },
  {
    id: 'case-7-double-trouble',
    number: 7,
    title: 'Guardia de Viernes Tarde',
    subtitle: 'Avería múltiple en dos equipos de la red',
    difficulty: 'Avanzado',
    ticketSender: 'Incidencia General Planta 2 (PC-01 y PC-03)',
    symptomReport:
      '«Dos puestos tienen problemas distintos: en PC-01 no carga ninguna web por nombre aunque sí hace ping a 8.8.8.8; mientras que en PC-03 sí funciona la red local pero jamás sale a Internet.»',
    learningObjective:
      'Resolver simultáneamente múltiples fallos silenciosos en una topología aplicando una metodología ordenada por capas OSI.',
    router: {
      id: 'ROUTER',
      name: 'Router-GW',
      lanIp: '192.168.20.1',
      lanMask: '255.255.255.0',
      wanIp: '146.70.12.88',
      ispGateway: '146.70.12.1',
      dnsForwarder: '8.8.8.8',
      mac: '00:1A:2B:20:01:01',
    },
    hosts: [
      {
        id: 'PC-01',
        name: 'PC-01',
        role: 'workstation',
        userLabel: 'Administración 1',
        mac: '00:1A:2B:20:10:10',
        ip: '192.168.20.10',
        mask: '255.255.255.0',
        gateway: '192.168.20.1',
        dns: '10.99.99.99', // FAULT 1: Invalid DNS
      },
      {
        id: 'PC-02',
        name: 'PC-02',
        role: 'workstation',
        userLabel: 'Administración 2',
        mac: '00:1A:2B:20:10:11',
        ip: '192.168.20.11',
        mask: '255.255.255.0',
        gateway: '192.168.20.1',
        dns: '8.8.8.8',
      },
      {
        id: 'PC-03',
        name: 'PC-03',
        role: 'laptop',
        userLabel: 'Logística',
        mac: '00:1A:2B:20:10:12',
        ip: '192.168.20.12',
        mask: '255.255.255.0',
        gateway: '192.168.20.254', // FAULT 2: Gateway points to .254 instead of .1
        dns: '8.8.8.8',
      },
      {
        id: 'PC-04',
        name: 'SRV-ERP',
        role: 'server',
        userLabel: 'Servidor ERP',
        mac: '00:1A:2B:20:10:50',
        ip: '192.168.20.50',
        mask: '255.255.255.0',
        gateway: '192.168.20.1',
        dns: '8.8.8.8',
      },
    ],
    expectedFaults: [
      {
        hostId: 'PC-01',
        faultType: 'INVALID_DNS',
        explanation:
          'PC-01 tiene el servidor DNS 10.99.99.99 que no existe. Debe usar 8.8.8.8, 1.1.1.1 o 192.168.20.1.',
      },
      {
        hostId: 'PC-03',
        faultType: 'WRONG_GATEWAY',
        explanation:
          'PC-03 apunta a la puerta de enlace 192.168.20.254, pero el router real tiene la IP 192.168.20.1.',
      },
    ],
    hints: [
      'En PC-01, usa "nslookup www.unfantasmaenelsistema.com" para confirmar el fallo de DNS.',
      'En PC-03, usa "tracert 8.8.8.8" o "ipconfig" y compara su puerta de enlace (.254) con la IP real del Router (.1).',
    ],
  },
  {
    id: 'case-8-apipa',
    number: 8,
    title: 'El Expediente APIPA 169.254',
    subtitle: 'Dirección de autoconfiguración por fallo DHCP',
    difficulty: 'Intermedio',
    ticketSender: 'Lucía P. (Diseño Gráfico — PC-03)',
    symptomReport:
      '«Al encender el portátil esta mañana me aparece "Red no identificada — Sin acceso a Internet". He mirado por encima y sí tiene una IP asignada, pero no puedo entrar a ningún servidor ni web.»',
    learningObjective:
      'Reconocer el rango reservado APIPA (169.254.0.0/16, RFC 3927) que Windows/Linux asigna automáticamente cuando falla la negociación DHCP, dejando al equipo fuera de la subred corporativa.',
    router: {
      id: 'ROUTER',
      name: 'Router-GW',
      lanIp: '192.168.30.1',
      lanMask: '255.255.255.0',
      wanIp: '88.12.45.190',
      ispGateway: '88.12.45.1',
      dnsForwarder: '1.1.1.1',
      mac: '00:1A:2B:30:01:01',
    },
    hosts: [
      {
        id: 'PC-01',
        name: 'PC-01',
        role: 'workstation',
        userLabel: 'Maquetación 1',
        mac: '00:1A:2B:30:10:10',
        ip: '192.168.30.10',
        mask: '255.255.255.0',
        gateway: '192.168.30.1',
        dns: '1.1.1.1',
      },
      {
        id: 'PC-02',
        name: 'PC-02',
        role: 'workstation',
        userLabel: 'Maquetación 2',
        mac: '00:1A:2B:30:10:11',
        ip: '192.168.30.11',
        mask: '255.255.255.0',
        gateway: '192.168.30.1',
        dns: '1.1.1.1',
      },
      {
        id: 'PC-03',
        name: 'PC-03',
        role: 'laptop',
        userLabel: 'Diseño (Lucía)',
        mac: '00:1A:2B:30:10:12',
        ip: '169.254.84.19', // APIPA address!
        mask: '255.255.0.0',
        gateway: '192.168.30.1',
        dns: '1.1.1.1',
      },
      {
        id: 'PC-04',
        name: 'SRV-RENDER',
        role: 'server',
        userLabel: 'Granja Render',
        mac: '00:1A:2B:30:10:50',
        ip: '192.168.30.50',
        mask: '255.255.255.0',
        gateway: '192.168.30.1',
        dns: '1.1.1.1',
      },
    ],
    expectedFaults: [
      {
        hostId: 'PC-03',
        faultType: 'WRONG_SUBNET_IP',
        explanation:
          'PC-03 tiene una dirección APIPA (169.254.84.19 / 255.255.0.0) generada al no recibir respuesta DHCP. Debe configurarse con una IP válida en 192.168.30.0/24 (ej. 192.168.30.12 y máscara 255.255.255.0).',
      },
    ],
    hints: [
      'Ejecuta "ipconfig /all" en PC-03 y observa la dirección IPv4 que empieza por 169.254.x.x.',
      'Las direcciones 169.254.0.0/16 son direcciones APIPA (Automatic Private IP Addressing) y no permiten comunicarse con la subred 192.168.30.0/24.',
      'En la pestaña "2. TCP/IPv4" de PC-03, asigna la IP 192.168.30.12 y corrige también su máscara a 255.255.255.0.',
    ],
  },
  {
    id: 'case-9-rogue-gateway',
    number: 9,
    title: 'El Gateway Impostor',
    subtitle: 'Puerta de enlace apuntando a un servidor sin salida WAN',
    difficulty: 'Intermedio',
    ticketSender: 'Raúl T. (Ingeniería — PC-01)',
    symptomReport:
      '«En PC-01 la puerta de enlace sí responde al ping porque está dentro de nuestra red local, pero cuando hago tracert a Internet los paquetes mueren en el primer salto.»',
    learningObjective:
      'Comprobar que una Puerta de Enlace no solo debe estar en la misma subred y responder a ping, sino que debe ser efectivamente el Router con capacidad de enrutamiento NAT/WAN y no otro host local.',
    router: {
      id: 'ROUTER',
      name: 'Router-GW',
      lanIp: '192.168.40.1',
      lanMask: '255.255.255.0',
      wanIp: '79.150.22.11',
      ispGateway: '79.150.22.1',
      dnsForwarder: '8.8.8.8',
      mac: '00:1A:2B:40:01:01',
    },
    hosts: [
      {
        id: 'PC-01',
        name: 'PC-01',
        role: 'workstation',
        userLabel: 'Ingeniería (Raúl)',
        mac: '00:1A:2B:40:10:10',
        ip: '192.168.40.10',
        mask: '255.255.255.0',
        gateway: '192.168.40.50', // SILENT FAULT: Points to SRV-NAS (.50) instead of Router (.1)!
        dns: '8.8.8.8',
      },
      {
        id: 'PC-02',
        name: 'PC-02',
        role: 'workstation',
        userLabel: 'CAD / CAM',
        mac: '00:1A:2B:40:10:11',
        ip: '192.168.40.11',
        mask: '255.255.255.0',
        gateway: '192.168.40.1',
        dns: '8.8.8.8',
      },
      {
        id: 'PC-03',
        name: 'PC-03',
        role: 'laptop',
        userLabel: 'Proyectos',
        mac: '00:1A:2B:40:10:12',
        ip: '192.168.40.12',
        mask: '255.255.255.0',
        gateway: '192.168.40.1',
        dns: '8.8.8.8',
      },
      {
        id: 'PC-04',
        name: 'SRV-NAS',
        role: 'server',
        userLabel: 'Almacenamiento (.50)',
        mac: '00:1A:2B:40:10:50',
        ip: '192.168.40.50',
        mask: '255.255.255.0',
        gateway: '192.168.40.1',
        dns: '8.8.8.8',
      },
    ],
    expectedFaults: [
      {
        hostId: 'PC-01',
        faultType: 'WRONG_GATEWAY',
        explanation:
          'PC-01 tiene configurado como Gateway 192.168.40.50 (que es el servidor de archivos SRV-NAS y no un router). Debe apuntar a 192.168.40.1.',
      },
    ],
    hints: [
      'Revisa "ipconfig" en PC-01: su puerta de enlace es 192.168.40.50.',
      'Observa en la topología quién tiene la IP 192.168.40.50 (SRV-NAS) y quién es el verdadero Router-GW (192.168.40.1).',
      'Cambia la puerta de enlace de PC-01 a 192.168.40.1.',
    ],
  },
  {
    id: 'case-10-master-audit',
    number: 10,
    title: 'Auditoría Crítica de Sistemas',
    subtitle: 'Triple avería combinada (Reto Final)',
    difficulty: 'Avanzado',
    ticketSender: 'Dirección de TI — Auditoría Global',
    symptomReport:
      '«Tras una migración de armario rack hay tres problemas simultáneos: PC-01 y PC-02 sufren cortes por conflicto en la red, PC-03 no ve al servidor .200 ni navega, y SRV-NAS no logra resolver dominios externos para sus copias en la nube.»',
    learningObjective:
      'Auditar íntegramente todos los nodos de una red local corrigiendo conflictos ARP, máscaras de subred asimétricas y servidores DNS inválidos hasta lograr un 100% de operatividad.',
    router: {
      id: 'ROUTER',
      name: 'Router-CoreGW',
      lanIp: '192.168.100.1',
      lanMask: '255.255.255.0',
      wanIp: '213.0.88.14',
      ispGateway: '213.0.88.1',
      dnsForwarder: '8.8.8.8',
      mac: '00:1A:2B:64:01:01',
    },
    hosts: [
      {
        id: 'PC-01',
        name: 'PC-01',
        role: 'workstation',
        userLabel: 'Puesto Financiero',
        mac: '00:1A:2B:64:10:10',
        ip: '192.168.100.10',
        mask: '255.255.255.0',
        gateway: '192.168.100.1',
        dns: '8.8.8.8',
      },
      {
        id: 'PC-02',
        name: 'PC-02',
        role: 'workstation',
        userLabel: 'Puesto Contable',
        mac: '00:1A:2B:64:10:11',
        ip: '192.168.100.10', // FAULT 1: Duplicate IP with PC-01
        mask: '255.255.255.0',
        gateway: '192.168.100.1',
        dns: '8.8.8.8',
      },
      {
        id: 'PC-03',
        name: 'PC-03',
        role: 'laptop',
        userLabel: 'Auditoría Externa',
        mac: '00:1A:2B:64:10:12',
        ip: '192.168.100.70',
        mask: '255.255.255.192', // FALLO 2: con /26 su red es .64/26 (.65-.126): router .1 y NAS .200 fuera
        gateway: '192.168.100.1',
        dns: '8.8.8.8',
      },
      {
        id: 'PC-04',
        name: 'SRV-NAS',
        role: 'server',
        userLabel: 'Cloud Sync (.200)',
        mac: '00:1A:2B:64:10:C8',
        ip: '192.168.100.200',
        mask: '255.255.255.0',
        gateway: '192.168.100.1',
        dns: '192.168.100.253', // FAULT 3: Non-existent DNS server
      },
    ],
    expectedFaults: [
      {
        hostId: 'PC-02',
        faultType: 'DUPLICATE_IP',
        explanation:
          'PC-02 comparte la IP 192.168.100.10 con PC-01. Debe cambiarse por ejemplo a 192.168.100.11.',
      },
      {
        hostId: 'PC-03',
        faultType: 'WRONG_SUBNET_MASK',
        explanation:
          'PC-03 (192.168.100.70) tiene una máscara /26 (255.255.255.192): para él su red es 192.168.100.64/26 (.65-.126). El router (.1) y SRV-NAS (.200) quedan fuera, y como su puerta de enlace no está en su subred, no puede llegar a ellos ni navegar. Debe ser 255.255.255.0.',
      },
      {
        hostId: 'PC-04',
        faultType: 'INVALID_DNS',
        explanation:
          'SRV-NAS apunta al servidor DNS inexistente 192.168.100.253. Debe usar 8.8.8.8, 1.1.1.1 o 192.168.100.1.',
      },
    ],
    hints: [
      'Paso 1 (PC-02): Corrige la IP duplicada 192.168.100.10 asignándole 192.168.100.11.',
      'Paso 2 (PC-03): Corrige la máscara 255.255.255.192 (/26) a 255.255.255.0 (/24).',
      'Paso 3 (SRV-NAS): Cambia el servidor DNS 192.168.100.253 por 8.8.8.8 o 1.1.1.1.',
    ],
  },
];

/**
 * Generates an unlimited procedural troubleshooting scenario with silent network faults.
 */
export function generateRandomScenario(seedCounter: number): Scenario {
  const thirdOctets = [1, 10, 25, 30, 40, 88, 100];
  const subnetOctet =
    thirdOctets[Math.floor(Math.random() * thirdOctets.length)];
  const basePrefix = `192.168.${subnetOctet}`;

  const router: RouterConfig = {
    id: 'ROUTER',
    name: 'Router-GW',
    lanIp: `${basePrefix}.1`,
    lanMask: '255.255.255.0',
    wanIp: '85.60.112.43',
    ispGateway: '85.60.112.1',
    dnsForwarder: '8.8.8.8',
    mac: '00:1A:2B:00:FF:01',
  };

  const hosts: HostNode[] = [
    {
      id: 'PC-01',
      name: 'PC-01',
      role: 'workstation',
      userLabel: 'Puesto 01',
      mac: '00:1A:2B:FA:10:01',
      ip: `${basePrefix}.10`,
      mask: '255.255.255.0',
      gateway: `${basePrefix}.1`,
      dns: '8.8.8.8',
    },
    {
      id: 'PC-02',
      name: 'PC-02',
      role: 'workstation',
      userLabel: 'Puesto 02',
      mac: '00:1A:2B:FA:10:02',
      ip: `${basePrefix}.11`,
      mask: '255.255.255.0',
      gateway: `${basePrefix}.1`,
      dns: '8.8.8.8',
    },
    {
      id: 'PC-03',
      name: 'PC-03',
      role: 'laptop',
      userLabel: 'Portátil 03',
      mac: '00:1A:2B:FA:10:03',
      ip: `${basePrefix}.12`,
      mask: '255.255.255.0',
      gateway: `${basePrefix}.1`,
      dns: '1.1.1.1',
    },
    {
      id: 'PC-04',
      name: 'SRV-NAS',
      role: 'server',
      userLabel: 'Servidor Local',
      mac: '00:1A:2B:FA:10:C8',
      ip: `${basePrefix}.200`,
      mask: '255.255.255.0',
      gateway: `${basePrefix}.1`,
      dns: '8.8.8.8',
    },
  ];

  const faultCandidates: FaultType[] = [
    'WRONG_GATEWAY',
    'INVALID_DNS',
    'DUPLICATE_IP',
    'WRONG_SUBNET_MASK',
    'WRONG_SUBNET_IP',
  ];

  const chosenFault =
    faultCandidates[Math.floor(Math.random() * faultCandidates.length)];
  const victimIndex = Math.floor(Math.random() * 3);
  const victim = hosts[victimIndex];

  let symptomReport = '';
  let explanation = '';

  switch (chosenFault) {
    case 'WRONG_GATEWAY': {
      const wrongGw =
        Math.random() > 0.5
          ? `192.168.${subnetOctet + 1}.1`
          : `${basePrefix}.254`;
      victim.gateway = wrongGw;
      symptomReport = `«El usuario de ${victim.name} informa que puede acceder a los equipos de la oficina, pero no tiene salida a Internet.»`;
      explanation = `${victim.name} tiene configurada una puerta de enlace incorrecta (${wrongGw}) en lugar de ${router.lanIp}.`;
      break;
    }
    case 'INVALID_DNS': {
      const wrongDns = `${basePrefix}.222`;
      victim.dns = wrongDns;
      symptomReport = `«Desde ${victim.name} aseguran que no carga ninguna página web por su dominio, aunque la red interna funciona.»`;
      explanation = `${victim.name} utiliza un servidor DNS inexistente (${wrongDns}).`;
      break;
    }
    case 'DUPLICATE_IP': {
      const peerIndex = (victimIndex + 1) % 3;
      victim.ip = hosts[peerIndex].ip;
      symptomReport = `«Se registran cortes intermitentes y errores de red en ${victim.name} y ${hosts[peerIndex].name}.»`;
      explanation = `${victim.name} tiene la misma dirección IP (${victim.ip}) que ${hosts[peerIndex].name}.`;
      break;
    }
    case 'WRONG_SUBNET_MASK': {
      victim.ip = `${basePrefix}.${140 + victimIndex}`;
      victim.mask = '255.255.255.128';
      symptomReport = `«${victim.name} solo llega al servidor SRV-NAS (${basePrefix}.200): no navega por Internet, no llega al router y no ve al resto de la oficina.»`;
      explanation = `${victim.name} (${victim.ip}) tiene una máscara /25 (255.255.255.128): su red es ${basePrefix}.128/25, así que el router (.1) y los equipos de la mitad baja quedan fuera y su puerta de enlace está fuera de su subred.`;
      break;
    }
    case 'WRONG_SUBNET_IP': {
      const wrongIp = `192.168.${subnetOctet + 5}.${10 + victimIndex}`;
      victim.ip = wrongIp;
      symptomReport = `«${victim.name} se ha quedado completamente incomunicado tras una reconfiguración manual.»`;
      explanation = `${victim.name} tiene la IP ${wrongIp}, que no pertenece a la subred ${basePrefix}.0/24.`;
      break;
    }
  }

  return {
    id: `random-${seedCounter}`,
    number: 11,
    title: `Reto Aleatorio #${seedCounter}`,
    subtitle: 'Escenario generado dinámicamente (Modo Práctica)',
    difficulty: 'Intermedio',
    ticketSender: `Mesa de Ayuda TI — Ticket #${1040 + seedCounter}`,
    symptomReport,
    learningObjective:
      'Aislar la causa raíz utilizando comandos de diagnóstico en consola (ipconfig, ping, tracert, nslookup, arp -a) y reparar la configuración TCP/IP.',
    router,
    hosts,
    expectedFaults: [
      {
        hostId: victim.id,
        faultType: chosenFault,
        explanation,
      },
    ],
    hints: [
      `Revisa el equipo mencionado en el ticket (${victim.name}) ejecutando "ipconfig /all".`,
      `Prueba conectividad escalonada: 1) ping a otro PC, 2) ping al router (${router.lanIp}), 3) ping a 8.8.8.8, 4) nslookup www.unfantasmaenelsistema.com.`,
    ],
    isRandom: true,
  };
}
