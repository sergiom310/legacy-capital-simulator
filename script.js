let chart = null;

// ===== Limpiar simulación =====
function limpiarSimulacion() {
  // Limpiar inputs
  document.getElementById("capital").value = "";
  document.getElementById("interes").value = "";
  document.getElementById("periodo").value = "";
  
  // Restablecer valores por defecto
  document.getElementById("diasOperativos").value = "22";
  
  // Restablecer radios a sus valores por defecto
  document.querySelector('input[name="tipoInteres"][value="mensual"]').checked = true;
  document.querySelector('input[name="tipoPeriodo"][value="meses"]').checked = true;
  
  // Limpiar tabla
  const tbody = document.querySelector("#tabla-resultados tbody");
  if (tbody) tbody.innerHTML = "";
  
  // Limpiar ROI
  const roiEl = document.getElementById("roi");
  if (roiEl) roiEl.textContent = "";
  
  // Destruir gráfico
  if (chart) {
    chart.destroy();
    chart = null;
  }
  
  // Ocultar sección de resultados
  const resultados = document.getElementById("resultados");
  if (resultados) resultados.classList.add("oculto");
  
  // Limpiar mensajes de error
  const error = document.getElementById("error");
  if (error) error.textContent = "";
  
  // Actualizar visibilidad de días operativos
  toggleDiasOperativos();
}

// ===== Sincronizar tipo de interés con tipo de período =====
function sincronizarPeriodo() {
  const tipoInteres = document.querySelector('input[name="tipoInteres"]:checked').value;
  const radioMeses = document.querySelector('input[name="tipoPeriodo"][value="meses"]');
  const radioDias = document.querySelector('input[name="tipoPeriodo"][value="dias"]');
  
  if (tipoInteres === 'mensual') {
    radioMeses.checked = true;
  } else {
    radioDias.checked = true;
  }
  
  // Actualizar visibilidad del campo días operativos
  toggleDiasOperativos();
}

// ===== Mostrar/ocultar campo días operativos según período =====
function toggleDiasOperativos() {
  const tipoPeriodo = document.querySelector('input[name="tipoPeriodo"]:checked').value;
  const diasOperativosContainer = document.getElementById('diasOperativosContainer');
  
  if (tipoPeriodo === 'meses') {
    diasOperativosContainer.classList.remove('oculto');
  } else {
    diasOperativosContainer.classList.add('oculto');
  }
}

// Inicializar event listeners al cargar la página
document.addEventListener('DOMContentLoaded', function() {
  const radiosInteres = document.querySelectorAll('input[name="tipoInteres"]');
  radiosInteres.forEach(radio => {
    radio.addEventListener('change', sincronizarPeriodo);
  });
  
  const radiosPeriodo = document.querySelectorAll('input[name="tipoPeriodo"]');
  radiosPeriodo.forEach(radio => {
    radio.addEventListener('change', toggleDiasOperativos);
  });
  
  // Configuración inicial
  toggleDiasOperativos();
});

