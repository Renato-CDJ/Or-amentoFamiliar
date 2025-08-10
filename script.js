
// Variável global para UID do usuário
let uid = null;

// Verificação de autenticação
firebase.auth().onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    uid = user.uid;
    carregarDadosIniciais();
  }
});

// Função de logout
function logout() {
  firebase.auth().signOut().then(() => {
    window.location.href = 'login.html';
  });
}

// ---------- CATEGORIAS ----------
let categorias = [];
const categoriaSelect = document.getElementById('categoriaDivida');
const novaCategoriaInput = document.getElementById('novaCategoria');

function atualizarSelectCategorias() {
  if (!categoriaSelect) return;
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
    // salva a categoria com uid
    db.collection('categorias').add({ nome: nova, uid }).then(() => {
      categorias.push(nova);
      atualizarSelectCategorias();
      novaCategoriaInput.value = '';
      // atualiza filtroCategoria caso exista
      const filtroCategoria = document.getElementById('filtroCategoria');
      if (filtroCategoria) {
        const opt = document.createElement('option');
        opt.value = nova;
        opt.textContent = nova;
        filtroCategoria.appendChild(opt);
      }
    }).catch(err => {
      console.error('Erro ao adicionar categoria:', err);
      alert('Erro ao salvar categoria.');
    });
  } else {
    alert('Categoria já existe ou inválida.');
  }
}

function removerCategoria() {
  const atual = categoriaSelect?.value;
  if (!atual) return;
  if (confirm(`Deseja realmente remover a categoria "${atual}"?`)) {
    db.collection('categorias')
      .where('uid', '==', uid)
      .where('nome', '==', atual)
      .get()
      .then(snapshot => {
        snapshot.forEach(doc => doc.ref.delete());
        categorias = categorias.filter(c => c !== atual);
        atualizarSelectCategorias();
        // atualizar filtroCategoria
        const filtroCategoria = document.getElementById('filtroCategoria');
        if (filtroCategoria) {
          Array.from(filtroCategoria.options).forEach(opt => {
            if (opt.value === atual) filtroCategoria.removeChild(opt);
          });
        }
      }).catch(err => {
        console.error('Erro ao remover categoria:', err);
        alert('Erro ao apagar categoria.');
      });
  }
}

// ---------- DOM ELEMENTS ----------
const listaIrmaos = document.getElementById('listaIrmaos');
const formIrmao = document.getElementById('formIrmao');
const nomeIrmao = document.getElementById('nomeIrmao');
const rendaIrmao = document.getElementById('rendaIrmao');
const rendaTotal = document.getElementById('rendaTotal');
const checkboxIrmaos = document.getElementById('checkboxIrmaos');
const formDivida = document.getElementById('formDivida');
const selectIrmao = document.getElementById('selectIrmao');
const formPoupanca = document.getElementById('formPoupanca');
const valorPoupado = document.getElementById('valorPoupado');
const listaPoupanca = document.getElementById('listaPoupanca');

let irmaos = [];
let dividas = [];
let poupanca = {};

