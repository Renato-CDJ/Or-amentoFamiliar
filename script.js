// Verificação de autenticação
firebase.auth().onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "login.html";
  }
});

// Função de logout
function logout() {
  firebase.auth().signOut().then(() => {
    window.location.href = 'login.html';
  });
}

let categorias = ['Alimentação', 'Moradia', 'Transporte', 'Educação', 'Saúde', 'Lazer'];
const categoriaSelect = document.getElementById('categoriaDivida');
const novaCategoriaInput = document.getElementById('novaCategoria');

function atualizarSelectCategorias() {
  categoriaSelect.innerHTML = '';
  categorias.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    categoriaSelect.appendChild(option);
  });
}

function adicionarCategoria() {
  const nova = novaCategoriaInput.value.trim();
  if (nova && !categorias.includes(nova)) {
    categorias.push(nova);
    atualizarSelectCategorias();
    novaCategoriaInput.value = '';
  } else {
    alert('Categoria já existe ou inválida.');
  }
}

function removerCategoria() {
  const atual = categoriaSelect.value;
  if (confirm(`Deseja realmente remover a categoria "${atual}"?`)) {
    categorias = categorias.filter(c => c !== atual);
    atualizarSelectCategorias();
  }
}


// Elementos do DOM
const listaIrmaos = document.getElementById('listaIrmaos');
const formIrmao = document.getElementById('formIrmao');
const nomeIrmao = document.getElementById('nomeIrmao');
const rendaIrmao = document.getElementById('rendaIrmao');
const rendaTotal = document.getElementById('rendaTotal');
const checkboxIrmaos = document.getElementById('checkboxIrmaos');
const formDivida = document.getElementById('formDivida');
const categoriaDivida = document.getElementById('categoriaDivida');
const selectIrmao = document.getElementById('selectIrmao');
const formPoupanca = document.getElementById('formPoupanca');
const valorPoupado = document.getElementById('valorPoupado');
const listaPoupanca = document.getElementById('listaPoupanca');

let irmaos = [];
let dividas = [];
let poupanca = {};

formIrmao?.addEventListener('submit', (e) => {
  e.preventDefault();
  const nome = nomeIrmao.value.trim();
  const renda = parseFloat(rendaIrmao.value);
  if (nome && !isNaN(renda)) {
    const irmao = { nome, renda };
    db.collection('irmaos').add(irmao).then(() => {
      irmaos.push(irmao);
      atualizarIrmaos();
      atualizarResumo();
      nomeIrmao.value = '';
      rendaIrmao.value = '';
    }).catch(console.error);
  }
});

function atualizarIrmaos() {
  listaIrmaos.innerHTML = '';
  checkboxIrmaos.innerHTML = '';
  selectIrmao.innerHTML = '';

  irmaos.forEach((irmao, i) => {
    const li = document.createElement('li');
    li.innerHTML = `${irmao.nome} - R$ ${irmao.renda.toFixed(2)} <button onclick="excluirIrmao('${irmao.nome}')">🗑️</button>`;
    listaIrmaos.appendChild(li);

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `irmao-${i}`;
    checkbox.name = 'irmaosDivida';
    checkbox.value = irmao.nome;

    const label = document.createElement('label');
    label.htmlFor = `irmao-${i}`;
    label.appendChild(checkbox);
    label.append(` ${irmao.nome}`);

    checkboxIrmaos.appendChild(label);

    const option = document.createElement('option');
    option.value = irmao.nome;
    option.textContent = irmao.nome;
    selectIrmao.appendChild(option);
  });
  atualizarListaPoupanca();
}

function excluirIrmao(nome) {
  irmaos = irmaos.filter(i => i.nome !== nome);
  db.collection('irmaos').where('nome', '==', nome).get().then(snapshot => {
    snapshot.forEach(doc => doc.ref.delete());
  }).catch(console.error);
  atualizarIrmaos();
  atualizarResumo();
}

