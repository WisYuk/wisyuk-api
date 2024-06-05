const pool = require('./db');
const bcrypt = require('bcrypt');
const uploadFileStream = require('./cloudStorage');
const fs = require('fs');
const path = require('path');
const { rejects } = require('assert');
const { request } = require('http');
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
                message: 'email not found'
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

        console.log('Preference values:', preferences);

        // insert the new preferences
        const preferenceValues = preferences.map(preferenceID => [userID, preferenceID, updatedAt]);
        console.log('Preference values:', preferenceValues);
        await pool.query('INSERT INTO users_preferences (users_id, preferences_id, updated_at) VALUES ?', [preferenceValues]);
        console.log('Insert result:', result);

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


module.exports = {
    signUpHandler,
    loginHandler,
    viewProfilHandler,
    editProfilHandler,
    addUserPreferencesHandler,

 // Export User Preferences Handlers
  getAllUserPreferencesHandler,
  getUserPreferencesByIdHandler,
  editUserPreferencesByIdHandler,
  deleteUserPreferencesByIdHandler,

  // Export Home Page Handlers
  addHomePageHandler,
  getAllHomePageHandler,
  getHomePageByIdHandler,
  editHomePageByIdHandler,
  deleteHomePageByIdHandler,
  
  // Export Payment Method Handlers
  addPaymentMethodHandler,
  getAllPaymentMethodHandler,
  getPaymentMethodByIdHandler,
  editPaymentMethodByIdHandler,
  deletePaymentMethodByIdHandler,

};