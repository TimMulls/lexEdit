const path = require('path');

module.exports = {
    parser: '@typescript-eslint/parser', // Specifies the ESLint parser
    plugins: [
        '@typescript-eslint',
    ],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended' // Uses the recommended rules from the @typescript-eslint/eslint-plugin
    ],
    rules: {
        // Place to specify ESLint rules. Can be used to overwrite rules specified from the extended configs
        // e.g. "@typescript-eslint/explicit-function-return-type": "off",
    },
    parserOptions: {
        project: path.resolve(__dirname, './tsconfig.json'),
        tsconfigRootDir: __dirname,
        ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
        sourceType: 'module', // Allows for the use of imports
    },
    env: {
        browser: true,
    },
    globals: {
        $: true
    },
    overrides: [
        {
            files: ['webpack/**/*.js'],
            rules: {
                'no-console': 0,
            },
            env: {
                node: true,
            },
        },
    ],
};