formDivida?.addEventListener('submit', (e) => {
  e.preventDefault();
  const descricao = document.getElementById('descDivida').value;
  const valor = parseFloat(document.getElementById('valorDivida').value);
  const dataVenc = document.getElementById('dataVencimento').value;
  const categoria = categoriaDivida.value;
  const selecionados = Array.from(document.querySelectorAll('input[name="irmaosDivida"]:checked')).map(cb => cb.value);

  if (descricao && !isNaN(valor) && selecionados.length > 0) {
    const porPessoa = valor / selecionados.length;
    const status = {};
    selecionados.forEach(i => status[i] = false);
    const divida = { descricao, valor, dataVenc, categoria, participantes: selecionados, status, porPessoa };

    db.collection('dividas').add(divida).then(() => {
      dividas.push(divida);
      atualizarGrafico();
      atualizarModal();
      formDivida.reset();
    }).catch(console.error);
  }
});

function atualizarResumo() {
  const totalRenda = irmaos.reduce((soma, i) => soma + i.renda, 0);
  rendaTotal.textContent = totalRenda.toFixed(2);
  atualizarGraficoRenda();
}

const ctx = document.getElementById('graficoPizza')?.getContext('2d');
let chartPizza;

function atualizarGrafico() {
  if (!ctx) return;
  const categorias = {};
  const cores = [];

  dividas.forEach(d => {
    categorias[d.categoria] = (categorias[d.categoria] || 0) + d.valor;
  });

  const labels = Object.keys(categorias);
  const valores = Object.values(categorias);

  labels.forEach(cat => {
    const todasPagas = dividas.filter(d => d.categoria === cat)
      .every(d => Object.values(d.status).every(pago => pago));
    cores.push(todasPagas ? '#4caf50' : '#ff6384');
  });

  if (chartPizza) chartPizza.destroy();

  chartPizza = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: valores, backgroundColor: cores }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

const ctxRenda = document.getElementById('graficoRenda')?.getContext('2d');
let chartRenda;

