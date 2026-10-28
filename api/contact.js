function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function buildOrderHtml(payload) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const rows = items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.qty)}</td>
          <td>${formatCurrency(item.price)}</td>
          <td>${formatCurrency(item.lineTotal)}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <h1>Nueva solicitud AgroCanary</h1>
    <p>El cliente entiende que no es una compra cerrada y que se confirmara disponibilidad, precio final, forma de pago y entrega antes de preparar el pedido.</p>
    <p><strong>Nombre:</strong> ${escapeHtml(payload.name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(payload.email)}</p>
    <p><strong>Telefono:</strong> ${escapeHtml(payload.phone)}</p>
    <p><strong>Preferencia de contacto:</strong> ${escapeHtml(payload.contactPreference)}</p>
    <h2>Entrega</h2>
    <p><strong>Metodo:</strong> ${escapeHtml(payload.deliveryMethod)}</p>
    <p><strong>Direccion:</strong> ${escapeHtml(payload.street || "No indicada")}</p>
    <p><strong>Piso / puerta / bloque:</strong> ${escapeHtml(payload.addressExtra || "No indicado")}</p>
    <p><strong>Codigo postal:</strong> ${escapeHtml(payload.postalCode)}</p>
    <p><strong>Municipio:</strong> ${escapeHtml(payload.city)}</p>
    <p><strong>Isla:</strong> ${escapeHtml(payload.island)}</p>
    <p><strong>Franja preferida:</strong> ${escapeHtml(payload.deliveryWindow)}</p>
    <p><strong>Google Maps:</strong> ${escapeHtml(payload.mapsLink || "No indicado")}</p>
    <p><strong>Indicaciones:</strong> ${escapeHtml(payload.deliveryNotes || "Sin indicaciones")}</p>
    <h2>Solicitud</h2>
    <table border="1" cellpadding="8" cellspacing="0">
      <thead>
        <tr>
          <th>Producto</th>
          <th>Cantidad</th>
          <th>Precio</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p><strong>Total orientativo:</strong> ${formatCurrency(payload.total)}</p>
    <h2>Facturacion</h2>
    <p><strong>Necesita factura:</strong> ${payload.needsInvoice ? "Si" : "No"}</p>
    <p><strong>Nombre fiscal:</strong> ${escapeHtml(payload.billingName || "No indicado")}</p>
    <p><strong>NIF/CIF:</strong> ${escapeHtml(payload.taxId || "No indicado")}</p>
    <p><strong>Direccion fiscal:</strong> ${escapeHtml(payload.billingAddress || "No indicada")}</p>
    <h2>Notas</h2>
    <p>${escapeHtml(payload.notes || "Sin notas")}</p>
  `;
}

function buildFarmerHtml(payload) {
  return `
    <h1>Nuevo productor interesado</h1>
    <p><strong>Nombre o finca:</strong> ${escapeHtml(payload.name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(payload.email)}</p>
    <p><strong>Producto y zona:</strong></p>
    <p>${escapeHtml(payload.message).replaceAll("\n", "<br />")}</p>
  `;
}

function isValidPayload(payload) {
  if (!payload || typeof payload !== "object") return false;
  if (payload.type === "order") {
    return (
      payload.name &&
      payload.email &&
      payload.phone &&
      payload.deliveryMethod &&
      payload.city &&
      payload.island &&
      (!payload.deliveryMethod ||
        payload.deliveryMethod !== "Entrega a domicilio" ||
        (payload.street && payload.postalCode)) &&
      Array.isArray(payload.items) &&
      payload.items.length
    );
  }
  if (payload.type === "farmer") {
    return payload.name && payload.email && payload.message;
  }
  return false;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metodo no permitido." });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_TO_EMAIL;
  const fromEmail = process.env.CONTACT_FROM_EMAIL || "AgroCanary <onboarding@resend.dev>";

  if (!apiKey || !toEmail) {
    return res.status(500).json({ error: "Faltan variables de entorno de correo." });
  }

  const payload = req.body;
  if (!isValidPayload(payload)) {
    return res.status(400).json({ error: "Datos incompletos." });
  }

  const html = payload.type === "order" ? buildOrderHtml(payload) : buildFarmerHtml(payload);
  const subject = payload.subject || "Nuevo contacto AgroCanary";

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject,
      html,
    }),
  });

  const data = await resendResponse.json().catch(() => ({}));
  if (!resendResponse.ok) {
    return res.status(502).json({ error: data.message || "Resend no pudo enviar el correo." });
  }

  return res.status(200).json({ ok: true, id: data.id });
};
