const path = require('path');

// Root directory of the project
const ROOT_DIR = path.resolve(__dirname, '..');

// Source directories
const SRC_DIR = path.join(ROOT_DIR, 'src');
const CONFIG_DIR = path.join(ROOT_DIR, 'config');
const MODELS_DIR = path.join(ROOT_DIR, 'models');
const ROUTES_DIR = path.join(ROOT_DIR, 'routes');
const CONTROLLERS_DIR = path.join(ROOT_DIR, 'controllers');
const MIDDLEWARES_DIR = path.join(ROOT_DIR, 'middleware');
const UTILS_DIR = path.join(ROOT_DIR, 'utils');
const SERVICES_DIR = path.join(ROOT_DIR, 'services');
const VALIDATORS_DIR = path.join(ROOT_DIR, 'validators');
const WEBSOCKET_DIR = path.join(ROOT_DIR, 'websocket');

// Build directories
const BUILD_DIR = path.join(ROOT_DIR, 'build');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');

// Test directories
const TESTS_DIR = path.join(ROOT_DIR, 'tests');
const TEST_UTILS_DIR = path.join(TESTS_DIR, 'utils');
const TEST_FIXTURES_DIR = path.join(TESTS_DIR, '__fixtures__');

module.exports = {
  // Root directories
  ROOT_DIR,
  SRC_DIR,
  CONFIG_DIR,
  BUILD_DIR,
  PUBLIC_DIR,
  UPLOADS_DIR,
  
  // Source code directories
  MODELS_DIR,
  ROUTES_DIR,
  CONTROLLERS_DIR,
  MIDDLEWARES_DIR,
  UTILS_DIR,
  SERVICES_DIR,
  VALIDATORS_DIR,
  WEBSOCKET_DIR,
  
  // Test directories
  TESTS_DIR,
  TEST_UTILS_DIR,
  TEST_FIXTURES_DIR,
  
  // Aliases for module resolution
  aliases: {
    '@root': ROOT_DIR,
    '@src': SRC_DIR,
    '@config': CONFIG_DIR,
    '@models': MODELS_DIR,
    '@routes': ROUTES_DIR,
    '@controllers': CONTROLLERS_DIR,
    '@middleware': MIDDLEWARES_DIR,
    '@utils': UTILS_DIR,
    '@services': SERVICES_DIR,
    '@validators': VALIDATORS_DIR,
    '@websocket': WEBSOCKET_DIR,
    '@test': TESTS_DIR,
  },
};