function atualizarGraficoRenda() {
  if (!ctxRenda) return;
  const labels = irmaos.map(i => i.nome);
  const dados = irmaos.map(i => i.renda);

  if (chartRenda) chartRenda.destroy();

  chartRenda = new Chart(ctxRenda, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Renda (R$)', data: dados, backgroundColor: '#36a2eb' }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

formPoupanca?.addEventListener('submit', (e) => {
  e.preventDefault();
  const nome = selectIrmao.value;
  const valor = parseFloat(valorPoupado.value);
  if (!isNaN(valor) && valor > 0) {
    poupanca[nome] = (poupanca[nome] || 0) + valor;
    db.collection('poupanca').add({ nome, valor }).then(() => {
      atualizarListaPoupanca();
      valorPoupado.value = '';
    }).catch(console.error);
  }
});

function atualizarListaPoupanca() {
  listaPoupanca.innerHTML = '';
  for (const [nome, valor] of Object.entries(poupanca)) {
    const li = document.createElement('li');
    li.textContent = `${nome} acumulou: R$ ${valor.toFixed(2)}`;
    listaPoupanca.appendChild(li);
  }
  atualizarGraficoPoupanca();
}

const ctxPoupanca = document.getElementById('graficoPoupanca')?.getContext('2d');
let chartPoupanca;

function atualizarGraficoPoupanca() {
  if (!ctxPoupanca) return;
  const labels = Object.keys(poupanca);
  const dados = Object.values(poupanca);

  if (chartPoupanca) chartPoupanca.destroy();

  chartPoupanca = new Chart(ctxPoupanca, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Valor Guardado (R$)', data: dados, backgroundColor: '#4caf50' }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function abrirModal() {
  document.getElementById('modalDividas').style.display = 'flex';
  atualizarModal();
}

function fecharModal() {
  document.getElementById('modalDividas').style.display = 'none';
}

document.getElementById('filtroStatus')?.addEventListener('change', atualizarModal);
document.getElementById('filtroCategoria')?.addEventListener('change', atualizarModal);

document.getElementById('listaModal')?.addEventListener('change', (e) => {
  if (e.target.matches('input[type="checkbox"][data-divida]')) {
    const index = e.target.dataset.divida;
    const nome = e.target.dataset.nome;
    dividas[index].status[nome] = e.target.checked;
    atualizarGrafico();
    atualizarModal();
  }
});

function atualizarModal() {
  const container = document.getElementById('listaModal');
  if (!container) return;
  container.innerHTML = '';
  const filtroStatus = document.getElementById('filtroStatus').value;
  const filtroCategoria = document.getElementById('filtroCategoria').value;
  const hoje = new Date();

  dividas.forEach((divida, index) => {
    const venc = new Date(divida.dataVenc);
    const atrasada = venc < hoje;
    const todosPagos = Object.values(divida.status).every(p => p);
    let status = todosPagos ? 'pago' : (atrasada ? 'atrasada' : 'pendente');

    if ((filtroStatus !== 'todos' && filtroStatus !== status) ||
        (filtroCategoria !== 'todas' && filtroCategoria !== divida.categoria)) return;

    const div = document.createElement('div');
    div.className = 'divida-detalhe';
    const statusTexto = `<span class="status-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`;

    const detalhes = document.createElement('div');
    detalhes.className = 'divida-info';
    detalhes.innerHTML = `
      ${statusTexto}<br>
      Categoria: ${divida.categoria}<br>
      Vencimento: ${divida.dataVenc}<br>
      Valor: R$ ${divida.valor.toFixed(2)}<br>
      ${divida.participantes.map(nome => {
        const checked = divida.status[nome] ? 'checked' : '';
        return `<label><input type="checkbox" data-divida="${index}" data-nome="${nome}" ${checked}> ${nome} - R$ ${divida.porPessoa.toFixed(2)}</label>`;
      }).join('<br>')}
      <br><button onclick="excluirDivida(${index})">Excluir Dívida</button>
    `;

    div.innerHTML = `<h3>${divida.descricao}</h3>`;
    div.appendChild(detalhes);
    div.addEventListener('click', () => {
      detalhes.style.display = detalhes.style.display === 'none' ? 'block' : 'none';
    });

    container.appendChild(div);
  });
}

function excluirDivida(index) {
  const descricao = dividas[index].descricao;
  db.collection('dividas').where('descricao', '==', descricao).get().then(snapshot => {
    snapshot.forEach(doc => doc.ref.delete());
  }).catch(console.error);
  dividas.splice(index, 1);
  atualizarGrafico();
  atualizarModal();
}

// Estilo e função para mostrar/ocultar gráficos com animação
document.head.insertAdjacentHTML("beforeend", `<style>.hidden{opacity:0;height:0!important;overflow:hidden;transition:all 0.3s ease}</style>`);

function toggleGrafico(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('hidden');
}

// Carregar dados do Firebase ao iniciar
window.addEventListener('DOMContentLoaded', () => {
  irmaos = [];
  dividas = [];
  poupanca = {};

  db.collection('irmaos').get().then(snapshot => {
    snapshot.forEach(doc => irmaos.push(doc.data()));
    atualizarIrmaos();
    atualizarResumo();
  }).catch(console.error);

  db.collection('dividas').get().then(snapshot => {
    snapshot.forEach(doc => dividas.push(doc.data()));
    atualizarGrafico();
    atualizarModal();
  }).catch(console.error);

  db.collection('poupanca').get().then(snapshot => {
    snapshot.forEach(doc => {
      const { nome, valor } = doc.data();
      poupanca[nome] = (poupanca[nome] || 0) + valor;
    });
    atualizarListaPoupanca();
  }).catch(console.error);
});

atualizarSelectCategorias();

