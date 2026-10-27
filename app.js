(() => {
  'use strict';

  const VAT_RATE = 0.20;
  const DEFAULTS = Object.freeze({
    purchaseCost: 120,
    adCost: 25,
    deliveryCost: 20,
    targetProfit: 50,
    currency: 'MAD',
    quantities: [1, 10, 25],
  });

  const elements = {
    purchaseCost: document.querySelector('#purchaseCost'),
    adCost: document.querySelector('#adCost'),
    deliveryCost: document.querySelector('#deliveryCost'),
    targetProfit: document.querySelector('#targetProfit'),
    currency: document.querySelector('#currency'),
    vatAmount: document.querySelector('#vatAmount'),
    salePrice: document.querySelector('#salePrice'),
    adBeforeVatResult: document.querySelector('#adBeforeVatResult'),
    adAfterVatResult: document.querySelector('#adAfterVatResult'),
    formulaText: document.querySelector('#formulaText'),
    quantityRows: document.querySelector('#quantityRows'),
    addQuantityButton: document.querySelector('#addQuantityButton'),
    resetButton: document.querySelector('#resetButton'),
    resetLink: document.querySelector('#resetLink'),
  };

  let quantities = [...DEFAULTS.quantities];
  let toastTimer;

  const formatNumber = (amount) => new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  const formatMoney = (amount) => `${formatNumber(amount)} ${elements.currency.value}`;

  const readNumber = (input) => {
    const raw = input.value.trim();
    const parsed = raw === '' ? Number.NaN : Number(raw);
    const invalid = !Number.isFinite(parsed) || parsed < 0;
    input.classList.toggle('is-invalid', invalid);
    input.setAttribute('aria-invalid', String(invalid));
    const field = input.closest('.field-card');
    let error = field.querySelector('.error-message');
    if (!error) {
      error = document.createElement('p');
      error.className = 'error-message';
      error.setAttribute('role', 'alert');
      field.append(error);
    }
    error.textContent = invalid ? (raw === '' ? 'Saisissez un montant supérieur ou égal à 0.' : 'La valeur doit être positive ou égale à 0.') : '';
    return invalid ? 0 : parsed;
  };

  const calculate = () => {
    const purchase = readNumber(elements.purchaseCost);
    const adBeforeVat = readNumber(elements.adCost);
    const delivery = readNumber(elements.deliveryCost);
    const targetProfit = readNumber(elements.targetProfit);
    const adVat = adBeforeVat * VAT_RATE;
    const adAfterVat = adBeforeVat + adVat;
    const costPerPiece = purchase + adAfterVat + delivery;
    const salePrice = costPerPiece + targetProfit;

    return { purchase, adBeforeVat, adVat, adAfterVat, delivery, targetProfit, costPerPiece, salePrice };
  };

  const updateCurrencyLabels = () => {
    document.querySelectorAll('[data-currency]').forEach((element) => {
      element.textContent = elements.currency.value;
    });
  };

  const renderQuantityRows = (values) => {
    elements.quantityRows.innerHTML = '';
    values.forEach((quantity, index) => {
      const row = document.createElement('tr');
      row.dataset.index = String(index);

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
        if (column === 6) cell.classList.add('profit-cell');
        row.append(cell);
      }

      const actionCell = document.createElement('td');
      const removeButton = document.createElement('button');
      removeButton.className = 'remove-row';
      removeButton.type = 'button';
      removeButton.textContent = '×';
      removeButton.title = 'Supprimer cette quantité';
      removeButton.setAttribute('aria-label', `Supprimer la quantité de la ligne ${index + 1}`);
      removeButton.dataset.removeIndex = String(index);
      actionCell.append(removeButton);
      row.append(actionCell);
      elements.quantityRows.append(row);
    });
  };

  const updateQuantityResults = (values) => {
    const result = calculate();
    [...elements.quantityRows.rows].forEach((row, rowIndex) => {
      const quantity = values[rowIndex];
      const totals = [
        formatMoney(result.salePrice),
        formatMoney(result.adBeforeVat * quantity),
        formatMoney(result.adAfterVat * quantity),
        formatMoney(result.delivery * quantity),
        formatMoney(result.costPerPiece * quantity),
        formatMoney(result.salePrice * quantity),
        formatMoney(result.targetProfit * quantity),
      ];
      row.querySelectorAll('[data-result-index]').forEach((cell, index) => {
        cell.textContent = totals[index];
      });
    });
  };

  const updateSummary = () => {
    const result = calculate();
    elements.vatAmount.textContent = formatMoney(result.adVat);
    elements.salePrice.textContent = formatNumber(result.salePrice);
    elements.adBeforeVatResult.textContent = formatMoney(result.adBeforeVat);
    elements.adAfterVatResult.textContent = formatMoney(result.adAfterVat);
    elements.formulaText.textContent = `${formatNumber(result.purchase)} achat + ${formatNumber(result.adBeforeVat)} publicité + ${formatNumber(result.adVat)} TVA + ${formatNumber(result.delivery)} livraison + ${formatNumber(result.targetProfit)} bénéfice`;
    updateCurrencyLabels();
    updateQuantityResults(quantities);
  };

  const showToast = (message) => {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.append(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2300);
  };

  const resetCalculator = () => {
    elements.purchaseCost.value = String(DEFAULTS.purchaseCost);
    elements.adCost.value = String(DEFAULTS.adCost);
    elements.deliveryCost.value = String(DEFAULTS.deliveryCost);
    elements.targetProfit.value = String(DEFAULTS.targetProfit);
    elements.currency.value = DEFAULTS.currency;
    quantities = [...DEFAULTS.quantities];
    renderQuantityRows(quantities);
    updateSummary();
    showToast('Les valeurs d’exemple ont été restaurées.');
  };

  [elements.purchaseCost, elements.adCost, elements.deliveryCost, elements.targetProfit].forEach((input) => {
    input.addEventListener('input', updateSummary);
    input.addEventListener('change', updateSummary);
  });

  elements.currency.addEventListener('change', updateSummary);

  elements.quantityRows.addEventListener('input', (event) => {
    const input = event.target.closest('[data-quantity-index]');
    if (!input) return;
    const index = Number(input.dataset.quantityIndex);
    const value = Number.parseInt(input.value, 10);
    if (Number.isFinite(value) && value >= 1) quantities[index] = value;
    updateQuantityResults(quantities);
  });

  elements.quantityRows.addEventListener('change', (event) => {
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
    updateQuantityResults(quantities);
  });

  elements.quantityRows.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-index]');
    if (!button) return;
    const index = Number(button.dataset.removeIndex);
    quantities.splice(index, 1);
    if (quantities.length === 0) quantities = [1];
    renderQuantityRows(quantities);
    updateQuantityResults(quantities);
    showToast('La ligne de quantité a été supprimée.');
  });

  elements.addQuantityButton.addEventListener('click', () => {
    const nextQuantity = quantities.length ? Math.max(...quantities) + 5 : 1;
    quantities.push(nextQuantity);
    renderQuantityRows(quantities);
    updateQuantityResults(quantities);
    const addedInput = elements.quantityRows.querySelector(`[data-quantity-index="${quantities.length - 1}"]`);
    addedInput?.focus();
    showToast('Une nouvelle quantité a été ajoutée.');
  });

  elements.resetButton.addEventListener('click', resetCalculator);
  elements.resetLink.addEventListener('click', resetCalculator);

  renderQuantityRows(quantities);
  updateSummary();
})();
