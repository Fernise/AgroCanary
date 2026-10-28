const contactConfig = {
  email: "agrocanary.canarias@gmail.com",
};

const MAX_UNITS_PER_PRODUCT = 10;
const CART_STORAGE_KEY = "agrocanary_cart";

const products = [
  {
    id: "tropical",
    name: "Caja tropical",
    price: 32,
    producer: "Ejemplo de caja",
    description:
      "Fruta de temporada con aguacate, mango, papaya y platano cuando haya cosecha disponible.",
    tags: ["Temporada", "Bajo pedido", "Tenerife"],
    visual:
      "linear-gradient(135deg, rgba(217, 155, 43, .75), rgba(34, 96, 74, .55)), url('assets/hero-canarias.jpg')",
  },
  {
    id: "desayuno",
    name: "Caja desayuno canario",
    price: 28,
    producer: "Ejemplo de caja",
    description:
      "Miel, gofio, mermelada y cafe o infusion local para una primera caja facil de enviar.",
    tags: ["Envasado", "Regalo", "Sin frio"],
    visual: "linear-gradient(135deg, #d99b2b, #fff2c0 48%, #22604a)",
  },
  {
    id: "regalo",
    name: "Caja regalo canaria",
    price: 45,
    producer: "Ejemplo de caja",
    description:
      "Mojo, sal marina, miel, queso curado y dulce local. Pensada para empresas y visitantes.",
    tags: ["Premium", "Empresa", "Sin stock"],
    visual: "linear-gradient(135deg, #143c32, #c4492d 50%, #f3d68d)",
  },
];

const cart = new Map();
const productGrid = document.querySelector("#productGrid");
const cartItems = document.querySelector("#cartItems");
const cartTotal = document.querySelector("#cartTotal");
const cartPanel = document.querySelector("#cartPanel");
const cartBadge = document.querySelector("#cartBadge");
const mobileCartBar = document.querySelector("#mobileCartBar");
const mobileCartCount = document.querySelector("#mobileCartCount");
const mobileCartTotal = document.querySelector("#mobileCartTotal");
const clearCartButton = document.querySelector("#clearCart");
const orderForm = document.querySelector("#orderForm");
const formNote = document.querySelector("#formNote");
const farmerForm = document.querySelector("#farmerForm");
const farmerNote = document.querySelector("#farmerNote");
const needsInvoice = document.querySelector("#needsInvoice");
const billingFields = document.querySelector("#billingFields");
const deliveryMethodInput = document.querySelector("input[name='deliveryMethod']");
const customSelects = document.querySelectorAll("[data-custom-select]");

function formatPrice(value) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function isValidEmail(value) {
  const email = String(value).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return false;

  const [, domain = ""] = email.split("@");
  const labels = domain.toLowerCase().split(".");
  const primaryDomain = labels[labels.length - 2];
  const topLevelDomain = labels[labels.length - 1];

  if (!primaryDomain || !topLevelDomain) return false;
  if (primaryDomain.length < 2 || topLevelDomain.length < 2) return false;

  return labels.every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
}

function isValidPhone(value) {
  const digits = String(value).replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
}

function isValidCanaryPostalCode(value) {
  return /^(35|38)\d{3}$/.test(String(value).trim());
}

function postalCodeMatchesIsland(postalCode, island) {
  const provincePrefix = String(postalCode).slice(0, 2);
  const santaCruzIslands = ["Tenerife", "La Palma", "La Gomera", "El Hierro"];
  const lasPalmasIslands = ["Gran Canaria", "Lanzarote", "Fuerteventura"];

  if (provincePrefix === "38") return santaCruzIslands.includes(island);
  if (provincePrefix === "35") return lasPalmasIslands.includes(island);
  return false;
}

function isValidOptionalUrl(value) {
  const url = String(value || "").trim();
  if (!url) return true;

  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function isHomeDelivery(value) {
  return value === "Entrega a domicilio";
}

function getTrimmed(formData, key) {
  return String(formData.get(key) || "").trim();
}

function clampQuantity(value) {
  const quantity = Number.parseInt(value, 10);
  if (Number.isNaN(quantity) || quantity <= 0) return 0;
  return Math.min(quantity, MAX_UNITS_PER_PRODUCT);
}

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "{}");
    const validProductIds = new Set(products.map((product) => product.id));

    Object.entries(saved).forEach(([id, qty]) => {
      const next = clampQuantity(qty);
      if (validProductIds.has(id) && next > 0) {
        cart.set(id, next);
      }
    });
  } catch {
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch {
      // Keep an in-memory cart when storage is blocked or unavailable.
    }
  }
}