// ---------- IRMÃOS ----------
formIrmao?.addEventListener('submit', (e) => {
  e.preventDefault();
  const nome = nomeIrmao.value.trim();
  const renda = parseFloat(rendaIrmao.value);
  if (nome && !isNaN(renda)) {
    const irmao = { nome, renda, uid };
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
  if (!listaIrmaos || !checkboxIrmaos || !selectIrmao) return;
  listaIrmaos.innerHTML = '';
  checkboxIrmaos.innerHTML = '';
  selectIrmao.innerHTML = '';

  irmaos.forEach((irmao, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${irmao.nome}</strong> - R$ ${irmao.renda.toFixed(2)}
      <div class="acoes-irmao">
        <button onclick="editarIrmao('${irmao.nome}')">✏️</button>
        <button onclick="excluirIrmao('${irmao.nome}')">🗑️</button>
      </div>
    `;
    listaIrmaos.appendChild(li);

    // checkbox para dívidas
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

    // opção para poupança
    const option = document.createElement('option');
    option.value = irmao.nome;
    option.textContent = irmao.nome;
    selectIrmao.appendChild(option);
  });

  atualizarListaPoupanca();
}

function editarIrmao(nome) {
  const novoValor = prompt(`Editar renda de ${nome} (R$):`);
  const renda = parseFloat(novoValor);
  if (!isNaN(renda) && renda >= 0) {
    // Atualiza local
    const index = irmaos.findIndex(i => i.nome === nome);
    if (index !== -1) {
      irmaos[index].renda = renda;
    }

    // Atualiza Firestore filtrando por uid + nome
    db.collection('irmaos')
      .where('uid', '==', uid)
      .where('nome', '==', nome)
      .get()
      .then(snapshot => {
        snapshot.forEach(doc => doc.ref.update({ renda }));
        atualizarIrmaos();
        atualizarResumo();
      })
      .catch(console.error);
  }
}

function toggleListaIrmaos() {
  const ul = document.getElementById('listaIrmaos');
  if (!ul) return;
  if (ul.style.display === 'none') {
    ul.style.display = 'block';
  } else {
    ul.style.display = 'none';
  }
}

function excluirIrmao(nome) {
  irmaos = irmaos.filter(i => i.nome !== nome);
  db.collection('irmaos')
    .where('uid', '==', uid)
    .where('nome', '==', nome)
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => doc.ref.delete());
      atualizarIrmaos();
      atualizarResumo();
    }).catch(console.error);
}

// ---------- DÍVIDAS ----------
formDivida?.addEventListener('submit', (e) => {
  e.preventDefault();
  const descricao = document.getElementById('descDivida').value;
  const valor = parseFloat(document.getElementById('valorDivida').value);
  const dataVenc = document.getElementById('dataVencimento').value;
  const categoria = categoriaSelect?.value;
  const selecionados = Array.from(document.querySelectorAll('input[name="irmaosDivida"]:checked')).map(cb => cb.value);

  if (descricao && !isNaN(valor) && selecionados.length > 0) {
    const porPessoa = valor / selecionados.length;
    const status = {};
    selecionados.forEach(i => status[i] = false);
    const divida = { descricao, valor, dataVenc, categoria, participantes: selecionados, status, porPessoa, uid };

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
  if (rendaTotal) rendaTotal.textContent = totalRenda.toFixed(2);
  atualizarGraficoRenda();
}

// ---------- GRÁFICO DE DÍVIDAS ----------
const ctx = document.getElementById('graficoPizza')?.getContext('2d');
let chartPizza;

function atualizarGrafico() {
  if (!ctx) return;

  const labels = [];
  const valores = [];
  const cores = [];

  dividas.forEach((divida, i) => {
    labels.push(`${divida.descricao} (${divida.categoria})`);
    valores.push(divida.valor);

    const totalmentePaga = Object.values(divida.status).every(pago => pago);
    cores.push(totalmentePaga ? '#4caf50' : '#ff6384');
  });

  if (chartPizza) chartPizza.destroy();

  chartPizza = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: valores,
        backgroundColor: cores
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (context) => {
              const valor = context.parsed;
              return `R$ ${valor.toFixed(2)}`;
            }
          }
        }
      }
    }
  });
}

// ---------- GRÁFICO DE RENDA ----------
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

// ---------- POUPANÇA ----------
formPoupanca?.addEventListener('submit', (e) => {
  e.preventDefault();
  const nome = selectIrmao.value;
  const valor = parseFloat(valorPoupado.value);
  if (!isNaN(valor) && valor > 0) {
    poupanca[nome] = (poupanca[nome] || 0) + valor;
    db.collection('poupanca').add({ nome, valor, uid }).then(() => {
      atualizarListaPoupanca();
      valorPoupado.value = '';
    }).catch(console.error);
  }
});

function atualizarListaPoupanca() {
  if (!listaPoupanca) return;
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

// ---------- MODAL DE DÍVIDAS ----------
function abrirModal() {
  const modal = document.getElementById('modalDividas');
  if (!modal) return;
  modal.style.display = 'flex';
  atualizarModal();
}

function fecharModal() {
  const modal = document.getElementById('modalDividas');
  if (!modal) return;
  modal.style.display = 'none';
}

document.getElementById('filtroStatus')?.addEventListener('change', atualizarModal);
document.getElementById('filtroCategoria')?.addEventListener('change', atualizarModal);

// Quando marcar/ desmarcar checkboxes no modal, atualiza o objeto local e persiste no Firestore
document.getElementById('listaModal')?.addEventListener('change', (e) => {
  if (e.target.matches('input[type="checkbox"][data-divida]')) {
    const index = parseInt(e.target.dataset.divida, 10);
    const nome = e.target.dataset.nome;
    if (isNaN(index)) return;
    dividas[index].status[nome] = e.target.checked;
    // Persistir alteração de status no Firestore (procura doc por uid + descricao)
    const descricao = dividas[index].descricao;
    db.collection('dividas')
      .where('uid', '==', uid)
      .where('descricao', '==', descricao)
      .get()
      .then(snapshot => {
        snapshot.forEach(docSnap => {
          docSnap.ref.update({ status: dividas[index].status }).catch(console.error);
        });
        atualizarGrafico();
        atualizarModal();
      }).catch(console.error);
  }
});

function atualizarModal() {
  const container = document.getElementById('listaModal');
  if (!container) return;
  container.innerHTML = '';
  const filtroStatus = document.getElementById('filtroStatus')?.value || 'todos';
  const filtroCategoria = document.getElementById('filtroCategoria')?.value || 'todas';
  const hoje = new Date();

  dividas.forEach((divida, index) => {
    const venc = new Date(divida.dataVenc);
    const atrasada = venc < hoje;
    const todosPagos = Object.values(divida.status || {}).every(p => p);
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
        const checked = divida.status && divida.status[nome] ? 'checked' : '';
        return `<label><input type="checkbox" data-divida="${index}" data-nome="${nome}" ${checked}> ${nome} - R$ ${divida.porPessoa.toFixed(2)}</label>`;
      }).join('<br>')}
      <br><button onclick="excluirDivida(${index})">Excluir Dívida</button>
    `;

    div.innerHTML = `<h3>${divida.descricao}</h3>`;
    div.appendChild(detalhes);
    detalhes.style.display = 'none';
    div.addEventListener('click', () => {
      detalhes.style.display = detalhes.style.display === 'none' ? 'block' : 'none';
    });

    container.appendChild(div);
  });
}

function excluirDivida(index) {
  const descricao = dividas[index].descricao;
  db.collection('dividas')
    .where('uid', '==', uid)
    .where('descricao', '==', descricao)
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => doc.ref.delete());
      // remover localmente
      dividas.splice(index, 1);
      atualizarGrafico();
      atualizarModal();
    }).catch(console.error);
}

