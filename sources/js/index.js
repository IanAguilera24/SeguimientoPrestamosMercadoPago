let loans = [];
let currentTab = 'new';
let activePageCards = 1;
let activePageTable = 1;
let closedPageCards = 1;
let closedPageTable = 1;
let viewMode = 'cards'; // 'cards' or 'table'
let closedViewMode = 'cards'; // 'cards' or 'table'
const itemsPerPageActive = 5;
const itemsPerPageClosed = 5;
let fechaCorte = 15;
let fechaLimite = 20;
let statusChart, amountChart, amountByMonthChart, termChart, monthlyChart;
// Filtros
let activeFechaDesde = '';
let activeFechaHasta = '';
let activeOrdenPor = 'fecha';
let activeOrdenAsc = true;
let closedFechaDesde = '';
let closedFechaHasta = '';
let closedOrdenPor = 'fecha';
let closedOrdenAsc = true;

// Cargar datos al iniciar
window.onload = function() {
    const saved = localStorage.getItem('mpLoans');
    if (saved) {
        loans = JSON.parse(saved);
    }
    const savedConfig = localStorage.getItem('mpConfig');
    if (savedConfig) {
        const config = JSON.parse(savedConfig);
        fechaCorte = config.fechaCorte || 15;
        fechaLimite = config.fechaLimite || 20;
    }
    document.getElementById('fechaCorte').value = fechaCorte;
    document.getElementById('fechaLimite').value = fechaLimite;
    document.getElementById('loanDate').valueAsDate = new Date();
    renderLoans();
};

function saveConfig() {
    fechaCorte = parseInt(document.getElementById('fechaCorte').value);
    fechaLimite = parseInt(document.getElementById('fechaLimite').value);
    const config = { fechaCorte, fechaLimite };
    localStorage.setItem('mpConfig', JSON.stringify(config));
    alert('Configuración guardada');
    renderAnalisis(); // Re-render charts with new config
}

function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
}

function toggleView() {
    viewMode = viewMode === 'cards' ? 'table' : 'cards';
    renderActiveLoans();
}

function toggleClosedView() {
    closedViewMode = closedViewMode === 'cards' ? 'table' : 'cards';
    renderLoans();
}

function applyActiveFilters() {
    activeFechaDesde = document.getElementById('activeFechaDesde').value;
    activeFechaHasta = document.getElementById('activeFechaHasta').value;
    activeOrdenPor = document.getElementById('activeOrdenPor').value;
    activeOrdenAsc = document.getElementById('activeOrdenDir').value === 'asc';
    activePageCards = 1;
    activePageTable = 1;
    renderActiveLoans();
    // Ocultar filtros después de aplicar
    document.getElementById('activeFilters').style.display = 'none';
    document.querySelector('#activeLoansTab button[onclick="toggleActiveFilters()"]').textContent = 'Mostrar Filtros';
}

function applyClosedFilters() {
    closedFechaDesde = document.getElementById('closedFechaDesde').value;
    closedFechaHasta = document.getElementById('closedFechaHasta').value;
    closedOrdenPor = document.getElementById('closedOrdenPor').value;
    closedOrdenAsc = document.getElementById('closedOrdenDir').value === 'asc';
    closedPageCards = 1;
    closedPageTable = 1;
    renderClosedLoans();
    // Ocultar filtros después de aplicar
    document.getElementById('closedFilters').style.display = 'none';
    document.querySelector('#closedLoansTab button[onclick="toggleClosedFilters()"]').textContent = 'Mostrar Filtros';
}

function toggleActiveFilters() {
    const filters = document.getElementById('activeFilters');
    const button = document.querySelector('#activeLoansTab button[onclick="toggleActiveFilters()"]');
    if (filters.style.display === 'none') {
        filters.style.display = 'block';
        button.textContent = 'Ocultar Filtros';
    } else {
        filters.style.display = 'none';
        button.textContent = 'Mostrar Filtros';
    }
}

