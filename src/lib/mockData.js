export const NICHES = {
  barberia: {
    id: 'barberia',
    name: 'Barbería',
    appTitle: 'Mi Barbería',
    icon: 'Scissors',
    roleName: 'Barbero',
    rolePlural: 'Barberos',
    serviceUnit: 'Corte',
    services: [
      { id: 's1', name: 'Corte Clásico', price_usd: 5, category: 'Cortes' },
      { id: 's2', name: 'Corte Degradé + Cejas', price_usd: 7, category: 'Cortes' },
      { id: 's3', name: 'Arreglo de Barba con Toalla Caliente', price_usd: 4, category: 'Barba' },
      { id: 's4', name: 'Combo Completo (Corte + Barba + Cejas)', price_usd: 10, category: 'Combos' },
      { id: 's5', name: 'Pigmentación / Tinte de Barba', price_usd: 6, category: 'Barba' },
      { id: 's6', name: 'Corte Infantil (Niños)', price_usd: 5, category: 'Cortes' },
    ],
    products: [
      { id: 'p1', name: 'Cera Mate Fijadora (150g)', price_usd: 8, cost_usd: 4, stock: 12, min_stock: 5, category: 'Productos' },
      { id: 'p2', name: 'Aceite Esencial para Barba', price_usd: 6, cost_usd: 3, stock: 4, min_stock: 5, category: 'Productos' },
      { id: 'p3', name: 'Tónico Minoxidil 5%', price_usd: 12, cost_usd: 7, stock: 8, min_stock: 3, category: 'Productos' },
      { id: 'p4', name: 'Caja de Hojillas Gillette (100 unid)', price_usd: 5, cost_usd: 2.5, stock: 15, min_stock: 5, category: 'Insumos' },
    ],
    staff: [
      { id: 'e1', name: 'Carlos "El Fino"', commission_pct: 50, avatar: '✂️' },
      { id: 'e2', name: 'Javier Cortes', commission_pct: 50, avatar: '💈' },
      { id: 'e3', name: 'Marcos Degradé', commission_pct: 60, avatar: '⚡' },
    ]
  },
  estetica: {
    id: 'estetica',
    name: 'Peluquería & Uñas',
    appTitle: 'Mi Salón & Estética',
    icon: 'Sparkles',
    roleName: 'Especialista',
    rolePlural: 'Especialistas',
    serviceUnit: 'Atención',
    services: [
      { id: 'es1', name: 'Manicure Ruso con Semipermanente', price_usd: 12, category: 'Uñas' },
      { id: 'es2', name: 'Pedicure Spa Completo', price_usd: 14, category: 'Uñas' },
      { id: 'es3', name: 'Diseño de Cejas + Henna', price_usd: 8, category: 'Cejas' },
      { id: 'es4', name: 'Pestañas Punto a Punto', price_usd: 15, category: 'Pestañas' },
      { id: 'es5', name: 'Lavado, Secado y Planchado', price_usd: 10, category: 'Cabello' },
    ],
    products: [
      { id: 'ep1', name: 'Aceite de Cutículas Frutal', price_usd: 4, cost_usd: 1.8, stock: 20, min_stock: 6, category: 'Productos' },
      { id: 'ep2', name: 'Brillo Secante Larga Duración', price_usd: 5, cost_usd: 2.5, stock: 8, min_stock: 4, category: 'Productos' },
    ],
    staff: [
      { id: 'ee1', name: 'Daniela Uñas', commission_pct: 50, avatar: '💅' },
      { id: 'ee2', name: 'Sofia Estilista', commission_pct: 55, avatar: '✨' },
    ]
  },
  mixto: {
    id: 'mixto',
    name: 'Barbería & Salón (Mixto)',
    appTitle: 'Mi Negocio (Barbería & Salón)',
    icon: 'Store',
    roleName: 'Profesional',
    rolePlural: 'Equipo (Barberos & Estilistas)',
    serviceUnit: 'Atención',
    services: [
      { id: 's1', name: 'Corte Degradé + Cejas', price_usd: 7, category: 'Barbería' },
      { id: 's4', name: 'Combo Completo (Corte + Barba)', price_usd: 10, category: 'Barbería' },
      { id: 'es1', name: 'Manicure Ruso Semipermanente', price_usd: 12, category: 'Salón' },
      { id: 'es4', name: 'Pestañas Punto a Punto', price_usd: 15, category: 'Salón' },
      { id: 'es5', name: 'Lavado y Secado', price_usd: 10, category: 'Salón' },
    ],
    products: [
      { id: 'p1', name: 'Cera Mate Fijadora', price_usd: 8, cost_usd: 4, stock: 12, min_stock: 5, category: 'Barbería' },
      { id: 'ep1', name: 'Aceite de Cutículas Frutal', price_usd: 4, cost_usd: 1.8, stock: 20, min_stock: 6, category: 'Salón' },
    ],
    staff: [
      { id: 'e1', name: 'Carlos "El Fino" (Barbero)', commission_pct: 50, avatar: '✂️' },
      { id: 'e2', name: 'Javier Cortes (Barbero)', commission_pct: 50, avatar: '💈' },
      { id: 'ee1', name: 'Daniela (Uñas & Manicure)', commission_pct: 50, avatar: '💅' },
      { id: 'ee2', name: 'Sofia (Estilista & Cejas)', commission_pct: 55, avatar: '✨' },
    ]
  }
}

