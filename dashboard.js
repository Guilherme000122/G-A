const corpoTabela = document.getElementById("corpoTabela");
const filtroTipo = document.getElementById("filtroTipo");
const filtroStatus = document.getElementById("filtroStatus");
const botaoExecutar = document.getElementById("executarTestes");
const estadoExecucao = document.getElementById("estadoExecucao");
const chaveFuncionarios = "gaVisionEmployees";
let documentoFormularioTestes = null;

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

    corpoTabela.querySelectorAll("tr").forEach(linha => {
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

function obterLinha(casoId) {
    return [...corpoTabela.querySelectorAll("tr")]
        .find(linha => linha.cells[0].textContent.trim() === casoId);
}

function definirResultado(casoId, status, detalhe) {
    const linha = obterLinha(casoId);
    const seletorStatus = linha.querySelector(".status");

    seletorStatus.value = status;
    atualizarCorStatus(seletorStatus);
    linha.querySelector(".resultado").value = detalhe;
    atualizarResumo();
    aplicarFiltros();
}

function lerFuncionarios() {
    const conteudo = localStorage.getItem(chaveFuncionarios);
    const funcionarios = conteudo ? JSON.parse(conteudo) : [];

    if (!Array.isArray(funcionarios)) {
        throw new Error("Os dados de funcionários armazenados não são válidos.");
    }

    return funcionarios;
}

function criarCpfUnico(funcionarios) {
    const cpfsExistentes = new Set(
        funcionarios.map(funcionario => String(funcionario.cpf || "").replace(/\D/g, ""))
    );

    for (let tentativa = 0; tentativa < 20; tentativa++) {
        let cpf = String(Math.floor(100000000 + Math.random() * 900000000));

        const calcularDigito = (base, fator) => {
            const soma = [...base].reduce(
                (total, numero) => total + Number(numero) * fator--,
                0
            );
            const digito = (soma * 10) % 11;
            return digito === 10 ? 0 : digito;
        };

        cpf += calcularDigito(cpf, 10);
        cpf += calcularDigito(cpf, 11);

        if (!cpfsExistentes.has(cpf)) return cpf;
    }

    throw new Error("Não foi possível gerar um CPF de teste exclusivo.");
}

function esperarCarregamentoFrame() {
    return new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => {
            frameTeste.removeEventListener("load", carregou);
            reject(new Error("O sistema demorou para carregar a página de teste."));
        }, 15000);

        function carregou() {
            window.clearTimeout(timeout);
            resolve(frameTeste.contentDocument);
        }

        frameTeste.addEventListener("load", carregou, { once: true });
    });
}

const frameTeste = document.createElement("iframe");
frameTeste.title = "Execução dos testes automatizados";
frameTeste.setAttribute("aria-hidden", "true");
frameTeste.tabIndex = -1;
frameTeste.hidden = true;
document.body.appendChild(frameTeste);

function carregarPagina(caminho) {
    const carregamento = esperarCarregamentoFrame();
    frameTeste.src = `./${caminho}?execucao=${Date.now()}-${Math.random()}`;
    return carregamento;
}

async function carregarFormularioTeste() {
    if (!documentoFormularioTestes) {
        documentoFormularioTestes = await carregarPagina("cadastro.html");
    }

    return documentoFormularioTestes;
}

function preencherCampo(formulario, nome, valor) {
    const campo = formulario.elements.namedItem(nome);
    campo.value = valor;
    campo.dispatchEvent(new Event("input", { bubbles: true }));
    campo.dispatchEvent(new Event("change", { bubbles: true }));
}

function preencherCamposObrigatorios(formulario, cpf) {
    preencherCampo(formulario, "name", "Teste automatizado");
    preencherCampo(formulario, "cpf", cpf);
    preencherCampo(formulario, "role", "Atendimento");
    preencherCampo(formulario, "department", "Administrativo");
    preencherCampo(formulario, "shift", "Manhã");
}

