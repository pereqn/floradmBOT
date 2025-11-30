// ===== ДАННЫЕ-ПРИМЕРЫ =====

// Простейший мок каталога.
// Потом это можно заменить на запросы к API / Supabase.
const PRODUCTS = [
  {
    id: "p1",
    name: "Red Naomi",
    country: "Армения",
    category: "Роза",
    length: 50,
    price: 52,
    hot: true,
    mode: "stock", // stock | hot | preorder
    tags: ["Премиум"],
  },
  {
    id: "p2",
    name: "Avalanche",
    country: "Россия",
    category: "Роза",
    length: 60,
    price: 46,
    hot: true,
    mode: "stock",
    tags: [],
  },
  {
    id: "p3",
    name: "Кустовая роза микс",
    country: "Кения",
    category: "Роза",
    length: 50,
    price: 58,
    hot: false,
    mode: "stock",
    tags: ["Премиум"],
  },
  {
    id: "p4",
    name: "Хризантема бигуди белая",
    country: "Россия",
    category: "Хризантема",
    length: 70,
    price: 72,
    hot: false,
    mode: "stock",
    tags: [],
  },
  {
    id: "p5",
    name: "Эустома букетная",
    country: "Россия",
    category: "Эустома",
    length: 60,
    price: 80,
    hot: false,
    mode: "stock",
    tags: [],
  },
  {
    id: "p6",
    name: "Роза Армения 50 см (под заказ)",
    country: "Армения",
    category: "Роза",
    length: 50,
    price: 50,
    hot: false,
    mode: "preorder",
    tags: ["Под заказ"],
  },
  {
    id: "p7",
    name: "Роза Китай 50 см (под заказ)",
    country: "Китай",
    category: "Роза",
    length: 50,
    price: 34,
    hot: false,
    mode: "preorder",
    tags: ["Под заказ", "Эконом"],
  },
];

// Корзина и заказы в памяти
let cart = {}; // {productId: quantity}
let orders = []; // [{id, items, totals, status, ...}]
let lastOrderId = 1;

// Настройки каталога
let currentCatalogMode = "hot"; // hot | stock | preorder

// ===== УТИЛИТЫ =====

function qs(sel) {
  return document.querySelector(sel);
}
function qsa(sel) {
  return Array.from(document.querySelectorAll(sel));
}

// Формат цены
function formatPrice(value) {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

// ===== НАВИГАЦИЯ МЕЖДУ ЭКРАНАМИ =====

function switchScreen(screenId) {
  qsa("[data-screen]").forEach((el) => {
    el.classList.toggle("hidden", el.id !== screenId);
  });
  qsa(".nav-btn").forEach((btn) => {
    btn.classList.toggle(
      "active",
      btn.getAttribute("data-nav-target") === screenId
    );
  });
}

function initNav() {
  qsa(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-nav-target");
      switchScreen(target);
    });
  });

  qsa("[data-nav-target]").forEach((el) => {
    if (!el.classList.contains("nav-btn")) {
      el.addEventListener("click", () => {
        const target = el.getAttribute("data-nav-target");
        switchScreen(target);
      });
    }
  });
}

// ===== ОНБОРДИНГ =====

function initOnboarding() {
  const onboarding = qs("#onboarding");
  const seen = localStorage.getItem("flowers_onboarding_seen");
  if (!seen) {
    onboarding.classList.remove("hidden");
  }

  qs("#onb-next-1").addEventListener("click", () => {
    qs("#onb-step-1").classList.add("hidden");
    qs("#onb-step-2").classList.remove("hidden");
  });

  qs("#onb-next-2").addEventListener("click", () => {
    onboarding.classList.add("hidden");
    localStorage.setItem("flowers_onboarding_seen", "1");
  });
}

// ===== КАТАЛОГ =====

function renderHotRow() {
  const row = qs("#hotProductsRow");
  row.innerHTML = "";
  PRODUCTS.filter((p) => p.hot).forEach((p) => {
    const card = document.createElement("button");
    card.className = "product-card";
    card.style.minWidth = "210px";
    card.innerHTML = `
      <div class="product-thumb">
        <span>${p.category}</span>
      </div>
      <div class="product-main">
        <div>
          <div class="product-title">${p.name}</div>
          <div class="product-meta">${p.country} • ${p.length} см</div>
          <div class="product-price">${formatPrice(p.price)}</div>
        </div>
        <div class="product-actions">
          <button class="btn secondary btn-sm" data-add-id="${p.id}">В корзину</button>
        </div>
      </div>
    `;
    row.appendChild(card);
  });

  row.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add-id]");
    if (!btn) return;
    addToCart(btn.getAttribute("data-add-id"), 1);
  });
}

