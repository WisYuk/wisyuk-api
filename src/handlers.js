const pool = require('./db');
const bcrypt = require('bcrypt');
const uploadFileStream = require('./cloudStorage');
// const fs = require('fs');
// const path = require('path');
// const { rejects } = require('assert');
// const { request } = require('http');

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

    // Start a transaction
    await connection.beginTransaction();

    // Insert into payment_receipts
    const [paymentResult] = await connection.query(
      'INSERT INTO payment_receipts (created_at, updated_at, status, users_id, payment_methods_id) VALUES (?,?,?,?,?);',
      [createdAt, createdAt, status, userID, paymentMethodID]
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

  try {
    const createdAt = new Date();

    // query add to your_plan
    await pool.query('INSERT INTO user_plans (created_at, go_at, users_id, tourism_id, hotels_id, rides_id, tour_guides_id)' +
      'VALUES (?,?,?,?,?,?,?);', [createdAt, go_date, userID, tourismID, hotelID, rideID, tourGuideID]);

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

module.exports = {
  signUpHandler,
  loginHandler,
  viewProfilHandler,
  editProfilHandler,
  addPaidPlanHandler,
  addFavouritePlanHandler
};