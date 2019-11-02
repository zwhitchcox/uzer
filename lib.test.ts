import { test, before, after, /*describe, afterEach, beforeEach*/ } from 'tezt'
import { Pool } from 'pg'
import sqlite from 'sqlite'
import { SqliteUzer, PostgresUzer } from './lib';
import expect from "expect"
import bcrypt from "bcrypt"

const sampleUser = {
  email: "zwhitchcox@gmail.com",
  password: "MyPassword@01"
}
const tableName = "mytable"

const sqliteUzer = SqliteUzer({
  tableName,
  sqlite: sqlite.open(":memory:"),
})

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  database: 'uzertest',
  password: 'password',
  port: 5432,
})
const postgresUzer = PostgresUzer({
  tableName,
  pool,
})

before(async () => {
  await sqliteUzer.init()
  db:
  await postgresUzer.init()
})

after(async () => {
  await pool.query(`DELETE FROM ${tableName};`)
  await sqliteUzer.close()
  await postgresUzer.close()
})

const runBoth = fn => {
  fn({
    uzer: sqliteUzer,
    type: "sqlite",
  })
  fn({
    uzer: postgresUzer,
    type: "postgres",
  })
}

runBoth(({uzer, type}) => {
  const falseVal = type === "sqlite" ? 0 : false
  const trueVal = type === "sqlite" ? 1 : true
  test("create user", async () => {
    expect(() => uzer.createUser({
      email: "asdf@asdf.com"
    }))
    await uzer.createUser(sampleUser)
    const {password, ...sampleUserNoPassword} = sampleUser
    const {password:hashedPass, ...gottenUser} = await uzer.getUser(sampleUser.email)
    expect(gottenUser).toMatchObject(sampleUserNoPassword as any)
    expect(await bcrypt.compare(sampleUser.password, hashedPass)).toBe(true)
  })

  test("check user credentials", async () => {
    const {email, password:correctPass} = sampleUser
    await uzer.authenticateUser({email, password: correctPass})

    const incorrectPass = "veqwerqteagkjd"
    await expect(uzer.authenticateUser({email, password: incorrectPass})).rejects.toThrow()
  })

  const alteredEmail = "zanehitchcox@gmail.com"
  test("update user email", async () => {
    await uzer.updateUserEmail(sampleUser.email, alteredEmail)
    expect(await uzer.getUser(alteredEmail)).toBeTruthy()
  })

  test("update user password", async () => {
    const newPassword = "MyNewPassword@01"
    const newUser = {
      email: alteredEmail,
      password: newPassword,
    }
    await uzer.updateUserPassword(newUser)
    await uzer.authenticateUser(newUser)
    await expect(uzer.authenticateUser({email: alteredEmail, password: "incorrectPassword"}))
      .rejects.toThrow()
  })

  const FIFTEEN_MINUTES = 1000 * 60 * 15
  const resetPassword = "ResetPassword@01"
  test("reset password token", async () => {
    const passwordResetToken = await uzer.createPasswordResetToken({
      email: alteredEmail,
      expiration: Date.now() + FIFTEEN_MINUTES
    })

    await uzer.resetPasswordByToken({
      email: alteredEmail,
      token: passwordResetToken,
      password: resetPassword,
    })

    const user = await uzer.getUser(alteredEmail)
    expect(await bcrypt.compare(resetPassword, user.password)).toBe(true)
  })

  const newUser = {
    email: alteredEmail,
    password: resetPassword
  }
  test("deactivate user", async () => {
    expect(await uzer.getAllUsers()).toMatchObject([{email: alteredEmail, active: trueVal}])
    await uzer.deactivateAccount(newUser)
    expect(await uzer.getAllUsers()).toMatchObject([{email: alteredEmail, active: falseVal}])
  })

  test("reactivate user", async () => {
    expect(await uzer.getAllUsers()).toMatchObject([{email: alteredEmail, active: falseVal}])
    await uzer.reactivateAccount(newUser)
    expect(await uzer.getAllUsers()).toMatchObject([{email: alteredEmail, active: trueVal}])
  })

  test("verify email", async () => {
    expect(await uzer.getAllUsers()).toMatchObject([{email: alteredEmail, email_verified: falseVal}])
    const verificationToken = await uzer.createEmailVerificationToken({
      email: alteredEmail,
      expiration: Date.now() + FIFTEEN_MINUTES,
    })
    await uzer.verifyEmailByToken({
      token: verificationToken,
      email: alteredEmail,
    })
    expect(await uzer.getAllUsers()).toMatchObject([{email: alteredEmail, email_verified: trueVal}])
  })
})
