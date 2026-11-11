const STORAGE_KEY = 'gaVisionEmployees';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const readEmployees = () => {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

const writeEmployees = (employees) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
};

const normalize = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const digitsOnly = (value = '') => String(value).replace(/\D/g, '');

const escapeHtml = (value = '') =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character],
  );

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value) || 0);

const showToast = (message, type = 'success') => {
  const toast = $('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.toggle('is-error', type === 'error');
  toast.classList.add('is-visible');
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove('is-visible'), 3200);
};

const setCommonContent = () => {
  const year = $('#currentYear');
  if (year) year.textContent = new Date().getFullYear();

  const currentDate = $('#currentDate');
  if (currentDate) {
    currentDate.textContent = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    }).format(new Date());
  }
};

function initAnaGuide() {
  const guide = $('#anaGuide');
  if (!guide) return;

  const toggle = $('#anaToggle');
  const panel = $('#anaPanel');
  const close = $('#anaClose');
  const speech = $('#anaSpeech');
  const message = $('#anaMessage');
  let speechTimer;

  const setOpen = (open) => {
    guide.classList.toggle('is-open', open);
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      window.clearTimeout(speechTimer);
      close.focus();
    } else {
      toggle.focus();
    }
  };

  toggle.addEventListener('click', () => setOpen(panel.hidden));
  close.addEventListener('click', () => setOpen(false));
  $$('[data-ana-link]').forEach((link) => link.addEventListener('click', () => setOpen(false)));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) setOpen(false);
  });

  speechTimer = window.setTimeout(() => speech.classList.add('is-resting'), 6500);

  if (document.body.dataset.page === 'dashboard') {
    const employeeCount = readEmployees().length;
    message.textContent = employeeCount
      ? `Você tem ${employeeCount} funcionário${employeeCount === 1 ? '' : 's'} cadastrado${employeeCount === 1 ? '' : 's'}. Posso levar você aos cadastros, à equipe ou aos dados.`
      : 'Sua equipe ainda está vazia. Que tal cadastrar o primeiro funcionário? Eu mostro o caminho.';
  }

  if (document.body.dataset.page === 'form') {
    const form = $('#employeeForm');
    const requiredNames = ['name', 'cpf', 'role', 'department', 'shift'];
    const tips = {
      name: 'Informe o nome completo do colaborador como aparece nos documentos.',
      cpf: 'Digite apenas os números. Eu aplico a máscara do CPF automaticamente.',
      birthDate: 'A data de nascimento é opcional e ajuda a manter o cadastro completo.',
      registration: 'Você pode criar uma matrícula ou deixar que o sistema gere uma automaticamente.',
      role: 'Escolha a função principal que o colaborador exercerá na agência.',
      department: 'Escolha o setor em que o colaborador atuará.',
      shift: 'Selecione apenas um turno para o colaborador.',
      salary: 'O salário informado entra automaticamente no cálculo da folha mensal.',
      status: 'Funcionários ativos aparecem nos indicadores do dashboard.',
    };

    const updateProgress = () => {
      const completed = requiredNames.filter((name) =>
        String(form.elements.namedItem(name)?.value || '').trim(),
      ).length;
      const progress = Math.round((completed / requiredNames.length) * 100);
      $('#anaProgressValue').textContent = `${progress}%`;
      $('#anaProgressBar').style.width = `${progress}%`;
      if (progress === 100) {
        speech.textContent = 'Ótimo! Os dados essenciais estão prontos.';
      }
    };

    form.addEventListener('focusin', (event) => {
      const tip = tips[event.target.name];
      if (tip) message.textContent = tip;
    });
    form.addEventListener('input', updateProgress);
    updateProgress();
  }
}

const iconEdit =
  '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m3 17.25-.01 3.76L6.75 21 17.81 9.94l-3.75-3.75L3 17.25ZM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"/></svg>';
const iconDelete =
  '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12Zm3-9h6v8H9v-8Zm6.5-6-1-1h-5l-1 1H5v2h14V4h-3.5Z"/></svg>';

