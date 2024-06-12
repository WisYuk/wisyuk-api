const pool = require('./db');
const bcrypt = require('bcrypt');
const uploadFileStream = require('./cloudStorage');
const axios = require('axios');

const saltPass = 10;

// SIGN UP
const signUpHandler = async (request, h) => {
  const { name, email, password, promotion } = request.payload;

  if (!name || !email || !password || promotion === undefined) {
    return h.response({
      status: 'fail',
      message: 'name, email, password, and promotion fields are required'
    }).code(400);
  }

  try {
    // Check if the email already exists
    const [existingEmail] = await pool.query('SELECT * FROM users WHERE email=?', [email]);
    if (existingEmail.length > 0) {
      return h.response({
        status: 'fail',
        message: 'email already exists'
      }).code(409);
    }

    // Hash the password
    const hashedPass = await bcrypt.hash(password, saltPass);

    // Process image file if it exists
    let imageUrl = null;

    // Set current timestamp
    const timestamp = new Date();

    // Insert query
    await pool.query(
      'INSERT INTO users (name, email, password, bool_promotion, created_at, updated_at, image) VALUES (?,?,?,?,?,?,?);',
      [name, email, hashedPass, promotion, timestamp, timestamp, imageUrl]
    );

    return h.response({
      status: 'success',
      message: 'sign up success'
    }).code(201);

  } catch (err) {
    console.error(err);
    return h.response({
      status: 'fail',
      message: 'internal server error'
    }).code(500);
  }
};


// LOGIN
const loginHandler = async (request, h) => {
  const { email, password } = request.payload;

  // Cek kalau user sama password yg dikirim kosong
  if (!email || !password) {
    return h.response({
      status: 'fail',
      message: 'email and password are required'
    }).code(400);
  }

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email=?;', [email]);

    // Misal kalau tidak ada data yang cocok a.k.a belum sign up
    if (rows.length === 0) {
      return h.response({
        status: 'fail',
        message: 'user tidak ditemukan'
      }).code(401);
    }

    // data ditemukan
    const user = rows[0];

    // decrypt password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return h.response({
        status: 'fail',
        message: 'password salah'
      }).code(401);
    }

    return h.response({
      status: 'success',
      message: 'login successful',
      user
    }).code(200);

  } catch (err) {
    console.error(err);
    return h.response({
      status: 'fail',
      message: 'internal server error'
    }).code(500);
  }
};

// VIEW PROFIL
const viewProfilHandler = async (request, h) => {
  // id diambil dari route url
  const { userID } = request.params;

  try {
    // Query to get user email
    const [userRows] = await pool.query('SELECT name, email, image FROM users where id=?', [userID]);
    console.log('User Rows:', userRows);  // Add this line

    // cek apakah email ada
    if (userRows.length === 0) {
      return h.response({
        status: 'fail',
        message: 'user not found'
      }).code(404);
    }
    // user ditemukan
    const { email: uEmail, name: uName, image: uImage } = userRows[0];

    // Query to get user preferences
    const [userPref] = await pool.query('SELECT p.name as preference_name FROM users u INNER JOIN users_preferences up on u.id = up.users_id INNER JOIN preferences p on p.id = up.preferences_id WHERE u.id = ?;', [userID]);
    if (userPref.length === 0) {
      return h.response({
        status: 'fail',
        message: 'preferences not found'
      }).code(404);
    }
    const preferences = userPref.map(row => row.preference_name);

    return h.response({
      status: 'success',
      data: {
        name: uName,
        email: uEmail,
        preferences: preferences,
        image: uImage
      }
    }).code(200);

  } catch (err) {
    console.error(err);
    return h.response({
      status: 'fail',
      message: 'Internal server error'
    }).code(500);
  }
};