function applyCatalogFilters(product) {
  const country = qs("#filterCountry").value;
  const cat = qs("#filterCategory").value;
  const len = qs("#filterLength").value;

  if (country && product.country !== country) return false;
  if (cat && product.category !== cat) return false;
  if (len && String(product.length) !== len) return false;
  return true;
}

function renderCatalog() {
  const list = qs("#catalogList");
  list.innerHTML = "";

  const filtered = PRODUCTS.filter((p) => {
    if (currentCatalogMode === "hot" && !p.hot) return false;
    if (currentCatalogMode === "stock" && p.mode !== "stock") return false;
    if (currentCatalogMode === "preorder" && p.mode !== "preorder") return false;
    return applyCatalogFilters(p);
  });

  if (!filtered.length) {
    list.innerHTML =
      '<p class="muted">Под ваши фильтры пока ничего нет. Попробуйте изменить условия.</p>';
    return;
  }

  filtered.forEach((p) => {
    const qty = cart[p.id] || 0;
    const card = document.createElement("div");
    card.className = "product-card";
    const tagsHtml = [
      p.hot ? '<span class="tag tag-hot">Горячее</span>' : "",
      p.mode === "preorder" ? '<span class="tag tag-preorder">Под заказ</span>' : "",
      ...(p.tags || []).map((t) => `<span class="tag">${t}</span>`),
    ]
      .filter(Boolean)
      .join("");

    card.innerHTML = `
      <div class="product-thumb">
        <span>${p.category}</span>
      </div>
      <div class="product-main">
        <div>
          <div class="product-title">${p.name}</div>
          <div class="product-meta">${p.country} • ${p.length} см</div>
          <div class="product-price">${formatPrice(p.price)}</div>
          <div class="product-tags">${tagsHtml}</div>
        </div>
        <div class="product-actions">
          <div class="qty-control" data-pid="${p.id}">
            <button class="qty-btn" data-q-action="dec">−</button>
            <span class="qty-value">${qty}</span>
            <button class="qty-btn" data-q-action="inc">+</button>
          </div>
        </div>
      </div>
    `;
    list.appendChild(card);
  });
}

function initCatalog() {
  // режим (горячее / наличие / под заказ)
  qsa(".segmented-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      qsa(".segmented-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentCatalogMode = btn.getAttribute("data-catalog-mode");
      renderCatalog();
    });
  });

  // фильтры
  ["#filterCountry", "#filterCategory", "#filterLength"].forEach((sel) => {
    qs(sel).addEventListener("change", renderCatalog);
  });

  // обработка +/−
  qs("#catalogList").addEventListener("click", (e) => {
    const control = e.target.closest(".qty-control");
    if (!control) return;
    const productId = control.getAttribute("data-pid");
    const actionBtn = e.target.closest("[data-q-action]");
    if (!actionBtn) return;
    const action = actionBtn.getAttribute("data-q-action");
    if (action === "inc") addToCart(productId, 1);
    if (action === "dec") addToCart(productId, -1);
  });

  renderHotRow();
  renderCatalog();
}

// ===== КОРЗИНА =====

function addToCart(productId, delta) {
  const current = cart[productId] || 0;
  let next = current + delta;
  if (next < 0) next = 0;
  if (next === 0) {
    delete cart[productId];
  } else {
    cart[productId] = next;
  }
  updateCartBar();
  renderCatalog();
}

function getCartItems() {
  return Object.entries(cart).map(([productId, qty]) => {
    const product = PRODUCTS.find((p) => p.id === productId);
    return { product, qty };
  });
}

// Логика скидки: армянские розы по объёму
function calculateCartTotals() {
  const items = getCartItems();
  let subtotal = 0;
  let armenianRoseQty = 0;

  items.forEach(({ product, qty }) => {
    const line = product.price * qty;
    subtotal += line;
    if (product.country === "Армения" && product.category === "Роза") {
      armenianRoseQty += qty;
    }
  });

  let discountPerStem = 0;
  if (armenianRoseQty >= 40000) discountPerStem = 3;
  else if (armenianRoseQty >= 20000) discountPerStem = 2.5;
  else if (armenianRoseQty >= 10000) discountPerStem = 2;

  const discount = discountPerStem * armenianRoseQty;
  const total = Math.max(subtotal - discount, 0);

  return { subtotal, discount, total, armenianRoseQty };
}