function toggleClosedFilters() {
    const filters = document.getElementById('closedFilters');
    const button = document.querySelector('#closedLoansTab button[onclick="toggleClosedFilters()"]');
    if (filters.style.display === 'none') {
        filters.style.display = 'block';
        button.textContent = 'Ocultar Filtros';
    } else {
        filters.style.display = 'none';
        button.textContent = 'Mostrar Filtros';
    }
}

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    
    // Find and activate the corresponding button
    const button = document.querySelector(`button[onclick="switchTab('${tab}')"]`);
    if (button) button.classList.add('active');
    
    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');
    
    if (tab === 'new') {
        document.getElementById('newLoanTab').classList.add('active');
    } else if (tab === 'active') {
        document.getElementById('activeLoansTab').classList.add('active');
        renderActiveLoans();
    } else if (tab === 'closed') {
        document.getElementById('closedLoansTab').classList.add('active');
    } else if (tab === 'analisis') {
        document.getElementById('analisisTab').classList.add('active');
        renderAnalisis();
    }
}

function calculateLoan(amount, term, startDate, paymentsMade = 0) {
    const iva = 0.16;
    
    // ANÁLISIS CORRECTO de los datos reales:
    // Mercado Pago NO usa sistema francés
    // La mensualidad es FIJA y se calcula al inicio
    
    // Esc1: $1000, 12 meses, total=$1,636.08, mens=$136.34
    // Esc2: $950, 12 meses, total=$1,554.24, mens=$129.52
    // Esc3: $5000, 12 meses, total=$8,449.44, mens=$704.12
    // Esc4: $1950, 12 meses, total=$3,383.99, mens=$282.00
    
    // Calcular factores con mayor precisión basados en datos reales
    let factorTotal;
    if (amount <= 500) {
        factorTotal = 1.725; // Para $277
    } else if (amount <= 1000) {
        factorTotal = 1.636083333333333; // Para $950-$1000
    } else if (amount <= 2000) {
        factorTotal = 1.735384615384615; // Para $1950
    } else if (amount <= 4000) {
        // Interpolar entre $1950 (1.735) y $3500 (1.528)
        const ratio = (amount - 1950) / (3500 - 1950);
        factorTotal = 1.735 + ratio * (1.528 - 1.735);
    } else {
        factorTotal = 1.689888; // Para $5000+
    }
    
    // Total y mensualidad fija - mantener máxima precisión
    const totalOriginal = amount * factorTotal;
    const mensualidadFija = totalOriginal / term;
    
    // Tasas de interés por monto
    let tasaMensual;
    if (amount <= 1000) {
        tasaMensual = 0.05222;
    } else if (amount <= 2000) {
        tasaMensual = 0.07880;
    } else {
        tasaMensual = 0.0816;
    }
    
    // Construir tabla de amortización
    // Mercado Pago usa un sistema donde el interés se mantiene alto al inicio
    let saldo = amount;
    let capitalAcumulado = 0;
    const amortizacion = [];
    
    // Primera pasada: calcular toda la tabla desde el inicio
    for (let i = 0; i < term; i++) {
        const interesCuota = amount * tasaMensual; // Siempre sobre monto original
        const ivaCuota = interesCuota * iva;
        const capitalCuota = mensualidadFija - interesCuota - ivaCuota;
        
        amortizacion.push({
            capital: capitalCuota,
            interes: interesCuota,
            iva: ivaCuota,
            cuota: mensualidadFija,
            saldoInicial: saldo,
            saldoFinal: Math.max(0, saldo - capitalCuota)
        });
        
        if (i < paymentsMade) {
            capitalAcumulado += capitalCuota;
            saldo -= capitalCuota;
        }
    }
    
    // Capital restante y total a pagar
    const capitalRestante = amount - capitalAcumulado;
    const cuotasRestantes = term - paymentsMade;
    const totalPagarRestante = mensualidadFija * cuotasRestantes;
    
    // Próxima cuota
    const proximaCuota = amortizacion[paymentsMade] || amortizacion[0];
    
    // Pago anticipado
    const hoy = new Date();
    const [year, month, day] = startDate.split('-');
    const inicio = new Date(year, month - 1, day);
    const diasTranscurridos = Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24));
    
    // La tasa diaria parece variar:
    // - Para préstamos nuevos (0 pagos): ~0.303% diario
    // - Para préstamos con pagos: ~0.132% diario sobre capital restante
    const tasaDiaria = paymentsMade > 0 ? 0.00132 : 0.00303;
    const interesesDiarios = capitalRestante * tasaDiaria * diasTranscurridos;
    const pagoAnticipado = capitalRestante + interesesDiarios;
    
    return {
        mensualidad: Math.round(mensualidadFija * 100) / 100,
        totalPagar: Math.round(totalPagarRestante * 100) / 100,
        pagoAnticipado: Math.round(pagoAnticipado * 100) / 100,
        capitalMensual: Math.round(proximaCuota.capital * 100) / 100,
        interesMensual: Math.round(proximaCuota.interes * 100) / 100,
        ivaMensual: Math.round(proximaCuota.iva * 100) / 100,
        pagosRestantes: cuotasRestantes,
        capitalRestante: Math.round(capitalRestante * 100) / 100,
        diasTranscurridos: diasTranscurridos
    };
}

