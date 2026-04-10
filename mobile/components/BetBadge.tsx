import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BadgeType } from '../lib/api';
import { BADGE_COLORS } from '../constants/colors';

type Props = {
  badge: BadgeType;
  size?: 'sm' | 'md' | 'lg';
};

export function BetBadge({ badge, size = 'md' }: Props) {
  const colors = BADGE_COLORS[badge];

  const sizeStyles = {
    sm: { paddingHorizontal: 8, paddingVertical: 3, fontSize: 10, borderRadius: 4 },
    md: { paddingHorizontal: 12, paddingVertical: 5, fontSize: 12, borderRadius: 6 },
    lg: { paddingHorizontal: 16, paddingVertical: 8, fontSize: 14, borderRadius: 8 },
  };

  const s = sizeStyles[size];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          paddingHorizontal: s.paddingHorizontal,
          paddingVertical: s.paddingVertical,
          borderRadius: s.borderRadius,
        },
      ]}
    >
      <Text
        style={[styles.text, { color: colors.text, fontSize: s.fontSize }]}
      >
        {badge}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '800',
    letterSpacing: 1,
  },
});
