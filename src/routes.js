const {
  signUpHandler,
  loginHandler,
  viewProfilHandler,
  editProfilHandler,
  addPaidPlanHandler,
  addFavouritePlanHandler,
  viewPaidPlanHandler,
  viewFavouritePlanHandler,
  viewDetailPaidPlanHandler,
  viewDetailFavouritePlanHandler,
  viewPaymentReceipt,
  searchTourismHandler,
  getAllPreferencesHandler,
  addUserPreferencesHandler,
  getAllPaymentMethodHandler,
  viewAllTourism,
  viewTourismDetail
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
    path: '/add-paid-plan',
    handler: addPaidPlanHandler
  },
  {
    method: 'POST',
    path: '/add-favourite-plan',
    handler: addFavouritePlanHandler
  },
  {
    method: 'GET',
    path: '/view-paid-plan/{userID}',
    handler: viewPaidPlanHandler
  },
  {
    method: 'GET',
    path: '/view-favourite-plan/{userID}',
    handler: viewFavouritePlanHandler
  },
  {
    method: 'GET',
    path: '/view-detail-paid-plan/{userID}/{tourismID}/{goAt}',
    handler: viewDetailPaidPlanHandler
  },
  {
    method: 'GET',
    path: '/view-detail-favourite-plan/{userID}/{tourismID}/{goAt}',
    handler: viewDetailFavouritePlanHandler
  },
  {
    method: 'GET',
    path: '/view-payment-receipt/{paymentReceiptID}',
    handler: viewPaymentReceipt
  },
  {
    method: 'GET',
    path: '/search-tourism',
    handler: searchTourismHandler
  },
  {
    method: 'GET',
    path: '/preferences',
    handler: getAllPreferencesHandler
  },
  {
    method: 'POST',
    path: '/user-preferences',
    handler: addUserPreferencesHandler
  },
  {
    method: 'GET',
    path: '/payment-methods',
    handler: getAllPaymentMethodHandler
  },
  {
    method: 'GET',
    path: '/tourisms',
    handler: viewAllTourism
  },
  {
    method: 'GET',
    path: '/tourism-detail/{tourismID}',
    handler: viewTourismDetail
  }
];

module.exports = routes;
