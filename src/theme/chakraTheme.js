import { extendTheme } from '@chakra-ui/react';

const pulseAnimation = {
  '0%': { transform: 'scale(1)', opacity: 0.8 },
  '50%': { transform: 'scale(1.1)', opacity: 1 },
  '100%': { transform: 'scale(1)', opacity: 0.8 },
};

const chakraTheme = extendTheme({
  styles: {
    global: {
      body: {
        bg: 'gray.50',
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'medium',
      },
      variants: {
        solid: {
          _hover: {
            transform: 'translateY(-1px)',
            boxShadow: 'lg',
          },
          transition: 'all 0.2s',
        },
      },
    },
    Modal: {
      baseStyle: {
        dialog: {
          borderRadius: 'lg',
        },
        overlay: {
          backdropFilter: 'blur(4px)',
        },
      },
    },
  },
  shadows: {
    subtle: '0 2px 8px rgba(0, 0, 0, 0.06)',
    medium: '0 4px 12px rgba(0, 0, 0, 0.08)',
    strong: '0 8px 16px rgba(0, 0, 0, 0.12)',
  },
  animations: {
    pulse: pulseAnimation,
  },
});

export { chakraTheme };