export const INITIAL_CLIENTS = [
  { id: 'c1', name: 'Miguel Ángel Rojas', phone: '+584121234567', debt_usd: 0, plan: 'Cliente Regular' },
  { id: 'c2', name: 'Alejandro Peña', phone: '+584149876543', debt_usd: 5, plan: 'Cliente Regular' },
  { id: 'c3', name: 'Roberto Gómez', phone: '+584245551122', debt_usd: 0, plan: 'Suscripción VIP (4 Cortes/Mes)', plan_renueva: '05 de Noviembre' },
  { id: 'c4', name: 'José Gregorio Silva', phone: '+584163334455', debt_usd: 10, plan: 'Cliente Regular' },
  { id: 'c5', name: 'Franklin Mendoza', phone: '+584128889900', debt_usd: 0, plan: 'Suscripción Barba Ilimitada', plan_renueva: '12 de Noviembre' },
]

export const INITIAL_APPOINTMENTS = [
  { id: 'a1', client_name: 'Miguel Ángel Rojas', date: new Date().toISOString().split('T')[0], time: '10:00 AM', staff_id: 'e1', service: 'Corte Degradé + Cejas', status: 'completada' },
  { id: 'a2', client_name: 'Alejandro Peña', date: new Date().toISOString().split('T')[0], time: '11:30 AM', staff_id: 'e2', service: 'Corte Clásico', status: 'en_atencion' },
  { id: 'a3', client_name: 'Héctor Mendoza', date: new Date().toISOString().split('T')[0], time: '02:00 PM', staff_id: 'e1', service: 'Combo Completo', status: 'pendiente' },
  { id: 'a4', client_name: 'Daniel Castillo', date: new Date().toISOString().split('T')[0], time: '03:30 PM', staff_id: 'e3', service: 'Arreglo de Barba', status: 'pendiente' },
  { id: 'a5', client_name: 'Gabriel Medina', date: new Date().toISOString().split('T')[0], time: '05:00 PM', staff_id: 'e2', service: 'Corte Clásico', status: 'pendiente' },
]

