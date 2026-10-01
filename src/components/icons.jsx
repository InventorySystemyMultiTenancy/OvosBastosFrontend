// Ícones outline minimalistas usados na sidebar e nos cards do dashboard.
// SVGs desenhados à mão (sem dependência externa) — stroke herda currentColor.
const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function IconDashboard(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="5" rx="2" />
      <rect x="13" y="12" width="8" height="9" rx="2" />
      <rect x="3" y="15" width="8" height="6" rx="2" />
    </svg>
  );
}

export function IconCaixa(props) {
  return (
    <svg {...base} {...props}>
      <rect x="2" y="7" width="20" height="13" rx="2" />
      <path d="M2 11h20" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M9.5 15.5h5" />
    </svg>
  );
}

export function IconClientes(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.8 19.5c0-3.4 2.8-5.6 6.2-5.6s6.2 2.2 6.2 5.6" />
      <circle cx="17.5" cy="8.5" r="2.4" />
      <path d="M15.8 13.9c2.6.4 4.6 2.3 4.6 5" />
    </svg>
  );
}

export function IconEstoque(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 2.6 3.5 7.3v9.4L12 21.4l8.5-4.7V7.3z" />
      <path d="M3.5 7.3 12 12l8.5-4.7" />
      <path d="M12 12v9.4" />
    </svg>
  );
}

export function IconRecebimentos(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 2.5h9l3 3v16h-12z" />
      <path d="M15 2.5v3h3" />
      <path d="M8.5 12h6" />
      <path d="M8.5 15.5h6" />
      <path d="M8.5 8.5h3" />
    </svg>
  );
}

export function IconBandejas(props) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="4" width="19" height="6" rx="1.5" />
      <rect x="2.5" y="14" width="19" height="6" rx="1.5" />
    </svg>
  );
}

export function IconVendas(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M2.5 3h2.4l2.2 12.2h11.4l1.9-8.6H6" />
    </svg>
  );
}

export function IconFinanceiro(props) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="6.5" width="19" height="13" rx="2" />
      <path d="M2.5 10.5h19" />
      <path d="M6.5 15h3" />
    </svg>
  );
}

export function IconUsuarios(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5" />
    </svg>
  );
}

export function IconLogout(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function IconLucro(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 6.5v11" />
      <path d="M15.2 9.2c0-1.3-1.4-2.2-3.2-2.2-1.9 0-3.2.9-3.2 2.2 0 1.4 1.3 1.9 3.2 2.3 1.9.4 3.2.9 3.2 2.3 0 1.3-1.3 2.2-3.2 2.2-1.8 0-3.2-.9-3.2-2.2" />
    </svg>
  );
}

export function IconFaturamento(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9.5h18" />
      <path d="M7.5 2.5v4" />
      <path d="M16.5 2.5v4" />
      <path d="M7 14h4" />
      <path d="M7 17.3h7" />
    </svg>
  );
}

export function IconGastos(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 8.5 12 3l9 5.5" />
      <rect x="4" y="8.5" width="16" height="12" rx="1.5" />
      <path d="M9.5 13.2a2.5 2 0 0 1 5 0c0 1.6-2.5 2-2.5 3.2" />
      <path d="M12 19v.01" />
    </svg>
  );
}

export function IconArrowUp(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 19V5" />
      <path d="M6 11l6-6 6 6" />
    </svg>
  );
}

export function IconArrowDown(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14" />
      <path d="M18 13l-6 6-6-6" />
    </svg>
  );
}

export function IconCalendar(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9.5h18" />
      <path d="M7.5 2.5v4" />
      <path d="M16.5 2.5v4" />
    </svg>
  );
}

export function IconBasket(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 9h16l-1.5 10.5a2 2 0 0 1-2 1.5H7.5a2 2 0 0 1-2-1.5z" />
      <path d="M8 9 9.5 3.5" />
      <path d="M16 9 14.5 3.5" />
      <path d="M9 13.5v4" />
      <path d="M12 13.5v4" />
      <path d="M15 13.5v4" />
    </svg>
  );
}

export function IconSearch(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-4.7-4.7" />
    </svg>
  );
}

export function IconGrid(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function IconCartao(props) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2.2" />
      <path d="M2.5 10h19" />
      <path d="M6 14.5h4" />
    </svg>
  );
}

export function IconDinheiro(props) {
  return (
    <svg {...base} {...props}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M5.5 9v.01" />
      <path d="M18.5 15v.01" />
    </svg>
  );
}

export function IconDividir(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12h16" />
      <circle cx="12" cy="6" r="2" />
      <circle cx="12" cy="18" r="2" />
    </svg>
  );
}

export function IconCamera(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 8h3l1.5-2.5h7L17 8h3a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 20H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 8z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </svg>
  );
}

export function IconPlus(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4v16" />
      <path d="M4 12h16" />
    </svg>
  );
}

export function IconChevronDown(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 8.5 12 15.5 19 8.5" />
    </svg>
  );
}

export function IconSpark(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 2.5c.6 3.3 2.3 5 5.5 5.6-3.2.6-4.9 2.3-5.5 5.6-.6-3.3-2.3-5-5.5-5.6 3.2-.6 4.9-2.3 5.5-5.6z" />
      <path d="M19 15.5c.3 1.6 1.1 2.4 2.6 2.7-1.5.3-2.3 1.1-2.6 2.7-.3-1.6-1.1-2.4-2.6-2.7 1.5-.3 2.3-1.1 2.6-2.7z" />
    </svg>
  );
}
