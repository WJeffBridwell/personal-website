module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    node: true,
    mocha: true,
    jest: true,
    jquery: true
  },
  extends: [
    'airbnb-base',
    'plugin:jest/recommended'
  ],
  plugins: ['jest'],
  parserOptions: {
    ecmaVersion: 'latest'
  },
  rules: {
    'no-console': 'off',
    'no-undef': 'error',
    'indent': ['error', 2],
    'import/extensions': ['error', 'ignorePackages', {
      js: 'never',
      mjs: 'never',
      jsx: 'never'
    }],
    'import/prefer-default-export': 'off',
    'import/no-extraneous-dependencies': ['error', {
      devDependencies: ['**/*.test.js', '**/test/**', '**/tests/**', '**/__mocks__/**', '**/jest.setup.js']
    }],
    'no-use-before-define': ['error', {
      functions: false,
      classes: true,
      variables: true
    }],
    'no-underscore-dangle': ['error', {
      allow: ['__filename', '__dirname', '__mock']
    }],
    'no-await-in-loop': 'off',
    'no-promise-executor-return': 'off',
    'class-methods-use-this': 'off',
    'no-param-reassign': ['error', {
      props: false
    }],
    'max-len': ['error', {
      code: 120,
      ignoreComments: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true
    }],
    'jest/no-conditional-expect': 'off',
    'arrow-parens': ['error', 'always'],
    'comma-dangle': ['error', 'always-multiline'],
    'no-trailing-spaces': 'error',
  },
  overrides: [
    {
      files: ['test/**/*.js', 'test/**/*.jsx'],
      rules: {
        'no-unused-vars': 'off',
      },
    },
  ],
  globals: {
    $: 'writable',
    jQuery: 'writable',
    getTagColor: 'writable',
    filterImagesByLetter: 'writable',
    filterImagesBySearch: 'writable'
  }
};