function addLoan() {
    const dateInput = document.getElementById('loanDate').value;
    const amount = parseFloat(document.getElementById('loanAmount').value);
    const term = parseInt(document.getElementById('loanTerm').value);
    
    if (!dateInput || !amount || !term) {
        alert('Por favor completa todos los campos');
        return;
    }
    
    const [year, month, day] = dateInput.split('-');
    const date = `${year}-${month}-${day}`;
    
    const loan = {
        id: Date.now(),
        date,
        amount,
        term,
        paymentsMade: 0,
        status: 'active',
        createdAt: new Date().toISOString()
    };
    
    loans.push(loan);
    saveLoans();
    
    document.getElementById('loanAmount').value = '';
    switchTab('active');
    renderLoans();
}

function makePayment(loanId) {
    const loan = loans.find(l => l.id === loanId);
    if (loan && loan.paymentsMade < loan.term) {
        loan.paymentsMade++;
        if (loan.paymentsMade >= loan.term) {
            loan.status = 'closed';
            loan.closedAt = new Date().toISOString();
        }
        saveLoans();
        if (currentTab === 'active') renderActiveLoans(); else renderLoans();
    }
}

function closeLoan(loanId) {
    const loan = loans.find(l => l.id === loanId);
    if (loan && confirm('¿Cerrar este préstamo? Se marcará como pagado completamente.')) {
        loan.status = 'closed';
        loan.closedAt = new Date().toISOString();
        saveLoans();
        if (currentTab === 'active') renderActiveLoans(); else renderLoans();
    }
}

function deleteLoan(loanId) {
    if (confirm('¿Eliminar este préstamo del historial?')) {
        loans = loans.filter(l => l.id !== loanId);
        saveLoans();
        if (currentTab === 'active') renderActiveLoans(); else renderLoans();
    }
}

function saveLoans() {
    localStorage.setItem('mpLoans', JSON.stringify(loans));
}

