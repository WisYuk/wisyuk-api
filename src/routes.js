const { config } = require("dotenv");
const {
  signUpHandler,
  loginHandler,
  viewProfilHandler,
  editProfilHandler,
  addUserPreferencesHandler,
  getAllUserPreferencesHandler,
  getUserPreferencesByIdHandler,
  editUserPreferencesByIdHandler,
  deleteUserPreferencesByIdHandler,
  addHomePageHandler,
  getAllHomePageHandler,
  getHomePageByIdHandler,
  editHomePageByIdHandler,
  deleteHomePageByIdHandler,
  addPaymentMethodHandler,
  getAllPaymentMethodHandler,
  getPaymentMethodByIdHandler,
  editPaymentMethodByIdHandler,
  deletePaymentMethodByIdHandler,
} = require("./handlers");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

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
        path: '/profile/{userId}',
        handler: viewProfilHandler
    },
    {
        method: 'PUT',
        path: '/profile/{userId}',
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
];

module.exports = routes;
