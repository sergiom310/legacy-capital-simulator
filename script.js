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

// ===== Generación de PDF (modo mixto: blanco / corporativo) =====
async function generarPDF() {
  // si no hay resultados, evitar generar
  const tbody = document.querySelector("#tabla-resultados tbody");
  if (!tbody || tbody.children.length === 0) {
    alert("Primero genera la proyección con 'Calcular'.");
    return;
  }

  // preparar contenido para PDF (plantilla ligera en blanco)
  const exportable = document.getElementById("exportable");

  // crear contenedor oculto con estilo claro (pdfTemplateWrapper)
  let wrapper = document.getElementById("pdfTemplateWrapper");
  if (wrapper) wrapper.remove();

  wrapper = document.createElement("div");
  wrapper.id = "pdfTemplateWrapper";
  document.body.appendChild(wrapper);

  const pdfTemplate = document.createElement("div");
  pdfTemplate.id = "pdfTemplate";
  pdfTemplate.innerHTML = `
    <div class="pdf-header">
      <img src="logo_back.png" width="290" alt="logo" />
      <div class="pdf-title">Simulación de Crecimiento Capital Legacy Capital</div>
    </div>
    <div class="pdf-summary" id="pdfSummary"></div>
    <table class="pdf-table" id="pdfTable">
      <thead>
        <tr><th>Mes</th><th>Capital Inicial</th><th>Interés</th><th>Capital Final</th></tr>
      </thead>
      <tbody></tbody>
    </table>
    <div style="margin-top:12px; text-align:center; color:#333; font-size:11px">Reporte generado automáticamente por Legacy Capital</div>
  `;
  wrapper.appendChild(pdfTemplate);

  // Llenar tabla del pdfTemplate con datos de la tabla visible
  const pdfTbody = pdfTemplate.querySelector("tbody");
  const rows = document.querySelectorAll("#tabla-resultados tbody tr");
  rows.forEach(r => {
    const cols = r.querySelectorAll("td");
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${cols[0].textContent}</td><td>${cols[1].textContent}</td><td>${cols[2].textContent}</td><td>${cols[3].textContent}</td>`;
    pdfTbody.appendChild(tr);
  });

  // Executive summary dinámico
  const capitalInicial = Math.round(Number(document.getElementById("capital").value));
  const interesMensual = Number(document.getElementById("interes").value);
  const meses = Number(document.getElementById("meses").value);
  // capital final (última fila)
  const ultimaFila = rows[rows.length - 1];
  const capitalFinalText = ultimaFila ? ultimaFila.querySelectorAll("td")[3].textContent : "";
  const pdfSummary = document.getElementById("pdfSummary");
  pdfSummary.innerHTML = `Con una inversión inicial de <strong>$ ${capitalInicial.toLocaleString('es-ES')}</strong> al <strong>${interesMensual}%</strong> mensual, en <strong>${meses} meses</strong> tu capital se proyecta a <strong>${capitalFinalText}</strong>.`;

  // Crear un canvas temporal para el gráfico del PDF con dimensiones fijas
  // Esto evita problemas de renderizado en resoluciones móviles
  if (chart && chart.data) {
    const tempCanvasContainer = document.createElement("div");
    tempCanvasContainer.style.width = "760px";
    tempCanvasContainer.style.height = "280px";
    tempCanvasContainer.style.position = "absolute";
    tempCanvasContainer.style.left = "-9999px";
    
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = 760;
    tempCanvas.height = 280;
    tempCanvasContainer.appendChild(tempCanvas);
    document.body.appendChild(tempCanvasContainer);
    
    // Crear un gráfico temporal con los mismos datos pero en tamaño fijo
    const tempChart = new Chart(tempCanvas.getContext("2d"), {
      type: 'bar',
      data: chart.data,
      options: {
        responsive: false,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 10,
            right: 10,
            bottom: 10,
            left: 10
          }
        },
        scales: {
          x: { 
            ticks: { color: '#666', font: { size: 10 } }, 
            grid: { color: '#e0e0e0' } 
          },
          y: { 
            ticks: { color: '#666', font: { size: 10 } }, 
            grid: { color: '#e0e0e0' } 
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        }
      }
    });
    
    // Esperar a que el gráfico se renderice
    await new Promise(r => setTimeout(r, 150));
    
    // Capturar la imagen del gráfico temporal
    const chartImg = document.createElement("img");
    chartImg.src = tempChart.toBase64Image();
    chartImg.style.width = "100%";
    chartImg.style.maxHeight = "280px";
    chartImg.style.marginTop = "12px";
    chartImg.style.objectFit = "contain";
    pdfTemplate.appendChild(chartImg);
    
    // Limpiar el gráfico y canvas temporal
    tempChart.destroy();
    document.body.removeChild(tempCanvasContainer);
  }

  // esperar un instante para que imágenes carguen correctamente
  await new Promise(r => setTimeout(r, 250));

  // generar canvas con html2canvas (scale para mayor resolución)
  const canvas = await html2canvas(pdfTemplate, { scale: 2, useCORS: true });
  const imgData = canvas.toDataURL("image/png");

  // preparar jsPDF (A4 vertical)
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // añadir imagen con márgenes (convertir px->mm aproximado)
  const imgProps = pdf.getImageProperties(imgData);
  const pdfImgWidth = pageWidth - 20; // margen 10mm cada lado
  const pdfImgHeight = (imgProps.height * pdfImgWidth) / imgProps.width;

  // Escribir fondo blanco (ya la imagen tiene blanco)
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // Agregar la imagen (centrada con margenes)
  pdf.addImage(imgData, 'PNG', 10, 10, pdfImgWidth, pdfImgHeight);

  // Pie con fecha
  const fecha = new Date().toLocaleDateString('es-ES');
  pdf.setFontSize(10);
  pdf.setTextColor(120);
  pdf.text(`Generado el ${fecha}`, 10, pageHeight - 10);

  // descargar
  pdf.save(`Reporte_MovveWallet_${fecha.replace(/\//g,'-')}.pdf`);

  // limpiar wrapper
  wrapper.remove();
}