import bcrypt from 'bcrypt'
import uuid from 'uuid/v4'
import {passwordValidator, emailValidator} from 'validatorz'
import { Pool } from 'pg'
import { hashPassword } from './util';

const checkEmail = email => {
  const errors = emailValidator(email)
  if (errors.length) {
    throw new Error("Invalid email.")
  }
}


export const Uzer = opts => {
  let pool;
  const tableName = opts.tableName || "users"
  const validatePassword = opts.validatePassword || passwordValidator
  const checkPassword = password => {
    const errors = validatePassword(password)
    if (errors.length) {
      throw new Error(errors.reduce((acc, cur) => acc + cur.toString() + "\n", ""))
    }
  }

  const getPool = () => pool

  const verboseLog = (opts.verbose && console.log) || (() => {})

  const CREATE_USER_TABLE =
  `
  CREATE TABLE IF NOT EXISTS ${tableName} (
    id SERIAL PRIMARY KEY,
    email varchar(320) NOT NULL UNIQUE,
    password varchar(60) NOT NULL
  );
  `
  const MIGRATION_1 = `
  DO $$
    BEGIN
      ALTER TABLE ${tableName} ADD COLUMN password_reset_token varchar(36);
      ALTER TABLE ${tableName} ADD COLUMN password_reset_token_expiration bigint;
      EXCEPTION WHEN duplicate_column THEN NULL;
    END;
  $$
  `
  const init = async () => {
    pool = await new Pool(opts.db)
    await pool.query(CREATE_USER_TABLE)
    await pool.query(MIGRATION_1)
    verboseLog('Initialized the user table.')
  }

  const close = async () => {
    await pool.end()
    verboseLog('Closed the database connection')
  }

  const INSERT_USER_QUERY = `INSERT INTO ${tableName} (email, password) VALUES ($1, $2);`
  const createUser = async user => {
    checkPassword(user.password)
    checkEmail(user.email)
    const hashedPass = await hashPassword(user.password)
    return await pool.query(INSERT_USER_QUERY, [user.email, hashedPass])
  }

  const GET_USER_QUERY = `SELECT * FROM ${tableName} WHERE email=$1;`
  const getUser = async email => {
    const result = await pool.query(GET_USER_QUERY, [email])
    return result.rows[0]
  }

  const authenticateUser = async ({email, password}) => {
    const user = await getUser(email)
    if (!await bcrypt.compare(password, user.password)) {
      throw new Error("Incorrect username or password.")
    }
  }

  const GET_ALL_USERS_QUERY = `SELECT * FROM ${tableName};`
  const getAllUsers = async () => {
    const { rows } = await pool.query(GET_ALL_USERS_QUERY)
    return rows
  }

  const UPDATE_USER_EMAIL_MUTATION = `UPDATE ${tableName} SET email = $1 WHERE email = $2;`
  const updateUserEmail = async (prevEmail, newEmail) => {
    const result = await pool.query(UPDATE_USER_EMAIL_MUTATION, [newEmail, prevEmail])
    return result
  }

  const UPDATE_USER_PASSWORD_MUTATION = `UPDATE ${tableName} SET password = $1 WHERE email = $2;`
  const updateUserPassword = async ({email, password: newPassword}) => {
    const errors = validatePassword(newPassword)
    if (errors.length) {
      throw new Error(errors.reduce((acc, cur) => acc + cur.toString() + "\n", ""))
    }
    const hashedPass = await hashPassword(newPassword)
    return pool.query(UPDATE_USER_PASSWORD_MUTATION, [hashedPass, email])
  }

  const DELETE_USER_BY_EMAIL_MUTATION = `DELETE FROM ${tableName} WHERE email = $1;`
  const deleteUser = email => pool.query(DELETE_USER_BY_EMAIL_MUTATION, [email])

  const CREATE_PASSWORD_RESET_TOKEN_MUTATION =
    `UPDATE ${tableName} SET password_reset_token = $1, password_reset_token_expiration = $2 WHERE email = $3;`
  const createPasswordResetToken = async ({email, expiration}) => {
    const token = uuid()
    await pool.query(CREATE_PASSWORD_RESET_TOKEN_MUTATION, [token, expiration, email])
    return token
  }

  const PASSWORD_RESET_TOKEN_QUERY = `SELECT password_reset_token from ${tableName} WHERE email = $1;`
  const getPasswordResetToken = async email => {
    const {rows} = await pool.query(PASSWORD_RESET_TOKEN_QUERY, [email])
    return rows[0].password_reset_token
  }

  const RESET_PASSWORD_BY_TOKEN_MUTATION =
    `UPDATE ${tableName} SET password_reset_token = NULL, password_reset_token_expiration = NULL, password = $1 WHERE email = $2;`
  const resetPasswordByToken = async ({email, password, token}) => {
    const resetToken = await getPasswordResetToken(email)
    if (token !== resetToken) {
      throw new Error("That token has expired or does not exist.")
    }
    const hashedPassword = await hashPassword(password)
    await pool.query(RESET_PASSWORD_BY_TOKEN_MUTATION, [hashedPassword, email])
  }

  return {
    init,
    close,
    createUser,
    authenticateUser,
    getPool,
    getUser,
    getAllUsers,
    updateUserEmail,
    updateUserPassword,
    resetPasswordByToken,
    createPasswordResetToken,
    deleteUser,
  }
}