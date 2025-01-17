export default {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current',
      },
      // Dynamically set modules based on process.env.NODE_ENV
      modules: process.env.NODE_ENV === 'test' ? 'auto' : false,
    }],
  ],
  // Add support for Jest's module system
  env: {
    test: {
      plugins: ['@babel/plugin-transform-modules-commonjs'],
    },
  },
};