const editProfilHandler = async (request, h) => {
  const { userID } = request.params;
  const { name, password, preferences } = request.payload;
  const file = request.payload.image;
  console.log(file);

  try {
    // Query for current data
    const [userRows] = await pool.query('SELECT name, password, updated_at, image FROM users WHERE id = ?', [userID]);
    if (userRows.length === 0) {
      return h.response({
        status: 'fail',
        message: 'user not found'
      }).code(404);
    }

    const userCurData = userRows[0];

    // Hash the new password if provided
    let hashedPass = userCurData.password;
    if (password) {
      hashedPass = await bcrypt.hash(password, 10);
    }

    // New image profile
    let imageUrl = userCurData.image;
    if (file && file.hapi && file.hapi.filename) {
      const imagePath = file.hapi.filename;
      imageUrl = await uploadFileStream(file, imagePath);
    }
    // buat tau bentuk data yg dikirim seperti apa
    console.log(imageUrl);

    const updatedAt = new Date();

    // Check if data exists in update_profiles table
    const [updateRows] = await pool.query('SELECT id FROM update_profiles WHERE users_id = ?', [userID]);

    if (updateRows.length > 0) {
      // Data already exists, update the record
      await pool.query('UPDATE update_profiles SET name_old = ?, password_old = ?, updated_at = ? WHERE users_id = ?',
        [userCurData.name, userCurData.password, userCurData.updated_at, userID]);
    } else {
      // No data exists, insert a new record
      await pool.query('INSERT INTO update_profiles (name_old, password_old, updated_at, users_id) VALUES (?, ?, ?, ?)',
        [userCurData.name, userCurData.password, userCurData.updated_at, userID]);
    }

    // Update table users
    await pool.query('UPDATE users SET name = ?, password = ?, updated_at = ?, image = ? WHERE id = ?',
      [name || userCurData.name, hashedPass, updatedAt, imageUrl, userID]);

    // Ensure preferences is an array
    let preferenceArray = Array.isArray(preferences) ? preferences : JSON.parse(preferences);

    // Delete existing preferences for the user
    await pool.query('DELETE FROM users_preferences WHERE users_id = ?', [userID]);

    // Insert the new preferences
    const preferenceValues = preferenceArray.map(preferenceID => [userID, preferenceID, updatedAt]);

    await pool.query('INSERT INTO users_preferences (users_id, preferences_id, updated_at) VALUES ?', [preferenceValues]);

    return h.response({
      status: 'success',
      message: 'Profile updated successfully',
    }).code(200);
  } catch (err) {
    console.error(err);
    return h.response({
      status: 'fail',
      message: 'Internal server error'
    }).code(500);
  }
};

const addPaidPlanHandler = async (request, h) => {
  const { userID, tourismID, hotelID, rideID, tourGuideID, go_date, status, paymentMethodID } = request.payload;

  if (!userID || !tourismID || !go_date || !hotelID || !rideID || !tourGuideID || !status || !paymentMethodID) {
    return h.response({
      status: 'fail',
      message: 'All fields are required'
    }).code(400);
  }

  const connection = await pool.getConnection();
  try {
    const createdAt = new Date();

    // Check if the user already has a plan with the same go_at date
    const [existingPlans] = await connection.query(
      'SELECT 1 FROM user_plans WHERE users_id = ? AND go_at = ? AND tourism_id = ?',
      [userID, go_date, tourismID]
    );

    if (existingPlans.length > 0) {
      return h.response({
        status: 'fail',
        message: 'User already has the plan'
      }).code(409);
    }

    // Start a transaction
    await connection.beginTransaction();

    // Get prices for hotel, ride, and tour guide
    const [[hotel]] = await connection.query('SELECT price FROM hotels WHERE id = ?', [hotelID]);
    const [[ride]] = await connection.query('SELECT price FROM rides WHERE id = ?', [rideID]);
    const [[tourGuide]] = await connection.query('SELECT price FROM tour_guides WHERE id = ?', [tourGuideID]);

    // Calculate total payment
    const paymentTotal = (hotel ? hotel.price : 0) + (ride ? ride.price : 0) + (tourGuide ? tourGuide.price : 0);

    // Insert into payment_receipts
    const [paymentResult] = await connection.query(
      'INSERT INTO payment_receipts (created_at, updated_at, status, users_id, payment_methods_id, payment_total) VALUES (?,?,?,?,?,?);',
      [createdAt, createdAt, status, userID, paymentMethodID, paymentTotal]
    );

    // Get the inserted payment_receipts_id
    const paymentReceiptsID = paymentResult.insertId;

    // Insert into user_plans
    await connection.query(
      'INSERT INTO user_plans (created_at, go_at, users_id, tourism_id, hotels_id, rides_id, tour_guides_id, payment_receipts_id) VALUES (?,?,?,?,?,?,?,?);',
      [createdAt, go_date, userID, tourismID, hotelID, rideID, tourGuideID, paymentReceiptsID]
    );

    // Commit the transaction
    await connection.commit();

    return h.response({
      status: 'success',
      message: 'Payment Success. Plan added'
    }).code(200);
  } catch (err) {
    // Rollback the transaction in case of an error
    await connection.rollback();
    console.error(err);
    return h.response({
      status: 'fail',
      message: 'Internal server error'
    }).code(500);
  } finally {
    // Release the connection back to the pool
    connection.release();
  }
};

