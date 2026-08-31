/**
 * The business rules the owner can change without a developer.
 *
 * One copy, used by both the development seed and the deployment bootstrap, so
 * a deployed database can never drift from a local one.
 *
 * A value left as an empty string is something the business has not supplied
 * yet. It is NOT given an invented default, and neither the seed nor the
 * bootstrap ever overwrites a value once it exists — an edit made in admin
 * survives every future deployment.
 */
export const SETTINGS: Record<string, string> = {
  currency: "EGP",
  timezone: "Africa/Cairo",

  // Normal orders
  normal_notice_hours: "48",
  normal_cutoff_time: "", // TO CONFIRM — no default invented
  normal_daily_capacity: "3",
  pickup_counts_toward_capacity: "true",
  pickup_enabled: "true",
  // How the site behaves today: orders can be for any day of the week. Nothing
  // has been decided about days off, so nothing is closed here.
  working_days: "0,1,2,3,4,5,6",
  minimum_order_value_piastres: "0", // confirmed: no minimum

  // Event orders
  event_notice_days: "5",
  event_max_guests: "100", // hard ceiling, enforced server-side
  event_default_capacity_mode: "BLOCK_DAY",

  // Cancellation
  normal_free_cancellation_hours: "24",
  event_free_cancellation_hours: "48",
  late_cancellation_percent: "20",
  customer_self_cancel_enabled: "false", // confirmed: admin cancels only

  // Payment
  payment_cash_enabled: "true",
  payment_instapay_enabled: "true",
  // The owner's switch. Card is offered only when this is not "false" AND a
  // payment provider is configured in the environment; configuring the provider
  // is the deliberate act that turns card on.
  payment_card_enabled: "true",
  // Supplied by the business. Shown at checkout when InstaPay is chosen.
  instapay_number: "+20 1119992417",
  // Anything further to say about the transfer. Nothing supplied yet.
  instapay_account_details: "",

  // Contact
  whatsapp_number: "+201123030107",
  contact_instagram: "https://www.instagram.com/thediine/",
  contact_email: "", // TO CONFIRM — no address supplied

  // Serving setup — both choices are offered today. The policy text, and the
  // returnable-dish terms below, are NOT written yet and are not invented here.
  serving_returnable_enabled: "true",
  serving_disposable_enabled: "true",
  serving_setup_policy_en: "", // TO CONFIRM
  serving_setup_policy_ar: "",
  // Recorded for when the business decides them. Empty means undecided, and
  // nothing anywhere charges or shows them while they are empty.
  returnable_deposit_piastres: "", // TO CONFIRM
  returnable_return_days: "", // TO CONFIRM
  returnable_late_fee_piastres: "", // TO CONFIRM
};