// ===== Cálculo y render UI =====
function calcularProyeccion() {
  const capitalInicial = Number(document.getElementById("capital").value);
  const tasaInteres = Number(document.getElementById("interes").value);
  const periodo = parseInt(document.getElementById("periodo").value, 10);
  const tipoInteres = document.querySelector('input[name="tipoInteres"]:checked').value;
  const tipoPeriodo = document.querySelector('input[name="tipoPeriodo"]:checked').value;
  const diasOperativos = parseInt(document.getElementById("diasOperativos").value, 10) || 22;
  const error = document.getElementById("error");
  const resultados = document.getElementById("resultados");
  const tbody = document.querySelector("#tabla-resultados tbody");
  const roiEl = document.getElementById("roi");

  error.textContent = "";
  tbody.innerHTML = "";
  roiEl.textContent = "";
  resultados.classList.add("oculto");

  if (!capitalInicial || isNaN(tasaInteres) || !periodo || periodo < 1) {
    error.textContent = "Por favor completa todos los campos correctamente.";
    return;
  }

  let capital = capitalInicial;
  const labels = [];
  const data = [];

  if (tipoPeriodo === 'meses') {
    // Cálculo por MESES
    if (tipoInteres === 'mensual') {
      // i% MENSUAL aplicado MES por MES
      for (let mes = 1; mes <= periodo; mes++) {
        const capitalInicialMes = capital; // Capital al inicio de ESTE mes
        const tasaMensual = tasaInteres / 100;
        
        // Aplicar interés una vez por mes
        capital = capital * (1 + tasaMensual);
        
        const interesGanado = capital - capitalInicialMes; // Interés de ESTE mes solamente
        const cIniFormatted = capitalInicialMes.toFixed(2);
        const intFormatted = interesGanado.toFixed(2);
        const cFinalFormatted = capital.toFixed(2);

        tbody.innerHTML += `
          <tr>
            <td>Mes ${mes}</td>
            <td>$ ${Number(cIniFormatted).toLocaleString("es-ES", {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td>$ ${Number(intFormatted).toLocaleString("es-ES", {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td>$ ${Number(cFinalFormatted).toLocaleString("es-ES", {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          </tr>
        `;

        labels.push(`Mes ${mes}`);
        data.push(Number(cFinalFormatted));
      }
    } else {
      // i% DIARIO aplicado DÍA por DÍA (meses convertidos a días operativos)
      const totalDias = periodo * diasOperativos; // Convertir meses a días operativos
      const tasaDiaria = tasaInteres / 100;
      let capitalInicialDelMes = capital; // Guardar capital al inicio de cada mes
      
      for (let dia = 1; dia <= totalDias; dia++) {
        capital = capital * (1 + tasaDiaria);
        
        // Mostrar cada X días (cada mes) o al final
        if (dia % diasOperativos === 0 || dia === totalDias) {
          const mes = Math.ceil(dia / diasOperativos);
          const interesDelMes = capital - capitalInicialDelMes; // Interés ganado en este mes
          
          const cIniFormatted = capitalInicialDelMes.toFixed(2);
          const intFormatted = interesDelMes.toFixed(2);
          const cFinalFormatted = capital.toFixed(2);

          tbody.innerHTML += `
            <tr>
              <td>Mes ${mes}</td>
              <td>$ ${Number(cIniFormatted).toLocaleString("es-ES", {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
              <td>$ ${Number(intFormatted).toLocaleString("es-ES", {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
              <td>$ ${Number(cFinalFormatted).toLocaleString("es-ES", {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            </tr>
          `;

          labels.push(`Mes ${mes}`);
          data.push(Number(cFinalFormatted));
          
          // Actualizar el capital inicial para el próximo mes
          capitalInicialDelMes = capital;
        }
      }
    }
  } else {
    // Cálculo por DÍAS CALENDARIO (todos los días, sin excepciones)
    let tasaDiaria;
    if (tipoInteres === 'mensual') {
      // Si el interés es mensual, lo convertimos a diario asumiendo 30 días por mes estándar
      const tasaMensual = tasaInteres / 100;
      tasaDiaria = Math.pow(1 + tasaMensual, 1 / 30) - 1;
    } else {
      // Si el interés ya es diario, lo usamos directamente
      tasaDiaria = tasaInteres / 100;
    }
    
    // Aplicar interés TODOS los días (incluyendo fines de semana)
    for (let diaCalendario = 1; diaCalendario <= periodo; diaCalendario++) {
      const capitalInicialDia = capital; // Capital al inicio de ESTE día
      
      // Aplicar interés cada día sin excepción
      capital = capital * (1 + tasaDiaria);

      // Mostrar TODOS los días (sin agrupación)
      const interesGanado = capital - capitalInicialDia; // Interés de ESTE día solamente
      const cIniFormatted = capitalInicialDia.toFixed(2);
      const intFormatted = interesGanado.toFixed(2);
      const cFinalFormatted = capital.toFixed(2);

      tbody.innerHTML += `
        <tr>
          <td>Día ${diaCalendario}</td>
          <td>$ ${Number(cIniFormatted).toLocaleString("es-ES", {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          <td>$ ${Number(intFormatted).toLocaleString("es-ES", {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          <td>$ ${Number(cFinalFormatted).toLocaleString("es-ES", {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
        </tr>
      `;

      labels.push(`Día ${diaCalendario}`);
      data.push(Number(cFinalFormatted));
    }
  }

  const roiTotal = ((capital / capitalInicial) - 1) * 100;
  roiEl.textContent = `Retorno total: ${roiTotal.toFixed(2)}%`;

  resultados.classList.remove("oculto");

  dibujarGrafico(labels, data);
}