function updateCartBar() {
  const items = getCartItems();
  const bar = qs("#cartBar");

  if (!items.length) {
    bar.classList.add("hidden");
    return;
  }

  const totals = calculateCartTotals();
  const totalQty = items.reduce((sum, it) => sum + it.qty, 0);
  qs("#cartSummary").textContent = `${items.length} позиций • ${totalQty} шт • ${formatPrice(
    totals.total
  )}`;
  bar.classList.remove("hidden");
}

function renderCartModal() {
  const container = qs("#cartItemsContainer");
  container.innerHTML = "";
  const items = getCartItems();

  if (!items.length) {
    container.innerHTML = '<p class="muted">В корзине пока пусто.</p>';
    return;
  }

  items.forEach(({ product, qty }) => {
    const card = document.createElement("div");
    card.className = "cart-item";
    card.innerHTML = `
      <div class="product-thumb">
        <span>${product.category}</span>
      </div>
      <div class="cart-item-main">
        <div class="cart-item-title">${product.name}</div>
        <div class="cart-item-meta">
          ${product.country} • ${product.length} см
        </div>
        <div class="cart-item-meta">
          ${qty} шт × ${formatPrice(product.price)} = ${formatPrice(
      product.price * qty
    )}
        </div>
        <div class="cart-item-actions">
          <div class="qty-control" data-pid="${product.id}">
            <button class="qty-btn" data-q-action="dec">−</button>
            <span class="qty-value">${qty}</span>
            <button class="qty-btn" data-q-action="inc">+</button>
          </div>
          <button class="cart-item-remove" data-remove-id="${product.id}">Удалить</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  const totals = calculateCartTotals();
  qs("#cartSubtotal").textContent = formatPrice(totals.subtotal);
  qs("#cartDiscount").textContent = totals.discount
    ? `−${formatPrice(totals.discount)}`
    : "0 ₽";
  qs("#cartTotal").textContent = formatPrice(totals.total);
  qs("#paymentAmount").textContent = formatPrice(totals.total);
}

function initCart() {
  const cartBar = qs("#cartBar");
  const cartModal = qs("#cartModal");

  qs("#openCartBtn").addEventListener("click", () => {
    renderCartModal();
    cartModal.classList.remove("hidden");
  });

  qs("#closeCartBtn").addEventListener("click", () => {
    cartModal.classList.add("hidden");
  });

  // обработка +/- и удаление в корзине
  qs("#cartItemsContainer").addEventListener("click", (e) => {
    const control = e.target.closest(".qty-control");
    const removeBtn = e.target.closest("[data-remove-id]");
    if (control) {
      const productId = control.getAttribute("data-pid");
      const action = e.target.getAttribute("data-q-action");
      if (action === "inc") addToCart(productId, 1);
      if (action === "dec") addToCart(productId, -1);
      renderCartModal();
    }
    if (removeBtn) {
      const id = removeBtn.getAttribute("data-remove-id");
      delete cart[id];
      updateCartBar();
      renderCartModal();
      renderCatalog();
    }
  });

  // переход к оплате
  qs("#checkoutBtn").addEventListener("click", () => {
    if (!getCartItems().length) {
      alert("Корзина пустая");
      return;
    }
    qs("#paymentModal").classList.remove("hidden");
  });

  qs("#closePaymentBtn").addEventListener("click", () => {
    qs("#paymentModal").classList.add("hidden");
  });

  qs("#confirmPaymentBtn").addEventListener("click", () => {
    if (!getCartItems().length) {
      qs("#paymentModal").classList.add("hidden");
      return;
    }
    createOrderFromCart();
    cart = {};
    updateCartBar();
    renderCatalog();
    qs("#paymentScreenshot").value = "";
    qs("#paymentModal").classList.add("hidden");
    qs("#cartModal").classList.add("hidden");
    alert("Оплата зафиксирована. Заказ создан и ожидает подтверждения менеджером.");
    switchScreen("screen-orders");
    renderOrders();
  });
}

// ===== ЗАКАЗЫ =====

function createOrderFromCart() {
  const items = getCartItems();
  if (!items.length) return;

  const totals = calculateCartTotals();
  const deliveryType = qs("#checkoutDeliveryType").value;
  const comment = qs("#checkoutComment").value.trim();

  const order = {
    id: lastOrderId++,
    createdAt: new Date(),
    items,
    totals,
    deliveryType,
    comment,
    status: "unpaid", // unpaid | pending | paid
  };
  orders.unshift(order);
  // очищаем поля
  qs("#checkoutComment").value = "";
}

function formatDate(dt) {
  return dt.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusBadge(status) {
  if (status === "unpaid") return '<span class="badge-status badge-unpaid">Ждёт оплаты</span>';
  if (status === "pending") return '<span class="badge-status badge-pending">На проверке</span>';
  if (status === "paid") return '<span class="badge-status badge-paid">Оплачен</span>';
  return status;
}

function renderOrders() {
  const list = qs("#ordersList");
  list.innerHTML = "";

  if (!orders.length) {
    list.innerHTML =
      '<p class="muted">Заказов ещё нет. Соберите первый в каталоге.</p>';
    return;
  }

  orders.forEach((order) => {
    const card = document.createElement("div");
    card.className = "order-card";
    const itemsShort = order.items
      .slice(0, 2)
      .map((it) => `${it.product.name} (${it.qty} шт)`)
      .join(", ");

    const totalQty = order.items.reduce((s, it) => s + it.qty, 0);

    card.innerHTML = `
      <div class="order-header">
        <div>Заказ №${order.id}</div>
        <div>${getStatusBadge(order.status)}</div>
      </div>
      <div class="order-meta">
        ${formatDate(order.createdAt)} • ${totalQty} шт • ${formatPrice(
      order.totals.total
    )}
      </div>
      <div class="order-meta">
        ${itemsShort}${order.items.length > 2 ? ", …" : ""}
      </div>
      <div class="order-actions">
        <button class="btn secondary btn-sm" data-order-repeat="${order.id}">Повторить</button>
      </div>
    `;
    list.appendChild(card);
  });
}

function initOrders() {
  qs("#ordersList").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-order-repeat]");
    if (!btn) return;
    const id = Number(btn.getAttribute("data-order-repeat"));
    const order = orders.find((o) => o.id === id);
    if (!order) return;

    cart = {};
    order.items.forEach(({ product, qty }) => {
      cart[product.id] = qty;
    });
    updateCartBar();
    renderCatalog();
    switchScreen("screen-catalog");
  });

  // кнопка "повторить последний" на главной
  qs("#repeatLastOrderBtn").addEventListener("click", () => {
    if (!orders.length) {
      alert("Пока нет прошлых заказов для повтора.");
      return;
    }
    const last = orders[0];
    cart = {};
    last.items.forEach(({ product, qty }) => {
      cart[product.id] = qty;
    });
    updateCartBar();
    renderCatalog();
    switchScreen("screen-catalog");
  });
}

// ===== ПРОФИЛЬ / О FAQ =====

function initProfile() {
  const nameInput = qs("#profileShopName");
  const cityInput = qs("#profileCity");
  const phoneInput = qs("#profilePhone");
  const headerSubtitle = qs("#headerSubtitle");

  // загрузка из localStorage
  const saved = JSON.parse(localStorage.getItem("flowers_profile") || "{}");
  if (saved.name) nameInput.value = saved.name;
  if (saved.city) cityInput.value = saved.city;
  if (saved.phone) phoneInput.value = saved.phone;
  if (saved.name) {
    headerSubtitle.textContent = `Привет, ${saved.name}!`;
  }

  qs("#saveProfileBtn").addEventListener("click", () => {
    const profile = {
      name: nameInput.value.trim(),
      city: cityInput.value.trim(),
      phone: phoneInput.value.trim(),
    };
    localStorage.setItem("flowers_profile", JSON.stringify(profile));
    if (profile.name) {
      headerSubtitle.textContent = `Привет, ${profile.name}!`;
    }
    alert("Профиль сохранён.");
  });
}

// FAQ модалка
function initFAQ() {
  const faqModal = qs("#faqModal");
  qs("#openFAQBtn").addEventListener("click", () => {
    faqModal.classList.remove("hidden");
  });
  qs("#closeFAQBtn").addEventListener("click", () => {
    faqModal.classList.add("hidden");
  });
}

// ===== ИНИЦИАЛИЗАЦИЯ =====

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initOnboarding();
  initCatalog();
  initCart();
  initOrders();
  initProfile();
  initFAQ();

  // Стартовый экран
  switchScreen("screen-home");
});
