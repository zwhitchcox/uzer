import bcrypt from 'bcrypt'
import {passwordValidator, emailValidator} from 'validatorz'
import sqlite from 'sqlite'


const checkEmail = email => {
  const errors = emailValidator(email)
  if (errors.length) {
    throw new Error("Invalid email.")
  }
}

export const Uzer = opts => {
  let db;
  const tableName = opts.tableName || "users"
  const validatePassword = opts.validatePassword || passwordValidator
  const dbFile = opts.dbFile || ":memory:"
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
    password TEXT NOT NULL
  );
  `
  const init = async () => {
    db = await sqlite.open(dbFile)
    await db.run(CREATE_USER_TABLE)
    verboseLog('Initialized the user table.')
  }

  const close = async () => {
    await db.close()
    verboseLog('Closed the database connection')
  }

  const INSERT_USER_QUERY = `INSERT INTO ${tableName} (email, password) VALUES (?, ?);`
  const createUser = async user => {
    checkPassword(user.password)
    checkEmail(user.email)
    const hashedPass = await bcrypt.hash(user.password, 10)
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
    const hashedPass = await bcrypt.hash(newPassword, 10)
    return db.run(UPDATE_USER_PASSWORD_MUTATION, [hashedPass, email])
  }

  const DELETE_USER_BY_EMAIL_MUTATION = `DELETE FROM ${tableName} WHERE email = ?;`
  const deleteUser = email => db.run(DELETE_USER_BY_EMAIL_MUTATION, [email])

  return {
    init,
    close,
    createUser,
    authenticateUser,
    getUser,
    getAllUsers,
    updateUserEmail,
    updateUserPassword,
    deleteUser,
  }
}