function renderLoans() {
    const closedContainer = document.getElementById('closedLoans');
    let closedLoans = loans.filter(l => l.status === 'closed');
    
    // Aplicar filtros
    let filteredLoans = closedLoans.filter(loan => {
        const date = loan.date;
        return (!closedFechaDesde || date >= closedFechaDesde) && (!closedFechaHasta || date <= closedFechaHasta);
    });
    
    // Aplicar orden
    filteredLoans.sort((a, b) => {
        let valA, valB;
        if (closedOrdenPor === 'fecha') {
            valA = a.date;
            valB = b.date;
        } else {
            valA = a.amount;
            valB = b.amount;
        }
        if (closedOrdenAsc) {
            return valA > valB ? 1 : valA < valB ? -1 : 0;
        } else {
            return valA < valB ? 1 : valA > valB ? -1 : 0;
        }
    });
    
    if (closedViewMode === 'cards') {
        // Paginación para cerrados en tarjetas
        const currentPage = closedPageCards;
        const itemsPerPage = itemsPerPageClosed;
        const closedStart = (currentPage - 1) * itemsPerPage;
        const closedEnd = closedStart + itemsPerPage;
        const closedPageLoans = filteredLoans.slice(closedStart, closedEnd);
        
        if (closedPageLoans.length === 0 && filteredLoans.length > 0) {
            closedPageCards = 1;
            return renderLoans();
        }
        
        if (closedPageLoans.length === 0) {
            closedContainer.innerHTML = '<div class="empty-state">No hay préstamos en el historial</div>';
        } else {
            closedContainer.innerHTML = closedPageLoans.map(loan => renderLoanCard(loan)).join('');
        }
        
        // Render pagination
        renderPagination('closed-cards', filteredLoans.length, currentPage, itemsPerPage);
    } else if (closedViewMode === 'table') {
        // Vista tabla para cerrados con paginación
        const currentPage = closedPageTable;
        const itemsPerPage = 10;
        const closedStart = (currentPage - 1) * itemsPerPage;
        const closedEnd = closedStart + itemsPerPage;
        const closedPageLoans = filteredLoans.slice(closedStart, closedEnd);
        
        if (closedPageLoans.length === 0 && filteredLoans.length > 0) {
            closedPageTable = 1;
            return renderLoans();
        }
        
        const tableHTML = `
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; background: #e0e5ec; border-radius: 8px; overflow: hidden; box-shadow: inset 6px 6px 12px rgba(163,177,198,0.6), inset -6px -6px 12px rgba(255,255,255,0.8); min-width: 800px;">
                    <thead>
                        <tr style="background: #e0e5ec; box-shadow: inset 3px 3px 6px rgba(163,177,198,0.6), inset -3px -3px 6px rgba(255,255,255,0.8);">
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #555;">Fecha</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #555;">Monto</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #555;">Plazo</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #555;">Pagos</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #555;">Estado</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #555;">Mensualidad</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #555;">Total Pagado</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #555;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${closedPageLoans.map(loan => {
                            const calc = calculateLoan(loan.amount, loan.term, loan.date, loan.paymentsMade);
                            const totalPagado = (loan.paymentsMade * calc.mensualidad).toFixed(2);
                            return `
                                <tr style="border-bottom: 1px solid #ccc;">
                                    <td style="padding: 12px; color: #555;">${loan.date.split('-').reverse().join('/')}</td>
                                    <td style="padding: 12px; color: #555;">$${loan.amount.toFixed(2)}</td>
                                    <td style="padding: 12px; color: #555;">${loan.term} meses</td>
                                    <td style="padding: 12px; color: #555;">${loan.paymentsMade} / ${loan.term}</td>
                                    <td style="padding: 12px; color: #555;">
                                        <span style="padding: 4px 8px; border-radius: 12px; font-size: 0.8em; font-weight: 600; background: #cce5ff; color: #004085;">
                                            CERRADO
                                        </span>
                                    </td>
                                    <td style="padding: 12px; color: #555;">$${calc.mensualidad.toFixed(2)}</td>
                                    <td style="padding: 12px; color: #555;">$${totalPagado}</td>
                                    <td style="padding: 12px;">
                                        <button class="btn-danger btn-small" onclick="deleteLoan(${loan.id})">Eliminar</button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
        closedContainer.innerHTML = tableHTML;
        
        // Render pagination
        renderPagination('closed-table', filteredLoans.length, currentPage, itemsPerPage);
    }
    
    // Update toggle button text
    const closedToggleBtn = document.getElementById('closedViewToggle');
    closedToggleBtn.textContent = closedViewMode === 'cards' ? 'Cambiar a Vista Tabla' : 'Cambiar a Vista Tarjetas';
}function renderActiveLoans() {
    const activeContainer = document.getElementById('activeLoans');
    let activeLoans = loans.filter(l => l.status === 'active');
    
    // Aplicar filtros
    let filteredLoans = activeLoans.filter(loan => {
        const date = loan.date;
        return (!activeFechaDesde || date >= activeFechaDesde) && (!activeFechaHasta || date <= activeFechaHasta);
    });
    
    // Aplicar orden
    filteredLoans.sort((a, b) => {
        let valA, valB;
        if (activeOrdenPor === 'fecha') {
            valA = a.date;
            valB = b.date;
        } else {
            valA = a.amount;
            valB = b.amount;
        }
        if (activeOrdenAsc) {
            return valA > valB ? 1 : valA < valB ? -1 : 0;
        } else {
            return valA < valB ? 1 : valA > valB ? -1 : 0;
        }
    });
    
    if (viewMode === 'cards') {
        // Paginación para activos en tarjetas
        const currentPage = activePageCards;
        const itemsPerPage = itemsPerPageActive;
        const activeStart = (currentPage - 1) * itemsPerPage;
        const activeEnd = activeStart + itemsPerPage;
        const activePageLoans = filteredLoans.slice(activeStart, activeEnd);
        
        if (activePageLoans.length === 0 && filteredLoans.length > 0) {
            activePageCards = 1;
            return renderActiveLoans();
        }
        
        if (activePageLoans.length === 0) {
            activeContainer.innerHTML = '<div class="empty-state">No hay préstamos activos</div>';
        } else {
            activeContainer.innerHTML = activePageLoans.map(loan => renderLoanCard(loan)).join('');
        }
        
        // Render pagination
        renderPagination('active-cards', filteredLoans.length, currentPage, itemsPerPage);
    } else if (viewMode === 'table') {
        // Vista tabla para activos con paginación
        const currentPage = activePageTable;
        const itemsPerPage = 10; // Más filas en tabla
        const activeStart = (currentPage - 1) * itemsPerPage;
        const activeEnd = activeStart + itemsPerPage;
        const activePageLoans = filteredLoans.slice(activeStart, activeEnd);
        
        if (activePageLoans.length === 0 && filteredLoans.length > 0) {
            activePageTable = 1;
            return renderActiveLoans();
        }
        
        const tableHTML = `
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; background: #e0e5ec; border-radius: 8px; overflow: hidden; box-shadow: inset 6px 6px 12px rgba(163,177,198,0.6), inset -6px -6px 12px rgba(255,255,255,0.8); min-width: 800px;">
                    <thead>
                        <tr style="background: #e0e5ec; box-shadow: inset 3px 3px 6px rgba(163,177,198,0.6), inset -3px -3px 6px rgba(255,255,255,0.8);">
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #555;">Fecha</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #555;">Monto</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #555;">Plazo</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #555;">Pagos</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #555;">Pago Anticipado</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #555;">Mensualidad</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #555;">Total a Pagar</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #555;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${activePageLoans.map(loan => {
                            const calc = calculateLoan(loan.amount, loan.term, loan.date, loan.paymentsMade);
                            return `
                                <tr style="border-bottom: 1px solid #ccc;">
                                    <td style="padding: 12px; color: #555;">${loan.date.split('-').reverse().join('/')}</td>
                                    <td style="padding: 12px; color: #555;">$${loan.amount.toFixed(2)}</td>
                                    <td style="padding: 12px; color: #555;">${loan.term} meses</td>
                                    <td style="padding: 12px; color: #555;">${loan.paymentsMade} / ${loan.term}</td>
                                    <td style="padding: 12px; color: #555;">$${calc.pagoAnticipado.toFixed(2)}</td>
                                    <td style="padding: 12px; color: #555;">$${calc.mensualidad.toFixed(2)}</td>
                                    <td style="padding: 12px; color: #555;">$${calc.totalPagar.toFixed(2)}</td>
                                    <td style="padding: 12px;">
                                        <button class="btn-success btn-small" onclick="makePayment(${loan.id})">Pago</button>
                                        <button class="btn-secondary btn-small" onclick="closeLoan(${loan.id})">Cerrar</button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
        activeContainer.innerHTML = tableHTML;
        
        // Render pagination
        renderPagination('active-table', filteredLoans.length, currentPage, itemsPerPage);
    }
    
    // Update toggle button text
    const toggleBtn = document.getElementById('viewToggle');
    toggleBtn.textContent = viewMode === 'cards' ? 'Cambiar a Vista Tabla' : 'Cambiar a Vista Tarjetas';
}

