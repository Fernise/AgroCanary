(() => {
  const producers = Array.isArray(window.AGROCANARY_PRODUCERS)
    ? window.AGROCANARY_PRODUCERS.filter((producer) => producer.published)
    : [];

  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  function renderProducerCard(producer) {
    const label = producer.isExample ? "Perfil de demostracion" : producer.category;
    return `
      <article class="producer-card producer-card-link">
        <a href="perfil-productor.html?id=${encodeURIComponent(producer.id)}" aria-label="Ver perfil de ${escapeHtml(producer.name)}">
          <img class="producer-card-image" src="${escapeHtml(producer.image)}" alt="${escapeHtml(producer.imageAlt)}" />
          <div class="producer-card-copy">
            <p class="tag">${escapeHtml(label)}</p>
            <h3>${escapeHtml(producer.name)}</h3>
            <p>${escapeHtml(producer.summary)}</p>
            <div class="product-meta">
              <span class="chip">${escapeHtml(producer.location)}</span>
              <span class="chip">${escapeHtml(producer.status)}</span>
            </div>
            <span class="producer-card-action">Ver perfil <span aria-hidden="true">&#8594;</span></span>
          </div>
        </a>
      </article>
    `;
  }

  document.querySelectorAll("[data-producer-list]").forEach((container) => {
    const limit = Number.parseInt(container.dataset.limit || "0", 10);
    const visibleProducers = limit > 0 ? producers.slice(0, limit) : producers;

    if (!visibleProducers.length) {
      container.innerHTML = '<p class="producer-empty">Todavia no hay perfiles publicados.</p>';
      return;
    }

    container.innerHTML = visibleProducers.map(renderProducerCard).join("");
  });

  const profile = document.querySelector("[data-producer-profile]");
  if (!profile) return;

  const requestedId = new URLSearchParams(window.location.search).get("id");
  const producer = producers.find((item) => item.id === requestedId);

  if (!producer) {
    profile.innerHTML = `
      <section class="profile-not-found">
        <p class="eyebrow">Productor no encontrado</p>
        <h1>Este perfil no esta disponible.</h1>
        <p>Puede que todavia no se haya publicado o que el enlace haya cambiado.</p>
        <a class="button primary" href="productores.html">Ver productores</a>
      </section>
    `;
    document.title = "Perfil no disponible | AgroCanary";
    return;
  }

  document.title = `${producer.name} | AgroCanary`;
  const profileLabel = producer.isExample ? "Demostracion, no productor real" : producer.category;
  const productsHtml = producer.products
    .map(
      (product) => `
        <article class="profile-product">
          <div>
            <h3>${escapeHtml(product.name)}</h3>
            <p>${escapeHtml(product.description)}</p>
          </div>
          <dl>
            <div><dt>Disponibilidad</dt><dd>${escapeHtml(product.availability)}</dd></div>
            <div><dt>Precio</dt><dd>${escapeHtml(product.price)}</dd></div>
          </dl>
        </article>
      `,
    )
    .join("");
  const fulfilmentHtml = producer.fulfilment
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  profile.innerHTML = `
    <section class="profile-hero">
      <img src="${escapeHtml(producer.image)}" alt="${escapeHtml(producer.imageAlt)}" />
      <div class="profile-hero-copy">
        <p class="eyebrow">${escapeHtml(profileLabel)}</p>
        <h1>${escapeHtml(producer.name)}</h1>
        <p>${escapeHtml(producer.summary)}</p>
        <div class="product-meta">
          <span class="chip">${escapeHtml(producer.location)}</span>
          <span class="chip">${escapeHtml(producer.status)}</span>
        </div>
      </div>
    </section>
    <section class="section profile-story">
      <div class="section-heading">
        <p class="eyebrow">La finca</p>
        <h2>Origen y forma de trabajar.</h2>
      </div>
      <p>${escapeHtml(producer.story)}</p>
    </section>
    <section class="profile-products-band">
      <div class="profile-products-inner">
        <div class="section-heading">
          <p class="eyebrow">Productos</p>
          <h2>Oferta de esta finca.</h2>
        </div>
        <div class="profile-product-list">${productsHtml}</div>
      </div>
    </section>
    <section class="section profile-fulfilment">
      <div>
        <p class="eyebrow">Pedido y entrega</p>
        <h2>Condiciones claras antes de pagar.</h2>
      </div>
      <div>
        <ul>${fulfilmentHtml}</ul>
        <a class="button primary" href="${escapeHtml(producer.requestUrl)}">Ver productos disponibles</a>
      </div>
    </section>
  `;
})();