export const INITIAL_TRANSACTIONS = [
  {
    id: 't1',
    type: 'ingreso',
    item_name: 'Corte Degradé + Cejas',
    category: 'Cortes',
    staff_name: 'Carlos "El Fino"',
    staff_id: 'e1',
    client_name: 'Miguel Ángel Rojas',
    monto_usd: 7,
    monto_bs: 371,
    tasa_bcv: 53.00,
    metodo_pago: 'pago_movil',
    comision_usd: 3.50,
    ganancia_negocio_usd: 3.50,
    hora: '09:45 AM',
    fecha: new Date().toISOString()
  },
  {
    id: 't2',
    type: 'ingreso',
    item_name: 'Combo Completo (Corte + Barba + Cejas)',
    category: 'Combos',
    staff_name: 'Javier Cortes',
    staff_id: 'e2',
    client_name: 'Alejandro Peña',
    monto_usd: 10,
    monto_bs: 530,
    tasa_bcv: 53.00,
    metodo_pago: 'efectivo_usd',
    comision_usd: 5.00,
    ganancia_negocio_usd: 5.00,
    hora: '10:30 AM',
    fecha: new Date().toISOString()
  },
  {
    id: 't3',
    type: 'ingreso',
    item_name: 'Cera Mate Fijadora (150g)',
    category: 'Productos',
    staff_name: 'Venta de Mostrador',
    staff_id: null,
    client_name: 'Cliente Mostrador',
    monto_usd: 8,
    monto_bs: 424,
    tasa_bcv: 53.00,
    metodo_pago: 'pago_movil',
    comision_usd: 0,
    ganancia_negocio_usd: 8.00,
    hora: '11:15 AM',
    fecha: new Date().toISOString()
  },
  {
    id: 't4',
    type: 'gasto',
    item_name: 'Botellón de agua y café para clientes',
    category: 'Comida / Café',
    staff_name: 'Gasto del Local',
    staff_id: null,
    client_name: '-',
    monto_usd: -4.00,
    monto_bs: -212,
    tasa_bcv: 53.00,
    metodo_pago: 'pago_movil',
    comision_usd: 0,
    ganancia_negocio_usd: -4.00,
    hora: '11:45 AM',
    fecha: new Date().toISOString()
  },
  {
    id: 't5',
    type: 'ingreso',
    item_name: 'Corte Clásico',
    category: 'Cortes',
    staff_name: 'Marcos Degradé',
    staff_id: 'e3',
    client_name: 'José Gregorio Silva',
    monto_usd: 5,
    monto_bs: 265,
    tasa_bcv: 53.00,
    metodo_pago: 'fiado',
    comision_usd: 3.00,
    ganancia_negocio_usd: 2.00,
    hora: '12:00 PM',
    fecha: new Date().toISOString()
  }
]

export const MONTHLY_HISTORY = [
  { mes: 'Enero', facturacion: 1850, gastos: 420, comisiones: 880, lucro: 550 },
  { mes: 'Febrero', facturacion: 2100, gastos: 490, comisiones: 1020, lucro: 590 },
  { mes: 'Marzo', facturacion: 2450, gastos: 510, comisiones: 1190, lucro: 750 },
  { mes: 'Abril', facturacion: 2300, gastos: 480, comisiones: 1120, lucro: 700 },
  { mes: 'Mayo', facturacion: 2680, gastos: 550, comisiones: 1310, lucro: 820 },
  { mes: 'Junio', facturacion: 2900, gastos: 600, comisiones: 1420, lucro: 880 },
  { mes: 'Julio', facturacion: 3100, gastos: 620, comisiones: 1510, lucro: 970 },
  { mes: 'Agosto', facturacion: 3050, gastos: 590, comisiones: 1480, lucro: 980 },
  { mes: 'Septiembre', facturacion: 3200, gastos: 630, comisiones: 1550, lucro: 1020 },
  { mes: 'Octubre (Actual)', facturacion: 2850, gastos: 540, comisiones: 1390, lucro: 920 },
]

export const INITIAL_BUSINESS_PROFILE = {
  businessName: 'Barbería & Studio El Fino',
  slogan: 'Cortes degradé de primera, barba con toalla caliente y atención VIP sin esperar de pie.',
  address: 'Av. Principal, Centro Comercial Nivel 1, Local 4',
  whatsapp: '+584121234567',
  schedule: 'Lunes a Sábado: 9:00 AM a 7:00 PM',
  instagram: '@barberiaelfino',
  paymentMethods: ['Pago Móvil BCV', 'Efectivo ($)', 'Zelle', 'Punto de Venta'],
  promoBanner: '🔥 Promo de la Semana: Combo Corte + Barba + Cejas por solo $10'
}

