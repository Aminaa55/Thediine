/* ═══════════════════════════════════════════════════════════════
   THE COZY LOAF — the one file you edit.

   Shared by index.html and confirm.html, so nothing below is
   repeated anywhere else in the site.
   ═══════════════════════════════════════════════════════════════ */
window.COZY_CONFIG = {

  brand: "The Cozy Loaf",
  city: "Cairo",
  instagram: "thecozyloaf_eg",

  /* ── WhatsApp ────────────────────────────────────────────────
     The bakery's WhatsApp number in full international form,
     digits only — no +, no spaces, no dashes.
     An Egyptian number like 0100 123 4567 becomes "201001234567".

     Leave empty and the Confirm on WhatsApp button stays disabled
     and says so, rather than opening a broken chat. */
  whatsappNumber: "",

  /* ── Ordering rules ────────────────────────────────────────── */
  minNoticeHours: 48,
  maxPerLoaf: 20,

  /* ── Products ──────────────────────────────────────────────── */
  products: {
    plain: { name: "Plain Sourdough", price: 230 },
    olive: { name: "Black Olive Sourdough", price: 250 }
  },

  /* ── Owner notification by email ─────────────────────────────
     Optional, and independent of WhatsApp. Needs no domain: the
     service sends from its own servers to whatever inbox you name.

       1. Sign up free at web3forms.com with the bakery's email.
       2. Paste the key they send into accessKey.
       3. Put "https://api.web3forms.com/submit" into orderEndpoint.

     A Formspree URL works too — put it in orderEndpoint and leave
     accessKey empty. With neither set, the order is saved in the
     customer's browser only and the confirmation page says so. */
  orderEndpoint: "",
  accessKey: "",

  /* ── Customer confirmation email — not live yet ──────────────
     Sending mail *as the brand* needs a domain you own. When you
     have one, set customerEmail.enabled to true and wire a sending
     service; the templates are ready in emails/ and every order
     already carries customer.email. Nothing else needs rewriting. */
  customerEmail: {
    enabled: false,
    from: ""          // e.g. "orders@thecozyloaf.com"
  }
};
