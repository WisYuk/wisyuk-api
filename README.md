# WisYuk-api
/signup
Method: POST

Description: Register a new user.

Request Payload:
{
  "name": "string",
  "email": "string",
  "password": "string",
  "promotion": "boolean"
}

Response:
201 Created on success
400 Bad Request if required fields are missing
409 Conflict if the email already exists

/login
Method: POST

Description: Authenticate a user.

Request Payload:
{
  "email": "string",
  "password": "string"
}

Response:
200 OK with user details on success
400 Bad Request if required fields are missing
401 Unauthorized if authentication fails

/profile/{userID} → view profil
Method: GET

Description: View user profile by user ID.

Path Parameters:
userID: The ID of the user

Response:
200 OK with user profile details
404 Not Found if user not found

/profile/{userID} → edit profil
Method: PUT

Description: Edit user profile.

Path Parameters:
userID: The ID of the user

Request Payload: (if not provide it will keep the current data, so don’t worry)
name: (Optional) New name
password: (Optional) New password
preferences: (Optional) Array of preference IDs
image: (Optional) New profile image

Response:
200 OK on success
404 Not Found if user not found

/add-paid-plan
Method: POST

Description: Add a paid plan for a user.

Request Payload:
{
  "userID": "integer",
  "tourismID": "integer",
  "hotelID": "integer",
  "rideID": "integer",
  "tourGuideID": "integer",
  "go_date": "string (YYYY-MM-DD)",
  "status": "string",
  "paymentMethodID": "integer"
}

Response:
200 OK on success
400 Bad Request if required fields are missing
409 Conflict if the user already has a plan on the same date

/add-favourite-plan
Method: POST

Description: Add a plan to the user's favourites.

Request Payload:
{
  "userID": "integer",
  "tourismID": "integer",
  "hotelID": "integer",
  "rideID": "integer",
  "tourGuideID": "integer",
  "go_date": "string (YYYY-MM-DD)"
}

Response:
200 OK on success
400 Bad Request if required fields are missing
409 Conflict if the plan already exists in favourites

/view-paid-plan/{userID}
Method: GET

Description: View all paid plans for a user.

Path Parameters:
userID: The ID of the user

Response:
200 OK with a list of paid plans
404 Not Found if no plans found

/view-favourite-plan/{userID}
Method: GET

Description: View all favourite plans for a user.

Path Parameters:
userID: The ID of the user

Response:
200 OK with a list of favourite plans
404 Not Found if no plans found

/view-detail-paid-plan/{userID}/{tourismID}/{goAt}
Method: GET

Description: View details of a specific paid plan.

Path Parameters:
userID: The ID of the user
tourismID: The ID of the tourism
goAt: The date of the plan (YYYY-MM-DD)

Response:
200 OK with plan details
404 Not Found if no matching records found

/view-detail-favourite-plan/{userID}/{tourismID}/{goAt}
Method: GET

Description: View details of a specific favourite plan.

Path Parameters:
userID: The ID of the user
tourismID: The ID of the tourism
goAt: The date of the plan (YYYY-MM-DD)

Response:
200 OK with plan details
404 Not Found if no matching records found

/view-payment-receipt/{paymentReceiptID}
Method: GET

Description: View details of a specific payment receipt.

Path Parameters:
paymentReceiptID: The ID of the payment receipt

Response:
200 OK with receipt details
404 Not Found if payment receipt not found

/search-tourism
Method: GET

Description: Search for tourism places by name.

Query Parameters:
tourismName: The name of the tourism place to search for

Response:
200 OK with a list of matching tourism places
404 Not Found if no matching places found

/preferences
Method: GET

Description: Get a list of all preferences.

Response:
200 OK with a list of preferences

/user-preferences
Method: POST

Description: Add preferences for a user.

Request Payload:
{
  "userID": "integer",
  "preferences": ["integer"] → send from id preferences
}

Response:
200 OK on success
400 Bad Request if required fields are missing
409 Conflict if user already has preferences

/payment-methods
Method: GET

Description: Get a list of all payment methods.

Response:

200 OK with a list of payment methods

/tourisms
Method: GET

Description: Get a list of all tourism places.

Response:

200 OK with a list of tourism places

/tourism-detail/{tourismID}
Method: GET

Description: Get details of a specific tourism place.

Path Parameters:
tourismID: The ID of the tourism place

Response:
200 OK with tourism details
404 Not Found if tourism not found

/favourites/{userID}/{tourismID}/{go_date}
Method: DELETE

Description: Delete specific tourism from favourite plan.

Path Parameters:
userID: The ID of the user
tourismID: The ID of the tourism
go_date: The date of the plan (YYYY-MM-DD)

Response:
200 OK plan removed from favourite plan
404 Not Found if tourism not found

/view-recommendation
Method: POST

Description: show recommendations to user based on the date they want to go.

Request Payload:
{
  "go_date": "string (YYYY-MM-DD)",
  "userID": "integer",
}

Response:
Failure (400)
status: "fail"
message: "go_at and userID are required"
Failure (404)
status: "fail"
message: "User preferences not found"
Failure (404)
status: "fail"
message: "No recommendations found"
Failure (404)
status: "fail"
message: "No tourism spots found for the given recommendations"
Failure (500)
status: "fail"
message: "Internal server error"
