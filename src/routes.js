const {
  signUpHandler,
  loginHandler,
  viewProfilHandler,
  editProfilHandler,
} = require("./handlers");
// const multer = require("multer");
// const upload = multer({ dest: "uploads/" });

const routes = [
  {
    method: 'POST',
    path: '/signup',
    config: {
      payload: {
        output: 'stream',
        parse: true,
        multipart: true,
        allow: 'multipart/form-data',
        maxBytes: 1000000
      },
      handler: signUpHandler
    }
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
];

module.exports = routes;
