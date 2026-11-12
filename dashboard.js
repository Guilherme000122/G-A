
const corpoTabela = document.getElementById("corpoTabela");
const filtroTipo = document.getElementById("filtroTipo");
const filtroStatus = document.getElementById("filtroStatus");

function atualizarResumo() {
    const linhas = [...corpoTabela.querySelectorAll("tr")];

    let passou = 0;
    let falhou = 0;

    linhas.forEach(linha => {
        const status = linha.querySelector(".status").value;

        if (status === "PASSOU") passou++;
        if (status === "FALHOU") falhou++;
    });

    const total = linhas.length;
    const percentual = total > 0
        ? Math.round((passou / total) * 100)
        : 0;

    document.getElementById("totalTestes").textContent = total;
    document.getElementById("totalPassou").textContent = passou;
    document.getElementById("totalFalhou").textContent = falhou;
    document.getElementById("percentual").textContent = percentual + "%";
}

function atualizarCorStatus(select) {
    select.classList.remove("pendente", "aprovado", "reprovado");

    if (select.value === "PASSOU") {
        select.classList.add("aprovado");
    } else if (select.value === "FALHOU") {
        select.classList.add("reprovado");
    } else {
        select.classList.add("pendente");
    }
}

function aplicarFiltros() {
    const tipoSelecionado = filtroTipo.value;
    const statusSelecionado = filtroStatus.value;

    const linhas = corpoTabela.querySelectorAll("tr");

    linhas.forEach(linha => {
        const tipo = linha.dataset.tipo;
        const status = linha.querySelector(".status").value;

        const tipoCorreto =
            tipoSelecionado === "todos" || tipo === tipoSelecionado;

        const statusCorreto =
            statusSelecionado === "todos" || status === statusSelecionado;

        linha.style.display =
            tipoCorreto && statusCorreto ? "" : "none";
    });
}

corpoTabela.addEventListener("change", evento => {
    if (evento.target.classList.contains("status")) {
        atualizarCorStatus(evento.target);
        atualizarResumo();
        aplicarFiltros();
    }
});

filtroTipo.addEventListener("change", aplicarFiltros);
filtroStatus.addEventListener("change", aplicarFiltros);

document.getElementById("dataAtual").textContent =
    "Data: " + new Date().toLocaleDateString("pt-BR");

document.querySelectorAll(".status").forEach(atualizarCorStatus);

atualizarResumo();