function renderLoanCard(loan) {
    const calc = calculateLoan(loan.amount, loan.term, loan.date, loan.paymentsMade);
    const progress = (loan.paymentsMade / loan.term) * 100;
    
    return `
        <div class="loan-item ${loan.status === 'closed' ? 'closed' : ''}">
            <div class="loan-header">
                <div class="loan-title">Préstamo de $${loan.amount.toFixed(2)}</div>
                <div class="loan-status ${loan.status === 'active' ? 'status-active' : 'status-closed'}">
                    ${loan.status === 'active' ? 'ACTIVO' : 'CERRADO'}
                </div>
            </div>
            
            <div class="loan-details">
                <div class="detail-item">
                    <div class="detail-label">Fecha de Solicitud</div>
                    <div class="detail-value">${loan.date.split('-').reverse().join('/')}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Plazo</div>
                    <div class="detail-value">${loan.term} meses</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Pagos Realizados</div>
                    <div class="detail-value">${loan.paymentsMade} / ${loan.term}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Pago Anticipado (${calc.diasTranscurridos} días)</div>
                    <div class="detail-value" style="color: #667eea;">$${calc.pagoAnticipado.toFixed(2)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Total a Pagar</div>
                    <div class="detail-value">$${calc.totalPagar.toFixed(2)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Mensualidad</div>
                    <div class="detail-value">$${calc.mensualidad.toFixed(2)}</div>
                </div>
            </div>
            
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%">
                    ${progress.toFixed(0)}%
                </div>
            </div>
            
            <div class="payment-breakdown">
                <div class="breakdown-title">Desglose de Mensualidad</div>
                <div class="breakdown-item">
                    <span>Capital</span>
                    <span>$${calc.capitalMensual.toFixed(2)}</span>
                </div>
                <div class="breakdown-item">
                    <span>Interés</span>
                    <span>$${calc.interesMensual.toFixed(2)}</span>
                </div>
                <div class="breakdown-item">
                    <span>IVA (16%)</span>
                    <span>$${calc.ivaMensual.toFixed(2)}</span>
                </div>
                <div class="breakdown-item" style="font-weight: 700; border-bottom: 2px solid #667eea;">
                    <span>Total Mensualidad</span>
                    <span>$${calc.mensualidad.toFixed(2)}</span>
                </div>
            </div>
            
            <div class="loan-actions">
                ${loan.status === 'active' ? `
                    <button class="btn-success btn-small" onclick="makePayment(${loan.id})">
                        Registrar Pago
                    </button>
                    <button class="btn-secondary btn-small" onclick="closeLoan(${loan.id})">
                        Cerrar Préstamo
                    </button>
                ` : `
                    <button class="btn-danger btn-small" onclick="deleteLoan(${loan.id})">
                        Eliminar
                    </button>
                `}
            </div>
        </div>
    `;
}