// ===== Chart.js =====
function dibujarGrafico(labels, data) {
  const ctx = document.getElementById("grafico").getContext("2d");
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Capital Final (USD)',
        data,
        backgroundColor: function(context) {
          // gradiente simple
          const g = context.chart.ctx.createLinearGradient(0, 0, 0, 300);
          g.addColorStop(0, 'rgba(0,255,127,0.7)');
          g.addColorStop(1, 'rgba(0,204,102,0.6)');
          return g;
        },
        borderColor: '#00CC66',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: '#66FFB3' }, grid: { color: 'transparent' } },
        y: { ticks: { color: '#66FFB3' }, grid: { color: '#1A4D33' } }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0b0b0b', titleColor: '#00FF7F', bodyColor: '#fff',
          callbacks: { label: ctx => `$ ${Number(ctx.raw).toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` }
        }
      }
    }
  });
}

// ===== Generación de PDF (nativo jsPDF — sin recorte de imágenes) =====
async function generarPDF() {
  const tbody = document.querySelector("#tabla-resultados tbody");
  if (!tbody || tbody.children.length === 0) {
    alert("Primero genera la proyección con 'Calcular'.");
    return;
  }

  const rows = document.querySelectorAll("#tabla-resultados tbody tr");
  const capitalInicial = Number(document.getElementById("capital").value).toFixed(2);
  const tasaInteres = Number(document.getElementById("interes").value);
  const tipoInteres = document.querySelector('input[name="tipoInteres"]:checked').value;
  const tipoPeriodo = document.querySelector('input[name="tipoPeriodo"]:checked').value;
  const periodo = Number(document.getElementById("periodo").value);
  const diasOperativos = parseInt(document.getElementById("diasOperativos").value, 10) || 22;
  const ultimaFila = rows[rows.length - 1];
  const capitalFinalText = ultimaFila ? ultimaFila.querySelectorAll("td")[3].textContent.trim() : "";

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth  = pdf.internal.pageSize.getWidth();   // 210 mm
  const pageHeight = pdf.internal.pageSize.getHeight();  // 297 mm
  const margin = 14;
  const usableW = pageWidth - margin * 2;                // 182 mm
  const footerY = pageHeight - 8;

  // Columnas: Mes | Capital Inicial | Interés | Capital Final
  const colW  = [20, 56, 56, 50];
  const colX  = [margin, margin + 20, margin + 76, margin + 132];
  const rowH  = 7;
  const thH   = 9;

  let y = margin;

  // ── helpers ──────────────────────────────────────────────────────────────
  function newPage() {
    pdf.addPage();
    y = margin;
  }

  function ensureSpace(needed) {
    if (y + needed > footerY - 4) newPage();
  }

  function drawTableHeader() {
    pdf.setFillColor(25, 25, 25);
    pdf.rect(margin, y, usableW, thH, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 255, 127);
    const headers = ['Período', 'Capital Inicial', 'Interés', 'Capital Final'];
    headers.forEach((h, i) => {
      pdf.text(h, colX[i] + colW[i] / 2, y + 6, { align: 'center' });
    });
    y += thH;
  }

  // ── ENCABEZADO ────────────────────────────────────────────────────────────
  pdf.setFillColor(18, 18, 18);
  pdf.rect(0, 0, pageWidth, 20, 'F');
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 255, 127);
  pdf.text('Simulación de Crecimiento de Capital', pageWidth / 2, 13, { align: 'center' });
  y = 26;

  // ── RESUMEN ───────────────────────────────────────────────────────────────
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(50, 50, 50);
  const tipoTexto = tipoInteres === 'mensual' ? 'mensual' : 'diario';
  const periodoTexto = tipoPeriodo === 'meses' ? `${periodo} meses` : `${periodo} días`;
  const diasOpTexto = (tipoPeriodo === 'meses' && tipoInteres === 'diario') ? ` (${diasOperativos} días operativos/mes)` : '';
  const resumen = `Con una inversión inicial de $ ${Number(capitalInicial).toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} al ${tasaInteres}% ${tipoTexto}, en ${periodoTexto}${diasOpTexto}, tu capital se proyecta a ${capitalFinalText}.`;
  const resumenLines = pdf.splitTextToSize(resumen, usableW);
  pdf.text(resumenLines, pageWidth / 2, y, { align: 'center' });
  y += resumenLines.length * 5 + 6;

  // ── TABLA ─────────────────────────────────────────────────────────────────
  drawTableHeader();

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  rows.forEach((row, idx) => {
    ensureSpace(rowH);
    // Si se añadió página nueva, repetir cabecera
    if (y === margin) drawTableHeader();

    const cols = row.querySelectorAll('td');
    const bg = idx % 2 === 0 ? [255, 255, 255] : [250, 247, 242];
    pdf.setFillColor(...bg);
    pdf.rect(margin, y, usableW, rowH, 'F');
    pdf.setDrawColor(220, 220, 220);
    pdf.line(margin, y + rowH, margin + usableW, y + rowH);
    pdf.setTextColor(35, 35, 35);
    cols.forEach((col, i) => {
      pdf.text(col.textContent.trim(), colX[i] + colW[i] / 2, y + 5, { align: 'center' });
    });
    y += rowH;
  });

  y += 6;

  // ── ROI ───────────────────────────────────────────────────────────────────
  const roiText = document.getElementById("roi").textContent.trim();
  if (roiText) {
    ensureSpace(10);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 255, 127);
    pdf.text(roiText, pageWidth / 2, y, { align: 'center' });
    y += 10;
  }

  // ── GRÁFICO ───────────────────────────────────────────────────────────────
  if (chart && chart.data && chart.data.datasets && chart.data.datasets[0]) {
    const chartH_mm = 78;
    ensureSpace(chartH_mm + 4);

    // Canvas temporal de tamaño fijo para evitar diferencias de resolución
    const tmpContainer = document.createElement('div');
    tmpContainer.style.cssText = 'width:760px;height:280px;position:absolute;left:-9999px;top:0;';
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width  = 760;
    tmpCanvas.height = 280;
    tmpContainer.appendChild(tmpCanvas);
    document.body.appendChild(tmpContainer);

    const tmpChart = new Chart(tmpCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: chart.data.labels,
        datasets: [{
          data: chart.data.datasets[0].data,
          backgroundColor: 'rgba(0,204,102,0.75)',
          borderColor: '#00CC66',
          borderWidth: 1
        }]
      },
      options: {
        animation: false,
        responsive: false,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: '#444', font: { size: 10 } }, grid: { color: '#e0e0e0' } },
          y: { ticks: { color: '#444', font: { size: 10 } }, grid: { color: '#e0e0e0' } }
        },
        plugins: { legend: { display: false }, tooltip: { enabled: false } }
      }
    });

    // Esperar un frame para que Chart.js termine de pintar
    await new Promise(r => requestAnimationFrame(r));

    const chartImgData = tmpCanvas.toDataURL('image/png');
    const chartW_mm = usableW;
    pdf.addImage(chartImgData, 'PNG', margin, y, chartW_mm, chartH_mm);
    y += chartH_mm + 4;

    tmpChart.destroy();
    document.body.removeChild(tmpContainer);
  }

  // ── NOTA ──────────────────────────────────────────────────────────────────
  ensureSpace(10);
  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(130);
  pdf.text(
    '*Cálculo compuesto considerando solo días hábiles (lunes a viernes) y tasa mensual proporcional. Valores redondeados a enteros.',
    pageWidth / 2, y, { align: 'center' }
  );
  y += 5;
  pdf.text('Reporte generado automáticamente por Capital', pageWidth / 2, y, { align: 'center' });

  // ── PIE DE PÁGINA EN TODAS LAS HOJAS ─────────────────────────────────────
  const fecha = new Date().toLocaleDateString('es-ES');
  const totalPages = pdf.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setFontSize(8);
    pdf.setTextColor(160);
    pdf.text(`Generado el ${fecha}`, margin, footerY);
    pdf.text('© 2026 Capital — Proyección estimada, no representa consejo financiero.', pageWidth / 2, footerY, { align: 'center' });
    pdf.text(`${p} / ${totalPages}`, pageWidth - margin, footerY, { align: 'right' });
  }

  pdf.save(`Reporte_Capital_${fecha.replace(/\//g, '-')}.pdf`);
}