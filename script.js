// ===== Utilidades =====
function esDiaHabil(fecha) {
  const d = fecha.getDay();
  return d >= 1 && d <= 5;
}

let chart = null;

// ===== Cálculo y render UI =====
function calcularProyeccion() {
  const capitalInicial = Number(document.getElementById("capital").value);
  const interesMensual = Number(document.getElementById("interes").value);
  const meses = parseInt(document.getElementById("meses").value, 10);
  const error = document.getElementById("error");
  const resultados = document.getElementById("resultados");
  const tbody = document.querySelector("#tabla-resultados tbody");
  const roiEl = document.getElementById("roi");

  error.textContent = "";
  tbody.innerHTML = "";
  roiEl.textContent = "";
  resultados.classList.add("oculto");

  if (!capitalInicial || isNaN(interesMensual) || !meses || meses < 1) {
    error.textContent = "Por favor completa todos los campos correctamente.";
    return;
  }

  let capital = capitalInicial;
  let fechaActual = new Date();
  const labels = [];
  const data = [];

  for (let mes = 1; mes <= meses; mes++) {
    // fecha fin del mes (mismo día +1 mes)
    const fechaFin = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, fechaActual.getDate());

    // contar días hábiles reales entre fechaActual (inclusive) y fechaFin (exclusive)
    let diasHabiles = 0;
    let temp = new Date(fechaActual);
    while (temp < fechaFin) {
      if (esDiaHabil(temp)) diasHabiles++;
      temp.setDate(temp.getDate() + 1);
    }

    // si por alguna razón diasHabiles es 0 (mes raro) evitamos división por 0
    if (diasHabiles === 0) diasHabiles = 21;

    // tasa mensual a decimal
    const tasaMensual = interesMensual / 100;

    // convertimos a tasa diaria que compuesta diariamente durante diasHabiles da tasaMensual
    // (1 + r_m) = (1 + r_d)^{diasHabiles}  => r_d = (1 + r_m)^{1/d} - 1
    const tasaDiaria = Math.pow(1 + tasaMensual, 1 / diasHabiles) - 1;

    const capitalInicialMes = capital;

    // aplicar día a día (solo hábiles)
    for (let i = 0; i < diasHabiles; i++) {
      capital = capital * (1 + tasaDiaria);
    }

    const interesGanado = capital - capitalInicialMes;

    // redondeo entero para presentación
    const cIniRounded = Math.round(capitalInicialMes);
    const intRounded = Math.round(interesGanado);
    const cFinalRounded = Math.round(capital);

    tbody.innerHTML += `
      <tr>
        <td>Mes ${mes}</td>
        <td>$ ${cIniRounded.toLocaleString("es-ES")}</td>
        <td>$ ${intRounded.toLocaleString("es-ES")}</td>
        <td>$ ${cFinalRounded.toLocaleString("es-ES")}</td>
      </tr>
    `;

    labels.push(`Mes ${mes}`);
    data.push(cFinalRounded);

    // avanzar al siguiente mes
    fechaActual = new Date(fechaFin);
  }

  const roiTotal = ((capital / capitalInicial) - 1) * 100;
  roiEl.textContent = `Retorno total: ${Math.round(roiTotal)}%`;

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
          g.addColorStop(0, 'rgba(255,153,51,0.7)');
          g.addColorStop(1, 'rgba(204,119,34,0.6)');
          return g;
        },
        borderColor: '#CC7722',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: '#FFB366' }, grid: { color: 'transparent' } },
        y: { ticks: { color: '#FFB366' }, grid: { color: '#4A3316' } }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0b0b0b', titleColor: '#FF9933', bodyColor: '#fff',
          callbacks: { label: ctx => `$ ${Number(ctx.raw).toLocaleString('es-ES')}` }
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
  const capitalInicial = Math.round(Number(document.getElementById("capital").value));
  const interesMensual = Number(document.getElementById("interes").value);
  const meses = Number(document.getElementById("meses").value);
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
    pdf.setTextColor(255, 153, 51);
    const headers = ['Mes', 'Capital Inicial', 'Interés', 'Capital Final'];
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
  pdf.setTextColor(255, 153, 51);
  pdf.text('Simulación de Crecimiento de Capital', pageWidth / 2, 13, { align: 'center' });
  y = 26;

  // ── RESUMEN ───────────────────────────────────────────────────────────────
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(50, 50, 50);
  const resumen = `Con una inversión inicial de $ ${capitalInicial.toLocaleString('es-ES')} al ${interesMensual}% mensual, en ${meses} meses tu capital se proyecta a ${capitalFinalText}.`;
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
    pdf.setTextColor(255, 153, 51);
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
          backgroundColor: 'rgba(204,119,34,0.75)',
          borderColor: '#CC7722',
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