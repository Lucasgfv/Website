// Shared behaviour for the inner pages.
// Contact details live ONLY here, so changing a number updates every page.
const CONTACT = {
  // WhatsApp in international format, digits only: 55 + DDD + number.
  whatsapp: "", // TODO: e.g. "5511999999999"
  email: "lucas@lkv11.com",
  instagram: "", // TODO: handle without @
  linkedin: "lucas-lkm",
};

// The contact form posts here; FormSubmit forwards each submission to CONTACT.email.
// The first submission triggers a one-time activation e-mail to that address.
const FORM_ENDPOINT = `https://formsubmit.co/ajax/${CONTACT.email}`;

const LINKS = {
  whatsapp: (text = "") =>
    CONTACT.whatsapp &&
    `https://wa.me/${CONTACT.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`,
  email: (subject = "", body = "") =>
    CONTACT.email &&
    `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  instagram: () => CONTACT.instagram && `https://instagram.com/${CONTACT.instagram}`,
  linkedin: () => CONTACT.linkedin && `https://www.linkedin.com/in/${CONTACT.linkedin}`,
};

// Elements like <a data-contact="whatsapp" data-message="..."> get their href here.
// If a channel isn't configured yet, the element is hidden instead of showing a broken link.
function wireContactLinks() {
  document.querySelectorAll("[data-contact]").forEach((el) => {
    const channel = el.dataset.contact;
    const url =
      channel === "email"
        ? LINKS.email(el.dataset.subject || "Contato pelo site")
        : LINKS[channel]?.(el.dataset.message);

    if (!url) {
      el.hidden = true;
      return;
    }
    el.href = url;
    if (channel !== "email") {
      el.target = "_blank";
      el.rel = "noopener";
    }
    const label = el.querySelector("[data-contact-label]");
    if (label) {
      label.textContent =
        channel === "email" ? CONTACT.email : channel === "whatsapp" ? formatPhone(CONTACT.whatsapp) : `@${CONTACT[channel]}`;
    }
  });
}

// "5511999999999" -> "+55 (11) 99999-9999"
function formatPhone(digits) {
  const m = digits.match(/^(\d{2})(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `+${m[1]} (${m[2]}) ${m[3]}-${m[4]}` : `+${digits}`;
}

function setupMenu() {
  const btn = document.querySelector(".menu-btn");
  const nav = document.getElementById("site-nav");
  if (!btn || !nav) return;

  const toggle = (open) => {
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
    btn.setAttribute("aria-expanded", String(open));
  };

  btn.addEventListener("click", () => toggle(!nav.classList.contains("is-open")));
  nav.addEventListener("click", (e) => e.target.closest("a") && toggle(false));
  document.addEventListener("keydown", (e) => e.key === "Escape" && toggle(false));
}

// The contact form has no backend: it builds the message and opens WhatsApp or e-mail.
function setupContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;

  // Pre-select the service when coming from another page (contato.html?servico=churrasco).
  const preset = new URLSearchParams(location.search).get("servico");
  if (preset && form.servico.querySelector(`option[value="${CSS.escape(preset)}"]`)) {
    form.servico.value = preset;
  }

  const error = form.querySelector(".form-error");
  const success = form.querySelector(".form-success");
  const sendBtn = form.querySelector('[data-send="form"]');
  const waBtn = form.querySelector('[data-send="whatsapp"]');
  if (!CONTACT.whatsapp) waBtn.hidden = true;

  const showError = (msg) => {
    error.textContent = msg;
    error.hidden = false;
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    error.hidden = true;
    success.hidden = true;

    // Native validation (required fields, e-mail format) before anything else.
    if (!form.reportValidity()) return;

    const data = Object.fromEntries(new FormData(form));
    const service = form.servico.selectedOptions[0].textContent;
    // <input type="date"> gives "2026-12-20"; show it as "20/12/2026".
    const date = data.data ? data.data.split("-").reverse().join("/") : "";

    // Bots fill every field, people never see this one: silently drop the submission.
    if (data._honey) return;

    if (e.submitter?.dataset.send === "whatsapp") {
      openWhatsApp(data, service, date);
      return;
    }

    sendBtn.disabled = true;
    const label = sendBtn.innerHTML;
    sendBtn.textContent = "Enviando...";
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: `Site lkv11 — ${service} — ${data.nome.trim()}`,
          _template: "table",
          _captcha: "false",
          nome: data.nome.trim(),
          email: data.email.trim(), // FormSubmit uses "email" as Reply-To
          servico: service,
          cidade: data.cidade?.trim() || "-",
          data_prevista: date || "-",
          mensagem: data.mensagem.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || String(json.success) !== "true") throw new Error(json.message || res.status);

      form.reset();
      success.hidden = false;
    } catch (err) {
      console.error("Contact form failed:", err);
      showError(`Não foi possível enviar agora. Tente de novo ou escreva para ${CONTACT.email}.`);
    } finally {
      sendBtn.disabled = false;
      sendBtn.innerHTML = label;
    }
  });
}

// Alternative channel: opens WhatsApp with the same message pre-filled.
function openWhatsApp(data, service, date) {
  const lines = [
    `Olá, Lucas! Meu nome é ${data.nome.trim()}.`,
    `Serviço: ${service}`,
    data.cidade ? `Cidade: ${data.cidade.trim()}` : "",
    date ? `Data prevista: ${date}` : "",
    "",
    data.mensagem.trim(),
  ].filter((line, i, all) => line !== "" || all[i - 1] !== "");

  window.open(LINKS.whatsapp(lines.join("\n")), "_blank", "noopener");
}

document.addEventListener("DOMContentLoaded", () => {
  wireContactLinks();
  setupMenu();
  setupContactForm();
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  if (window.lucide) window.lucide.createIcons();
});