// ---------- EXTRAS ----------
document.head.insertAdjacentHTML("beforeend", `<style>.hidden{opacity:0;height:0!important;overflow:hidden;transition:all 0.3s ease}</style>`);

function toggleGrafico(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('hidden');
}

function exportarCSV() {
  let csv = 'Nome,Renda,Poupança\n';
  irmaos.forEach(i => {
    const poupado = poupanca[i.nome] || 0;
    csv += `${i.nome},${i.renda},${poupado}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'relatorio.csv';
  a.click();
}

// ---------- LOAD INICIAL ----------
function carregarDadosIniciais() {
  categorias = [];
  irmaos = [];
  dividas = [];
  poupanca = {};

  // categorias do usuário
  db.collection('categorias').where('uid', '==', uid).get().then(snapshot => {
    categorias = [];
    snapshot.forEach(doc => {
      const { nome } = doc.data();
      if (nome) categorias.push(nome);
    });
    atualizarSelectCategorias();

    // preencher filtroCategoria se existir
    const filtroCategoria = document.getElementById('filtroCategoria');
    if (filtroCategoria) {
      filtroCategoria.innerHTML = '<option value="todas">Todas</option>';
      categorias.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        filtroCategoria.appendChild(option);
      });
    }
  }).catch(console.error);

  // irmãos (do usuário)
  db.collection('irmaos').where('uid', '==', uid).get().then(snapshot => {
    irmaos = [];
    snapshot.forEach(doc => irmaos.push(doc.data()));
    atualizarIrmaos();
    atualizarResumo();
  }).catch(console.error);

  // dívidas (do usuário)
  db.collection('dividas').where('uid', '==', uid).get().then(snapshot => {
    dividas = [];
    snapshot.forEach(doc => dividas.push(doc.data()));
    atualizarGrafico();
    atualizarModal();
  }).catch(console.error);

  // poupanca (do usuário)
  db.collection('poupanca').where('uid', '==', uid).get().then(snapshot => {
    poupanca = {};
    snapshot.forEach(doc => {
      const { nome, valor } = doc.data();
      poupanca[nome] = (poupanca[nome] || 0) + valor;
    });
    atualizarListaPoupanca();
  }).catch(console.error);
}

