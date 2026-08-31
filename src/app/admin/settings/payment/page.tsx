import { requireAdminPage } from "@/lib/admin-auth";
import { getSettingsMap } from "@/lib/admin-settings";
import { CARD_PAYMENTS_PAUSED } from "@/lib/paymob";
import { SettingsHead } from "../head";
import { PaymentSettings } from "@/components/admin/settings-payment";
import { HistoryNote } from "@/components/admin/settings-bits";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payment · Settings" };

export default async function PaymentSettingsPage() {
  await requireAdminPage();
  const s = await getSettingsMap();

  return (
    <div>
      <SettingsHead
        title="Payment"
        body="How customers can pay, and the InstaPay details they are shown."
      />
      <PaymentSettings
        values={{
          payment_cash_enabled: s.payment_cash_enabled ?? "true",
          payment_instapay_enabled: s.payment_instapay_enabled ?? "true",
          instapay_number: s.instapay_number ?? "",
          instapay_account_details: s.instapay_account_details ?? "",
        }}
        cardPaused={CARD_PAYMENTS_PAUSED}
      />
      <HistoryNote>
        An order records how it was paid for at the time it was placed. Changing these details
        changes what the next customer is shown; an order already waiting to be verified keeps its
        own record, and payment status is still something only you set.
      </HistoryNote>
    </div>
  );
}
