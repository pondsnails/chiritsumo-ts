export const colors = {
  background: '#1A1A2E',
  backgroundDark: '#000000',
  surface: 'rgba(255, 255, 255, 0.08)',
  surfaceBorder: 'rgba(255, 255, 255, 0.15)',
  border: 'rgba(255, 255, 255, 0.15)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textTertiary: 'rgba(255, 255, 255, 0.5)',

  primary: '#00D4FF',
  primaryLight: '#00E5FF',
  primaryDark: '#00A8CC',

  success: '#4ADE80',
  warning: '#FACC15',
  error: '#EF4444',
  info: '#3B82F6',

  read: '#60A5FA',
  solve: '#F87171',
  memo: '#A78BFA',
};

export const gradients = {
  background: {
    colors: [colors.background, colors.backgroundDark],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
};