const addFavouritePlanHandler = async (request, h) => {
  const { userID, tourismID, hotelID, rideID, tourGuideID, go_date } = request.payload;

  if (!userID || !tourismID || !go_date || !hotelID || !rideID || !tourGuideID) {
    return h.response({
      status: 'fail',
      message: 'All fields are required'
    }).code(400);
  }

  const connection = await pool.getConnection();
  try {
    const createdAt = new Date();

    // Check if the user already has a plan with the same go_at date
    const [existingPlans] = await connection.query(
      'SELECT 1 FROM favourite_plans WHERE users_id = ? AND go_at = ? AND tourism_id = ?',
      [userID, go_date, tourismID]
    );

    if (existingPlans.length > 0) {
      return h.response({
        status: 'fail',
        message: 'user already saved this plan'
      }).code(409);
    }

    // query add to your_plan
    await pool.query(`INSERT INTO favourite_plans (created_at, go_at, users_id, tourism_id, hotels_id, rides_id, tour_guides_id)
      VALUES (?,?,?,?,?,?,?);`,
      [createdAt, go_date, userID, tourismID, hotelID, rideID, tourGuideID]
    );

    return h.response({
      status: 'success',
      message: 'Plan added to favourite'
    }).code(200);

  } catch (err) {
    console.error(err);
    return h.response({
      status: 'fail',
      message: 'Internal server error'
    }).code(500);
  }
};

const viewPaidPlanHandler = async (request, h) => {
  const { userID } = request.params;

  try {
    // query to get data from user_plans table
    const [rows] = await pool.query(
      `SELECT t.id, t.name, t.description, t.image, up.go_at FROM user_plans up 
      INNER JOIN users u ON u.id = up.users_id
      INNER JOIN tourism t ON t.id = up.tourism_id
      WHERE up.users_id = ?;`,
      [userID]
    );

    if (rows.length === 0) {
      return h.response({
        status: 'fail',
        message: 'No plans found for the user'
      }).code(404);
    }

    return h.response({
      status: 'success',
      data: rows
    }).code(200);

  } catch (err) {
    console.error(err);
    return h.response({
      status: 'fail',
      message: 'Internal server error'
    }).code(500);
  }
};

const viewFavouritePlanHandler = async (request, h) => {
  const { userID } = request.params;

  try {
    // query to get data from user_plans table
    const [rows] = await pool.query(
      `SELECT t.id, t.name, t.description, t.image, fp.go_at FROM favourite_plans fp 
       INNER JOIN users u ON u.id = fp.users_id 
       INNER JOIN tourism t ON t.id = fp.tourism_id
       WHERE fp.users_id = ?;`,
      [userID]
    );

    if (rows.length === 0) {
      return h.response({
        status: 'fail',
        message: 'No plans favourite found'
      }).code(404);
    }

    return h.response({
      status: 'success',
      data: rows
    }).code(200);

  } catch (err) {
    console.error(err);
    return h.response({
      status: 'fail',
      message: 'Internal server error'
    }).code(500);
  }
};

const viewDetailPaidPlanHandler = async (request, h) => {
  const { userID, tourismID, goAt } = request.params;

  try {
    const [rows] = await pool.query(
      `SELECT t.image AS tourism_image, t.name AS tourism_name, t.description AS tourism_description, 
              h.name AS hotel_name, r.name AS ride_name, tg.name AS tour_guide_name, pr.id AS payment_receipt_id
       FROM user_plans up 
       INNER JOIN users u ON u.id = up.users_id 
       INNER JOIN tourism t ON t.id = up.tourism_id 
       INNER JOIN hotels h ON h.id = up.hotels_id 
       INNER JOIN rides r ON r.id = up.rides_id 
       INNER JOIN tour_guides tg ON tg.id = up.tour_guides_id 
       INNER JOIN payment_receipts pr ON pr.id = up.payment_receipts_id 
       WHERE up.users_id = ? AND up.tourism_id = ? AND up.go_at = ?;`,
      [userID, tourismID, goAt]
    );

    if (rows.length === 0) {
      return h.response({
        status: 'fail',
        message: 'No matching records found in paid plans'
      }).code(404);
    }

    return h.response({
      status: 'success',
      data: rows
    }).code(200);

  } catch (err) {
    console.error(err);
    return h.response({
      status: 'fail',
      message: 'Internal server error'
    }).code(500);
  }
};

