// Verifica autenticação
firebase.auth().onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    uid = user.uid;
    carregarParcelamentos();
  }
});

let uid = null;
let parcelamentos = [];

// 🎨 Config padrão gráficos
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.plugins.tooltip.backgroundColor = "#4f46e5";
Chart.defaults.plugins.tooltip.titleColor = "#fff";
Chart.defaults.plugins.tooltip.bodyColor = "#fff";

// Plugin para texto no centro do donut
const centerTextPlugin = {
  id: 'centerText',
  afterDraw(chart) {
    if (chart.config.options.centerText) {
      const ctx = chart.ctx;
      const { text1, text2 } = chart.config.options.centerText;
      ctx.save();
      ctx.font = "16px Inter";
      ctx.fillStyle = "#666";
      ctx.textAlign = "center";
      ctx.fillText(text1, chart.width / 2, chart.height / 2 - 5);
      ctx.font = "bold 22px Inter";
      ctx.fillStyle = "#000";
      ctx.fillText(text2, chart.width / 2, chart.height / 2 + 20);
      ctx.restore();
    }
  }
};

// Função para criar gradiente no gráfico
function criarGradiente(ctx, cor1, cor2) {
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, cor1);
  gradient.addColorStop(1, cor2);
  return gradient;
}

// 📊 Gráfico Pizza estilo donut com gradiente
const ctxPizza = document.getElementById('graficoPizza').getContext('2d');
let graficoPizza = new Chart(ctxPizza, {
  type: 'doughnut',
  data: {
    labels: ['Quitado', 'Pendente'],
    datasets: [{
      data: [0, 0],
      backgroundColor: [
        criarGradiente(ctxPizza, '#66bb6a', '#4caf50'),
        criarGradiente(ctxPizza, '#ffb74d', '#ff9800')
      ],
      borderWidth: 0
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { display: false }
    },
    centerText: {
      text1: 'Valor total',
      text2: 'R$ 0,00'
    }
  },
  plugins: [centerTextPlugin]
});

// 📥 Carregar dados
function carregarParcelamentos() {
  parcelamentos = [];
  db.collection('parcelamentos').where('uid', '==', uid).get().then(snapshot => {
    snapshot.forEach(doc => {
      let p = doc.data();
      p.id = doc.id;
      parcelamentos.push(p);
    });
    renderizarAcompanhamentos();
    atualizarResumo();
    atualizarGraficos();
  });
}

// 📄 Renderizar lista
function renderizarAcompanhamentos() {
  const div = document.getElementById('acompanhamento');
  div.innerHTML = '';
  const nomeFiltro = document.getElementById('buscaNome').value?.toLowerCase() || '';
  const statusFiltro = document.getElementById('filtroStatus').value;

  parcelamentos
    .filter(p => p.nome.toLowerCase().includes(nomeFiltro))
    .filter(p => !statusFiltro || (statusFiltro === 'quitado' && p.quitado) || (statusFiltro === 'pendente' && !p.quitado))
    .forEach(p => {
      const pagas = p.parcelas.filter(x => x.paga).length;
      const percent = Math.round((pagas / p.qtdTotal) * 100);
      const valorTotal = p.valorParcela * p.qtdTotal;

      // Gradiente da barra de progresso conforme status
      const barraGradiente = p.quitado
        ? "linear-gradient(90deg, #81c784, #4caf50)"
        : "linear-gradient(90deg, #ffcc80, #ff9800)";

      const card = document.createElement('div');
      card.className = 'parcelamento-card';
      card.style.background = '#fff';
      card.style.borderRadius = '10px';
      card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
      card.style.marginBottom = '1rem';
      card.style.overflow = 'hidden';

      card.innerHTML = `
        <div style="background:#f3f4f6; padding:0.6rem 1rem; display:flex; justify-content:space-between; align-items:center;">
          <strong style="color:#4f46e5; font-size:1.1rem;">${p.nome} - <span style="color:#111;">${formatarMoeda(valorTotal)}</span></strong>
          <div style="display:flex; gap:0.5rem; align-items:center;">
            <span class="${p.quitado ? 'status-quitado' : 'status-pendente'}">${p.quitado ? 'Quitado' : 'Pendente'}</span>
            <button onclick="removerParcelamento('${p.id}')" style="border:none; background:none; cursor:pointer; color:#ef4444; font-size:1.1rem;">🗑️</button>
            <button onclick="toggleParcelas('${p.id}')" style="border:none; background:#e0e7ff; color:#4338ca; padding:0.3rem 0.6rem; border-radius:6px; cursor:pointer; font-size:0.85rem;">Ocultar</button>
          </div>
        </div>
        <div id="parcelas-${p.id}" style="padding:0.8rem 1rem;">
          <div style="margin-bottom:0.5rem;">Progresso: ${pagas}/${p.qtdTotal} parcelas</div>
          <div style="background:#e5e7eb; height:8px; border-radius:4px; overflow:hidden; margin-bottom:0.8rem;">
            <div class="progress-bar" style="width:${percent}%; background:${barraGradiente}; height:100%;"></div>
          </div>
          <div style="display:flex; flex-direction:column; gap:0.3rem;">
            ${p.parcelas.map((parc, i) => `
              <label style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem; border:1px solid #e5e7eb; border-radius:6px; background:#fafafa;">
                <span>📅 Parcela ${i+1} - ${parc.data} - ${formatarMoeda(p.valorParcela)}</span>
                <input type="checkbox" ${parc.paga ? 'checked' : ''} onchange="marcarParcela('${p.id}', ${i})" />
              </label>
            `).join('')}
          </div>
        </div>
      `;
      div.appendChild(card);
    });
}

// Função para ocultar/mostrar parcelas
function toggleParcelas(id) {
  const parcelasDiv = document.getElementById(`parcelas-${id}`);
  const btn = event.target;
  if (parcelasDiv.style.display === 'none') {
    parcelasDiv.style.display = 'block';
    btn.textContent = 'Ocultar';
  } else {
    parcelasDiv.style.display = 'none';
    btn.textContent = 'Mostrar';
  }
}
window.toggleParcelas = toggleParcelas;

// 📊 Resumo
function atualizarResumo() {
  const total = parcelamentos.length;
  const quitados = parcelamentos.filter(p => p.quitado).length;
  document.getElementById('resumoTotal').textContent = total;
  document.getElementById('resumoQuitados').textContent = quitados;
  document.getElementById('resumoPendentes').textContent = total - quitados;
}

// 🔄 Atualizar gráficos
function atualizarGraficos() {
  const totalQuitado = parcelamentos
    .filter(p => p.quitado)
    .reduce((sum, p) => sum + (p.valorParcela * p.qtdTotal), 0);

  const totalPendente = parcelamentos
    .filter(p => !p.quitado)
    .reduce((sum, p) => sum + (p.valorParcela * p.qtdTotal), 0);

  graficoPizza.data.datasets[0].data = [totalQuitado, totalPendente];
  graficoPizza.options.centerText.text2 = formatarMoeda(totalQuitado + totalPendente);
  graficoPizza.update();

  // Atualiza legenda lateral
  const legendaDiv = document.getElementById('graficoLegenda');
  legendaDiv.innerHTML = `
    <span style="color:#4caf50;">Quitado <strong>${formatarMoeda(totalQuitado)}</strong></span>
    <span style="color:#ff9800;">Pendente <strong>${formatarMoeda(totalPendente)}</strong></span>
  `;
}

// 💾 Salvar novo parcelamento
document.getElementById('formParcelamento').addEventListener('submit', e => {
  e.preventDefault();
  const nome = document.getElementById('nomeDivida').value;
  const valorParcela = parseFloat(document.getElementById('valorParcela').value);
  const qtd = parseInt(document.getElementById('qtdParcelas').value);
  const inicio = document.getElementById('dataInicio').value;
  const parcelas = [];

  for (let i = 0; i < qtd; i++) {
    const d = new Date(inicio);
    d.setMonth(d.getMonth() + i);
    parcelas.push({ data: d.toISOString().slice(0, 10), paga: false });
  }

  const novo = { uid, nome, valorParcela, qtdTotal: qtd, parcelas, quitado: false, criadoEm: new Date().toISOString() };

  db.collection('parcelamentos').add(novo).then(() => {
    carregarParcelamentos();
    e.target.reset();
  });
});

// ✅ Marcar parcela
function marcarParcela(id, index) {
  const p = parcelamentos.find(p => p.id === id);
  if (!p) return;
  p.parcelas[index].paga = !p.parcelas[index].paga;
  p.quitado = p.parcelas.every(x => x.paga);

  db.collection('parcelamentos').doc(id).update(p).then(carregarParcelamentos);
}
window.marcarParcela = marcarParcela;

// 🗑️ Remover
function removerParcelamento(id) {
  if (confirm('Excluir parcelamento?')) {
    db.collection('parcelamentos').doc(id).delete().then(carregarParcelamentos);
  }
}
window.removerParcelamento = removerParcelamento;

// 🔍 Filtros
document.getElementById('buscaNome').addEventListener('input', renderizarAcompanhamentos);
document.getElementById('filtroStatus').addEventListener('change', renderizarAcompanhamentos);

// 💰 Função formatar moeda
function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
