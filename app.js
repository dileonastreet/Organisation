(() => {
  'use strict';

  const STORAGE_KEY = 'marge-studio-customers-v1';
  const VAT_RATE = 0.20;
  const DEFAULTS = Object.freeze({
    purchaseCost: 120,
    adCost: 25,
    deliveryCost: 20,
    targetProfit: 50,
    currency: 'MAD',
    quantities: [1, 10, 25],
  });
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const ui = {
    clientView: $('#clientsView'),
    calculatorView: $('#calculatorView'),
    navLinks: $$('.nav-link[data-nav]'),
    storageStatus: $('#storageStatus'),
    customerForm: $('#customerForm'),
    customerName: $('#customerName'),
    customerPhone: $('#customerPhone'),
    customerCity: $('#customerCity'),
    customerSizes: $('#customerSizes'),
    customerSubmit: $('#customerSubmit'),
    customerFormMessage: $('#customerFormMessage'),
    cancelEdit: $('#cancelEdit'),
    cityDatalist: $('#knownCities'),
    cityFilter: $('#cityFilter'),
    customerSearch: $('#customerSearch'),
    citySummaryRows: $('#citySummaryRows'),
    cityEmptyState: $('#cityEmptyState'),
    customerRows: $('#customerRows'),
    customerEmptyState: $('#customerEmptyState'),
    totalCustomers: $('#totalCustomers'),
    cityCount: $('#cityCount'),
    sizeCount: $('#sizeCount'),
    importFile: $('#importFile'),
    bulkData: $('#bulkData'),
    addBulk: $('#addBulk'),
    sampleBtn: $('#sampleBtn'),
    exportExcel: $('#exportExcel'),
    exportExcelSecondary: $('#exportExcelSecondary'),
    exportPhones: $('#exportPhones'),
    exportPhonesSecondary: $('#exportPhonesSecondary'),
    calculator: {
      purchaseCost: $('#purchaseCost'),
      adCost: $('#adCost'),
      deliveryCost: $('#deliveryCost'),
      targetProfit: $('#targetProfit'),
      currency: $('#currency'),
      vatAmount: $('#vatAmount'),
      salePrice: $('#salePrice'),
      adBeforeVatResult: $('#adBeforeVatResult'),
      adAfterVatResult: $('#adAfterVatResult'),
      formulaText: $('#formulaText'),
      quantityRows: $('#quantityRows'),
      addQuantityButton: $('#addQuantityButton'),
      resetButton: $('#resetButton'),
      resetLink: $('#resetLink'),
    },
  };

  let customers = loadCustomers();
  let editingId = null;
  let quantities = [...DEFAULTS.quantities];
  let toastTimer;

  function clean(value) {
    return String(value ?? '').trim();
  }

  function makeId() {
    return globalThis.crypto?.randomUUID?.() || `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function loadCustomers() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((row) => row && row.id && row.name && row.phone && row.city && row.sizes)
        .map((row) => ({
          id: String(row.id),
          name: clean(row.name),
          phone: clean(row.phone),
          city: clean(row.city),
          sizes: normalizeSizeText(row.sizes),
          createdAt: row.createdAt || new Date().toISOString(),
          updatedAt: row.updatedAt || row.createdAt || new Date().toISOString(),
        }));
    } catch (error) {
      console.warn('Les données locales des clients n’ont pas pu être lues.', error);
      return [];
    }
  }

  function saveCustomers() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
      ui.storageStatus.textContent = 'Données enregistrées dans ce navigateur';
      ui.storageStatus.title = 'Les données restent sur cet appareil et dans ce navigateur.';
      return true;
    } catch (error) {
      console.error('Enregistrement local impossible.', error);
      ui.storageStatus.textContent = 'Enregistrement local indisponible';
      showToast('Le navigateur n’a pas pu enregistrer les données. Exportez votre fichier Excel.');
      return false;
    }
  }

  function normalizeSizeText(value) {
    return splitSizes(value).join(', ');
  }

  function splitSizes(value) {
    const seen = new Set();
    return String(value ?? '').split(/[,;\/|]+/)
      .map((size) => size.trim())
      .filter((size) => {
        if (!size) return false;
        const key = size.toLocaleUpperCase('fr');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function normalizeHeader(value) {
    return clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr')
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function normalizePhone(value) {
    return String(value ?? '').replace(/\D/g, '');
  }

  function cityKey(value) {
    return clean(value).toLocaleLowerCase('fr');
  }

  function duplicateKey(record) {
    const phone = normalizePhone(record.phone);
    return phone ? `${phone}|${cityKey(record.city)}` : '';
  }

  function showToast(message, kind = 'success') {
    let toast = $('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.append(toast);
    }
    toast.textContent = message;
    toast.dataset.kind = kind;
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2800);
  }

  function createTextCell(text, className = '') {
    const cell = document.createElement('td');
    cell.textContent = String(text ?? '');
    if (className) cell.className = className;
    return cell;
  }

  function appendSizeTags(container, sizes) {
    const wrap = document.createElement('div');
    wrap.className = 'size-list';
    const tokens = splitSizes(sizes);
    if (!tokens.length) {
      wrap.textContent = '—';
    } else {
      tokens.forEach((size) => {
        const tag = document.createElement('span');
        tag.className = 'size-tag';
        tag.textContent = size;
        wrap.append(tag);
      });
    }
    container.append(wrap);
  }

  function sortedCities() {
    return [...new Set(customers.map((customer) => customer.city))]
      .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  }

  function getSizeSet() {
    const sizes = new Map();
    customers.forEach((customer) => splitSizes(customer.sizes).forEach((size) => {
      const key = size.toLocaleUpperCase('fr');
      if (!sizes.has(key)) sizes.set(key, size);
    }));
    return [...sizes.values()].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' }));
  }

  function renderMetrics() {
    ui.totalCustomers.textContent = new Intl.NumberFormat('fr-FR').format(customers.length);
    ui.cityCount.textContent = new Intl.NumberFormat('fr-FR').format(sortedCities().length);
    ui.sizeCount.textContent = new Intl.NumberFormat('fr-FR').format(getSizeSet().length);
  }

  function renderCityOptions() {
    const selected = ui.cityFilter.value;
    ui.cityFilter.replaceChildren(new Option('Toutes les villes', ''));
    ui.cityDatalist.replaceChildren();
    sortedCities().forEach((city) => {
      const option = new Option(city, city);
      ui.cityFilter.add(option);
      const suggestion = document.createElement('option');
      suggestion.value = city;
      ui.cityDatalist.append(suggestion);
    });
    if (sortedCities().includes(selected)) ui.cityFilter.value = selected;
  }

  function groupCustomersByCity() {
    const groups = new Map();
    customers.forEach((customer) => {
      const key = customer.city;
      if (!groups.has(key)) groups.set(key, { customers: [], sizes: new Map() });
      const group = groups.get(key);
      group.customers.push(customer);
      splitSizes(customer.sizes).forEach((size) => {
        const sizeKey = size.toLocaleUpperCase('fr');
        if (!group.sizes.has(sizeKey)) group.sizes.set(sizeKey, size);
      });
    });
    return groups;
  }

  function renderCitySummary() {
    ui.citySummaryRows.replaceChildren();
    const cities = sortedCities();
    ui.cityEmptyState.hidden = cities.length > 0;
    const groups = groupCustomersByCity();
    cities.forEach((city) => {
      const group = groups.get(city);
      const row = document.createElement('tr');
      const cityCell = createTextCell(city, 'city-name');
      const countCell = createTextCell(group.customers.length, 'number-cell');
      const sizeCell = document.createElement('td');
      appendSizeTags(sizeCell, [...group.sizes.values()].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true })));
      row.append(cityCell, countCell, sizeCell);
      ui.citySummaryRows.append(row);
    });
  }

  function makeActionButton(action, customer, label, iconPath, className = '') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `row-action ${className}`.trim();
    button.dataset.action = action;
    button.dataset.customerId = customer.id;
    button.setAttribute('aria-label', `${label} ${customer.name}`);
    button.title = `${label} ${customer.name}`;
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', action === 'edit' ? 'path' : 'path');
    path.setAttribute('d', iconPath);
    icon.append(path);
    button.append(icon);
    return button;
  }

  function renderCustomerList() {
    ui.customerRows.replaceChildren();
    const selectedCity = ui.cityFilter.value;
    const query = clean(ui.customerSearch.value).toLocaleLowerCase('fr');
    const filtered = [...customers]
      .filter((customer) => !selectedCity || customer.city === selectedCity)
      .filter((customer) => !query || `${customer.name} ${customer.phone}`.toLocaleLowerCase('fr').includes(query))
      .sort((a, b) => a.city.localeCompare(b.city, 'fr', { sensitivity: 'base' }) || a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));

    ui.customerEmptyState.hidden = filtered.length > 0;
    if (!filtered.length) {
      ui.customerEmptyState.textContent = customers.length ? 'Aucun résultat pour cette recherche.' : 'Aucun client pour le moment. Ajoutez une fiche ou importez plusieurs lignes.';
      return;
    }

    const fragment = document.createDocumentFragment();
    filtered.forEach((customer) => {
      const row = document.createElement('tr');
      row.append(createTextCell(customer.name, 'customer-name-cell'));
      row.append(createTextCell(customer.phone, 'phone-cell'));
      row.append(createTextCell(customer.city, 'city-name'));
      const sizes = document.createElement('td');
      appendSizeTags(sizes, customer.sizes);
      row.append(sizes);
      const actions = document.createElement('td');
      const actionGroup = document.createElement('div');
      actionGroup.className = 'customer-actions';
      actionGroup.append(
        makeActionButton('edit', customer, 'Modifier', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z M14 6l4 4', 'edit'),
        makeActionButton('delete', customer, 'Supprimer', 'M4 7h16 M10 11v6m4-6v6 M6 7l1 14h10l1-14 M9 7V4h6v3', 'delete'),
      );
      actions.append(actionGroup);
      row.append(actions);
      fragment.append(row);
    });
    ui.customerRows.append(fragment);
  }

  function renderCustomers() {
    renderMetrics();
    renderCityOptions();
    renderCitySummary();
    renderCustomerList();
  }

  function setActiveNav(name) {
    ui.navLinks.forEach((link) => {
      const active = link.dataset.nav === name;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function showWorkspace(name, scrollTarget) {
    const calculator = name === 'calculator';
    ui.clientView.hidden = calculator;
    ui.calculatorView.hidden = !calculator;
    setActiveNav(name);
    if (!calculator && scrollTarget) {
      window.setTimeout(() => $(scrollTarget)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 20);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  ui.navLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const destination = link.dataset.nav;
      const targets = { overview: '#overview', clients: '#customerList', cities: '#citySummarySection', exports: '#exportsPanel' };
      showWorkspace(destination, targets[destination]);
      if (destination !== 'calculator' && location.hash !== link.hash) history.replaceState(null, '', link.hash);
      if (destination === 'calculator') history.replaceState(null, '', '#calculatorView');
    });
  });

  function setFormMessage(message, kind = 'error') {
    ui.customerFormMessage.textContent = message;
    ui.customerFormMessage.dataset.kind = kind;
  }

  function resetCustomerForm() {
    ui.customerForm.reset();
    editingId = null;
    ui.customerSubmit.innerHTML = '<span aria-hidden="true">＋</span> Ajouter à la liste';
    ui.customerSubmit.classList.remove('is-editing');
    ui.cancelEdit.hidden = true;
    setFormMessage('');
    ui.customerName.focus();
  }

  function beginEdit(customerId) {
    const customer = customers.find((entry) => entry.id === customerId);
    if (!customer) return;
    editingId = customer.id;
    ui.customerName.value = customer.name;
    ui.customerPhone.value = customer.phone;
    ui.customerCity.value = customer.city;
    ui.customerSizes.value = customer.sizes;
    ui.customerSubmit.innerHTML = '<span aria-hidden="true">✓</span> Enregistrer les modifications';
    ui.customerSubmit.classList.add('is-editing');
    ui.cancelEdit.hidden = false;
    setFormMessage('Modification en cours.', 'info');
    $('#customerFormPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    ui.customerName.focus({ preventScroll: true });
  }

  function recordFromForm() {
    return {
      name: clean(ui.customerName.value),
      phone: clean(ui.customerPhone.value),
      city: clean(ui.customerCity.value),
      sizes: normalizeSizeText(ui.customerSizes.value),
    };
  }

  function validateCustomer(record, existingId = null) {
    if (!record.name || !record.phone || !record.city || !record.sizes) {
      return 'Renseignez le nom, le téléphone, la ville et au moins une taille.';
    }
    if (normalizePhone(record.phone).length < 5) return 'Vérifiez le numéro de téléphone saisi.';
    const key = duplicateKey(record);
    if (customers.some((item) => item.id !== existingId && duplicateKey(item) === key)) {
      return 'Ce numéro existe déjà pour cette ville. Modifiez la fiche existante si nécessaire.';
    }
    return '';
  }

  ui.customerForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const record = recordFromForm();
    const error = validateCustomer(record, editingId);
    if (error) {
      setFormMessage(error);
      showToast(error, 'error');
      return;
    }
    const now = new Date().toISOString();
    if (editingId) {
      const index = customers.findIndex((customer) => customer.id === editingId);
      if (index < 0) {
        resetCustomerForm();
        return;
      }
      customers[index] = { ...customers[index], ...record, updatedAt: now };
      setFormMessage('Les modifications ont été enregistrées.', 'success');
      saveCustomers();
      renderCustomers();
      resetCustomerForm();
      showToast('La fiche client a été modifiée.');
    } else {
      customers.push({ id: makeId(), ...record, createdAt: now, updatedAt: now });
      saveCustomers();
      renderCustomers();
      ui.customerForm.reset();
      setFormMessage('');
      ui.customerName.focus();
      showToast('Le client a été ajouté à la liste.');
    }
  });

  ui.cancelEdit.addEventListener('click', resetCustomerForm);
  ui.customerRows.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action][data-customer-id]');
    if (!button) return;
    const customerId = button.dataset.customerId;
    if (button.dataset.action === 'edit') {
      beginEdit(customerId);
      return;
    }
    const customer = customers.find((entry) => entry.id === customerId);
    if (!customer || !window.confirm(`Supprimer la fiche de ${customer.name} ?`)) return;
    customers = customers.filter((entry) => entry.id !== customerId);
    if (editingId === customerId) resetCustomerForm();
    saveCustomers();
    renderCustomers();
    showToast('La fiche client a été supprimée.');
  });

  ui.cityFilter.addEventListener('change', renderCustomerList);
  ui.customerSearch.addEventListener('input', renderCustomerList);

  const FIELD_ALIASES = {
    name: ['nom', 'nom du client', 'name', 'customer', 'customer name'],
    phone: ['telephone', 'numero telephone', 'telephone client', 'phone', 'mobile', 'tel'],
    city: ['ville', 'city', 'town'],
    sizes: ['taille', 'tailles', 'tailles achetees', 'size', 'sizes'],
  };

  function mapHeaders(row) {
    const normalized = row.map(normalizeHeader);
    return Object.fromEntries(Object.entries(FIELD_ALIASES).map(([key, aliases]) => {
      const normalizedAliases = aliases.map(normalizeHeader);
      return [key, normalized.findIndex((header) => normalizedAliases.includes(header))];
    }));
  }

  function hasAllFields(mapping) {
    return Object.values(mapping).every((index) => index >= 0);
  }

  function parseDelimited(text, forcedDelimiter = null) {
    const source = String(text ?? '').replace(/^\uFEFF/, '');
    const delimiter = forcedDelimiter || chooseDelimiter(source);
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;
    for (let i = 0; i < source.length; i += 1) {
      const char = source[i];
      if (char === '"') {
        if (quoted && source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = !quoted;
        }
      } else if (!quoted && char === delimiter) {
        row.push(field.trim());
        field = '';
      } else if (!quoted && (char === '\n' || char === '\r')) {
        if (char === '\r' && source[i + 1] === '\n') i += 1;
        row.push(field.trim());
        if (row.some((cell) => cell !== '')) rows.push(row);
        row = [];
        field = '';
      } else {
        field += char;
      }
    }
    row.push(field.trim());
    if (row.some((cell) => cell !== '')) rows.push(row);
    return rows;
  }

  function chooseDelimiter(text) {
    const firstLine = String(text).split(/\r?\n/).find((line) => line.trim()) || '';
    const candidates = ['\t', ';', ','];
    let best = '\t';
    let bestScore = -1;
    candidates.forEach((candidate) => {
      let columns = 1;
      let quoted = false;
      for (let index = 0; index < firstLine.length; index += 1) {
        if (firstLine[index] === '"') quoted = !quoted;
        else if (!quoted && firstLine[index] === candidate) columns += 1;
      }
      const score = columns > 1 ? columns * 10 - (candidate === ',' ? 1 : 0) : 0;
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    });
    return best;
  }

  function findHeader(rows) {
    const limit = Math.min(rows.length, 12);
    for (let index = 0; index < limit; index += 1) {
      const mapping = mapHeaders(rows[index]);
      if (hasAllFields(mapping)) return { index, mapping };
    }
    return null;
  }

  function recordsFromRows(rows) {
    if (!rows.length) return [];
    const header = findHeader(rows);
    const mapping = header?.mapping || { name: 0, phone: 1, city: 2, sizes: 3 };
    const start = header ? header.index + 1 : 0;
    return rows.slice(start).map((row) => ({
      name: clean(row[mapping.name]),
      phone: clean(row[mapping.phone]),
      city: clean(row[mapping.city]),
      sizes: normalizeSizeText(row[mapping.sizes]),
    })).filter((record) => record.name || record.phone || record.city || record.sizes);
  }

  function normalizeExcelValue(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
      if (value instanceof Date) return value.toLocaleDateString('fr-FR');
      if ('text' in value) return String(value.text);
      if ('richText' in value && Array.isArray(value.richText)) return value.richText.map((part) => part.text || '').join('');
      if ('result' in value) return normalizeExcelValue(value.result);
      if ('hyperlink' in value && 'text' in value) return String(value.text);
      return '';
    }
    return String(value);
  }

  function rowsFromWorksheet(worksheet) {
    const rows = [];
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      rows.push(row.values.slice(1).map(normalizeExcelValue));
    });
    return rows;
  }

  async function readImportFile(file) {
    const lowerName = file.name.toLocaleLowerCase('fr');
    if (lowerName.endsWith('.csv')) {
      const text = new TextDecoder('utf-8').decode(await file.arrayBuffer());
      return parseDelimited(text);
    }
    if (!lowerName.endsWith('.xlsx')) throw new Error('Choisissez un fichier XLSX ou CSV.');
    if (!window.ExcelJS) throw new Error('La bibliothèque Excel intégrée n’est pas disponible.');
    const workbook = new window.ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const sheets = workbook.worksheets;
    const preferred = sheets.find((sheet) => normalizeHeader(sheet.name).includes('repertoire clients'));
    const ordered = preferred ? [preferred, ...sheets.filter((sheet) => sheet !== preferred)] : sheets;
    for (const sheet of ordered) {
      const rows = rowsFromWorksheet(sheet);
      if (rows.length && (findHeader(rows) || rows[0].length >= 4)) return rows;
    }
    throw new Error('Aucune feuille ne contient les colonnes Nom, Téléphone, Ville et Tailles.');
  }

  function addImportedRecords(records) {
    const existingKeys = new Set(customers.map(duplicateKey).filter(Boolean));
    let added = 0;
    let duplicates = 0;
    let invalid = 0;
    const now = new Date().toISOString();
    records.forEach((record) => {
      const cleanRecord = {
        name: clean(record.name),
        phone: clean(record.phone),
        city: clean(record.city),
        sizes: normalizeSizeText(record.sizes),
      };
      if (!cleanRecord.name || !cleanRecord.phone || !cleanRecord.city || !cleanRecord.sizes || normalizePhone(cleanRecord.phone).length < 5) {
        invalid += 1;
        return;
      }
      const key = duplicateKey(cleanRecord);
      if (key && existingKeys.has(key)) {
        duplicates += 1;
        return;
      }
      if (key) existingKeys.add(key);
      customers.push({ id: makeId(), ...cleanRecord, createdAt: now, updatedAt: now });
      added += 1;
    });
    if (added) {
      saveCustomers();
      renderCustomers();
    }
    return { added, duplicates, invalid };
  }

  function importResultMessage(result) {
    const parts = [`${result.added} client(s) ajouté(s)`];
    if (result.duplicates) parts.push(`${result.duplicates} doublon(s) ignoré(s)`);
    if (result.invalid) parts.push(`${result.invalid} ligne(s) incomplète(s) ignorée(s)`);
    return `${parts.join(' · ')}.`;
  }

  ui.addBulk.addEventListener('click', () => {
    const raw = clean(ui.bulkData.value);
    if (!raw) {
      showToast('Collez d’abord les lignes à ajouter.', 'error');
      return;
    }
    const records = recordsFromRows(parseDelimited(raw));
    if (!records.length) {
      showToast('Aucune ligne client reconnue. Vérifiez les colonnes Nom, Téléphone, Ville et Tailles.', 'error');
      return;
    }
    const result = addImportedRecords(records);
    showToast(importResultMessage(result), result.added ? 'success' : 'error');
  });

  ui.sampleBtn.addEventListener('click', () => {
    ui.bulkData.value = [
      'Nom\tTéléphone\tVille\tTailles',
      'Exemple Sarah\t+212 6 12 34 56 78\tCasablanca\t38, 40, M',
      'Exemple Yassine\t+212 6 98 76 54 32\tRabat\t42, XL',
    ].join('\n');
    ui.bulkData.focus();
    showToast('Exemple chargé dans la zone de texte ; il ne sera ajouté qu’après votre clic.');
  });

  ui.importFile.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const rows = await readImportFile(file);
      const records = recordsFromRows(rows);
      const result = addImportedRecords(records);
      showToast(importResultMessage(result), result.added ? 'success' : 'error');
    } catch (error) {
      console.error('Import client impossible.', error);
      showToast(error.message || 'Impossible de lire le fichier. Vérifiez les colonnes demandées.', 'error');
    } finally {
      event.target.value = '';
    }
  });

  function excelTextCell(cell, value) {
    cell.value = String(value ?? '');
    cell.numFmt = '@';
  }

  function styleExcelSheet(worksheet, title, subtitle, headers, widths, tabColor) {
    const columnCount = headers.length;
    widths.forEach((width, index) => { worksheet.getColumn(index + 1).width = width; });
    worksheet.mergeCells(1, 1, 1, columnCount);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = title;
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFB6FF35' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF081827' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    worksheet.getRow(1).height = 34;

    worksheet.mergeCells(2, 1, 2, columnCount);
    const subtitleCell = worksheet.getCell(2, 1);
    subtitleCell.value = subtitle;
    subtitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FFBDD1DC' } };
    subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B2030' } };
    subtitleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    worksheet.getRow(2).height = 23;

    worksheet.getCell(3, 1).value = 'Généré le';
    worksheet.getCell(3, 1).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF718B9A' } };
    worksheet.getCell(3, 2).value = new Date();
    worksheet.getCell(3, 2).numFmt = 'dd/mm/yyyy hh:mm';
    worksheet.getCell(3, 2).font = { name: 'Arial', size: 9, color: { argb: 'FF718B9A' } };
    worksheet.getRow(4).height = 7;

    const headerRow = worksheet.getRow(5);
    headerRow.values = headers;
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFF1FAFC' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF123647' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      cell.border = { bottom: { style: 'medium', color: { argb: 'FF19D5CA' } } };
    });
    worksheet.views = [{ state: 'frozen', ySplit: 5, activeCell: 'A6', topLeftCell: 'A6' }];
    worksheet.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: columnCount } };
    worksheet.properties.tabColor = tabColor;
    worksheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
    worksheet.pageMargins = { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };
  }

  function styleExcelDataRow(row, rowNumber) {
    row.height = 22;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { name: 'Arial', size: 10, color: { argb: 'FFE8F1F5' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowNumber % 2 === 0 ? 'FF0C2031' : 'FF10283A' } };
      cell.border = { bottom: { style: 'hair', color: { argb: 'FF254458' } } };
    });
  }

  function finalizeTableSheet(worksheet, headers, dataStart = 6) {
    const lastRow = Math.max(5, worksheet.rowCount);
    worksheet.autoFilter = { from: { row: 5, column: 1 }, to: { row: lastRow, column: headers.length } };
    for (let rowNumber = dataStart; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      styleExcelDataRow(worksheet.getRow(rowNumber), rowNumber);
    }
  }

  function safeWorksheetName(value, usedNames) {
    let base = clean(value).replace(/[\\/*?:\[\]]/g, ' ').replace(/^'+|'+$/g, '').trim().slice(0, 31) || 'Ville';
    if (base.toLocaleLowerCase('fr') === 'history') base = 'Ville';
    let name = base;
    let suffix = 2;
    while (usedNames.has(name.toLocaleLowerCase('fr'))) {
      const ending = ` ${suffix}`;
      name = `${base.slice(0, 31 - ending.length)}${ending}`;
      suffix += 1;
    }
    usedNames.add(name.toLocaleLowerCase('fr'));
    return name;
  }

  function addFormulaCell(cell, formula, result) {
    cell.value = { formula, result };
    cell.numFmt = '#,##0';
  }

  async function exportWorkbook() {
    if (!customers.length) {
      showToast('Ajoutez ou importez des clients avant de créer le rapport Excel.', 'error');
      return;
    }
    if (!window.ExcelJS) {
      showToast('La bibliothèque Excel locale n’a pas pu être chargée. Rechargez la page.', 'error');
      return;
    }
    const button = ui.exportExcel;
    button.disabled = true;
    button.classList.add('is-loading');
    try {
      const workbook = new window.ExcelJS.Workbook();
      workbook.creator = 'Marge Studio';
      workbook.subject = 'Clients organisés par ville et tailles achetées';
      workbook.title = 'Marge Studio — Répertoire clients';
      workbook.created = new Date();
      workbook.modified = new Date();
      workbook.properties.date1904 = false;

      const orderedCustomers = [...customers].sort((a, b) => a.city.localeCompare(b.city, 'fr', { sensitivity: 'base' }) || a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
      const groups = groupCustomersByCity();
      const cityNames = sortedCities();
      const sizeMap = new
Map();
      orderedCustomers.forEach((customer) => splitSizes(customer.sizes).forEach((size) => {
        const key = size.toLocaleUpperCase('fr');
        if (!sizeMap.has(key)) sizeMap.set(key, { label: size, count: 0, cities: new Set() });
        const entry = sizeMap.get(key);
        entry.count += 1;
        entry.cities.add(customer.city);
      }));

      const summary = workbook.addWorksheet('Synthèse des villes');
      const directory = workbook.addWorksheet('Répertoire clients');
      const sizeDetails = workbook.addWorksheet('Tailles par client');
      const sizeAnalysis = workbook.addWorksheet('Analyse des tailles');
      styleExcelSheet(summary, 'MARGE STUDIO — SYNTHÈSE CLIENTS', 'Effectifs et tailles enregistrées par ville', ['Ville', 'Nombre de clients', 'Tailles enregistrées'], [30, 22, 48], 'B6FF35');
      styleExcelSheet(directory, 'MARGE STUDIO — RÉPERTOIRE CLIENTS', 'Coordonnées et tailles — triées par ville puis par nom', ['Ville', 'Nom du client', 'Téléphone', 'Tailles achetées'], [26, 30, 24, 30], '19D5CA');
      styleExcelSheet(sizeDetails, 'MARGE STUDIO — TAILLES PAR CLIENT', 'Une ligne par taille achetée, pour faciliter les filtres Excel', ['Ville', 'Nom du client', 'Téléphone', 'Taille'], [26, 30, 24, 16], '38A8FF');
      styleExcelSheet(sizeAnalysis, 'MARGE STUDIO — ANALYSE DES TAILLES', 'Fréquence des tailles présentes dans les fiches clients', ['Taille', 'Nombre de clients', 'Villes concernées'], [18, 22, 48], 'B6FF35');

      orderedCustomers.forEach((customer) => {
        const row = directory.addRow([customer.city, customer.name, customer.phone, customer.sizes]);
        excelTextCell(row.getCell(3), customer.phone);
        row.getCell(4).numFmt = '@';
      });
      finalizeTableSheet(directory, ['Ville', 'Nom du client', 'Téléphone', 'Tailles achetées']);

      let sizeDetailCount = 0;
      orderedCustomers.forEach((customer) => {
        splitSizes(customer.sizes).forEach((size) => {
          const row = sizeDetails.addRow([customer.city, customer.name, customer.phone, size]);
          excelTextCell(row.getCell(3), customer.phone);
          row.getCell(4).numFmt = '@';
          sizeDetailCount += 1;
        });
      });
      finalizeTableSheet(sizeDetails, ['Ville', 'Nom du client', 'Téléphone', 'Taille']);

      let sizeIndex = 0;
      [...sizeMap.values()].sort((a, b) => a.label.localeCompare(b.label, 'fr', { numeric: true, sensitivity: 'base' })).forEach((entry) => {
        sizeIndex += 1;
        const rowNumber = 5 + sizeIndex;
        const row = sizeAnalysis.addRow([entry.label, '', [...entry.cities].sort((a, b) => a.localeCompare(b, 'fr')).join(', ')]);
        const detailLastRow = Math.max(6, 5 + sizeDetailCount);
        addFormulaCell(row.getCell(2), `COUNTIF('Tailles par client'!$D$6:$D$${detailLastRow},A${rowNumber})`, entry.count);
      });
      finalizeTableSheet(sizeAnalysis, ['Taille', 'Nombre de clients', 'Villes concernées']);

      let cityIndex = 0;
      cityNames.forEach((city) => {
        cityIndex += 1;
        const rowNumber = 5 + cityIndex;
        const group = groups.get(city);
        const sizes = [...group.sizes.values()].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' })).join(', ');
        const row = summary.addRow([city, '', sizes]);
        const directoryLastRow = Math.max(6, 5 + orderedCustomers.length);
        addFormulaCell(row.getCell(2), `COUNTIF('Répertoire clients'!$A$6:$A$${directoryLastRow},A${rowNumber})`, group.customers.length);
      });
      const summaryTotalRow = summary.addRow(['TOTAL', '', `${sizeMap.size} tailles distinctes`]);
      const directoryLastRow = Math.max(6, 5 + orderedCustomers.length);
      addFormulaCell(summaryTotalRow.getCell(2), `COUNTA('Répertoire clients'!$B$6:$B$${directoryLastRow})`, customers.length);
      finalizeTableSheet(summary, ['Ville', 'Nombre de clients', 'Tailles enregistrées']);
      summaryTotalRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFB6FF35' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF163B3E' } };
        cell.border = { top: { style: 'medium', color: { argb: 'FF19D5CA' } } };
      });

      const usedNames = new Set(['synthèse des villes', 'répertoire clients', 'tailles par client', 'analyse des tailles']);
      cityNames.forEach((city) => {
        const sheetName = safeWorksheetName(city, usedNames);
        const citySheet = workbook.addWorksheet(sheetName);
        const cityCustomers = orderedCustomers.filter((customer) => customer.city === city);
        styleExcelSheet(citySheet, `CLIENTS — ${city.toLocaleUpperCase('fr')}`, `${cityCustomers.length} client(s) · coordonnées et tailles achetées`, ['Nom du client', 'Téléphone', 'Tailles achetées'], [32, 25, 34], '19D5CA');
        cityCustomers.forEach((customer) => {
          const row = citySheet.addRow([customer.name, customer.phone, customer.sizes]);
          excelTextCell(row.getCell(2), customer.phone);
          row.getCell(3).numFmt = '@';
        });
        finalizeTableSheet(citySheet, ['Nom du client', 'Téléphone', 'Tailles achetées']);
      });

      workbook.calcProperties.fullCalcOnLoad = true;
      workbook.calcProperties.forceFullCalc = true;
      const buffer = await workbook.xlsx.writeBuffer();
      downloadBlob(buffer, `Marge_Studio_Clients_${new Date().toISOString().slice(0, 10)}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      showToast('Le classeur Excel complet a été téléchargé.');
    } catch (error) {
      console.error('Création du classeur Excel impossible.', error);
      showToast('La création Excel a échoué. Réessayez après avoir rechargé la page.', 'error');
    } finally {
      button.disabled = false;
      button.classList.remove('is-loading');
    }
  }

  function downloadBlob(content, filename, mimeType) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1800);
  }

  function exportPhoneNumbers() {
    if (!customers.length) {
      showToast('Aucun numéro à exporter pour le moment.', 'error');
      return;
    }
    const numbers = [...new Set(customers
      .slice()
      .sort((a, b) => a.city.localeCompare(b.city, 'fr') || a.name.localeCompare(b.name, 'fr'))
      .map((customer) => customer.phone.trim())
      .filter(Boolean))];
    downloadBlob(`${numbers.join('\r\n')}\r\n`, `Numeros_clients_${new Date().toISOString().slice(0, 10)}.txt`, 'text/plain;charset=utf-8');
    showToast(`${numbers.length} numéro(s) exporté(s), un par ligne.`);
  }

  [ui.exportExcel, ui.exportExcelSecondary].forEach((button) => button.addEventListener('click', exportWorkbook));
  [ui.exportPhones, ui.exportPhonesSecondary].forEach((button) => button.addEventListener('click', exportPhoneNumbers));

  // Calculator logic — kept separate from the customer records.
  const calc = ui.calculator;
  let calcToastTimer;

  function formatNumber(amount) {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
  }

  function formatMoney(amount) {
    return `${formatNumber(amount)} ${calc.currency.value}`;
  }

  function readCalcNumber(input) {
    const raw = input.value.trim();
    const value = raw === '' ? Number.NaN : Number(raw);
    const invalid = !Number.isFinite(value) || value < 0;
    input.classList.toggle('is-invalid', invalid);
    input.setAttribute('aria-invalid', String(invalid));
    const card = input.closest('.field-card');
    let error = $('.error-message', card);
    if (!error) {
      error = document.createElement('p');
      error.className = 'error-message';
      error.setAttribute('role', 'alert');
      card.append(error);
    }
    error.textContent = invalid ? (raw === '' ? 'Saisissez un montant supérieur ou égal à 0.' : 'La valeur doit être positive ou égale à 0.') : '';
    return invalid ? 0 : value;
  }

  function calculatePrice() {
    const purchase = readCalcNumber(calc.purchaseCost);
    const adBeforeVat = readCalcNumber(calc.adCost);
    const delivery = readCalcNumber(calc.deliveryCost);
    const targetProfit = readCalcNumber(calc.targetProfit);
    const adVat = adBeforeVat * VAT_RATE;
    const adAfterVat = adBeforeVat + adVat;
    const costPerPiece = purchase + adAfterVat + delivery;
    const salePrice = costPerPiece + targetProfit;
    return { purchase, adBeforeVat, adVat, adAfterVat, delivery, targetProfit, costPerPiece, salePrice };
  }

  function renderQuantityRows() {
    calc.quantityRows.replaceChildren();
    quantities.forEach((quantity, index) => {
      const row = document.createElement('tr');
      const quantityCell = document.createElement('td');
      const quantityInput = document.createElement('input');
      quantityInput.className = 'quantity-input';
      quantityInput.type = 'number';
      quantityInput.min = '1';
      quantityInput.step = '1';
      quantityInput.inputMode = 'numeric';
      quantityInput.value = String(quantity);
      quantityInput.setAttribute('aria-label', `Quantité de la ligne ${index + 1}`);
      quantityInput.dataset.quantityIndex = String(index);
      quantityCell.append(quantityInput);
      row.append(quantityCell);
      for (let column = 0; column < 7; column += 1) {
        const cell = document.createElement('td');
        cell.dataset.resultIndex = String(column);
        if (column === 6) cell.className = 'profit-cell';
        row.append(cell);
      }
      const actionCell = document.createElement('td');
      const remove = document.createElement('button');
      remove.className = 'remove-row';
      remove.type = 'button';
      remove.textContent = '×';
      remove.title = 'Supprimer cette quantité';
      remove.setAttribute('aria-label', `Supprimer la quantité de la ligne ${index + 1}`);
      remove.dataset.removeIndex = String(index);
      actionCell.append(remove);
      row.append(actionCell);
      calc.quantityRows.append(row);
    });
  }

  function updateCalculator() {
    const result = calculatePrice();
    calc.vatAmount.textContent = formatMoney(result.adVat);
    calc.salePrice.textContent = formatNumber(result.salePrice);
    calc.adBeforeVatResult.textContent = formatMoney(result.adBeforeVat);
    calc.adAfterVatResult.textContent = formatMoney(result.adAfterVat);
    calc.formulaText.textContent = `${formatNumber(result.purchase)} achat + ${formatNumber(result.adBeforeVat)} publicité + ${formatNumber(result.adVat)} TVA + ${formatNumber(result.delivery)} livraison + ${formatNumber(result.targetProfit)} bénéfice`;
    $$('[data-currency]').forEach((label) => { label.textContent = calc.currency.value; });

    [...calc.quantityRows.rows].forEach((row, rowIndex) => {
      const quantity = quantities[rowIndex];
      const values = [
        formatMoney(result.salePrice),
        formatMoney(result.adBeforeVat * quantity),
        formatMoney(result.adAfterVat * quantity),
        formatMoney(result.delivery * quantity),
        formatMoney(result.costPerPiece * quantity),
        formatMoney(result.salePrice * quantity),
        formatMoney(result.targetProfit * quantity),
      ];
      $$('[data-result-index]', row).forEach((cell, index) => { cell.textContent = values[index]; });
    });
  }

  function showCalculatorToast(message) {
    let toast = $('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.append(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(calcToastTimer);
    calcToastTimer = window.setTimeout(() => toast.classList.remove('show'), 2300);
  }

  function resetCalculator() {
    calc.purchaseCost.value = String(DEFAULTS.purchaseCost);
    calc.adCost.value = String(DEFAULTS.adCost);
    calc.deliveryCost.value = String(DEFAULTS.deliveryCost);
    calc.targetProfit.value = String(DEFAULTS.targetProfit);
    calc.currency.value = DEFAULTS.currency;
    quantities = [...DEFAULTS.quantities];
    renderQuantityRows();
    updateCalculator();
    showCalculatorToast('Les valeurs d’exemple ont été restaurées.');
  }

  [calc.purchaseCost, calc.adCost, calc.deliveryCost, calc.targetProfit].forEach((input) => {
    input.addEventListener('input', updateCalculator);
    input.addEventListener('change', updateCalculator);
  });
  calc.currency.addEventListener('change', updateCalculator);
  calc.quantityRows.addEventListener('input', (event) => {
    const input = event.target.closest('[data-quantity-index]');
    if (!input) return;
    const index = Number(input.dataset.quantityIndex);
    const value = Number.parseInt(input.value, 10);
    if (Number.isFinite(value) && value >= 1) quantities[index] = value;
    updateCalculator();
  });
  calc.quantityRows.addEventListener('change', (event) => {
    const input = event.target.closest('[data-quantity-index]');
    if (!input) return;
    const index = Number(input.dataset.quantityIndex);
    const value = Number.parseInt(input.value, 10);
    if (!Number.isFinite(value) || value < 1) {
      quantities[index] = 1;
      input.value = '1';
    } else {
      quantities[index] = value;
      input.value = String(value);
    }
    updateCalculator();
  });
  calc.quantityRows.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-index]');
    if (!button) return;
    quantities.splice(Number(button.dataset.removeIndex), 1);
    if (!quantities.length) quantities = [1];
    renderQuantityRows();
    updateCalculator();
    showCalculatorToast('La ligne de quantité a été supprimée.');
  });
  calc.addQuantityButton.addEventListener('click', () => {
    quantities.push(quantities.length ? Math.max(...quantities) + 5 : 1);
    renderQuantityRows();
    updateCalculator();
    const added = $('[data-quantity-index]', calc.quantityRows.lastElementChild);
    added?.focus();
    showCalculatorToast('Une nouvelle quantité a été ajoutée.');
  });
  calc.resetButton.addEventListener('click', resetCalculator);
  calc.resetLink.addEventListener('click', resetCalculator);

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      customers = loadCustomers();
      renderCustomers();
      showToast('Les fiches ont été actualisées depuis un autre onglet.');
    }
  });

  renderCustomers();
  renderQuantityRows();
  updateCalculator();
  if (location.hash === '#calculatorView' || location.hash === '#calculator') {
    showWorkspace('calculator');
  } else {
    showWorkspace('clients');
  }
})();