const initials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] || ''}${parts.length > 1 ? parts.at(-1)[0] : ''}`.toUpperCase();
};

function initDashboard() {
  const tableBody = $('#employeesTableBody');
  if (!tableBody) return;

  let employees = readEmployees();
  let deleteId = null;

  const updateDashboard = () => {
    const total = employees.length;
    const active = employees.filter((employee) => employee.status === 'Ativo').length;
    const inactive = total - active;
    const activePercent = total ? Math.round((active / total) * 100) : 0;
    const inactivePercent = total ? 100 - activePercent : 0;
    const payroll = employees.reduce((sum, employee) => sum + (Number(employee.salary) || 0), 0);

    $('#totalEmployees').textContent = total;
    $('#activeEmployees').textContent = active;
    $('#payroll').textContent = formatCurrency(payroll);
    $('#activeSummary').textContent = `${activePercent}% do quadro atual`;
    $('#activePercent').textContent = `${activePercent}%`;
    $('#inactivePercent').textContent = `${inactivePercent}%`;
    $('#activeBar').style.width = `${activePercent}%`;
    $('#inactiveBar').style.width = `${inactivePercent}%`;
    $('#indicatorFootnote').textContent = total
      ? `${active} ativo${active === 1 ? '' : 's'} e ${inactive} inativo${inactive === 1 ? '' : 's'} no quadro atual.`
      : 'Cadastre sua equipe para visualizar a distribuição.';
  };

  const renderEmployees = (query = '') => {
    const term = normalize(query);
    const filtered = employees.filter((employee) =>
      [employee.name, employee.cpf, employee.role, employee.registration, employee.department]
        .map(normalize)
        .some((value) => value.includes(term)),
    );

    tableBody.innerHTML = filtered
      .map(
        (employee) => `
          <tr>
            <td>
              <div class="employee-cell">
                <span class="avatar">${escapeHtml(initials(employee.name))}</span>
                <span>
                  <strong>${escapeHtml(employee.name)}</strong>
                  <small>${escapeHtml(employee.corporateEmail || employee.personalEmail || 'Contato não informado')}</small>
                </span>
              </div>
            </td>
            <td>${escapeHtml(employee.registration || '—')}</td>
            <td>${escapeHtml(employee.role || '—')}</td>
            <td>${escapeHtml(employee.department || '—')}</td>
            <td><span class="status-badge ${employee.status === 'Ativo' ? 'status-active' : 'status-inactive'}">${escapeHtml(employee.status || 'Inativo')}</span></td>
            <td>
              <div class="actions-cell">
                <a class="table-action" href="./cadastro.html?id=${encodeURIComponent(employee.id)}" aria-label="Editar ${escapeHtml(employee.name)}" title="Editar">${iconEdit}</a>
                <button class="table-action delete" type="button" data-delete-id="${escapeHtml(employee.id)}" aria-label="Excluir ${escapeHtml(employee.name)}" title="Excluir">${iconDelete}</button>
              </div>
            </td>
          </tr>`,
      )
      .join('');

    const emptyState = $('#emptyState');
    emptyState.hidden = filtered.length > 0;
    const emptyTitle = $('h3', emptyState);
    const emptyText = $('p', emptyState);
    const emptyButton = $('.button', emptyState);

    if (employees.length && !filtered.length) {
      emptyTitle.textContent = 'Nenhum resultado encontrado';
      emptyText.textContent = 'Tente buscar usando outro nome, CPF, cargo, matrícula ou setor.';
      emptyButton.hidden = true;
    } else {
      emptyTitle.textContent = 'Nenhum funcionário cadastrado';
      emptyText.textContent = 'Comece adicionando o primeiro integrante da sua equipe.';
      emptyButton.hidden = false;
    }

    $('#tableCount').textContent =
      filtered.length === 1 ? '1 funcionário encontrado' : `${filtered.length} funcionários encontrados`;
  };

  const refresh = () => {
    employees = readEmployees();
    updateDashboard();
    renderEmployees($('#searchInput').value);
  };

  $('#searchInput').addEventListener('input', (event) => renderEmployees(event.target.value));

  tableBody.addEventListener('click', (event) => {
    const deleteButton = event.target.closest('[data-delete-id]');
    if (!deleteButton) return;
    const employee = employees.find((item) => item.id === deleteButton.dataset.deleteId);
    if (!employee) return;
    deleteId = employee.id;
    $('#deleteEmployeeName').textContent = employee.name;
    $('#deleteModal').hidden = false;
    $('#cancelDelete').focus();
  });

  const closeDeleteModal = () => {
    $('#deleteModal').hidden = true;
    deleteId = null;
  };

  $('#cancelDelete').addEventListener('click', closeDeleteModal);
  $('#deleteModal').addEventListener('click', (event) => {
    if (event.target === $('#deleteModal')) closeDeleteModal();
  });
  $('#confirmDelete').addEventListener('click', () => {
    if (!deleteId) return;
    employees = employees.filter((employee) => employee.id !== deleteId);
    writeEmployees(employees);
    closeDeleteModal();
    refresh();
    showToast('Funcionário excluído com sucesso.');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !$('#deleteModal').hidden) closeDeleteModal();
  });

  $('#exportButton').addEventListener('click', () => {
    if (!employees.length) {
      showToast('Não há funcionários cadastrados para exportar.', 'error');
      return;
    }

    const payload = {
      application: 'G&A VISION | Gestão Empresarial',
      exportedAt: new Date().toISOString(),
      employees,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ga-vision-funcionarios-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast('Arquivo JSON exportado com sucesso.');
  });

  $('#importButton').addEventListener('click', () => $('#importInput').click());
  $('#importInput').addEventListener('change', async (event) => {
    const [file] = event.target.files;
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const imported = Array.isArray(parsed) ? parsed : parsed.employees;
      if (!Array.isArray(imported)) throw new Error('Formato inválido');

      const validEmployees = imported
        .filter((employee) => employee && employee.name && employee.cpf && employee.role && employee.department)
        .map((employee) => ({
          ...employee,
          id: String(employee.id || crypto.randomUUID()),
          salary: Number(employee.salary) || 0,
          status: employee.status === 'Inativo' ? 'Inativo' : 'Ativo',
        }));

      if (!validEmployees.length && imported.length) throw new Error('Nenhum registro válido');
      if (
        employees.length &&
        !window.confirm('A importação substituirá os cadastros atuais. Deseja continuar?')
      ) {
        event.target.value = '';
        return;
      }

      writeEmployees(validEmployees);
      refresh();
      showToast(
        validEmployees.length
          ? `${validEmployees.length} funcionário${validEmployees.length === 1 ? '' : 's'} importado${validEmployees.length === 1 ? '' : 's'} com sucesso.`
          : 'Arquivo importado. A lista está vazia.',
      );
    } catch {
      showToast('Não foi possível importar. Verifique o formato do arquivo JSON.', 'error');
    } finally {
      event.target.value = '';
    }
  });

  const menuButton = $('#menuButton');
  const closeMenu = () => {
    document.body.classList.remove('menu-open');
    menuButton.setAttribute('aria-expanded', 'false');
  };
  menuButton.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
  $('#sidebarOverlay').addEventListener('click', closeMenu);
  $$('[data-nav]').forEach((link) => link.addEventListener('click', closeMenu));

  updateDashboard();
  renderEmployees();

  const params = new URLSearchParams(location.search);
  if (params.get('saved') === 'created') showToast('Funcionário cadastrado com sucesso.');
  if (params.get('saved') === 'updated') showToast('Dados do funcionário atualizados.');
}

const formatCpf = (value) =>
  digitsOnly(value)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

const formatPhone = (value) => {
  const digits = digitsOnly(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
};

const parseSalary = (value = '') => {
  const normalized = String(value).trim();
  if (!normalized) return 0;
  if (normalized.includes(',')) {
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(normalized)) {
      return Number.NaN;
    }
    return Number(normalized.replace(/\./g, '').replace(',', '.'));
  }
  if (/^\d{1,3}(?:\.\d{3})+$/.test(normalized)) {
    return Number(normalized.replace(/\./g, ''));
  }
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return Number.NaN;
  return Number(normalized);
};

function initForm() {
  const form = $('#employeeForm');
  if (!form) return;

  const employees = readEmployees();
  const editId = new URLSearchParams(location.search).get('id');
  const editingEmployee = employees.find((employee) => employee.id === editId);

  if (editId && !editingEmployee) {
    showToast('Funcionário não encontrado. Um novo cadastro será criado.', 'error');
  }

  if (editingEmployee) {
    $('#formPageTitle').textContent = 'Editar funcionário';
    $('#formPageDescription').textContent = 'Atualize os dados do colaborador e salve as alterações.';
    $('#submitLabel').textContent = 'Salvar alterações';
    document.title = `Editar ${editingEmployee.name} | G&A VISION`;

    Object.entries(editingEmployee).forEach(([key, value]) => {
      const input = form.elements.namedItem(key);
      if (!input) return;
      if (
        key === 'role' &&
        input instanceof HTMLSelectElement &&
        value &&
        ![...input.options].some((option) => option.value === value)
      ) {
        input.add(new Option(value, value));
      }
      input.value =
        key === 'salary'
          ? Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : value || '';
    });
  }

  const cpfInput = form.elements.namedItem('cpf');
  const phoneInput = form.elements.namedItem('phone');
  cpfInput.addEventListener('input', () => {
    cpfInput.value = formatCpf(cpfInput.value);
  });
  phoneInput.addEventListener('input', () => {
    phoneInput.value = formatPhone(phoneInput.value);
  });

  const clearFieldError = (input) => {
    const field = input.closest('.field');
    field?.classList.remove('has-error');
    const error = field?.querySelector('.field-error');
    if (error) error.textContent = '';
  };

  $$('input, select', form).forEach((input) =>
    input.addEventListener('input', () => clearFieldError(input)),
  );

  const setFieldError = (name, message) => {
    const input = form.elements.namedItem(name);
    const field = input.closest('.field');
    field.classList.add('has-error');
    $('.field-error', field).textContent = message;
    return input;
  };

  const validateCpf = (cpf) => {
    const digits = digitsOnly(cpf);
    if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
    const calculateDigit = (base, factor) => {
      const total = base.split('').reduce((sum, number) => sum + Number(number) * factor--, 0);
      const result = (total * 10) % 11;
      return result === 10 ? 0 : result;
    };
    const first = calculateDigit(digits.slice(0, 9), 10);
    const second = calculateDigit(digits.slice(0, 10), 11);
    return first === Number(digits[9]) && second === Number(digits[10]);
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    $$('.has-error', form).forEach((field) => field.classList.remove('has-error'));
    $$('.field-error', form).forEach((error) => (error.textContent = ''));

    const formData = Object.fromEntries(new FormData(form).entries());
    let firstInvalid = null;
    [
      ['name', 'Informe o nome completo.'],
      ['cpf', 'Informe o CPF.'],
      ['role', 'Informe o cargo.'],
      ['department', 'Selecione o setor.'],
      ['shift', 'Selecione o turno.'],
    ].forEach(([name, message]) => {
      if (!String(formData[name] || '').trim()) firstInvalid ||= setFieldError(name, message);
    });

    if (formData.cpf && !validateCpf(formData.cpf)) {
      firstInvalid ||= setFieldError('cpf', 'Informe um CPF válido.');
    }

    const duplicateCpf = employees.find(
      (employee) => employee.id !== editId && digitsOnly(employee.cpf) === digitsOnly(formData.cpf),
    );
    if (duplicateCpf) firstInvalid ||= setFieldError('cpf', 'Este CPF já está cadastrado.');

    const registration = String(formData.registration || '').trim();
    const duplicateRegistration =
      registration &&
      employees.find(
        (employee) =>
          employee.id !== editId && normalize(employee.registration) === normalize(registration),
      );
    if (duplicateRegistration) {
      firstInvalid ||= setFieldError('registration', 'Esta matrícula já está em uso.');
    }

    if (formData.personalEmail && !form.elements.namedItem('personalEmail').validity.valid) {
      firstInvalid ||= setFieldError('personalEmail', 'Informe um e-mail válido.');
    }
    if (formData.corporateEmail && !form.elements.namedItem('corporateEmail').validity.valid) {
      firstInvalid ||= setFieldError('corporateEmail', 'Informe um e-mail válido.');
    }

    const salary = parseSalary(formData.salary);
    if (!Number.isFinite(salary) || salary < 0) {
      firstInvalid ||= setFieldError('salary', 'Informe um salário válido igual ou maior que zero.');
    }

    if (firstInvalid) {
      firstInvalid.focus();
      showToast('Revise os campos destacados antes de continuar.', 'error');
      return;
    }

    const employee = {
      id: editingEmployee?.id || crypto.randomUUID(),
      name: formData.name.trim(),
      cpf: formatCpf(formData.cpf),
      birthDate: formData.birthDate,
      rg: formData.rg.trim(),
      phone: formData.phone,
      personalEmail: formData.personalEmail.trim(),
      corporateEmail: formData.corporateEmail.trim(),
      address: formData.address.trim(),
      registration: registration || `GAV-${String(Date.now()).slice(-6)}`,
      role: formData.role.trim(),
      department: formData.department,
      admissionDate: formData.admissionDate,
      shift: formData.shift,
      contractType: formData.contractType,
      status: formData.status,
      supervisor: formData.supervisor.trim(),
      salary,
      updatedAt: new Date().toISOString(),
      createdAt: editingEmployee?.createdAt || new Date().toISOString(),
    };

    const nextEmployees = editingEmployee
      ? employees.map((item) => (item.id === editingEmployee.id ? employee : item))
      : [...employees, employee];

    writeEmployees(nextEmployees);
    location.href = `./dashboard.html?saved=${editingEmployee ? 'updated' : 'created'}#funcionarios`;
  });
}

setCommonContent();
if (document.body.dataset.page === 'dashboard') initDashboard();
if (document.body.dataset.page === 'form') initForm();
initAnaGuide();
