import bcrypt from 'bcrypt'
import {passwordValidator, emailValidator} from 'validatorz'
import uuid from 'uuid/v4'
import sqlite from 'sqlite'
import { hashPassword } from './util';


const checkEmail = email => {
  const errors = emailValidator(email)
  if (errors.length) {
    throw new Error("Invalid email.")
  }
}

export const Uzer = opts => {
  let db;
  const tableName = opts.tableName || "user"
  const validatePassword = opts.validatePassword || passwordValidator
  const checkPassword = password => {
    const errors = validatePassword(password)
    if (errors.length) {
      throw new Error(errors.reduce((acc, cur) => acc + cur.toString() + "\n", ""))
    }
  }

  const verboseLog = (opts.verbose && console.log) || (() => {})

  const CREATE_USER_TABLE =
  `
  CREATE TABLE IF NOT EXISTS ${tableName} (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    password_reset_token TEXT,
    password_reset_token_expiration INTEGER,
    email_verified BOOLEAN NOT NULL CHECK (email_verified IN (0, 1)),
    email_verification_token TEXT,
    email_verification_token_expiration INTEGER,
    active BOOLEAN NOT NULL CHECK (active IN (0, 1))
  );
  `
  const init = async () => {
    db = await opts.sqlite
    await db.run(CREATE_USER_TABLE)
    verboseLog('Initialized the user table.')
  }

  const close = async () => {
    await db.close()
    verboseLog('Closed the database connection')
  }

  const INSERT_USER_QUERY = `INSERT INTO ${tableName} (email, password, active, email_verified) VALUES (?, ?, 1, 0);`
  const createUser = async user => {
    checkPassword(user.password)
    checkEmail(user.email)
    const hashedPass = await hashPassword(user.password)
    return await db.get(INSERT_USER_QUERY, [user.email, hashedPass])
  }

  const authenticateUser = async ({email, password}) => {
    const user = await getUser(email)
    if (!await bcrypt.compare(password, user.password)) {
      throw new Error("Incorrect username or password.")
    }
  }

  const GET_USER_BY_EMAIL_QUERY = `SELECT * FROM ${tableName} WHERE email=?;`
  const getUser = email => db.get(GET_USER_BY_EMAIL_QUERY, [email])

  const GET_ALL_USERS_QUERY = `SELECT * FROM ${tableName};`
  const getAllUsers = () => db.all(GET_ALL_USERS_QUERY)

  const UPDATE_USER_EMAIL_MUTATION = `UPDATE ${tableName} SET email = ? WHERE email = ?;`
  const updateUserEmail = (prevEmail, newEmail) => db.run(UPDATE_USER_EMAIL_MUTATION, [newEmail, prevEmail])

  const UPDATE_USER_PASSWORD_MUTATION = `UPDATE ${tableName} SET password = ? WHERE email = ?;`
  const updateUserPassword = async ({email, password: newPassword}) => {
    const errors = validatePassword(newPassword)
    if (errors.length) {
      throw new Error(errors.reduce((acc, cur) => acc + cur.toString() + "\n", ""))
    }
    const hashedPass = await hashPassword(newPassword)
    return db.run(UPDATE_USER_PASSWORD_MUTATION, [hashedPass, email])
  }

  const DELETE_USER_BY_EMAIL_MUTATION = `DELETE FROM ${tableName} WHERE email = ?;`
  const deleteUser = email => db.run(DELETE_USER_BY_EMAIL_MUTATION, [email])

  const CREATE_PASSWORD_RESET_TOKEN_MUTATION =
    `UPDATE ${tableName} SET password_reset_token = ?, password_reset_token_expiration = ? WHERE email = ?;`
  const createPasswordResetToken = async ({email, expiration}) => {
    const token = uuid()
    await db.run(CREATE_PASSWORD_RESET_TOKEN_MUTATION, [token, expiration, email])
    return token
  }

  const PASSWORD_RESET_TOKEN_QUERY = `SELECT password_reset_token from ${tableName} WHERE email = ?;`
  const getPasswordResetToken = async email => {
    const result = await db.get(PASSWORD_RESET_TOKEN_QUERY, email)
    return result.password_reset_token
  }

  const RESET_PASSWORD_BY_TOKEN_MUTATION =
    `UPDATE ${tableName} SET password_reset_token = NULL, password_reset_token_expiration = NULL, password = ? WHERE email = ?;`
  const resetPasswordByToken = async ({email, password, token}) => {
    const resetToken = await getPasswordResetToken(email)
    if (token !== resetToken) {
      throw new Error("That token has expired or does not exist.")
    }
    const hashedPassword = await hashPassword(password)
    await db.run(RESET_PASSWORD_BY_TOKEN_MUTATION, [hashedPassword, email])
  }

  const DEACTIVATE_ACCOUNT_MUTATION = `UPDATE ${tableName} SET active = 0 WHERE email = ?;`
  const deactivateAccount = async ({email, password}) => {
    await authenticateUser({email, password})
    await db.run(DEACTIVATE_ACCOUNT_MUTATION, [email])
  }

  const REACTIVATE_ACCOUNT_MUTATION = `UPDATE ${tableName} SET active = 1 WHERE email = ?;`
  const reactivateAccount = async ({email, password}) => {
    await authenticateUser({email, password})
    await db.run(REACTIVATE_ACCOUNT_MUTATION, [email])
  }

  const CREATE_EMAIL_VERIFICATION_TOKEN_MUTATION =
    `
    UPDATE ${tableName}
    SET email_verification_token = ?,
        email_verification_token_expiration = ?
    WHERE email = ?;
    `
  const createEmailVerificationToken = async ({email, expiration}) => {
    const token = uuid()
    await db.run(CREATE_EMAIL_VERIFICATION_TOKEN_MUTATION, [token, expiration, email])
    return token
  }

  const EMAIL_VERIFICATION_TOKEN_QUERY = `SELECT email_verification_token from ${tableName} WHERE email = ?;`
  const getEmailVerificationToken = async email => {
    const result = await db.get(EMAIL_VERIFICATION_TOKEN_QUERY, email)
    return result.email_verification_token
  }

  const VERIFY_EMAIL_BY_TOKEN_MUTATION =
    `
    UPDATE ${tableName}
    SET email_verification_token = NULL,
        email_verification_token_expiration = NULL,
        email_verified = 1
    WHERE email = ?;
    `
  const verifyEmailByToken = async ({email, token}) => {
    const resetToken = await getEmailVerificationToken(email)
    if (token !== resetToken) {
      throw new Error("That token has expired or does not exist.")
    }
    await db.run(VERIFY_EMAIL_BY_TOKEN_MUTATION, [email])
  }

  return {
    init,
    close,
    createUser,
    authenticateUser,
    getUser,
    getAllUsers,
    updateUserEmail,
    updateUserPassword,
    deactivateAccount,
    reactivateAccount,
    createPasswordResetToken,
    resetPasswordByToken,
    verifyEmailByToken,
    createEmailVerificationToken,
    deleteUser,
  }
}