const viewDetailFavouritePlanHandler = async (request, h) => {
  const { userID, tourismID, goAt } = request.params;

  try {
    const [rows] = await pool.query(
      `SELECT t.image AS tourism_image, t.name AS tourism_name, t.description AS tourism_description, 
              h.name AS hotel_name, r.name AS ride_name, tg.name AS tour_guide_name 
       FROM favourite_plans fp 
       INNER JOIN users u ON u.id = fp.users_id 
       INNER JOIN tourism t ON t.id = fp.tourism_id 
       INNER JOIN hotels h ON h.id = fp.hotels_id 
       INNER JOIN rides r ON r.id = fp.rides_id 
       INNER JOIN tour_guides tg ON tg.id = fp.tour_guides_id
       WHERE fp.users_id = ? AND fp.tourism_id = ? AND fp.go_at = ?;`,
      [userID, tourismID, goAt]
    );

    if (rows.length === 0) {
      return h.response({
        status: 'fail',
        message: 'No matching records found in favourite plans'
      }).code(404);
    }

    return h.response({
      status: 'success',
      data: rows
    }).code(200);

  } catch (err) {
    console.error(err);
    return h.response({
      status: 'fail',
      message: 'Internal server error'
    }).code(500);
  }
};

const viewPaymentReceipt = async (request, h) => {
  // We can get data when view paid plan detail send the payment_receipt id
  const { paymentReceiptID } = request.params;

  try {
    const [rows] = await pool.query(
      `SELECT pr.created_at, pr.updated_at, pr.status, pr.users_id, pr.payment_methods_id, pr.payment_total,
              u.name AS user_name, pm.name AS payment_method_name,
              h.price AS hotel_price, r.price AS ride_price, tg.price AS tour_guide_price
       FROM payment_receipts pr
       INNER JOIN users u ON u.id = pr.users_id
       INNER JOIN payment_methods pm ON pm.id = pr.payment_methods_id
       INNER JOIN user_plans up ON up.payment_receipts_id = pr.id
       INNER JOIN hotels h ON h.id = up.hotels_id
       INNER JOIN rides r ON r.id = up.rides_id
       INNER JOIN tour_guides tg ON tg.id = up.tour_guides_id
       WHERE pr.id = ?;`,
      [paymentReceiptID]
    );

    if (rows.length === 0) {
      return h.response({
        status: 'fail',
        message: 'Payment receipt not found'
      }).code(404);
    }

    return h.response({
      status: 'success',
      data: rows[0] // Return the first (and only) row
    }).code(200);

  } catch (err) {
    console.error(err);
    return h.response({
      status: 'fail',
      message: 'Internal server error'
    }).code(500);
  }
};

// Perlu di adjust pakai table tourism
const searchTourismHandler = async (request, h) => {
  const { tourismName } = request.query;

  try {
    // Build the query to search by tourism name
    // Query to search for tourism places by name
    const [rows] = await pool.query(
      'SELECT * FROM tourism WHERE name LIKE ?',
      [`%${tourismName}%`]
    );

    // Check if no records are found
    if (rows.length === 0) {
      return h.response({
        status: 'fail',
        message: 'No tourism places found with the given name'
      }).code(404);
    }

    // If records are found, return them
    return h.response({
      status: 'success',
      data: rows
    }).code(200);

  } catch (err) {
    console.error(err);
    return h.response({
      status: 'fail',
      message: 'Internal server error'
    }).code(500);
  }
};

const getAllPreferencesHandler = async (request, h) => {
  try {
    const [rows] = await pool.query('SELECT * FROM preferences;');

    return h.response({
      status: 'success',
      data: rows
    }).code(200);
  } catch (err) {
    console.error(err);
    return h.response({
      status: 'fail',
      message: 'Internal server error'
    }).code(500);
  }
};

const addUserPreferencesHandler = async (request, h) => {
  const { userID, preferences } = request.payload;

  if (!userID || !preferences || preferences.length !== 3) {
    return h.response({
      status: 'fail',
      message: 'User ID and exactly three preferences are required'
    }).code(400);
  }

  try {
    const updatedAt = new Date();

    const connection = await pool.getConnection();

    try {
      // Start a transaction
      await connection.beginTransaction();

      // Insert each preference into the users_preferences table
      for (const preferenceID of preferences) {
        await connection.query(
          'INSERT INTO users_preferences (users_id, preferences_id, updated_at) VALUES (?, ?, ?);',
          [userID, preferenceID, updatedAt]
        );
      }

      // Commit the transaction
      await connection.commit();

      return h.response({
        status: 'success',
        message: 'User preferences added successfully'
      }).code(200);
    } catch (err) {
      // Rollback the transaction in case of an error
      await connection.rollback();
      console.error(err);
      return h.response({
        status: 'fail',
        message: 'Each preferences should be different.'
      }).code(500);
    } finally {
      // Release the connection back to the pool
      connection.release();
    }
  } catch (err) {
    console.error(err);
    return h.response({
      status: 'fail',
      message: 'Internal server error'
    }).code(500);
  }
};

