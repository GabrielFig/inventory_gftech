import { useEffect, useState } from "react";
import { Animated, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { AppText } from "@/components/ui/text";
import { ApiClientError } from "@/lib/http";
import { radius, spacing, useTheme } from "@/theme";

export function Skeleton({ height = 16, width, radiusSize = radius.sm }: { height?: number; width?: number | `${number}%`; radiusSize?: number }) {
  const theme = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ height, width: width ?? "100%", borderRadius: radiusSize, backgroundColor: theme.surfaceMuted, opacity }}
    />
  );
}

/** Esqueleto de lista: evita el parpadeo de "sin resultados" mientras llega la primera respuesta. */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <View style={{ gap: spacing.md, padding: spacing.lg }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={{ gap: spacing.sm }}>
          <Skeleton height={16} width="62%" />
          <Skeleton height={12} width="40%" />
        </View>
      ))}
    </View>
  );
}

export function EmptyState({
  icon = "inbox",
  title,
  message,
  action,
}: {
  icon?: IconName;
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: "center", gap: spacing.md, paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: radius.full,
          backgroundColor: theme.primarySoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={30} color="primary" />
      </View>
      <AppText variant="title" style={{ textAlign: "center" }}>
        {title}
      </AppText>
      {message ? (
        <AppText tone="muted" style={{ textAlign: "center" }}>
          {message}
        </AppText>
      ) : null}
      {action}
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const offline = error instanceof ApiClientError && error.status === 0;
  const message = error instanceof ApiClientError ? error.message : "No pudimos cargar la información.";
  return (
    <EmptyState
      icon={offline ? "cloud-off" : "error-outline"}
      title={offline ? "Sin conexión" : "Algo salió mal"}
      message={message}
      action={onRetry ? <Button title="Reintentar" variant="secondary" icon="refresh" onPress={onRetry} /> : undefined}
    />
  );
}