function renderPagination(type, totalItems, currentPage, itemsPerPage) {
    const containerId = type.includes('active') ? 'activePagination' : 'closedPagination';
    const container = document.getElementById(containerId);
    
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    const prevDisabled = currentPage === 1;
    const nextDisabled = currentPage === totalPages;
    
    container.innerHTML = `
        <div style="display: flex; justify-content: center; gap: 10px; margin-top: 20px;">
            <button class="btn-secondary btn-small" onclick="changePage('${type}', ${currentPage - 1})" ${prevDisabled ? 'disabled' : ''}>Anterior</button>
            <span style="align-self: center; color: #555; font-weight: 600;">Página ${currentPage} de ${totalPages}</span>
            <button class="btn-secondary btn-small" onclick="changePage('${type}', ${currentPage + 1})" ${nextDisabled ? 'disabled' : ''}>Siguiente</button>
        </div>
    `;
}

function changePage(type, page) {
    if (type === 'active-cards') {
        activePageCards = page;
        renderActiveLoans();
    } else if (type === 'active-table') {
        activePageTable = page;
        renderActiveLoans();
    } else if (type === 'closed-cards') {
        closedPageCards = page;
        renderLoans();
    } else if (type === 'closed-table') {
        closedPageTable = page;
        renderLoans();
    }
}