const getAllPaymentMethodHandler = async (request, h) => {
  try {
    const [rows] = await pool.query('SELECT * FROM payment_methods;');

    return h.response({
      status: 'success',
      data: rows
    }).code(200);
  } catch (err) {
    console.error(err);
    return h.response({
      status: 'fail',
      message: 'Internal server error'
    }).code(500);
  }
};

const viewAllTourism = async (request, h) => {
  try {
    const [rows] = await pool.query('SELECT * FROM tourism;');

    return h.response({
      status: 'success',
      data: rows
    }).code(200);
  } catch (err) {
    console.error(err);
    return h.response({
      status: 'fail',
      message: 'Internal server error'
    }).code(500);
  }
};

const viewTourismDetail = async (request, h) => {
  const { tourismID } = request.params;

  try {
    const [hotels] = await pool.query(
      `SELECT * FROM hotels h 
      INNER JOIN hotels_has_tourism ht on h.id = ht.hotels_id
      WHERE ht.tourism_id = ?`,
      [tourismID]
    );

    const [tourGuides] = await pool.query(
      `SELECT * FROM tour_guides tg 
      INNER JOIN tourism_has_tour_guides ttg on tg.id = ttg.tour_guides_id
      WHERE ttg.tourism_id = ?`,
      [tourismID]
    );

    const [rides] = await pool.query(
      `SELECT * FROM rides r 
      INNER JOIN tourism_has_rides tr on r.id = tr.rides_id
      WHERE tr.tourism_id = ?`,
      [tourismID]
    );

    return h.response({
      status: 'success',
      dataHotels: hotels,
      dataTourGuides: tourGuides,
      dataRides: rides
    }).code(200);

  } catch (err) {
    console.error(err);
    return h.response({
      status: 'fail',
      message: 'Internal server error'
    }).code(500);
  }
};

const formatDate = (dateString) => {
  const [year, month, day] = dateString.split('-');
  return `${day}_${month}_${year}`;
};

const viewRecommendedTourism = async (request, h) => {
  const { go_at, user_preferences } = request.payload;
  console.log(go_at, user_preferences);

  if (!go_at || !user_preferences || user_preferences.length !== 6) {
    return h.response({
      status: 'fail',
      message: 'go_at and exactly 6 user_preferences are required'
    }).code(400);
  }

  try {
    // Convert the go_at date to the required format
    const formattedDate = formatDate(go_at);
    console.log(formattedDate);

    // Prepare the input for the ML model
    const modelInput = {
      date: formattedDate,
      user_input: user_preferences
    };

    // Make a request to the ML model endpoint
    const modelResponse = await axios.post('http://35.186.145.213/recommend', modelInput);
    const recommendations = modelResponse.data.top_N_indices;
    console.log(recommendations);
    
    if (!recommendations || recommendations.length === 0) {
      return h.response({
        status: 'fail',
        message: 'No recommendations found'
      }).code(404);
    }

    // Fetch the recommended tourism spots from the database
    const placeholders = recommendations.map(() => '?').join(', ');
    const query = `SELECT * FROM tourism WHERE id IN (${placeholders})`;
    const [rows] = await pool.query(query, recommendations);

    if (rows.length === 0) {
      return h.response({
        status: 'fail',
        message: 'No tourism spots found for the given recommendations'
      }).code(404);
    }

    // Prepare the response with recommendations and tourism spot details
    const responseData = {
      recommendations: recommendations.map((id) => ({
        id,
        details: rows.find((row) => row.id === id)
      }))
    };

    return h.response({
      status: 'success',
      data: responseData
    }).code(200);

  } catch (err) {
    console.error('Error:', err.message);
    if (err.response && err.response.status === 404) {
      return h.response({
        status: 'fail',
        message: 'No recommendations found'
      }).code(404);
    }
    return h.response({
      status: 'fail',
      message: 'Internal server error'
    }).code(500);
  }
};

module.exports = {
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
  viewTourismDetail,
  viewRecommendedTourism
};