async function executarCaso(casoId, teste) {
    try {
        const detalhe = await teste();
        definirResultado(casoId, "PASSOU", detalhe);
    } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : String(erro);
        definirResultado(casoId, "FALHOU", `Falha na verificação: ${mensagem}`);
    }
}

async function executarTestes() {
    botaoExecutar.disabled = true;
    botaoExecutar.textContent = "Executando...";
    estadoExecucao.textContent = "Executando testes automatizados...";

    corpoTabela.querySelectorAll("tr").forEach(linha => {
        const status = linha.querySelector(".status");
        status.value = "PENDENTE";
        atualizarCorStatus(status);
        linha.querySelector(".resultado").value = "Aguardando execução...";
    });
    atualizarResumo();
    aplicarFiltros();

    if (!["http:", "https:"].includes(location.protocol)) {
        const detalhe = "Abra esta página por um servidor local (por exemplo, o Live Server do VS Code) para executar os testes.";
        corpoTabela.querySelectorAll("tr").forEach(linha => {
            linha.querySelector(".resultado").value = detalhe;
        });
        estadoExecucao.textContent = detalhe;
        botaoExecutar.disabled = false;
        botaoExecutar.textContent = "Executar testes novamente";
        return;
    }

    const identificador = `QA-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const nomeTeste = `Teste automatizado ${identificador}`;
    let funcionarioTesteId = null;
    let documentoDashboardPrincipal = null;
    let cpfTeste;

    try {
        await executarCaso("CT-01", async () => {
            const funcionarios = lerFuncionarios();
            cpfTeste = criarCpfUnico(funcionarios);
            const documento = await carregarPagina("cadastro.html");
            const formulario = documento.getElementById("employeeForm");

            preencherCamposObrigatorios(formulario, cpfTeste);
            preencherCampo(formulario, "name", nomeTeste);
            preencherCampo(formulario, "salary", "2500,00");
            preencherCampo(formulario, "corporateEmail", `${identificador.toLowerCase()}@exemplo.com`);

            const proximaPagina = esperarCarregamentoFrame();
            formulario.requestSubmit();
            documentoDashboardPrincipal = await proximaPagina;
            const funcionarioSalvo = lerFuncionarios().find(
                funcionario => funcionario.name === nomeTeste
            );

            if (!funcionarioSalvo) {
                throw new Error("O cadastro válido não foi salvo.");
            }

            funcionarioTesteId = funcionarioSalvo.id;

            if (!frameTeste.contentWindow.location.pathname.endsWith("/index.html")) {
                throw new Error("Após salvar, o sistema não voltou ao dashboard principal.");
            }

            if (!documentoDashboardPrincipal.querySelector("#totalEmployees")) {
                throw new Error("O dashboard principal não foi carregado após o cadastro.");
            }

            return "Cadastro válido salvo e dashboard principal carregado.";
        });

        await executarCaso("CT-07", async () => {
            documentoDashboardPrincipal =
                documentoDashboardPrincipal || await carregarPagina("index.html");
            const totalSalarios = lerFuncionarios().reduce(
                (total, funcionario) => total + (Number(funcionario.salary) || 0),
                0
            );
            const salarioExibido = documentoDashboardPrincipal
                .getElementById("payroll")?.textContent.trim();
            const salarioEsperado = new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL"
            }).format(totalSalarios);

            if (salarioExibido !== salarioEsperado) {
                throw new Error(`Esperado "${salarioEsperado}", exibido "${salarioExibido || "nada"}".`);
            }

            return `Folha exibida corretamente como ${salarioExibido}.`;
        });

        await executarCaso("CT-08", async () => {
            documentoDashboardPrincipal =
                documentoDashboardPrincipal || await carregarPagina("index.html");
            const marca = documentoDashboardPrincipal.querySelector(".brand-mark");

            if (!marca || !marca.textContent.replace(/\s/g, "").includes("G&A")) {
                throw new Error("A marca G&A não foi encontrada no cabeçalho do dashboard.");
            }

            return "A identidade visual G&A está presente no dashboard.";
        });

        await executarCaso("CT-02", async () => {
            const documento = await carregarFormularioTeste();
            const formulario = documento.getElementById("employeeForm");

            formulario.requestSubmit();

            const campoNome = formulario.elements.namedItem("name");
            if (!campoNome.closest(".field").classList.contains("has-error")) {
                throw new Error("O sistema aceitou o cadastro sem preencher o nome obrigatório.");
            }

            return "O formulário bloqueou o cadastro e destacou o campo obrigatório vazio.";
        });

        await executarCaso("CT-03", async () => {
            const funcionarios = lerFuncionarios();
            const documento = await carregarFormularioTeste();
            const formulario = documento.getElementById("employeeForm");

            preencherCamposObrigatorios(formulario, criarCpfUnico(funcionarios));
            preencherCampo(formulario, "corporateEmail", "usuario@");
            formulario.requestSubmit();

            const email = formulario.elements.namedItem("corporateEmail");
            if (!email.closest(".field").classList.contains("has-error")) {
                throw new Error("O sistema aceitou um endereço de e-mail inválido.");
            }

            return "O formulário rejeitou o e-mail corporativo inválido.";
        });

        await executarCaso("CT-04", async () => {
            const documento = await carregarFormularioTeste();
            const turno = documento.querySelector('[name="shift"]');

            if (!(turno instanceof HTMLSelectElement) || turno.multiple) {
                throw new Error("O campo de turno não está limitado a uma única opção.");
            }

            return "O campo de turno permite selecionar apenas uma opção.";
        });

        await executarCaso("CT-05", async () => {
            const funcionarios = lerFuncionarios();
            const documento = await carregarFormularioTeste();
            const formulario = documento.getElementById("employeeForm");

            preencherCamposObrigatorios(formulario, criarCpfUnico(funcionarios));
            preencherCampo(formulario, "salary", "-500");
            formulario.requestSubmit();

            const salario = formulario.elements.namedItem("salary");
            if (!salario.closest(".field").classList.contains("has-error")) {
                throw new Error("O sistema aceitou um salário negativo.");
            }

            return "O formulário rejeitou o salário negativo.";
        });

        await executarCaso("CT-06", async () => {
            const documento = await carregarFormularioTeste();
            const cargos = [...documento.querySelector('[name="role"]').options]
                .filter(opcao => opcao.value.trim());

            if (cargos.length < 4) {
                throw new Error(`Foram encontradas apenas ${cargos.length} opções de cargo.`);
            }

            return `${cargos.length} opções de cargo disponíveis.`;
        });

    } finally {
        if (funcionarioTesteId) {
            const funcionarios = lerFuncionarios();
            localStorage.setItem(
                chaveFuncionarios,
                JSON.stringify(funcionarios.filter(funcionario => funcionario.id !== funcionarioTesteId))
            );
        }

        frameTeste.removeAttribute("src");
        const aprovados = [...corpoTabela.querySelectorAll(".status")]
            .filter(status => status.value === "PASSOU").length;
        const reprovados = [...corpoTabela.querySelectorAll(".status")]
            .filter(status => status.value === "FALHOU").length;

        estadoExecucao.textContent =
            `Execução concluída: ${aprovados} aprovado(s), ${reprovados} reprovado(s).`;
        botaoExecutar.disabled = false;
        botaoExecutar.textContent = "Executar testes novamente";
    }
}

filtroTipo.addEventListener("change", aplicarFiltros);
filtroStatus.addEventListener("change", aplicarFiltros);
botaoExecutar.addEventListener("click", executarTestes);

document.getElementById("dataAtual").textContent =
    "Data: " + new Date().toLocaleDateString("pt-BR");

document.querySelectorAll(".status").forEach(atualizarCorStatus);
atualizarResumo();
executarTestes();
