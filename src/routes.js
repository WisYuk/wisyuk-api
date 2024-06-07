const {
  signUpHandler,
  loginHandler,
  viewProfilHandler,
  editProfilHandler,
  paymentSuccessHandler
} = require("./handlers");

const routes = [
  {
    method: 'POST',
    path: '/signup',
    handler: signUpHandler
  },
  {
    method: 'POST',
    path: '/login',
    handler: loginHandler
  },
  {
    method: 'GET',
    path: '/profile/{userID}',
    handler: viewProfilHandler
  },
  {
    method: 'PUT',
    path: '/profile/{userID}',
    config: {
      payload: {
        output: 'stream',
        parse: true,
        multipart: true,
        allow: 'multipart/form-data',
        maxBytes: 1000000
      },
      handler: editProfilHandler
    }
  },
  {
    method: 'POST',
    path: '/payment-success',
    handler: paymentSuccessHandler
  }
];

module.exports = routes;
