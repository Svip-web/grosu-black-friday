(() => {
  const form = document.getElementById('lead-form');
  const submitButton = form.querySelector('button[type="submit"]');
  const status = document.getElementById('form-status');
  const buttonText = submitButton.textContent;
  let requestId = crypto.randomUUID();
  let sending = false;

  form.addEventListener('input', () => {
    requestId = crypto.randomUUID();
    status.hidden = true;
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending || !form.reportValidity()) return;
    const fields = new FormData(form);
    const submittedRequestId = requestId;
    const name = fields.get('name').trim();
    if (!name) {
      status.hidden = false;
      status.textContent = 'Укажите ваше имя.';
      form.elements.name.focus();
      return;
    }
    const phone = fields.get('phone').replace(/[\s().-]/g, '');
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      status.hidden = false;
      status.textContent = 'Укажите телефон с международным кодом, например +380501234567.';
      form.elements.phone.focus();
      return;
    }

    const attribution = {};
    const query = new URLSearchParams(location.search);
    for (const field of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid']) {
      if (query.has(field)) attribution[field] = query.get(field).slice(0, 512);
    }
    for (const field of ['fbc', 'fbp']) {
      const cookie = document.cookie.split(';').map(value => value.trim()).find(value => value.startsWith('_' + field + '='));
      if (cookie) attribution[field] = cookie.slice(field.length + 2, field.length + 514);
    }

    sending = true;
    submitButton.disabled = true;
    submitButton.textContent = 'ОТКРЫВАЕМ ОПЛАТУ…';
    status.hidden = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        signal: controller.signal,
        body: JSON.stringify({
          ...Object.fromEntries(Object.entries(attribution).filter(([key]) => key !== 'fbc' && key !== 'fbp')),
          title: 'Предоплата с сайта ЧП 20$',
          stage: 106874727,
          upstage: 106875715,
          product: 'Etsy',
          type_lead: 'Горячий',
          type_lead_pay: 'Автооплата',
          pack_pay: 'Бронь',
          tag: '399$/599$/899$;blackfriday',
          currency: 'USD',
          req: 'etsy_pay_4',
          amount: 20,
          tp: 'https://www.juliagrosuschool.us/thanks',
          name,
          email: fields.get('email').trim(),
          phone,
          Phone: phone,
          system_url: location.href,
          system_exid: submittedRequestId,
          system_fbc: attribution.fbc || '',
          system_fbp: attribution.fbp || ''
        })
      });
      const result = await response.json();
      if (!response.ok || !result || typeof result !== 'object' || Array.isArray(result)
        || result.error || result.success === false || result.state === false) {
        throw new Error('Не удалось передать заявку. Попробуйте ещё раз чуть позже.');
      }
      if (typeof result.paymentUrl !== 'string' || !result.paymentUrl.trim()) {
        throw new Error('Не удалось открыть оплату. Попробуйте ещё раз чуть позже.');
      }
      const checkout = new URL(result.paymentUrl);
      if (checkout.protocol !== 'https:' || checkout.username || checkout.password) {
        throw new Error('Не удалось открыть оплату. Попробуйте ещё раз чуть позже.');
      }
      location.assign(checkout.href);
    } catch (error) {
      status.hidden = false;
      status.textContent = error.name === 'AbortError'
        ? 'Ответ задерживается. Попробуйте ещё раз чуть позже.'
        : 'Не удалось открыть оплату. Проверьте соединение и попробуйте ещё раз.';
    } finally {
      clearTimeout(timeout);
      sending = false;
      submitButton.disabled = false;
      submitButton.textContent = buttonText;
    }
  });
})();