function renderAnalisis() {
    // Destroy existing charts
    if (statusChart) statusChart.destroy();
    if (amountChart) amountChart.destroy();
    if (amountByMonthChart) amountByMonthChart.destroy();
    if (termChart) termChart.destroy();
    if (monthlyChart) monthlyChart.destroy();
    
    const activeLoans = loans.filter(l => l.status === 'active');
    const closedLoans = loans.filter(l => l.status === 'closed');
    
    const totalActiveAmount = activeLoans.reduce((sum, l) => sum + l.amount, 0);
    const totalClosedAmount = closedLoans.reduce((sum, l) => sum + l.amount, 0);
    
    // Pie chart for loan status
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    statusChart = new Chart(statusCtx, {
        type: 'pie',
        data: {
            labels: ['Activos', 'Cerrados'],
            datasets: [{
                data: [activeLoans.length, closedLoans.length],
                backgroundColor: ['#667eea', '#28a745'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Distribución de Préstamos por Estado'
                }
            }
        }
    });
    
    // Bar chart for amounts
    const amountCtx = document.getElementById('amountChart').getContext('2d');
    amountChart = new Chart(amountCtx, {
        type: 'bar',
        data: {
            labels: ['Activos', 'Cerrados'],
            datasets: [{
                label: 'Monto Total ($)',
                data: [totalActiveAmount, totalClosedAmount],
                backgroundColor: ['#667eea', '#28a745'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Montos Totales por Estado'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // Monthly chart - total pending payments per month
    const monthlyData = {};
    const today = new Date();
    activeLoans.forEach(loan => {
        const calc = calculateLoan(loan.amount, loan.term, loan.date, loan.paymentsMade);
        const monthly = calc.mensualidad;
        const pagosRestantes = calc.pagosRestantes;
        
        // Calculate payment dates
        const [year, month, day] = loan.date.split('-').map(Number);
        let paymentDate = new Date(year, month, fechaLimite - 1); // First payment in next month
        
        for (let i = 0; i < pagosRestantes; i++) {
            const paymentMonth = paymentDate.getFullYear() + '-' + String(paymentDate.getMonth() + 1).padStart(2, '0');
            if (!monthlyData[paymentMonth]) monthlyData[paymentMonth] = 0;
            monthlyData[paymentMonth] += monthly;
            
            // Next payment
            paymentDate.setMonth(paymentDate.getMonth() + 1);
        }
    });
    
    const months = Object.keys(monthlyData).sort();
    const monthlyAmounts = months.map(m => monthlyData[m]);
    
    const monthlyCtx = document.getElementById('monthlyChart').getContext('2d');
    monthlyChart = new Chart(monthlyCtx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Pagos Pendientes ($)',
                data: monthlyAmounts,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Pagos Mensuales Pendientes'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // Amount by month chart
    const amountByMonthData = {};
    loans.forEach(loan => {
        const month = loan.date.substring(0, 7);
        if (!amountByMonthData[month]) amountByMonthData[month] = 0;
        amountByMonthData[month] += loan.amount;
    });
    const monthsAmount = Object.keys(amountByMonthData).sort();
    const amounts = monthsAmount.map(m => amountByMonthData[m]);
    
    const amountByMonthCtx = document.getElementById('amountByMonthChart').getContext('2d');
    amountByMonthChart = new Chart(amountByMonthCtx, {
        type: 'bar',
        data: {
            labels: monthsAmount,
            datasets: [{
                label: 'Monto Solicitado ($)',
                data: amounts,
                backgroundColor: '#28a745',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Montos Solicitados por Mes'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // Term distribution chart
    const termData = {};
    loans.forEach(loan => {
        if (!termData[loan.term]) termData[loan.term] = 0;
        termData[loan.term]++;
    });
    const terms = Object.keys(termData).sort((a,b) => a - b);
    const termCounts = terms.map(t => termData[t]);
    
    const termCtx = document.getElementById('termChart').getContext('2d');
    termChart = new Chart(termCtx, {
        type: 'pie',
        data: {
            labels: terms.map(t => t + ' meses'),
            datasets: [{
                data: termCounts,
                backgroundColor: ['#ff6384', '#36a2eb', '#cc65fe', '#ffce56'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Distribución por Plazo'
                }
            }
        }
    });
}
