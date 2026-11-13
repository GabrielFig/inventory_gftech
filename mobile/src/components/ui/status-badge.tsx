import { View } from "react-native";

import { AppText } from "@/components/ui/text";
import type { StockStatus } from "@/lib/types";
import { radius, spacing, useTheme } from "@/theme";

const LABEL: Record<StockStatus, string> = { ok: "En stock", bajo: "Stock bajo", agotado: "Agotado" };

export function StatusBadge({ status }: { status: StockStatus }) {
  const theme = useTheme();
  const tone = {
    ok: { bg: theme.successSoft, fg: theme.success },
    bajo: { bg: theme.warningSoft, fg: theme.warning },
    agotado: { bg: theme.dangerSoft, fg: theme.danger },
  }[status];

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        alignSelf: "flex-start",
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: 3,
        borderRadius: radius.full,
        backgroundColor: tone.bg,
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tone.fg }} />
      <AppText variant="captionStrong" style={{ color: tone.fg }}>
        {LABEL[status]}
      </AppText>
    </View>
  );
}