function saveCart() {
  try {
    const payload = Object.fromEntries(cart.entries());
    if (!cart.size) {
      localStorage.removeItem(CART_STORAGE_KEY);
      return;
    }

    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // The current page still keeps the selection in memory.
  }
}

function closeCustomSelects(exceptSelect = null) {
  customSelects.forEach((select) => {
    if (select === exceptSelect) return;
    select.classList.remove("is-open");
    select.querySelector(".select-trigger")?.setAttribute("aria-expanded", "false");
  });
}

function initCustomSelects() {
  customSelects.forEach((select, selectIndex) => {
    const input = select.querySelector("input[type='hidden']");
    const trigger = select.querySelector(".select-trigger");
    const label = trigger.querySelector("span");
    const options = select.querySelectorAll("[data-value]");
    const optionList = [...options];
    const menu = select.querySelector(".select-menu");

    menu.id = menu.id || `customSelectMenu${selectIndex + 1}`;
    trigger.setAttribute("aria-controls", menu.id);

    const openAndFocusOption = (fromEnd = false) => {
      select.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
      closeCustomSelects(select);
      const selectedIndex = optionList.findIndex(
        (option) => option.getAttribute("aria-selected") === "true",
      );
      const fallbackIndex = fromEnd ? optionList.length - 1 : 0;
      optionList[selectedIndex >= 0 ? selectedIndex : fallbackIndex]?.focus();
    };

    trigger.addEventListener("click", () => {
      const isOpen = select.classList.toggle("is-open");
      trigger.setAttribute("aria-expanded", String(isOpen));
      if (isOpen) closeCustomSelects(select);
    });

    trigger.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        openAndFocusOption(event.key === "ArrowUp");
      }
    });

    options.forEach((option) => {
      option.addEventListener("click", () => {
        input.value = option.dataset.value;
        label.textContent = option.textContent;
        options.forEach((item) => item.setAttribute("aria-selected", "false"));
        option.setAttribute("aria-selected", "true");
        input.dispatchEvent(new Event("change", { bubbles: true }));
        closeCustomSelects();
        trigger.focus();
      });

      option.addEventListener("keydown", (event) => {
        const currentIndex = optionList.indexOf(option);
        let nextIndex = null;

        if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % optionList.length;
        if (event.key === "ArrowUp") {
          nextIndex = (currentIndex - 1 + optionList.length) % optionList.length;
        }
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = optionList.length - 1;

        if (nextIndex !== null) {
          event.preventDefault();
          optionList[nextIndex].focus();
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          option.click();
        }

        if (event.key === "Escape") {
          event.preventDefault();
          closeCustomSelects();
          trigger.focus();
        }
      });
    });
  });
}

function updateDeliveryRequirements() {
  const homeDelivery = isHomeDelivery(deliveryMethodInput?.value);
  const streetInput = orderForm.elements.street;
  const postalCodeInput = orderForm.elements.postalCode;

  streetInput.required = homeDelivery;
  postalCodeInput.required = homeDelivery;
}

