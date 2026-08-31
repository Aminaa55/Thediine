import { getSettingsMap } from "@/lib/admin-settings";
import { db } from "@/lib/db";
import { PaymentSettings } from "@/components/admin/settings-payment";
import { HistoryNote } from "@/components/admin/settings-bits";

export const metadata = { title: "Payment · Settings" };

export default async function PaymentSettingsPage() {
  const [s, options] = await Promise.all([
    getSettingsMap(),
    db.paymentOption.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div>
      <PaymentSettings
        options={options.map((o) => ({
          id: o.id,
          builtIn: o.builtIn,
          nameEn: o.nameEn,
          instructionsEn: o.instructionsEn ?? "",
          kind: o.kind,
          isEnabled: o.isEnabled,
          verifyBeforeDelivery: o.verifyBeforeDelivery,
        }))}
        instapay={{
          number: s.instapay_number ?? "",
          details: s.instapay_account_details ?? "",
        }}
      />
      <HistoryNote>
        An order records how it was paid for, by name, at the time it was placed. Renaming or
        retiring a method never changes it, and payment status is still only ever set by you.
      </HistoryNote>
    </div>
  );
}
