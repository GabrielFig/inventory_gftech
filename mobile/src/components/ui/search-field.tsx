import { Pressable, TextInput, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { hit, noOutline, radius, spacing, useTheme } from "@/theme";

/** Campo de búsqueda con lupa y botón para borrar; mismo aspecto en Inventario y Ventas. */
export function SearchField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  accessibilityLabel: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        minHeight: hit,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
      }}
    >
      <Icon name="search" size={22} color="textMuted" />
      <TextInput
        accessibilityLabel={accessibilityLabel}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        autoCorrect={false}
        returnKeyType="search"
        style={{ flex: 1, minHeight: hit, fontSize: 16, color: theme.text, paddingVertical: 0, ...noOutline }}
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Borrar búsqueda"
          hitSlop={12}
          onPress={() => onChangeText("")}
        >
          <Icon name="close" size={20} color="textMuted" />
        </Pressable>
      ) : null}
    </View>
  );
}