function renderProducts() {
  productGrid.innerHTML = products
    .map((product) => {
      const qty = cart.get(product.id) || 0;
      const control = qty
        ? `
          <div class="quantity-block">
            <div class="product-quantity" aria-label="Cantidad de ${product.name}">
              <button type="button" data-card-dec="${product.id}" aria-label="Restar ${product.name}">-</button>
              <input
                type="number"
                inputmode="numeric"
                min="1"
                max="${MAX_UNITS_PER_PRODUCT}"
                value="${qty}"
                data-card-qty="${product.id}"
                aria-label="Unidades de ${product.name}"
              />
              <button type="button" data-card-inc="${product.id}" aria-label="Sumar ${product.name}">+</button>
            </div>
            ${qty >= MAX_UNITS_PER_PRODUCT ? `<button class="bulk-link" type="button" data-bulk="${product.id}">Pedido mayor</button>` : ""}
          </div>
        `
        : `<button class="button add-button" type="button" data-add="${product.id}">Anadir</button>`;

      return `
        <article class="product-card" data-product-card="${product.id}">
          <div class="product-visual" style="--visual: ${product.visual}"></div>
          <div class="product-body">
            <p class="tag">${product.producer}</p>
            <h3>${product.name}</h3>
            <p>${product.description}</p>
            <div class="product-meta">
              ${product.tags.map((tag) => `<span class="chip">${tag}</span>`).join("")}
            </div>
            <div class="price-row">
              <span class="price">${formatPrice(product.price)}</span>
              ${control}
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function cartEntries() {
  return [...cart.entries()].map(([id, qty]) => {
    const product = products.find((item) => item.id === id);
    return { ...product, qty, lineTotal: product.price * qty };
  });
}

function renderCart() {
  const entries = cartEntries();
  const itemCount = entries.reduce((sum, entry) => sum + entry.qty, 0);
  const total = entries.reduce((sum, entry) => sum + entry.lineTotal, 0);
  cartBadge.textContent = String(itemCount);
  cartBadge.hidden = itemCount === 0;
  mobileCartBar.hidden = itemCount === 0;
  mobileCartCount.textContent = `${itemCount} ${itemCount === 1 ? "unidad" : "unidades"}`;
  mobileCartTotal.textContent = formatPrice(total);

  if (!entries.length) {
    cartItems.innerHTML = '<p class="cart-empty">Todavia no has elegido ninguna caja.</p>';
    cartTotal.textContent = formatPrice(0);
    return;
  }

  cartItems.innerHTML = entries
    .map(
      (entry) => `
        <div class="cart-line">
          <div>
            <strong>${entry.name}</strong>
            <div>${formatPrice(entry.price)} x ${entry.qty}</div>
          </div>
          <div class="qty-controls" aria-label="Cantidad de ${entry.name}">
            <button type="button" data-dec="${entry.id}" aria-label="Restar ${entry.name}">-</button>
            <input
              type="number"
              inputmode="numeric"
              min="1"
              max="${MAX_UNITS_PER_PRODUCT}"
              value="${entry.qty}"
              data-cart-qty="${entry.id}"
              aria-label="Unidades de ${entry.name}"
            />
            <button type="button" data-inc="${entry.id}" aria-label="Sumar ${entry.name}">+</button>
          </div>
        </div>
      `,
    )
    .join("");

  cartTotal.textContent = formatPrice(total);
}

function showAddedFeedback(id) {
  const card = document.querySelector(`[data-product-card="${id}"]`);

  card?.classList.remove("just-added");
  cartPanel?.classList.remove("cart-updated");
  void card?.offsetWidth;
  void cartPanel?.offsetWidth;
  card?.classList.add("just-added");
  cartPanel?.classList.add("cart-updated");

  window.setTimeout(() => {
    card?.classList.remove("just-added");
    cartPanel?.classList.remove("cart-updated");
  }, 950);
}

function restoreCartFocus(selector, fallbackSelector = null) {
  const target =
    document.querySelector(selector) ||
    (fallbackSelector ? document.querySelector(fallbackSelector) : null);
  if (!target) return;

  try {
    target.focus({ preventScroll: true });
  } catch {
    target.focus();
  }
}

function addToCart(id, button = null, restoreKeyboardFocus = false) {
  const shouldRestoreFocus = restoreKeyboardFocus && document.activeElement === button;
  const next = Math.min((cart.get(id) || 0) + 1, MAX_UNITS_PER_PRODUCT);
  cart.set(id, next);
  saveCart();
  renderProducts();
  renderCart();
  showAddedFeedback(id);
  if (shouldRestoreFocus) restoreCartFocus(`[data-card-qty="${id}"]`);
}

function updateQuantity(
  id,
  direction,
  showFeedback = false,
  focusSelector = null,
  fallbackSelector = null,
) {
  const current = cart.get(id) || 0;
  const next = Math.min(current + direction, MAX_UNITS_PER_PRODUCT);
  if (next <= 0) {
    cart.delete(id);
  } else {
    cart.set(id, next);
  }
  saveCart();
  renderProducts();
  renderCart();
  if (showFeedback && next > 0) showAddedFeedback(id);
  if (focusSelector) restoreCartFocus(focusSelector, fallbackSelector);
}

function setQuantity(id, value, showFeedback = false) {
  const next = clampQuantity(value);
  if (next <= 0) {
    cart.delete(id);
  } else {
    cart.set(id, next);
  }
  saveCart();
  renderProducts();
  renderCart();
  if (showFeedback && next > 0) showAddedFeedback(id);
}

function openBulkEmail(productId) {
  const product = products.find((item) => item.id === productId);
  const subject = encodeURIComponent(`Solicitud especial AgroCanary - ${product?.name || "producto"}`);
  const body = encodeURIComponent(
    [
      "Hola, quiero consultar una solicitud especial de mas de 10 unidades.",
      "",
      `Producto: ${product?.name || productId}`,
      "Unidades aproximadas:",
      "Fecha deseada:",
      "Zona de entrega:",
      "",
      "Gracias.",
    ].join("\n"),
  );

  window.location.href = `mailto:${contactConfig.email}?subject=${subject}&body=${body}`;
}

function buildOrderPayload(formData) {
  const entries = cartEntries();
  const total = entries.reduce((sum, entry) => sum + entry.lineTotal, 0);

  return {
    type: "order",
    subject: "Nueva solicitud AgroCanary",
    name: getTrimmed(formData, "name"),
    email: getTrimmed(formData, "email"),
    phone: getTrimmed(formData, "phone"),
    contactPreference: getTrimmed(formData, "contactPreference"),
    deliveryMethod: getTrimmed(formData, "deliveryMethod"),
    street: getTrimmed(formData, "street"),
    addressExtra: getTrimmed(formData, "addressExtra"),
    postalCode: getTrimmed(formData, "postalCode"),
    city: getTrimmed(formData, "city"),
    island: getTrimmed(formData, "island"),
    deliveryWindow: getTrimmed(formData, "deliveryWindow"),
    mapsLink: getTrimmed(formData, "mapsLink"),
    deliveryNotes: getTrimmed(formData, "deliveryNotes"),
    needsInvoice: formData.get("needsInvoice") === "on",
    billingName: getTrimmed(formData, "billingName"),
    taxId: getTrimmed(formData, "taxId"),
    billingAddress: getTrimmed(formData, "billingAddress"),
    notes: getTrimmed(formData, "notes"),
    total,
    items: entries.map((entry) => ({
      name: entry.name,
      qty: entry.qty,
      price: entry.price,
      lineTotal: entry.lineTotal,
    })),
  };
}

function openEmail(payload) {
  const subject = encodeURIComponent(payload.subject || "Contacto AgroCanary");
  const body = encodeURIComponent(buildEmailBody(payload));
  window.location.href = `mailto:${contactConfig.email}?subject=${subject}&body=${body}`;
}

function buildEmailBody(payload) {
  if (payload.type === "order") {
    const lines = payload.items.map(
      (item) => `- ${item.qty} x ${item.name} (${formatPrice(item.lineTotal)})`,
    );
    return [
      "Hola, quiero enviar una solicitud de reserva de AgroCanary.",
      "Entiendo que no es una compra cerrada y que se confirmara disponibilidad, precio final, forma de pago y entrega antes de preparar el pedido.",
      "",
      `Nombre: ${payload.name}`,
      `Email: ${payload.email}`,
      `Telefono: ${payload.phone}`,
      `Preferencia de contacto: ${payload.contactPreference}`,
      "",
      "ENTREGA",
      `Metodo: ${payload.deliveryMethod}`,
      `Direccion: ${payload.street || "No indicada"}`,
      `Piso / puerta / bloque: ${payload.addressExtra || "No indicado"}`,
      `Codigo postal: ${payload.postalCode}`,
      `Municipio: ${payload.city}`,
      `Isla: ${payload.island}`,
      `Franja preferida: ${payload.deliveryWindow}`,
      `Google Maps: ${payload.mapsLink || "No indicado"}`,
      `Indicaciones: ${payload.deliveryNotes || "Sin indicaciones"}`,
      "",
      "Solicitud:",
      ...lines,
      `Total orientativo: ${formatPrice(payload.total)}`,
      "",
      "FACTURACION",
      `Necesita factura: ${payload.needsInvoice ? "Si" : "No"}`,
      `Nombre fiscal: ${payload.billingName || "No indicado"}`,
      `NIF/CIF: ${payload.taxId || "No indicado"}`,
      `Direccion fiscal: ${payload.billingAddress || "No indicada"}`,
      "",
      `Notas: ${payload.notes || "Sin notas"}`,
    ].join("\n");
  }

  return [
    "Hola, soy productor/a y quiero participar en el piloto de AgroCanary.",
    "",
    `Nombre o finca: ${payload.name}`,
    `Email: ${payload.email}`,
    "",
    "Producto y zona:",
    payload.message,
  ].join("\n");
}

document.addEventListener("click", (event) => {
  const addId = event.target.closest("[data-add]")?.dataset.add;
  const incId = event.target.closest("[data-inc]")?.dataset.inc;
  const decId = event.target.closest("[data-dec]")?.dataset.dec;
  const cardIncId = event.target.closest("[data-card-inc]")?.dataset.cardInc;
  const cardDecId = event.target.closest("[data-card-dec]")?.dataset.cardDec;
  const bulkId = event.target.closest("[data-bulk]")?.dataset.bulk;

  if (addId) addToCart(addId, event.target.closest("[data-add]"), event.detail === 0);
  if (incId) updateQuantity(incId, 1, false, `[data-inc="${incId}"]`, "#clearCart");
  if (decId) updateQuantity(decId, -1, false, `[data-dec="${decId}"]`, "#clearCart");
  if (cardIncId) {
    updateQuantity(cardIncId, 1, true, `[data-card-inc="${cardIncId}"]`);
  }
  if (cardDecId) {
    updateQuantity(
      cardDecId,
      -1,
      false,
      `[data-card-dec="${cardDecId}"]`,
      `[data-add="${cardDecId}"]`,
    );
  }
  if (bulkId) openBulkEmail(bulkId);
  if (!event.target.closest("[data-custom-select]")) closeCustomSelects();
});

document.addEventListener("change", (event) => {
  const cardQtyId = event.target.closest("[data-card-qty]")?.dataset.cardQty;
  const cartQtyId = event.target.closest("[data-cart-qty]")?.dataset.cartQty;

  if (cardQtyId) {
    setQuantity(cardQtyId, event.target.value, true);
  }
  if (cartQtyId) {
    setQuantity(cartQtyId, event.target.value);
  }
  if (event.target === deliveryMethodInput) updateDeliveryRequirements();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    const openSelect = document.querySelector("[data-custom-select].is-open");
    closeCustomSelects();
    openSelect?.querySelector(".select-trigger")?.focus();
  }
});

clearCartButton.addEventListener("click", () => {
  cart.clear();
  saveCart();
  renderProducts();
  renderCart();
});

needsInvoice.addEventListener("change", () => {
  billingFields.hidden = !needsInvoice.checked;
  billingFields.querySelectorAll("input").forEach((input) => {
    input.required = needsInvoice.checked;
  });
});

orderForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!cart.size) {
    formNote.textContent = "Elige al menos una caja antes de enviar la solicitud.";
    return;
  }

  if (!orderForm.checkValidity()) {
    orderForm.reportValidity();
    formNote.textContent = "Revisa los campos obligatorios antes de enviar.";
    return;
  }

  const formData = new FormData(orderForm);
  const payload = buildOrderPayload(formData);
  const homeDelivery = isHomeDelivery(payload.deliveryMethod);
  if (!isValidEmail(payload.email)) {
    formNote.textContent = "Introduce un email valido, por ejemplo nombre@correo.com.";
    orderForm.elements.email.focus();
    return;
  }
  if (!isValidPhone(payload.phone)) {
    formNote.textContent = "Introduce un telefono valido con al menos 9 digitos.";
    orderForm.elements.phone.focus();
    return;
  }
  if (homeDelivery && !isValidCanaryPostalCode(payload.postalCode)) {
    formNote.textContent = "Introduce un codigo postal canario valido, empezando por 35 o 38.";
    orderForm.elements.postalCode.focus();
    return;
  }
  if (homeDelivery && !postalCodeMatchesIsland(payload.postalCode, payload.island)) {
    formNote.textContent = "El codigo postal no parece corresponder con la isla seleccionada.";
    orderForm.elements.postalCode.focus();
    return;
  }
  if (!isValidOptionalUrl(payload.mapsLink)) {
    formNote.textContent = "El enlace de Google Maps debe empezar por http:// o https://.";
    orderForm.elements.mapsLink.focus();
    return;
  }
  if (payload.needsInvoice && (!payload.billingName || !payload.taxId || !payload.billingAddress)) {
    formNote.textContent = "Completa nombre fiscal, NIF/CIF y direccion de facturacion.";
    orderForm.elements.billingName.focus();
    return;
  }

  openEmail(payload);
  formNote.textContent =
    "Se ha abierto tu correo con la solicitud preparada. Si no se abrio, escribe a agrocanary.canarias@gmail.com; tu seleccion sigue guardada.";
});

farmerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!farmerForm.checkValidity()) {
    farmerForm.reportValidity();
    farmerNote.textContent = "Revisa los campos obligatorios antes de enviar.";
    return;
  }

  const formData = new FormData(farmerForm);
  const farmerEmail = getTrimmed(formData, "email");
  if (!isValidEmail(farmerEmail)) {
    farmerNote.textContent = "Introduce un email valido, por ejemplo productor@correo.com.";
    farmerForm.elements.email.focus();
    return;
  }

  openEmail({
    type: "farmer",
    subject: "Nuevo productor interesado en AgroCanary",
    name: getTrimmed(formData, "name"),
    email: farmerEmail,
    message: getTrimmed(formData, "message"),
  });
  farmerNote.textContent = "Se ha abierto tu correo con la solicitud preparada.";
});

initCustomSelects();
updateDeliveryRequirements();
loadCart();
renderProducts();
renderCart();
